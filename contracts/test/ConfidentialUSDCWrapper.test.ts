import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import type { ConfidentialUSDCWrapper, MockUSDC } from "../typechain-types";

describe("ConfidentialUSDCWrapper", function () {
  async function deployFixture() {
    const [deployer, safe, alice] = await ethers.getSigners();

    const usdcFactory = await ethers.getContractFactory("MockUSDC");
    const usdc = (await usdcFactory.deploy()) as unknown as MockUSDC;
    await usdc.waitForDeployment();

    const wrapperFactory = await ethers.getContractFactory("ConfidentialUSDCWrapper");
    const wrapper = (await wrapperFactory.deploy(
      await usdc.getAddress(),
      "Confidential USDC",
      "cUSDC",
      "https://example.com/confidential-usdc.json",
    )) as unknown as ConfidentialUSDCWrapper;
    await wrapper.waitForDeployment();

    await (await usdc.mint(safe.address, 1_000_000n)).wait();

    return { usdc, wrapper, deployer, safe, alice };
  }

  it("wraps real USDC into a confidential balance for the treasury (a visible funding step)", async function () {
    const { usdc, wrapper, safe } = await deployFixture();
    const wrapperAddress = await wrapper.getAddress();

    await (await usdc.connect(safe).approve(wrapperAddress, 100_000n)).wait();
    await (await wrapper.connect(safe)["wrap(address,uint256)"](safe.address, 100_000n)).wait();

    expect(await usdc.balanceOf(safe.address)).to.equal(900_000n);
    expect(await usdc.balanceOf(wrapperAddress)).to.equal(100_000n);

    const balanceHandle = await wrapper.confidentialBalanceOf(safe.address);
    const clearBalance = await fhevm.userDecryptEuint(FhevmType.euint64, balanceHandle, wrapperAddress, safe);
    expect(clearBalance).to.equal(100_000n);
  });

  it("moves a fully encrypted payout from the treasury's wrapped balance to a recipient", async function () {
    const { usdc, wrapper, safe, alice } = await deployFixture();
    const wrapperAddress = await wrapper.getAddress();

    await (await usdc.connect(safe).approve(wrapperAddress, 100_000n)).wait();
    await (await wrapper.connect(safe)["wrap(address,uint256)"](safe.address, 100_000n)).wait();

    const transferInput = fhevm.createEncryptedInput(wrapperAddress, safe.address);
    transferInput.add64(15_000n);
    const transferEncrypted = await transferInput.encrypt();

    await (
      await wrapper
        .connect(safe)
        ["confidentialTransfer(address,bytes32,bytes)"](
          alice.address,
          transferEncrypted.handles[0],
          transferEncrypted.inputProof,
        )
    ).wait();

    // The recipient's balance is only visible via decryption - never from a public USDC.balanceOf
    // read, since alice never touches the real underlying token in the private path.
    const aliceBalanceHandle = await wrapper.confidentialBalanceOf(alice.address);
    const aliceBalance = await fhevm.userDecryptEuint(FhevmType.euint64, aliceBalanceHandle, wrapperAddress, alice);
    expect(aliceBalance).to.equal(15_000n);
    expect(await usdc.balanceOf(alice.address)).to.equal(0n);

    const safeBalanceHandle = await wrapper.confidentialBalanceOf(safe.address);
    const safeBalance = await fhevm.userDecryptEuint(FhevmType.euint64, safeBalanceHandle, wrapperAddress, safe);
    expect(safeBalance).to.equal(85_000n);
  });

  it("lets the public path skip the wrapper entirely - a plain, transparent USDC transfer", async function () {
    const { usdc, safe, alice } = await deployFixture();
    await (await usdc.connect(safe).transfer(alice.address, 42_000n)).wait();
    expect(await usdc.balanceOf(alice.address)).to.equal(42_000n);
  });
});
