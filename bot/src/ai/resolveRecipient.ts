/**
 * @file resolveRecipient.ts
 * @description Resolves a recipient string from parsePayoutIntent (a Slack <@USERID> mention, or
 * a bare name) into an actual Slack user ID. Names are matched against the team's real member
 * list (real name, display name, username) - ambiguous or unmatched names are surfaced back to
 * the requester rather than guessed at, since a wrong recipient here means a wrong payout.
 */

import type { WebClient } from "@slack/web-api";

const MENTION_PATTERN = /^<@([A-Z0-9]+)(\|[^>]*)?>$/i;

export type ResolveResult =
  | { status: "resolved"; slackUserId: string; displayName: string }
  | { status: "ambiguous"; matches: string[] }
  | { status: "not_found" };

export async function resolveRecipient(client: WebClient, raw: string): Promise<ResolveResult> {
  const trimmed = raw.trim();
  const mentionMatch = MENTION_PATTERN.exec(trimmed);
  if (mentionMatch) {
    const slackUserId = mentionMatch[1];
    try {
      const info = await client.users.info({ user: slackUserId });
      const displayName = info.user?.profile?.real_name || info.user?.real_name || info.user?.name || slackUserId;
      return { status: "resolved", slackUserId, displayName };
    } catch {
      return { status: "not_found" };
    }
  }

  const needle = trimmed.toLowerCase();
  const members = await listAllMembers(client);
  const matches = members.filter((m) => {
    const real = (m.profile?.real_name || m.real_name || "").toLowerCase();
    const display = (m.profile?.display_name || "").toLowerCase();
    const username = (m.name || "").toLowerCase();
    return real === needle || display === needle || username === needle;
  });

  if (matches.length === 1) {
    const m = matches[0];
    const displayName = m.profile?.real_name || m.real_name || m.name || m.id!;
    return { status: "resolved", slackUserId: m.id!, displayName };
  }
  if (matches.length > 1) {
    return { status: "ambiguous", matches: matches.map((m) => `<@${m.id}>`) };
  }
  return { status: "not_found" };
}

async function listAllMembers(client: WebClient) {
  const all = [];
  let cursor: string | undefined;
  do {
    const res = await client.users.list({ cursor, limit: 200 });
    all.push(...(res.members ?? []));
    cursor = res.response_metadata?.next_cursor || undefined;
  } while (cursor);
  return all.filter((m) => !m.is_bot && !m.deleted && m.id !== "USLACKBOT");
}
