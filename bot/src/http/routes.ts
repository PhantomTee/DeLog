/**
 * @file routes.ts
 * @description Dashboard-facing HTTP surface, mounted as Bolt customRoutes alongside the OAuth
 * install routes (see ../index.ts). Two concerns live here: "Sign in with Slack" (OIDC) issuing
 * a dashboard JWT, and read-only JSON endpoints the Zamance frontend polls. No endpoint here ever
 * returns a payout amount - see the comment on the Payout model in prisma/schema.prisma.
 */

import type { CustomRoute } from "@slack/bolt";
import { buildAuthorizeUrl, exchangeCodeForUserInfo } from "./slackOidc";
import { signOAuthState, verifyOAuthState, signSession } from "./jwt";
import { sendJson, handlePreflight, getQuery, requireSession } from "./helpers";
import { getTeam, listPayouts, listPayrollRuns } from "../db/repository";
import { getBotSignerAddress } from "../chain/safe";

function frontendUrl(path: string): string {
  const base = process.env.DASHBOARD_ORIGIN ?? "http://localhost:3000";
  return `${base}${path}`;
}

export const dashboardRoutes: CustomRoute[] = [
  {
    path: "/auth/slack/login",
    method: "GET",
    handler: (_req, res) => {
      const state = signOAuthState();
      res.writeHead(302, { Location: buildAuthorizeUrl(state) });
      res.end();
    },
  },
  {
    path: "/auth/slack/callback",
    method: "GET",
    handler: async (req, res) => {
      const query = getQuery(req);
      const code = query.get("code");
      const state = query.get("state");

      if (!code || !state || !verifyOAuthState(state)) {
        res.writeHead(302, { Location: frontendUrl("/dashboard?error=invalid_state") });
        res.end();
        return;
      }

      try {
        const info = await exchangeCodeForUserInfo(code);
        const team = await getTeam(info.teamId);
        if (!team) {
          res.writeHead(302, { Location: frontendUrl("/dashboard?error=not_installed") });
          res.end();
          return;
        }
        const token = signSession({ teamId: info.teamId, userId: info.userId });
        res.writeHead(302, { Location: frontendUrl(`/dashboard#token=${token}`) });
        res.end();
      } catch (err) {
        console.error("[oidc] callback failed", err);
        res.writeHead(302, { Location: frontendUrl("/dashboard?error=oidc_failed") });
        res.end();
      }
    },
  },
  {
    path: "/api/me",
    method: ["GET", "OPTIONS"],
    handler: async (req, res) => {
      if (req.method === "OPTIONS") return handlePreflight(res);
      const session = requireSession(req, res);
      if (!session) return;
      const team = await getTeam(session.teamId);
      sendJson(res, 200, { teamId: session.teamId, userId: session.userId, teamName: team?.name ?? null });
    },
  },
  {
    path: "/api/team",
    method: ["GET", "OPTIONS"],
    handler: async (req, res) => {
      if (req.method === "OPTIONS") return handlePreflight(res);
      const session = requireSession(req, res);
      if (!session) return;
      const team = await getTeam(session.teamId);
      if (!team) return sendJson(res, 404, { error: "Team not found" });
      sendJson(res, 200, {
        id: team.id,
        name: team.name,
        installedAt: team.installedAt,
        safeAddress: team.safeAddress,
        tokenAddress: team.tokenAddress,
        botSignerAddress: getBotSignerAddress(),
        treasuryConfigured: Boolean(team.safeAddress && team.tokenAddress),
      });
    },
  },
  {
    path: "/api/payouts",
    method: ["GET", "OPTIONS"],
    handler: async (req, res) => {
      if (req.method === "OPTIONS") return handlePreflight(res);
      const session = requireSession(req, res);
      if (!session) return;
      const payouts = await listPayouts(session.teamId);
      sendJson(
        res,
        200,
        payouts.map((p) => ({
          id: p.id,
          requesterId: p.requesterId,
          recipientId: p.recipientId,
          status: p.status,
          safeTxHash: p.safeTxHash,
          txHash: p.txHash,
          createdAt: p.createdAt,
        })),
      );
    },
  },
  {
    path: "/api/payroll-runs",
    method: ["GET", "OPTIONS"],
    handler: async (req, res) => {
      if (req.method === "OPTIONS") return handlePreflight(res);
      const session = requireSession(req, res);
      if (!session) return;
      const runs = await listPayrollRuns(session.teamId);
      sendJson(
        res,
        200,
        runs.map((r) => ({
          id: r.id,
          requesterId: r.requesterId,
          status: r.status,
          safeTxHash: r.safeTxHash,
          txHash: r.txHash,
          recipientCount: r.items.length,
          createdAt: r.createdAt,
        })),
      );
    },
  },
];
