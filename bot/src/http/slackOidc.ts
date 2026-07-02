/**
 * @file slackOidc.ts
 * @description "Sign in with Slack" via Slack's OpenID Connect endpoints - separate from the
 * bot's own OAuth install flow (Bolt's installer). This just establishes who is asking to view
 * the dashboard; it never grants any bot scopes.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: requireEnv("SLACK_CLIENT_ID"),
    scope: "openid profile email",
    redirect_uri: requireEnv("SLACK_OIDC_REDIRECT_URI"),
    state,
  });
  return `https://slack.com/openid/connect/authorize?${params.toString()}`;
}

export interface SlackUserInfo {
  teamId: string;
  teamName?: string;
  userId: string;
  name?: string;
  email?: string;
}

export async function exchangeCodeForUserInfo(code: string): Promise<SlackUserInfo> {
  const tokenRes = await fetch("https://slack.com/api/openid.connect.token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requireEnv("SLACK_CLIENT_ID"),
      client_secret: requireEnv("SLACK_CLIENT_SECRET"),
      grant_type: "authorization_code",
      code,
      redirect_uri: requireEnv("SLACK_OIDC_REDIRECT_URI"),
    }),
  });
  const tokenBody = (await tokenRes.json()) as { ok: boolean; access_token?: string; error?: string };
  if (!tokenBody.ok || !tokenBody.access_token) {
    throw new Error(`Slack OIDC token exchange failed: ${tokenBody.error ?? "unknown error"}`);
  }

  const userRes = await fetch("https://slack.com/api/openid.connect.userInfo", {
    headers: { authorization: `Bearer ${tokenBody.access_token}` },
  });
  const user = (await userRes.json()) as {
    ok: boolean;
    error?: string;
    sub?: string;
    name?: string;
    email?: string;
    "https://slack.com/team_id"?: string;
    "https://slack.com/team_name"?: string;
  };
  if (!user.ok || !user.sub || !user["https://slack.com/team_id"]) {
    throw new Error(`Slack OIDC userInfo failed: ${user.error ?? "unknown error"}`);
  }

  return {
    teamId: user["https://slack.com/team_id"],
    teamName: user["https://slack.com/team_name"],
    userId: user.sub,
    name: user.name,
    email: user.email,
  };
}
