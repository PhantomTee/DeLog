/**
 * @file payoutStatus.ts
 * @description /payout-status <id> - ephemeral lookup of a payout or payroll run's state,
 * scoped to the requesting team so one workspace can never see another's data.
 */

import type { SlackCommandMiddlewareArgs, AllMiddlewareArgs } from "@slack/bolt";
import { getPayout } from "../../db/repository";
import { prisma } from "../../db/client";

export async function handlePayoutStatus({
  command,
  ack,
  respond,
}: SlackCommandMiddlewareArgs & AllMiddlewareArgs): Promise<void> {
  await ack();

  const id = command.text.trim();
  if (!id) {
    await respond({ response_type: "ephemeral", text: "Usage: /payout-status <payout-or-run-id>" });
    return;
  }

  const payout = await getPayout(command.team_id, id);
  if (payout) {
    await respond({
      response_type: "ephemeral",
      text: `Payout ${payout.id}: status=${payout.status}${payout.safeTxHash ? ` safeTxHash=${payout.safeTxHash}` : ""}${payout.txHash ? ` txHash=${payout.txHash}` : ""}`,
    });
    return;
  }

  const run = await prisma.payrollRun.findFirst({
    where: { id, teamId: command.team_id },
    include: { items: true },
  });
  if (run) {
    await respond({
      response_type: "ephemeral",
      text: `Payroll run ${run.id}: status=${run.status}, ${run.items.length} recipients${run.safeTxHash ? ` safeTxHash=${run.safeTxHash}` : ""}${run.txHash ? ` txHash=${run.txHash}` : ""}`,
    });
    return;
  }

  await respond({ response_type: "ephemeral", text: `No payout or payroll run found with id "${id}".` });
}
