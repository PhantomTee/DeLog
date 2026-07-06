/**
 * @file jwt.ts
 * @description Dashboard session tokens (Bearer JWT, no server-side session storage) and a
 * short-lived signed OAuth `state` value for the custom "Sign in with Slack" OIDC flow (see
 * ../slackOidc.ts), avoiding the need for a cookie/session round trip during that redirect. This
 * intentionally reuses JWT_SECRET rather than SLACK_STATE_SECRET - the latter is a separate env
 * var consumed directly by Bolt's own built-in installer OAuth flow (the "Add to Slack" button,
 * configured as `stateSecret` in index.ts) for a *different* OAuth handshake. Two independent
 * OAuth flows, two independent secrets - neither is unused, they just don't share one.
 */

import jwt from "jsonwebtoken";

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET is not set");
  return value;
}

export interface DashboardSession {
  teamId: string;
  userId: string;
}

export function signSession(session: DashboardSession): string {
  return jwt.sign(session, secret(), { expiresIn: "7d" });
}

export function verifySession(token: string): DashboardSession | null {
  try {
    return jwt.verify(token, secret()) as DashboardSession;
  } catch {
    return null;
  }
}

export function signOAuthState(): string {
  return jwt.sign({}, secret(), { expiresIn: "5m" });
}

export function verifyOAuthState(state: string): boolean {
  try {
    jwt.verify(state, secret());
    return true;
  } catch {
    return false;
  }
}
