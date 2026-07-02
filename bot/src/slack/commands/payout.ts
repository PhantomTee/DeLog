/**
 * @file payout.ts
 * @description /payout opens a modal (recipient + amount); on submit, resolves the recipient's
 * registered address, encrypts the amount for the team's Safe (the on-chain caller), proposes a
 * Safe transaction, and notifies the requester + Safe owners by DM only - no public channel
 * messages.
 */

import type { SlackCommandMiddlewareArgs, AllMiddlewareArgs, SlackViewMiddlewareArgs } from "@slack/bolt";
import type { WebClient } from "@slack/web-api";
import {
  getWalletAddress,
  createPendingPayout,
  attachSafeTx,
  markPayoutFailed,
  logAudit,
  getRegisteredOwnerSlackIds,
} from "../../db/repository";
import { buildEncryptedAmount } from "../../chain/fheEncrypt";
import { buildConfidentialTransferCall, proposeSafeTransaction, getSafeOwners } from "../../chain/safe";
import { tokenInterface } from "../../chain/token";
import { dmUser } from "../dm";
import { requireTeamTreasury, TREASURY_NOT_CONFIGURED_MESSAGE } from "../teamConfig";

export const PAYOUT_CALLBACK_ID = "payout_modal";

export async function openPayoutModal({
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
      callback_id: PAYOUT_CALLBACK_ID,
      private_metadata: JSON.stringify({ teamId: command.team_id, requesterId: command.user_id }),
      title: { type: "plain_text", text: "New payout" },
      submit: { type: "plain_text", text: "Propose" },
      close: { type: "plain_text", text: "Cancel" },
      blocks: [
        {
          type: "input",
          block_id: "recipient",
          label: { type: "plain_text", text: "Recipient" },
          element: { type: "users_select", action_id: "recipient_user" },
        },
        {
          type: "input",
          block_id: "amount",
          label: { type: "plain_text", text: "Amount (token base units)" },
          element: { type: "plain_text_input", action_id: "amount_input" },
        },
      ],
    },
  });
}

export async function handlePayoutSubmission({
  ack,
  view,
  client,
}: SlackViewMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  const { teamId, requesterId } = JSON.parse(view.private_metadata) as { teamId: string; requesterId: string };
  const recipientId = view.state.values.recipient.recipient_user.selected_user;
  const amountRaw = view.state.values.amount.amount_input.value?.trim();

  if (!recipientId) {
    await ack({ response_action: "errors", errors: { recipient: "Choose a recipient" } });
    return;
  }

  let amount: bigint;
  try {
    amount = BigInt(amountRaw ?? "");
    if (amount <= 0n) throw new Error("non-positive");
  } catch {
    await ack({ response_action: "errors", errors: { amount: "Enter a positive whole number" } });
    return;
  }

  const recipientAddr = await getWalletAddress(teamId, recipientId);
  if (!recipientAddr) {
    await ack({
      response_action: "errors",
      errors: { recipient: "This user has not run /register-wallet yet" },
    });
    return;
  }

  const treasury = await requireTeamTreasury(teamId);
  if (!treasury) {
    await ack({ response_action: "errors", errors: { recipient: TREASURY_NOT_CONFIGURED_MESSAGE } });
    return;
  }

  await ack();

  const payout = await createPendingPayout({ teamId, requesterId, recipientId, recipientAddr });

  try {
    // The Safe is msg.sender when the transfer executes on-chain, so the encrypted input
    // must be bound to the Safe's address, not the bot's own key.
    const { handle, inputProof } = await buildEncryptedAmount(treasury.tokenAddress, treasury.safeAddress, amount);
    const call = buildConfidentialTransferCall(
      treasury.tokenAddress,
      tokenInterface,
      recipientAddr,
      handle,
      inputProof,
    );
    const { safeTxHash } = await proposeSafeTransaction(treasury.safeAddress, [call]);

    await attachSafeTx(payout.id, safeTxHash, handle);
    await logAudit(teamId, requesterId, "payout_proposed", `payoutId=${payout.id} safeTxHash=${safeTxHash}`);

    await notifyPayoutProposed(client, teamId, treasury.safeAddress, payout.id, requesterId, recipientId, safeTxHash);
  } catch (err) {
    await markPayoutFailed(payout.id);
    await dmUser(
      client,
      requesterId,
      `Payout ${payout.id} failed to propose: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function notifyPayoutProposed(
  client: WebClient,
  teamId: string,
  safeAddress: string,
  payoutId: string,
  requesterId: string,
  recipientId: string,
  safeTxHash: string,
): Promise<void> {
  await dmUser(
    client,
    requesterId,
    `Payout ${payoutId} proposed to the Safe (tx ${safeTxHash}). Waiting for a second owner to sign in Safe{Wallet}.`,
  );

  const owners = await getSafeOwners(safeAddress);
  const ownerSlackIds = await getRegisteredOwnerSlackIds(teamId, owners);
  for (const ownerId of ownerSlackIds.filter((id) => id !== requesterId)) {
    await dmUser(
      client,
      ownerId,
      `A payout to <@${recipientId}> is awaiting your signature. Open Safe{Wallet} and sign tx ${safeTxHash}. (Details are intentionally not posted here or in any channel.)`,
    );
  }
}
