/**
 * @file fundTreasury.ts
 * @description /fund-treasury <amount> - mints encrypted supply to the team's Safe. mint() is
 * onlyOwner on ConfidentialPayoutToken and ownership is the Safe post-deploy, so this goes
 * through the same propose/co-sign/execute flow as a payout. Restricted to registered Safe
 * owners so a random workspace member cannot spam mint proposals.
 */

import type { SlackCommandMiddlewareArgs, AllMiddlewareArgs } from "@slack/bolt";
import { buildEncryptedAmount } from "../../chain/fheEncrypt";
import { proposeSafeTransaction, getSafeOwners } from "../../chain/safe";
import { tokenInterface } from "../../chain/token";
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
    await respond({ response_type: "ephemeral", text: "Usage: /fund-treasury <positive whole number>" });
    return;
  }

  const { handle, inputProof } = await buildEncryptedAmount(treasury.tokenAddress, treasury.safeAddress, amount);
  const data = tokenInterface.encodeFunctionData("mint(address,bytes32,bytes)", [
    treasury.safeAddress,
    handle,
    inputProof,
  ]);
  const { safeTxHash } = await proposeSafeTransaction(treasury.safeAddress, [
    { to: treasury.tokenAddress, value: "0", data },
  ]);

  await logAudit(command.team_id, command.user_id, "treasury_mint_proposed", `safeTxHash=${safeTxHash}`);

  await respond({
    response_type: "ephemeral",
    text: `Mint proposed (tx ${safeTxHash}). A second Safe owner must sign AND execute it in Safe{Wallet} - the bot's approval worker only auto-executes /payout and /payroll transactions, not treasury mints.`,
  });
}
