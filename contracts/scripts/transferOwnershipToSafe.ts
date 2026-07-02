/**
 * @file transferOwnershipToSafe.ts
 * @description One-time step run immediately after deploy: transfers ConfidentialPayoutToken
 * ownership (mint authority) from the deployer key to the team Safe. After this runs, the
 * deployer key has no further power over the token - only the Safe (2-of-N) can mint.
 */

import { ethers, network } from "hardhat";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const CONTRACT_NAME = "ConfidentialPayoutToken";

async function main() {
  const safeAddress = process.env.SAFE_ADDRESS;
  if (!safeAddress || !ethers.isAddress(safeAddress)) {
    throw new Error("Set SAFE_ADDRESS in .env to a valid Sepolia Safe address before running this script");
  }

  const deploymentPath = resolve(__dirname, "..", "deployments", network.name, `${CONTRACT_NAME}.json`);
  const deployment = JSON.parse(readFileSync(deploymentPath, "utf8"));
  const contract = await ethers.getContractAt(CONTRACT_NAME, deployment.address);

  const currentOwner = await contract.owner();
  console.log(`[transfer-ownership] ${CONTRACT_NAME} @ ${deployment.address}`);
  console.log(`[transfer-ownership] current owner=${currentOwner}`);
  console.log(`[transfer-ownership] transferring to Safe=${safeAddress}`);

  const tx = await contract.transferOwnership(safeAddress);
  await tx.wait();

  const newOwner = await contract.owner();
  if (newOwner.toLowerCase() !== safeAddress.toLowerCase()) {
    throw new Error(`Ownership transfer did not take effect: owner is still ${newOwner}`);
  }
  console.log(`[transfer-ownership] done. New owner=${newOwner}. tx=${tx.hash}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
