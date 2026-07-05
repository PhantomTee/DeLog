/**
 * @file setupTreasury.ts
 * @description /setup-treasury <safeAddress> - one-time per-team onboarding step. Zamance cannot
 * deploy a Safe on a team's behalf (that needs their own gas-funded key and on-chain choices -
 * see ../../../README.md), so a workspace admin runs this once they've created their Safe (with
 * the bot added as a co-signing owner). Unlike the old custom-token model, there is no token
 * address to configure: every team pays out in real Sepolia USDC plus the one globally shared
 * ConfidentialUSDCWrapper (WRAPPER_ADDRESS env var) - both are protocol-level constants.
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

  const safeAddress = command.text.trim().split(/\s+/)[0];
  if (!safeAddress || !ethers.isAddress(safeAddress)) {
    await respond({
      response_type: "ephemeral",
      text: "Usage: /setup-treasury <safeAddress> - must be a valid Sepolia Safe address.",
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

  await setTeamTreasury(command.team_id, ethers.getAddress(safeAddress));
  await logAudit(command.team_id, command.user_id, "treasury_configured", `safe=${safeAddress}`);

  await respond({
    response_type: "ephemeral",
    text: `Treasury configured. Safe: ${safeAddress}. Payouts move real Sepolia USDC. Send the Safe some testnet USDC, then run /fund-treasury <amount> to shield part of it into the private, confidential balance before running private payouts.`,
  });
}
