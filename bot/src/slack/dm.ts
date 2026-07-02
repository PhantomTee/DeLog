/**
 * @file dm.ts
 * @description Sends a direct message to a Slack user, opening the DM channel first. Used for
 * every payout/payroll notification so amounts and addresses never touch a public channel.
 */

import type { WebClient } from "@slack/web-api";

export async function dmUser(client: WebClient, userId: string, text: string): Promise<void> {
  const opened = await client.conversations.open({ users: userId });
  const channel = opened.channel?.id;
  if (!channel) throw new Error(`Could not open a DM channel with ${userId}`);
  await client.chat.postMessage({ channel, text });
}
