/**
 * @file repository.ts
 * @description Data access helpers for teams, wallets, payouts, payroll runs, and the audit log.
 * Every query is scoped by teamId for tenant isolation. `detail` passed to logAudit must never
 * contain a plaintext payout amount - see the comment on AuditLog in schema.prisma.
 */

import { prisma } from "./client";

export async function getTeam(teamId: string) {
  return prisma.team.findUnique({ where: { id: teamId } });
}

export async function setTeamTreasury(teamId: string, safeAddress: string) {
  return prisma.team.update({ where: { id: teamId }, data: { safeAddress } });
}

export async function registerWallet(teamId: string, slackUserId: string, ethAddress: string) {
  return prisma.wallet.upsert({
    where: { teamId_slackUserId: { teamId, slackUserId } },
    update: { ethAddress },
    create: { teamId, slackUserId, ethAddress },
  });
}

export async function getWalletAddress(teamId: string, slackUserId: string): Promise<string | null> {
  const wallet = await prisma.wallet.findUnique({ where: { teamId_slackUserId: { teamId, slackUserId } } });
  return wallet?.ethAddress ?? null;
}

/** Slack user IDs (within this team) whose registered wallet matches one of the Safe's on-chain owners. */
export async function getRegisteredOwnerSlackIds(teamId: string, ownerAddresses: string[]): Promise<string[]> {
  const ownerSet = new Set(ownerAddresses.map((a) => a.toLowerCase()));
  const wallets = await prisma.wallet.findMany({ where: { teamId } });
  return wallets.filter((w) => ownerSet.has(w.ethAddress.toLowerCase())).map((w) => w.slackUserId);
}

export async function createPendingPayout(params: {
  teamId: string;
  requesterId: string;
  recipientId: string;
  recipientAddr: string;
  isPrivate: boolean;
  payrollRunId?: string;
}) {
  return prisma.payout.create({
    data: {
      teamId: params.teamId,
      requesterId: params.requesterId,
      recipientId: params.recipientId,
      recipientAddr: params.recipientAddr,
      isPrivate: params.isPrivate,
      payrollRunId: params.payrollRunId,
      status: "pending_approval",
    },
  });
}

export async function attachSafeTx(payoutId: string, safeTxHash: string, amountHandle?: string) {
  return prisma.payout.update({
    where: { id: payoutId },
    data: { safeTxHash, amountHandle, status: "awaiting_signatures" },
  });
}

export async function markPayoutExecuted(payoutId: string, txHash: string) {
  return prisma.payout.update({
    where: { id: payoutId },
    data: { status: "executed", txHash },
  });
}

export async function markPayoutFailed(payoutId: string) {
  return prisma.payout.update({ where: { id: payoutId }, data: { status: "failed" } });
}

export async function getPayout(teamId: string, id: string) {
  return prisma.payout.findFirst({ where: { id, teamId }, include: { payrollRun: true } });
}

export async function listPayouts(teamId: string, limit = 50) {
  return prisma.payout.findMany({
    where: { teamId, payrollRunId: null },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listPayrollRuns(teamId: string, limit = 20) {
  return prisma.payrollRun.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { items: true },
  });
}

export async function createPayrollRun(teamId: string, requesterId: string, isPrivate: boolean) {
  return prisma.payrollRun.create({ data: { teamId, requesterId, isPrivate, status: "pending_approval" } });
}

export async function attachPayrollSafeTx(payrollRunId: string, safeTxHash: string) {
  return prisma.payrollRun.update({
    where: { id: payrollRunId },
    data: { safeTxHash, status: "awaiting_signatures" },
  });
}

export async function markPayrollExecuted(payrollRunId: string, txHash: string) {
  await prisma.payrollRun.update({ where: { id: payrollRunId }, data: { status: "executed", txHash } });
  await prisma.payout.updateMany({
    where: { payrollRunId },
    data: { status: "executed", txHash },
  });
  return prisma.payrollRun.findUniqueOrThrow({ where: { id: payrollRunId }, include: { items: true } });
}

export async function getPendingSafeTxs() {
  const [payouts, payrollRuns] = await Promise.all([
    prisma.payout.findMany({ where: { status: "awaiting_signatures", payrollRunId: null } }),
    prisma.payrollRun.findMany({ where: { status: "awaiting_signatures" } }),
  ]);
  return { payouts, payrollRuns };
}

export async function logAudit(teamId: string, actorId: string, action: string, detail: string) {
  return prisma.auditLog.create({ data: { teamId, actorId, action, detail } });
}
