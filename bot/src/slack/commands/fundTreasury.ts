/**
 * @file fundTreasury.ts
 * @description /fund-treasury <amount> - shields part of the Safe's own real USDC balance into
 * its confidential balance inside the shared ConfidentialUSDCWrapper, so private payouts have
 * encrypted balance to draw from. Wrapping takes a plaintext amount on-chain (wrap() has no
 * encrypted-amount overload), so this is a visible "moved X into privacy" treasury action - not
 * a private payout itself. It bundles approve() + wrap() as one atomic Safe MultiSend proposal.
 * Restricted to registered Safe owners so a random workspace member cannot spam proposals.
 */

import type { SlackCommandMiddlewareArgs, AllMiddlewareArgs } from "@slack/bolt";
import { buildApproveCall, buildWrapCall, proposeSafeTransaction, getSafeOwners } from "../../chain/safe";
import { usdcInterface, wrapperInterface, getWrapperAddress } from "../../chain/token";
import { logAudit, getRegisteredOwnerSlackIds } from "../../db/repository";
import { requireTeamTreasury, TREASURY_NOT_CONFIGURED_MESSAGE } from "../teamConfig";

export async function handleFundTreasury({
  command,
  ack,
  respond,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();

  const treasury = await requireTeamTreasury(command.team_id);
  if (!treasury) {
    await respond({ response_type: "ephemeral", text: TREASURY_NOT_CONFIGURED_MESSAGE });
    return;
  }

  const owners = await getSafeOwners(treasury.safeAddress);
  const ownerSlackIds = await getRegisteredOwnerSlackIds(command.team_id, owners);
  if (!ownerSlackIds.includes(command.user_id)) {
    await respond({
      response_type: "ephemeral",
      text: "Only a registered Safe owner can fund the treasury. Run /register-wallet first if you are an owner.",
    });
    return;
  }

  let amount: bigint;
  try {
    amount = BigInt(command.text.trim());
    if (amount <= 0n) throw new Error("non-positive");
  } catch {
    await respond({ response_type: "ephemeral", text: "Usage: /fund-treasury <positive whole number, in USDC base units>" });
    return;
  }

  const wrapperAddress = getWrapperAddress();
  const approveCall = buildApproveCall(treasury.safeAddress, usdcInterface, wrapperAddress, amount);
  const wrapCall = buildWrapCall(wrapperAddress, wrapperInterface, treasury.safeAddress, amount);
  const { safeTxHash } = await proposeSafeTransaction(treasury.safeAddress, [approveCall, wrapCall]);

  await logAudit(command.team_id, command.user_id, "treasury_wrap_proposed", `safeTxHash=${safeTxHash}`);

  await respond({
    response_type: "ephemeral",
    text: `Wrap proposed (tx ${safeTxHash}): shields ${amount} of the Safe's real USDC into its confidential balance. A second Safe owner must sign AND execute it in Safe{Wallet} - the bot's approval worker only auto-executes /payout and /payroll transactions, not treasury wraps. The Safe must already hold that much real Sepolia USDC.`,
  });
}
