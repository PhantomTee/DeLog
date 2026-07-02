# ConfidentialPayoutToken — Self-Review

Checked against `.claude/skills/fhevm-skill/review-modules/` before treating the
contract as deployable. `scripts/fhe-lint.js` also run: 0 issues.

## acl-completeness
- `mint`/`burn` call `FHE.fromExternal` then delegate to OZ `ERC7984._mint`/`_burn`,
  which already calls `FHE.allowThis` + `FHE.allow(holder)` on every stored balance
  branch (verified by reading `node_modules/@openzeppelin/confidential-contracts/.../ERC7984.sol:275-309`).
  The only value *we* add ACL for ourselves is the `minted`/`burned` return value,
  via `FHE.allowTransient(_, msg.sender)` — matches the skill's template exactly.
- No custom `confidentialTransfer` override — inherited implementation already
  grants ACL to both sender and recipient on every path. No gap found.

## confidentiality-boundary
- No custom `require`/`if` branches on encrypted conditions (only the plaintext
  `onlyOwner` check). No leak.
- No custom events; the inherited `ConfidentialTransfer` event only carries the
  opaque `transferred` handle, never a decrypted amount.
- No plaintext-amount allowance map (ERC-7984 operator map only stores a `uint48`
  expiry, not an amount — explicitly a non-finding per the review module).
- No `makePubliclyDecryptable` calls anywhere in this contract.

## type-operation-safety
- Correct base (`ZamaEthereumConfig`), correct import path, pragma `^0.8.28`
  (satisfies the `^0.8.27` floor for `@openzeppelin/confidential-contracts`).
- `FHE.fromExternal` used for all external/user-submitted ciphertexts — never
  `FHE.asEuint64` on external input. No wrong-name FHE calls, no `FHE.select`
  type mismatches, no `div`/`rem` at all.

## decryption-integrity / encrypted-state-flow / fhe-logic-invariant / solidity-security
- No public-decryption flow in this contract, so `decryption-integrity` has no
  attack surface here.
- No loops, no external token calls, no peripheral helper contracts — the
  `solidity-security` module's attack surface (fee-on-transfer, rebasing,
  unbounded loops, unvalidated helper returns) does not apply to this file.
- Self-transfer was tested directly (`test/ConfidentialPayoutToken.test.ts`):
  OZ's `_update` writes `_balances[from]` before reading `_balances[to]`, so a
  self-transfer nets to zero change rather than double-crediting (the P1 class
  bug the skill warns about only applies to hand-rolled transfer functions that
  write both sides independently — confirmed this contract doesn't have one).

## Residual risk carried forward (not a contract bug, an operational one)
- `mint` is `onlyOwner`. The deploy script sets the deployer key as initial
  owner; `scripts/transferOwnershipToSafe.ts` MUST run before any real funds
  are minted, or the deployer key alone can mint unlimited supply. Verify
  `owner() == SAFE_ADDRESS` on-chain before funding the treasury.
