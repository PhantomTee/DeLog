/**
 * @file teamConfig.ts
 * @description Shared helper every payout-moving command uses to load a team's treasury config,
 * with a consistent "not set up yet" message pointing at /setup-treasury.
 */

import { getTeam } from "../db/repository";

export interface TeamTreasury {
  safeAddress: string;
  tokenAddress: string;
}

export async function requireTeamTreasury(teamId: string): Promise<TeamTreasury | null> {
  const team = await getTeam(teamId);
  if (!team?.safeAddress || !team.tokenAddress) return null;
  return { safeAddress: team.safeAddress, tokenAddress: team.tokenAddress };
}

export const TREASURY_NOT_CONFIGURED_MESSAGE =
  "This workspace hasn't configured a treasury yet. An admin needs to run /setup-treasury <safeAddress> <tokenAddress> first.";
