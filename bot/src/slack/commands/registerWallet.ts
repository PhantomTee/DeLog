/**
 * @file registerWallet.ts
 * @description /register-wallet 0x... - self-service (team, Slack user) -> Sepolia address mapping.
 */

import type { SlackCommandMiddlewareArgs, AllMiddlewareArgs } from "@slack/bolt";
import { ethers } from "ethers";
import { registerWallet, logAudit } from "../../db/repository";

export async function handleRegisterWallet({
  command,
  ack,
  respond,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();

  const address = command.text.trim();
  if (!ethers.isAddress(address)) {
    await respond({ response_type: "ephemeral", text: `"${address}" is not a valid Ethereum address.` });
    return;
  }

  const checksummed = ethers.getAddress(address);
  await registerWallet(command.team_id, command.user_id, checksummed);
  await logAudit(command.team_id, command.user_id, "register_wallet", `slack=${command.user_id} eth=${checksummed}`);

  await respond({ response_type: "ephemeral", text: `Registered ${checksummed} as your payout address.` });
}
