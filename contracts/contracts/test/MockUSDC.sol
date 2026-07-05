/* SPDX-License-Identifier: MIT */
pragma solidity ^0.8.28;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Test-only stand-in for Circle's real Sepolia USDC (0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238),
 * which does not exist on the local Hardhat network. Never deployed to Sepolia/mainnet.
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("USD Coin", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
