/**
 * @file payroll.ts
 * @description /payroll opens a modal for a bulk list ("@user amount" or "USERID amount" per
 * line, one recipient per line - Slack plain_text_input does not expand @mention autocomplete,
 * so raw <@USERID> mention syntax or a bare Slack member ID both work). All recipients are
 * validated up front, then bundled into a single MultiSend-batched Safe transaction so the whole
 * run succeeds or fails atomically.
 */

import type { SlackCommandMiddlewareArgs, AllMiddlewareArgs, SlackViewMiddlewareArgs } from "@slack/bolt";
import type { WebClient } from "@slack/web-api";
import {
  getWalletAddress,
  createPendingPayout,
  createPayrollRun,
  attachPayrollSafeTx,
  logAudit,
  getRegisteredOwnerSlackIds,
} from "../../db/repository";
import { prisma } from "../../db/client";
import { buildEncryptedAmount } from "../../chain/fheEncrypt";
import { buildConfidentialTransferCall, proposeSafeTransaction, getSafeOwners } from "../../chain/safe";
import { tokenInterface } from "../../chain/token";
import { dmUser } from "../dm";
import { requireTeamTreasury, TREASURY_NOT_CONFIGURED_MESSAGE } from "../teamConfig";

export const PAYROLL_CALLBACK_ID = "payroll_modal";

const LINE_PATTERN = /^\s*<?@?([A-Z0-9]+)>?\s+(\d+)\s*$/i;

export async function openPayrollModal({
  command,
  ack,
  client,
  respond,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();

  const treasury = await requireTeamTreasury(command.team_id);
  if (!treasury) {
    await respond({ response_type: "ephemeral", text: TREASURY_NOT_CONFIGURED_MESSAGE });
    return;
  }

  await client.views.open({
    trigger_id: command.trigger_id,
    view: {
      type: "modal",
      callback_id: PAYROLL_CALLBACK_ID,
      private_metadata: JSON.stringify({ teamId: command.team_id, requesterId: command.user_id }),
      title: { type: "plain_text", text: "New payroll run" },
      submit: { type: "plain_text", text: "Propose" },
      close: { type: "plain_text", text: "Cancel" },
      blocks: [
        {
          type: "input",
          block_id: "lines",
          label: { type: "plain_text", text: "One recipient per line: <@USERID> amount" },
          element: { type: "plain_text_input", action_id: "lines_input", multiline: true },
        },
      ],
    },
  });
}

interface ParsedLine {
  slackUserId: string;
  amount: bigint;
}

function parseLines(raw: string): ParsedLine[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines.map((line) => {
    const match = LINE_PATTERN.exec(line);
    if (!match) throw new Error(`Could not parse line: "${line}" (expected "<@USERID> amount")`);
    return { slackUserId: match[1], amount: BigInt(match[2]) };
  });
}

export async function handlePayrollSubmission({
  ack,
  view,
  client,
}: SlackViewMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  const { teamId, requesterId } = JSON.parse(view.private_metadata) as { teamId: string; requesterId: string };
  const raw = view.state.values.lines.lines_input.value ?? "";

  let parsed: ParsedLine[];
  try {
    parsed = parseLines(raw);
    if (parsed.length === 0) throw new Error("Enter at least one recipient");
  } catch (err) {
    await ack({
      response_action: "errors",
      errors: { lines: err instanceof Error ? err.message : "Could not parse the recipient list" },
    });
    return;
  }

  const resolved: Array<ParsedLine & { addr: string }> = [];
  for (const line of parsed) {
    const addr = await getWalletAddress(teamId, line.slackUserId);
    if (!addr) {
      await ack({
        response_action: "errors",
        errors: { lines: `<@${line.slackUserId}> has not run /register-wallet yet` },
      });
      return;
    }
    if (line.amount <= 0n) {
      await ack({ response_action: "errors", errors: { lines: `Amount for <@${line.slackUserId}> must be positive` } });
      return;
    }
    resolved.push({ ...line, addr });
  }

  const treasury = await requireTeamTreasury(teamId);
  if (!treasury) {
    await ack({ response_action: "errors", errors: { lines: TREASURY_NOT_CONFIGURED_MESSAGE } });
    return;
  }

  await ack();

  const run = await createPayrollRun(teamId, requesterId);
  for (const item of resolved) {
    await createPendingPayout({
      teamId,
      requesterId,
      recipientId: item.slackUserId,
      recipientAddr: item.addr,
      payrollRunId: run.id,
    });
  }

  try {
    const calls = [];
    for (const item of resolved) {
      const { handle, inputProof } = await buildEncryptedAmount(
        treasury.tokenAddress,
        treasury.safeAddress,
        item.amount,
      );
      calls.push(
        buildConfidentialTransferCall(treasury.tokenAddress, tokenInterface, item.addr, handle, inputProof),
      );
    }

    const { safeTxHash } = await proposeSafeTransaction(treasury.safeAddress, calls);
    await attachPayrollSafeTx(run.id, safeTxHash);
    await logAudit(
      teamId,
      requesterId,
      "payroll_proposed",
      `runId=${run.id} safeTxHash=${safeTxHash} count=${resolved.length}`,
    );

    await notifyPayrollProposed(client, teamId, treasury.safeAddress, run.id, requesterId, resolved.length, safeTxHash);
  } catch (err) {
    await prisma.payrollRun.update({ where: { id: run.id }, data: { status: "failed" } });
    await prisma.payout.updateMany({ where: { payrollRunId: run.id }, data: { status: "failed" } });
    await dmUser(
      client,
      requesterId,
      `Payroll run ${run.id} failed to propose: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function notifyPayrollProposed(
  client: WebClient,
  teamId: string,
  safeAddress: string,
  runId: string,
  requesterId: string,
  count: number,
  safeTxHash: string,
): Promise<void> {
  await dmUser(
    client,
    requesterId,
    `Payroll run ${runId} (${count} recipients) proposed to the Safe (tx ${safeTxHash}). Waiting for a second owner to sign.`,
  );

  const owners = await getSafeOwners(safeAddress);
  const ownerSlackIds = await getRegisteredOwnerSlackIds(teamId, owners);
  for (const ownerId of ownerSlackIds.filter((id) => id !== requesterId)) {
    await dmUser(
      client,
      ownerId,
      `A payroll run of ${count} recipients is awaiting your signature. Open Safe{Wallet} and sign tx ${safeTxHash}.`,
    );
  }
}
