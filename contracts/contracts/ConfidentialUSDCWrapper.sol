/* SPDX-License-Identifier: MIT */
pragma solidity ^0.8.28;

import { ERC7984ERC20Wrapper } from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984ERC20Wrapper.sol";
import { ERC7984 } from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { IERC20 } from "@openzeppelin/contracts/interfaces/IERC20.sol";

/**
 * @title ConfidentialUSDCWrapper
 * @notice Wraps a real ERC20 (Circle's Sepolia USDC by default) into an ERC7984 confidential
 * token. Wrapping (`wrap`) is permissionless by design - anyone holding the underlying asset can
 * shield it - so unlike ConfidentialPayoutToken there is no owner-only mint here. The team's Safe
 * holds one real USDC balance; a payout either leaves as a plain transfer of the underlying
 * asset (public) or gets wrapped-and-sent as an encrypted confidentialTransfer (private) -
 * see bot/src/slack/payoutEngine.ts for how the two paths are built.
 */
contract ConfidentialUSDCWrapper is ERC7984ERC20Wrapper, ZamaEthereumConfig {
    constructor(
        IERC20 underlyingToken,
        string memory name_,
        string memory symbol_,
        string memory contractURI_
    ) ERC7984(name_, symbol_, contractURI_) ERC7984ERC20Wrapper(underlyingToken) {}
}
