export const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL ?? "http://localhost:3001";
export const SLACK_INSTALL_URL = `${BOT_API_URL}/slack/install`;
export const SLACK_LOGIN_URL = `${BOT_API_URL}/auth/slack/login`;
