/**
 * @file parsePayoutIntent.ts
 * @description Parses a free-text Slack DM into a structured payout intent via Groq. Recipients
 * come back exactly as written (a Slack <@USERID> mention, or a bare name) - resolving a bare
 * name to an actual Slack user happens separately in resolveRecipient.ts, since that needs the
 * team's real member list, which the model does not have. The model is instructed to never
 * fabricate a recipient or amount that isn't present in the message, and to flag anything
 * ambiguous rather than guess - a misparsed payout is a real-money mistake, not a typo.
 */

import { getGroqClient } from "./groqClient";

export interface PayoutIntentItem {
  recipient: string;
  amount: string;
}

export type PayoutIntent =
  | { type: "single" | "batch"; items: PayoutIntentItem[]; isPrivate: boolean }
  | { type: "unclear"; clarification: string }
  | { type: "not_a_payout" };

const SYSTEM_PROMPT = `You extract payout requests from a Slack direct message sent to a payroll bot called DeLog.

Rules:
- "recipient" must be copied EXACTLY as written in the message: a Slack mention like <@U123ABC>, or a bare name like "Sarah". Never invent, guess, or normalize a Slack ID - you do not have access to the team's member list.
- "amount" must be a positive integer written as a string (whole token base units - no currency symbols, no decimals, no words).
- If the message names more than one recipient, return type "batch" with one item per recipient.
- If the message names exactly one recipient, return type "single" with exactly one item.
- If the message is clearly not a payout request (a greeting, a question, small talk), return type "not_a_payout".
- If it's clearly an attempted payout but missing a recipient or an amount, or the amount is ambiguous or non-numeric, return type "unclear" with a short "clarification" question.
- Never fabricate a recipient or amount that is not present in the message. When in doubt, prefer "unclear" over guessing.
- Every payout is either "private" (encrypted, confidential) or "public" (a normal, transparent USDC transfer). Set "isPrivate" to false ONLY if the message explicitly asks for public/normal/transparent/non-private/visible USDC (e.g. "pay Sarah 500 publicly", "send 200 in normal USDC", "non-private transfer"). Otherwise, ALWAYS set "isPrivate" to true - private is the default when the message says nothing about visibility. One visibility applies to the whole message (all recipients), not per-recipient.`;

const RESPONSE_SCHEMA = {
  name: "payout_intent",
  schema: {
    type: "object",
    properties: {
      type: { type: "string", enum: ["single", "batch", "unclear", "not_a_payout"] },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            recipient: { type: "string" },
            amount: { type: "string" },
          },
          required: ["recipient", "amount"],
        },
      },
      isPrivate: { type: "boolean" },
      clarification: { type: "string" },
    },
    required: ["type"],
  },
};

export async function parsePayoutIntent(message: string): Promise<PayoutIntent> {
  const groq = getGroqClient();

  let raw: string | null | undefined;
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
      response_format: { type: "json_schema", json_schema: RESPONSE_SCHEMA },
      temperature: 0,
    });
    raw = completion.choices[0]?.message?.content;
  } catch (err) {
    return {
      type: "unclear",
      clarification: `I couldn't process that (${err instanceof Error ? err.message : "unknown error"}). Try rephrasing?`,
    };
  }

  if (!raw) {
    return { type: "unclear", clarification: "I didn't catch that - can you rephrase who to pay and how much?" };
  }

  let parsed: { type?: string; items?: PayoutIntentItem[]; isPrivate?: boolean; clarification?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { type: "unclear", clarification: "I couldn't parse that - can you rephrase who to pay and how much?" };
  }

  if (parsed.type === "not_a_payout") return { type: "not_a_payout" };
  if (parsed.type === "unclear") {
    return { type: "unclear", clarification: parsed.clarification ?? "Could you clarify who to pay and how much?" };
  }
  if ((parsed.type === "single" || parsed.type === "batch") && parsed.items?.length) {
    // Private is the safe default - only an explicit "publicly"/"normal USDC" request in the
    // message should ever turn it off (see the isPrivate rule in SYSTEM_PROMPT).
    return { type: parsed.type, items: parsed.items, isPrivate: parsed.isPrivate ?? true };
  }
  return { type: "unclear", clarification: "I couldn't tell who to pay and how much - can you rephrase?" };
}
