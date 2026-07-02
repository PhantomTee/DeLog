/* SPDX-License-Identifier: MIT */
pragma solidity ^0.8.28;

import { ERC7984 } from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { FHE, externalEuint64, euint64 } from "@fhevm/solidity/lib/FHE.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ConfidentialPayoutToken
 * @notice ERC-7984 confidential token used as the team payout treasury on FHEVM v0.11.
 * @dev Owner (the team's Gnosis Safe) mints encrypted supply to fund payroll; balances and
 * confidentialTransfer/confidentialTransferFrom amounts (inherited from ERC7984) stay encrypted
 * end-to-end. Recipient addresses remain visible on-chain (inherent to a public EVM); amounts
 * do not. Ownership must be transferred to the Safe immediately after deployment - see
 * scripts/transferOwnershipToSafe.ts.
 */
contract ConfidentialPayoutToken is ERC7984, ZamaEthereumConfig, Ownable {
    constructor(
        string memory name_,
        string memory symbol_,
        string memory contractURI_,
        address initialOwner
    ) ERC7984(name_, symbol_, contractURI_) Ownable(initialOwner) {}

    /**
     * @notice Mint encrypted payout-token supply to `to`. Owner-only (the Safe).
     * @dev Proof is verified by FHE.fromExternal before _mint. allowTransient (not allow) is
     * used so the grant lasts only for this tx - the caller only needs to read the return
     * value here, the recipient's stored balance ACL is handled inside ERC7984._mint.
     * @param to Recipient of the minted balance (typically the Safe treasury itself).
     * @param encAmount Externally encrypted euint64 amount.
     * @param inputProof ZK proof binding encAmount to this contract and the caller.
     * @return minted Encrypted amount actually credited (zero on overflow).
     */
    function mint(
        address to,
        externalEuint64 encAmount,
        bytes calldata inputProof
    ) external onlyOwner returns (euint64 minted) {
        euint64 amount = FHE.fromExternal(encAmount, inputProof);
        minted = _mint(to, amount);
        FHE.allowTransient(minted, msg.sender);
    }

    /**
     * @notice Burn encrypted payout-token supply from the caller (e.g. treasury cleanup).
     * @param encAmount Externally encrypted euint64 amount.
     * @param inputProof ZK proof binding encAmount to this contract and the caller.
     * @return burned Encrypted amount actually debited (zero if balance insufficient).
     */
    function burn(externalEuint64 encAmount, bytes calldata inputProof) external returns (euint64 burned) {
        euint64 amount = FHE.fromExternal(encAmount, inputProof);
        burned = _burn(msg.sender, amount);
        FHE.allowTransient(burned, msg.sender);
    }
}
