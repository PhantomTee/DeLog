/**
 * @file installationStore.ts
 * @description Prisma-backed Slack InstallationStore. Each installed workspace becomes one Team
 * row; Bolt resolves the right bot token per incoming event automatically once this is wired
 * into the App's `installationStore` option - no custom `authorize` function needed. Enterprise
 * Grid (org-wide) installs are intentionally unsupported for now (DeLog targets a single team's
 * treasury; org-wide install semantics would need a different data model).
 */

import type { Installation, InstallationQuery, InstallationStore } from "@slack/oauth";
import { prisma } from "../db/client";

export const prismaInstallationStore: InstallationStore = {
  async storeInstallation(installation: Installation<"v1" | "v2", boolean>) {
    if (installation.isEnterpriseInstall || !installation.team?.id) {
      throw new Error("DeLog does not support Enterprise Grid org-wide installs");
    }
    if (!installation.bot?.token) {
      throw new Error("Installation is missing a bot token");
    }

    await prisma.team.upsert({
      where: { id: installation.team.id },
      update: {
        name: installation.team.name,
        botToken: installation.bot.token,
        botUserId: installation.bot.userId,
        botScopes: installation.bot.scopes.join(","),
      },
      create: {
        id: installation.team.id,
        name: installation.team.name,
        botToken: installation.bot.token,
        botUserId: installation.bot.userId,
        botScopes: installation.bot.scopes.join(","),
      },
    });
  },

  async fetchInstallation(query: InstallationQuery<boolean>) {
    if (query.isEnterpriseInstall || !query.teamId) {
      throw new Error("DeLog does not support Enterprise Grid org-wide installs");
    }
    const team = await prisma.team.findUnique({ where: { id: query.teamId } });
    if (!team) throw new Error(`No installation found for team ${query.teamId}`);

    return {
      team: { id: team.id, name: team.name ?? undefined },
      enterprise: undefined,
      user: { id: "", token: undefined, scopes: undefined },
      bot: {
        token: team.botToken,
        id: team.botUserId ?? "",
        userId: team.botUserId ?? "",
        scopes: team.botScopes ? team.botScopes.split(",") : [],
      },
      appId: undefined,
      isEnterpriseInstall: false,
    };
  },

  async deleteInstallation(query: InstallationQuery<boolean>) {
    if (!query.teamId) return;
    await prisma.team.delete({ where: { id: query.teamId } }).catch(() => undefined);
  },
};
