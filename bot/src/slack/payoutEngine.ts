/**
 * @file payoutEngine.ts
 * @description Shared "propose payout(s) to the Safe" logic. Given already-resolved (Slack user,
 * address, amount) pairs, builds the encrypted transfer call(s), proposes the Safe transaction,
 * persists it, and DMs the requester + Safe owners. Used by both the modal-based /payout and
 * /payroll commands and the natural-language DM flow (see nlPayout.ts) - one code path for the
 * part that actually moves toward moving funds, so a change to ACL/encoding/notification logic
 * only has to happen once.
 */

import type { WebClient } from "@slack/web-api";
import {
  createPendingPayout,
  createPayrollRun,
  attachSafeTx,
  attachPayrollSafeTx,
  markPayoutFailed,
  logAudit,
  getRegisteredOwnerSlackIds,
} from "../db/repository";
import { prisma } from "../db/client";
import { buildEncryptedAmount } from "../chain/fheEncrypt";
import { buildConfidentialTransferCall, proposeSafeTransaction, getSafeOwners } from "../chain/safe";
import { tokenInterface } from "../chain/token";
import { dmUser } from "./dm";
import type { TeamTreasury } from "./teamConfig";

export interface ResolvedRecipient {
  slackUserId: string;
  address: string;
  amount: bigint;
}

export async function proposeSinglePayout(
  client: WebClient,
  teamId: string,
  requesterId: string,
  treasury: TeamTreasury,
  recipient: ResolvedRecipient,
): Promise<void> {
  const payout = await createPendingPayout({
    teamId,
    requesterId,
    recipientId: recipient.slackUserId,
    recipientAddr: recipient.address,
  });

  try {
    // The Safe is msg.sender when the transfer executes on-chain, so the encrypted input
    // must be bound to the Safe's address, not the bot's own key.
    const { handle, inputProof } = await buildEncryptedAmount(
      treasury.tokenAddress,
      treasury.safeAddress,
      recipient.amount,
    );
    const call = buildConfidentialTransferCall(
      treasury.tokenAddress,
      tokenInterface,
      recipient.address,
      handle,
      inputProof,
    );
    const { safeTxHash } = await proposeSafeTransaction(treasury.safeAddress, [call]);

    await attachSafeTx(payout.id, safeTxHash, handle);
    await logAudit(teamId, requesterId, "payout_proposed", `payoutId=${payout.id} safeTxHash=${safeTxHash}`);
    await notifyProposed(
      client,
      teamId,
      treasury.safeAddress,
      requesterId,
      `Payout ${payout.id} proposed to the Safe (tx ${safeTxHash}). Waiting for a second owner to sign in Safe{Wallet}.`,
      `A payout to <@${recipient.slackUserId}> is awaiting your signature. Open Safe{Wallet} and sign tx ${safeTxHash}. (Details are intentionally not posted here or in any channel.)`,
    );
  } catch (err) {
    await markPayoutFailed(payout.id);
    await dmUser(
      client,
      requesterId,
      `Payout ${payout.id} failed to propose: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export async function proposeBatchPayroll(
  client: WebClient,
  teamId: string,
  requesterId: string,
  treasury: TeamTreasury,
  recipients: ResolvedRecipient[],
): Promise<void> {
  const run = await createPayrollRun(teamId, requesterId);
  for (const item of recipients) {
    await createPendingPayout({
      teamId,
      requesterId,
      recipientId: item.slackUserId,
      recipientAddr: item.address,
      payrollRunId: run.id,
    });
  }

  try {
    const calls = [];
    for (const item of recipients) {
      const { handle, inputProof } = await buildEncryptedAmount(
        treasury.tokenAddress,
        treasury.safeAddress,
        item.amount,
      );
      calls.push(buildConfidentialTransferCall(treasury.tokenAddress, tokenInterface, item.address, handle, inputProof));
    }

    const { safeTxHash } = await proposeSafeTransaction(treasury.safeAddress, calls);
    await attachPayrollSafeTx(run.id, safeTxHash);
    await logAudit(
      teamId,
      requesterId,
      "payroll_proposed",
      `runId=${run.id} safeTxHash=${safeTxHash} count=${recipients.length}`,
    );
    await notifyProposed(
      client,
      teamId,
      treasury.safeAddress,
      requesterId,
      `Payroll run ${run.id} (${recipients.length} recipients) proposed to the Safe (tx ${safeTxHash}). Waiting for a second owner to sign.`,
      `A payroll run of ${recipients.length} recipients is awaiting your signature. Open Safe{Wallet} and sign tx ${safeTxHash}.`,
    );
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

async function notifyProposed(
  client: WebClient,
  teamId: string,
  safeAddress: string,
  requesterId: string,
  requesterMessage: string,
  ownerMessage: string,
): Promise<void> {
  await dmUser(client, requesterId, requesterMessage);
  const owners = await getSafeOwners(safeAddress);
  const ownerSlackIds = await getRegisteredOwnerSlackIds(teamId, owners);
  for (const ownerId of ownerSlackIds.filter((id) => id !== requesterId)) {
    await dmUser(client, ownerId, ownerMessage);
  }
}
