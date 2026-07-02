import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { ConfidentialPayoutToken } from "../typechain-types";

describe("ConfidentialPayoutToken", function () {
  async function deployFixture() {
    const [owner, safe, alice, bob] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("ConfidentialPayoutToken");
    const token = (await factory.deploy(
      "Team Payout Token",
      "TPAY",
      "https://example.com/team-payout-token.json",
      owner.address,
    )) as unknown as ConfidentialPayoutToken;
    await token.waitForDeployment();
    return { token, owner, safe, alice, bob };
  }

  it("mints encrypted supply to the owner-designated treasury", async function () {
    const { token, owner, safe } = await deployFixture();
    const address = await token.getAddress();

    const input = fhevm.createEncryptedInput(address, owner.address);
    input.add64(1_000_000n);
    const encrypted = await input.encrypt();

    const tx = await token.connect(owner).mint(safe.address, encrypted.handles[0], encrypted.inputProof);
    await tx.wait();

    const balanceHandle = await token.confidentialBalanceOf(safe.address);
    const clearBalance = await fhevm.userDecryptEuint(FhevmType.euint64, balanceHandle, address, safe);
    expect(clearBalance).to.equal(1_000_000n);
  });

  it("rejects mint from a non-owner", async function () {
    const { token, alice, bob } = await deployFixture();
    const address = await token.getAddress();

    const input = fhevm.createEncryptedInput(address, alice.address);
    input.add64(500n);
    const encrypted = await input.encrypt();

    await expect(
      token.connect(alice).mint(bob.address, encrypted.handles[0], encrypted.inputProof),
    ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
  });

  it("moves an encrypted payout from the treasury to a recipient", async function () {
    const { token, owner, safe, alice } = await deployFixture();
    const address = await token.getAddress();

    const mintInput = fhevm.createEncryptedInput(address, owner.address);
    mintInput.add64(1_000n);
    const mintEncrypted = await mintInput.encrypt();
    await (await token.connect(owner).mint(safe.address, mintEncrypted.handles[0], mintEncrypted.inputProof)).wait();

    const transferInput = fhevm.createEncryptedInput(address, safe.address);
    transferInput.add64(150n);
    const transferEncrypted = await transferInput.encrypt();

    await (
      await token
        .connect(safe)
        ["confidentialTransfer(address,bytes32,bytes)"](
          alice.address,
          transferEncrypted.handles[0],
          transferEncrypted.inputProof,
        )
    ).wait();

    const aliceBalanceHandle = await token.confidentialBalanceOf(alice.address);
    const aliceBalance = await fhevm.userDecryptEuint(FhevmType.euint64, aliceBalanceHandle, address, alice);
    expect(aliceBalance).to.equal(150n);

    const safeBalanceHandle = await token.confidentialBalanceOf(safe.address);
    const safeBalance = await fhevm.userDecryptEuint(FhevmType.euint64, safeBalanceHandle, address, safe);
    expect(safeBalance).to.equal(850n);
  });

  it("leaves the balance unchanged on a self-transfer (OZ ERC7984._update nets sequentially, no double-credit)", async function () {
    // acl.md's Pattern 1 warns that a *hand-rolled* transfer that writes
    // _balances[from] then _balances[to] independently double-credits on
    // self-transfer (P1 in the skill's vulnerability catalog). The inherited
    // OpenZeppelin ERC7984._update avoids this not by reverting, but by
    // writing _balances[from] first and having the `to` branch read that
    // already-updated value - so a self-transfer nets to zero change. This
    // test pins that behavior; it must keep passing if the OZ dependency
    // is ever upgraded.
    const { token, owner, safe } = await deployFixture();
    const address = await token.getAddress();

    const mintInput = fhevm.createEncryptedInput(address, owner.address);
    mintInput.add64(100n);
    const mintEncrypted = await mintInput.encrypt();
    await (await token.connect(owner).mint(safe.address, mintEncrypted.handles[0], mintEncrypted.inputProof)).wait();

    const transferInput = fhevm.createEncryptedInput(address, safe.address);
    transferInput.add64(10n);
    const transferEncrypted = await transferInput.encrypt();

    await (
      await token
        .connect(safe)
        ["confidentialTransfer(address,bytes32,bytes)"](
          safe.address,
          transferEncrypted.handles[0],
          transferEncrypted.inputProof,
        )
    ).wait();

    const balanceHandle = await token.confidentialBalanceOf(safe.address);
    const balance = await fhevm.userDecryptEuint(FhevmType.euint64, balanceHandle, address, safe);
    expect(balance).to.equal(100n);
  });
});
