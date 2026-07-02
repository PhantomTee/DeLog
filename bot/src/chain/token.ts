/**
 * @file token.ts
 * @description Minimal ConfidentialPayoutToken ABI surface the bot needs, plus a shared
 * ethers.Interface for encoding Safe calldata.
 */

import { ethers } from "ethers";

export const CONFIDENTIAL_PAYOUT_TOKEN_ABI = [
  "function confidentialTransfer(address to, bytes32 encAmount, bytes inputProof) returns (bytes32)",
  "function confidentialBalanceOf(address account) view returns (bytes32)",
  "function owner() view returns (address)",
  "function mint(address to, bytes32 encAmount, bytes inputProof) returns (bytes32)",
];

export const tokenInterface = new ethers.Interface(CONFIDENTIAL_PAYOUT_TOKEN_ABI);

export function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) throw new Error("RPC_URL is not set");
  return new ethers.JsonRpcProvider(rpcUrl);
}

export function getReadOnlyToken(tokenAddress: string): ethers.Contract {
  return new ethers.Contract(tokenAddress, CONFIDENTIAL_PAYOUT_TOKEN_ABI, getProvider());
}
