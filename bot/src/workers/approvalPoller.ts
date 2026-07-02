/**
 * @file approvalPoller.ts
 * @description Background loop: checks Safe Transaction Service confirmation counts for every
 * awaiting_signatures payout/payroll run, executes once the threshold is met, and DMs the
 * requester + recipient(s). This is what lets the bot co-sign a proposal but never execute it
 * alone - execution only happens after a human owner's signature is observed on the Safe side.
 * Runs outside any single Slack request, so it constructs a WebClient per team from that team's
 * stored installation token rather than reusing a single app-wide client.
 */

import { WebClient } from "@slack/web-api";
import { getPendingSafeTxs, markPayoutExecuted, markPayrollExecuted, getTeam } from "../db/repository";
import { getTransactionStatus, executeSafeTransaction } from "../chain/safe";
import { dmUser } from "../slack/dm";

const DEFAULT_INTERVAL_MS = 30_000;
const teamClientCache = new Map<string, WebClient>();

async function getTeamClient(teamId: string): Promise<WebClient | null> {
  if (teamClientCache.has(teamId)) return teamClientCache.get(teamId)!;
  const team = await getTeam(teamId);
  if (!team) return null;
  const client = new WebClient(team.botToken);
  teamClientCache.set(teamId, client);
  return client;
}

export function startApprovalPoller(): () => void {
  const intervalMs = Number(process.env.APPROVAL_POLL_INTERVAL_MS ?? DEFAULT_INTERVAL_MS);
  const timer = setInterval(() => {
    pollOnce().catch((err) => console.error("[approval-poller] tick failed", err));
  }, intervalMs);
  console.log(`[approval-poller] started, interval=${intervalMs}ms`);
  return () => clearInterval(timer);
}

async function pollOnce(): Promise<void> {
  const { payouts, payrollRuns } = await getPendingSafeTxs();

  for (const payout of payouts) {
    if (!payout.safeTxHash) continue;
    await tryExecutePayout(payout.teamId, payout.id, payout.safeTxHash, payout.requesterId, payout.recipientId);
  }

  for (const run of payrollRuns) {
    if (!run.safeTxHash) continue;
    await tryExecutePayroll(run.teamId, run.id, run.safeTxHash, run.requesterId);
  }
}

async function tryExecutePayout(
  teamId: string,
  payoutId: string,
  safeTxHash: string,
  requesterId: string,
  recipientId: string,
): Promise<void> {
  const status = await getTransactionStatus(safeTxHash);
  if (status.isExecuted) return;
  if ((status.confirmations?.length ?? 0) < status.confirmationsRequired) return;

  const team = await getTeam(teamId);
  if (!team?.safeAddress) return;

  const { transactionHash } = await executeSafeTransaction(team.safeAddress, safeTxHash);
  await markPayoutExecuted(payoutId, transactionHash);

  const client = await getTeamClient(teamId);
  if (!client) return;
  await dmUser(client, requesterId, `Payout ${payoutId} executed on-chain: tx ${transactionHash}`);
  await dmUser(client, recipientId, `You received a private payout. tx ${transactionHash}`);
}

async function tryExecutePayroll(teamId: string, runId: string, safeTxHash: string, requesterId: string): Promise<void> {
  const status = await getTransactionStatus(safeTxHash);
  if (status.isExecuted) return;
  if ((status.confirmations?.length ?? 0) < status.confirmationsRequired) return;

  const team = await getTeam(teamId);
  if (!team?.safeAddress) return;

  const { transactionHash } = await executeSafeTransaction(team.safeAddress, safeTxHash);
  const run = await markPayrollExecuted(runId, transactionHash);

  const client = await getTeamClient(teamId);
  if (!client) return;
  await dmUser(client, requesterId, `Payroll run ${runId} executed on-chain: tx ${transactionHash}`);
  for (const item of run.items) {
    await dmUser(client, item.recipientId, `You received a private payout as part of a payroll run. tx ${transactionHash}`);
  }
}
