/**
 * @file fheEncrypt.ts
 * @description Builds encrypted payout amounts (externalEuint64 handle + inputProof) for
 * ConfidentialPayoutToken calls, and decrypts euint64 balance handles for verification. Uses
 * the legacy @zama-fhe/relayer-sdk primitives (createInstance/createEncryptedInput/userDecrypt)
 * directly rather than the new high-level Token API, because the high-level API submits its own
 * transaction via a single EOA signer - here the amount must be embedded as raw calldata inside
 * a Safe multisig transaction instead, so only the encrypt/decrypt primitives are needed.
 */

import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";
import type { FhevmInstance } from "@zama-fhe/relayer-sdk/node";
import { ethers } from "ethers";

let instancePromise: Promise<FhevmInstance> | null = null;

function getInstance(): Promise<FhevmInstance> {
  if (!instancePromise) {
    const rpcUrl = process.env.RPC_URL;
    if (!rpcUrl) throw new Error("RPC_URL is not set");
    instancePromise = createInstance({ ...SepoliaConfig, network: rpcUrl });
  }
  return instancePromise;
}

export interface EncryptedAmount {
  handle: string;
  inputProof: string;
}

/**
 * Encrypts a payout amount for ConfidentialPayoutToken.mint / confidentialTransfer.
 *
 * @param tokenAddress Address of the ConfidentialPayoutToken.
 * @param callerAddress The address that will be msg.sender ON-CHAIN when this ciphertext is
 * consumed - NOT necessarily the bot's own key. When the calldata is embedded in a Safe
 * transaction, this MUST be the Safe's address, because Safe.execTransaction calls the target
 * from the Safe contract itself; the ZK input proof is bound to (contract, caller) and a mismatch
 * reverts FHE.fromExternal with an invalid-proof error.
 * @param amount Payout amount in the token's base unit (max 6 decimals per ERC-7984; euint64 range).
 */
export async function buildEncryptedAmount(
  tokenAddress: string,
  callerAddress: string,
  amount: bigint,
): Promise<EncryptedAmount> {
  if (amount <= 0n) throw new Error("amount must be positive");
  const instance = await getInstance();
  const input = instance.createEncryptedInput(tokenAddress, callerAddress);
  input.add64(amount);
  const { handles, inputProof } = await input.encrypt();
  return {
    handle: ethers.hexlify(handles[0]),
    inputProof: ethers.hexlify(inputProof),
  };
}

/**
 * Decrypts a euint64 handle on behalf of `wallet` via the EIP-712 user-decrypt flow. Used for
 * end-to-end verification (confirming a recipient's encrypted balance actually changed) - not
 * part of the payout path itself. `wallet` must already hold ACL access to `handle`
 * (FHE.allow(handle, wallet.address) must have been called on-chain), or the relayer rejects
 * the request.
 */
export async function decryptEuint64(tokenAddress: string, handle: string, wallet: ethers.Wallet): Promise<bigint> {
  const instance = await getInstance();
  const keypair = instance.generateKeypair();
  const startTimestamp = Math.floor(Date.now() / 1000);
  const durationDays = 1;

  const eip712 = instance.createEIP712(keypair.publicKey, [tokenAddress], startTimestamp, durationDays);
  const { EIP712Domain: _omit, ...typesWithoutDomain } = eip712.types;
  const signature = await wallet.signTypedData(
    eip712.domain,
    typesWithoutDomain as unknown as Record<string, Array<{ name: string; type: string }>>,
    eip712.message,
  );

  const results = await instance.userDecrypt(
    [{ handle, contractAddress: tokenAddress }],
    keypair.privateKey,
    keypair.publicKey,
    signature,
    [tokenAddress],
    wallet.address,
    startTimestamp,
    durationDays,
  );

  const value = results[handle as `0x${string}`];
  if (typeof value !== "bigint") {
    throw new Error(`Expected a bigint balance from userDecrypt, got ${typeof value}: ${String(value)}`);
  }
  return value;
}
