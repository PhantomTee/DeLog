/**
 * @file deploy.ts
 * @description Deploys ConfidentialPayoutToken and records address + ABI for the bot backend.
 * Initial owner is the deployer key; run transferOwnershipToSafe.ts immediately after to move
 * mint authority to the team Safe. Never leave the deployer key as owner in production use.
 */

import { ethers, network, artifacts, run } from "hardhat";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const CONTRACT_NAME = "ConfidentialPayoutToken";
const TOKEN_NAME = process.env.TOKEN_NAME || "Team Payout Token";
const TOKEN_SYMBOL = process.env.TOKEN_SYMBOL || "TPAY";
const TOKEN_URI = process.env.TOKEN_CONTRACT_URI || "https://example.com/team-payout-token.json";
const OUT_ROOT = resolve(__dirname, "..", "deployments");

async function main() {
  console.log(`[deploy] network=${network.name} chainId=${network.config.chainId}`);
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`[deploy] deployer=${deployer.address} balance=${ethers.formatEther(balance)} ETH`);
  if (balance === 0n && network.name !== "hardhat") {
    throw new Error("Deployer balance is 0; fund the account before deploying");
  }

  const factory = await ethers.getContractFactory(CONTRACT_NAME);
  const contract = await factory.deploy(TOKEN_NAME, TOKEN_SYMBOL, TOKEN_URI, deployer.address);
  const tx = contract.deploymentTransaction();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`[deploy] ${CONTRACT_NAME} -> ${address}`);
  console.log(`[deploy] owner=${deployer.address} (transfer to the Safe before use in production)`);

  const artifact = await artifacts.readArtifact(CONTRACT_NAME);
  const record = {
    contractName: CONTRACT_NAME,
    address,
    chainId: Number(network.config.chainId ?? 0),
    network: network.name,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    transactionHash: tx?.hash ?? null,
    constructorArgs: [TOKEN_NAME, TOKEN_SYMBOL, TOKEN_URI, deployer.address],
    abi: artifact.abi,
  };
  const outDir = join(OUT_ROOT, network.name);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${CONTRACT_NAME}.json`), JSON.stringify(record, null, 2));
  console.log(`[deploy] wrote ${outDir}/${CONTRACT_NAME}.json`);

  const etherscanKey = process.env.ETHERSCAN_API_KEY?.trim();
  if (network.name === "sepolia" && etherscanKey && etherscanKey !== "your_etherscan_api_key") {
    console.log(`[deploy] waiting 30s for Etherscan indexing before verify`);
    await new Promise((r) => setTimeout(r, 30_000));
    try {
      await run("verify:verify", {
        address,
        constructorArguments: [TOKEN_NAME, TOKEN_SYMBOL, TOKEN_URI, deployer.address],
      });
      console.log(`[deploy] verified on Etherscan`);
    } catch (err: unknown) {
      console.log(`[deploy] verify skipped: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
