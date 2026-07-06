# Zamance - 3 Minute Pitch Script

Read this like you're explaining it to a teammate, not reciting it. Cut anything that
doesn't sound like you. Timings assume ~150 wpm - adjust pacing to fit exactly 3:00.

---

### 0:00-0:20 - Hook

"Every team that pays people through Slack has the same problem: the moment you type
an amount into a channel or even a DM, it's sitting in plaintext forever - in Slack's
servers, in everyone's search history, in a screenshot someone takes by accident.
Zamance fixes that. It's a Slack bot that pays your team in real USDC on Ethereum,
and the amount can be fully encrypted end to end, using Zama's FHEVM."

### 0:20-0:50 - What it is

"Here's how it works. Your team connects a Gnosis Safe - a multisig wallet - and
Zamance becomes one signer on it, never the only one. So the bot can *propose* a
payout, but a human always has to co-sign before anything moves. Then, for the
actual transfer: you choose, per payout, whether it's public - a normal transparent
USDC transfer - or private, where the amount is encrypted using a confidential
ERC-7984 token that wraps real USDC. Same real money, your choice of visibility."

### 0:50-1:50 - Live demo (screen recording)

"Let me show you. [switch to screen recording]

In Slack, I run `/payout`, pick a teammate, an amount, and toggle it to Private.
That proposes a transaction to our Safe - notice nothing here, not even in my own
DM, ever shows a public channel message with the amount.

[Show Safe{Wallet} - a second owner signing]

A second Safe owner signs it here. Zamance's approval worker picks that up and
executes automatically.

[Show dashboard]

Here's the live dashboard - it shows status, timestamps, whether a payout was
public or private - but never the amount. That's not a UI choice, the backend
genuinely never stores it in plaintext.

[Show /balance page]

And here's the part I'm most proud of: this page lets *anyone* connect their own
wallet and decrypt their own confidential balance, right in the browser, using
Zama's relayer SDK - no Slack needed. You can try this yourself right now."

### 1:50-2:30 - Under the hood

"Under the hood: the confidential token is a real `ERC7984ERC20Wrapper` around
Circle's actual Sepolia USDC - so wrapping it into a private balance and paying out
of it is the same mechanic you'd use with real money, not a toy internal token.
It's deployed and verified on Sepolia Etherscan, built on `@fhevm/solidity` v0.11
and OpenZeppelin's confidential-contracts library. Every encrypted value has an ACL
- so only the right people can ever decrypt it - and the multisig means Zamance,
the bot, can never move funds by itself, ever."

### 2:30-3:00 - Close

"Zamance is fully open source, deployed and working right now on Sepolia - Slack
bot, smart contracts, and a live dashboard. If you run a team and you've ever
winced at typing a salary into Slack, this is what that should have looked like
from day one. Thanks for watching."

---

# X / Twitter Thread

**Tweet 1 (hook)**
Every Slack payroll bot has the same flaw: the amount is sitting in plaintext the
moment you type it.

Zamance fixes that - private team payouts on Slack, encrypted end-to-end with
@zama_fhe's FHEVM. Built for the Zama Developer Program.

🧵

**Tweet 2 (the mechanic)**
Every payout has a toggle: Public (a normal transparent USDC transfer) or Private
(a fully encrypted confidential transfer via an ERC-7984 wrapper around real
Sepolia USDC).

Same real money. Your choice of visibility, per payout.

**Tweet 3 (custody)**
Zamance never holds your funds alone. It's one signer on your team's Gnosis Safe
multisig - it can *propose* a payout, but a human always has to co-sign before
anything executes.

**Tweet 4 (the demo hook)**
You don't need to install anything to see the core mechanic: connect any wallet at
[zamance.vercel.app/balance] and decrypt your own confidential USDC balance, live,
via Zama's relayer SDK - entirely in your browser.

**Tweet 5 (tech stack)**
Built on:
- @fhevm/solidity v0.11 (ZamaEthereumConfig, ERC-7984)
- OpenZeppelin confidential-contracts
- Gnosis Safe (protocol-kit + api-kit)
- Slack Bolt (Socket Mode)
- Groq for "pay Sarah 500" natural-language payouts

**Tweet 6 (proof)**
Contracts deployed + verified on Sepolia:
- ConfidentialUSDCWrapper: [etherscan link]
- Wraps real Circle USDC: [etherscan link]

Full source, both contracts and the Slack backend: [GitHub link]

**Tweet 7 (close)**
If your team has ever winced at typing a salary into Slack - this is what that
should've looked like from day one. Live demo, source, and video walkthrough below.

[video]
