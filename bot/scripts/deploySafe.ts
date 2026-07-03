/**
 * @file deploySafe.ts
 * @description One-time script: deploys a 2-of-2 Safe on Sepolia owned by the bot's
 * signer address and the org-owner address, paid for by the (separate, disposable)
 * deployer key. Not part of the runtime app - run manually, once, per environment.
 */

import "dotenv/config";
import * as dotenv from "dotenv";
import { resolve } from "node:path";
import { ethers } from "ethers";
import Safe from "@safe-global/protocol-kit";

// Deployer key lives in contracts/.env, not bot/.env - load it explicitly.
const deployerEnv = dotenv.config({ path: resolve(__dirname, "..", "..", "contracts", ".env") }).parsed;

async function main() {
  const rpcUrl = process.env.RPC_URL;
  const botSignerKey = process.env.BOT_SAFE_SIGNER_PRIVATE_KEY;
  const orgOwnerKey = process.env.ORG_OWNER_PRIVATE_KEY;
  const deployerKey = deployerEnv?.PRIVATE_KEY;

  if (!rpcUrl) throw new Error("RPC_URL not set in bot/.env");
  if (!botSignerKey) throw new Error("BOT_SAFE_SIGNER_PRIVATE_KEY not set in bot/.env");
  if (!orgOwnerKey) throw new Error("ORG_OWNER_PRIVATE_KEY not set in bot/.env");
  if (!deployerKey) throw new Error("PRIVATE_KEY not set in contracts/.env");

  const botAddress = new ethers.Wallet(botSignerKey).address;
  const orgOwnerAddress = new ethers.Wallet(orgOwnerKey).address;
  const deployerAddress = new ethers.Wallet(deployerKey).address;

  console.log("[deploy-safe] bot signer:", botAddress);
  console.log("[deploy-safe] org owner:", orgOwnerAddress);
  console.log("[deploy-safe] gas payer (deployer):", deployerAddress);

  const safeSdk = await Safe.init({
    provider: rpcUrl,
    signer: deployerKey,
    predictedSafe: {
      safeAccountConfig: {
        owners: [botAddress, orgOwnerAddress],
        threshold: 2,
      },
    },
  });

  const predictedAddress = await safeSdk.getAddress();
  console.log("[deploy-safe] predicted address:", predictedAddress);

  const deploymentTx = await safeSdk.createSafeDeploymentTransaction();

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(deployerKey, provider);
  const txResponse = await wallet.sendTransaction({
    to: deploymentTx.to,
    value: BigInt(deploymentTx.value),
    data: deploymentTx.data,
  });
  console.log("[deploy-safe] deployment tx submitted:", txResponse.hash);
  const receipt = await txResponse.wait();
  console.log("[deploy-safe] confirmed in block:", receipt?.blockNumber);

  const code = await provider.getCode(predictedAddress);
  if (code === "0x") throw new Error("Safe deployment did not produce code at the predicted address");
  console.log("[deploy-safe] SAFE_ADDRESS=" + predictedAddress);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
