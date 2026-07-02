/**
 * @file setupTreasury.ts
 * @description /setup-treasury <safeAddress> <tokenAddress> - one-time per-team onboarding step.
 * Zamance cannot deploy a Safe or a confidential token on a team's behalf (that needs their own
 * gas-funded key and their own on-chain deployment decisions - see ../../../README.md), so a
 * workspace admin runs this once they've deployed ConfidentialPayoutToken and created their Safe
 * (with the bot added as a co-signing owner) themselves.
 */

import type { SlackCommandMiddlewareArgs, AllMiddlewareArgs } from "@slack/bolt";
import { ethers } from "ethers";
import { setTeamTreasury, logAudit } from "../../db/repository";
import { getBotSignerAddress, getSafeOwners } from "../../chain/safe";

export async function handleSetupTreasury({
  command,
  ack,
  respond,
  client,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();

  const userInfo = await client.users.info({ user: command.user_id });
  if (!userInfo.user?.is_admin && !userInfo.user?.is_owner) {
    await respond({ response_type: "ephemeral", text: "Only a workspace admin can run /setup-treasury." });
    return;
  }

  const [safeAddress, tokenAddress] = command.text.trim().split(/\s+/);
  if (!safeAddress || !tokenAddress || !ethers.isAddress(safeAddress) || !ethers.isAddress(tokenAddress)) {
    await respond({
      response_type: "ephemeral",
      text: "Usage: /setup-treasury <safeAddress> <tokenAddress> - both must be valid Sepolia addresses.",
    });
    return;
  }

  let owners: string[];
  try {
    owners = await getSafeOwners(safeAddress);
  } catch (err) {
    await respond({
      response_type: "ephemeral",
      text: `Could not read owners from that Safe address: ${err instanceof Error ? err.message : String(err)}`,
    });
    return;
  }

  const botAddress = getBotSignerAddress();
  if (!owners.some((o) => o.toLowerCase() === botAddress.toLowerCase())) {
    await respond({
      response_type: "ephemeral",
      text: `The bot (${botAddress}) is not an owner of that Safe yet. Add it as a co-signing owner (threshold >= 2-of-N) before running /setup-treasury.`,
    });
    return;
  }

  await setTeamTreasury(command.team_id, ethers.getAddress(safeAddress), ethers.getAddress(tokenAddress));
  await logAudit(command.team_id, command.user_id, "treasury_configured", `safe=${safeAddress} token=${tokenAddress}`);

  await respond({
    response_type: "ephemeral",
    text: `Treasury configured. Safe: ${safeAddress}, Token: ${tokenAddress}. Run /fund-treasury to mint encrypted supply.`,
  });
}
