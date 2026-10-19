# ChainWitness

**A safety-gated x402 client that hires Scout or Sentinel and verifies USDG settlement on Robinhood Chain.**

ChainWitness discovers an agent's live offer, checks its HTTP 402 quote against the agent card, signs one capped EIP-3009 authorization only after exact operator confirmation, and independently verifies the resulting on-chain USDG transfer before reporting success.

## Demo video

[Watch the video and public X post](<https://x.com/uledjend/status/2111979061144629432>). The project source and independently verifiable on-chain receipt are linked below.

## Verified live result

**One real Scout call completed and its payment was verified on-chain.**

- Agent: Scout `grade_launches`
- Quote and transfer: **0.010000 USDG** (10,000 base units)
- Network: Robinhood Chain, chain ID **4663**
- Payment method: EIP-3009 `transferWithAuthorization`
- Receipt: [View on Blockscout](https://robinhoodchain.blockscout.com/tx/0x9bf2ef3529a35c3ee2c3e15fc548483e1b00bfa0a30231250153d6dec8f4fee9)
- Block: `92149556`
- Agent result: one launch graded by Scout; the response and live report were saved locally by ChainWitness.

The receipt shows a successful USDG transfer from the separate test wallet to Scout. The facilitator submitted the authorization transaction, so the payer did not need ETH for gas. The transaction hash and transfer were independently inspected on Robinhood Chain.

See [the proof record](docs/PAID_CALL_PROOF.md) for receipt fields and verification steps. The [reviewer walkthrough](docs/REVIEWER_WALKTHROUGH.md) explains the payment flow and includes a key-free verification command. A paid receipt proves settlement, not the accuracy or safety of Scout's research.

## Safety design

- **Quote binding:** validates the live Scout card, skill resource, pay-to address, token, network, amount and payment scheme before signing.
- **Exact-only payment:** requires the `exact` EIP-3009 scheme; it never falls back to a transaction-hash payment.
- **Human consent:** requires an interactive terminal and the exact quoted amount typed at the prompt.
- **Hard caps:** refuses quotes above 0.011 USDG and applies a 0.012 USDG rolling daily journal cap.
- **No blind retries:** if a request fails after signing, ChainWitness records an uncertain state and instructs the operator to inspect the journal and chain before any retry.
- **Independent receipt verification:** checks the chain ID, transaction status, USDG contract, payer, recipient and exact amount.
- **Sentinel route:** adds a separate `scan_contract` call with a required token address, exact price binding, a 0.020000 USDG per-call ceiling, a 0.020000 USDG daily journal cap and the same explicit confirmation gate. It refuses changed or non-`exact` quotes.

## Requirements

- Node.js 20.10 or newer
- A separate test wallet with enough USDG for the quoted amount
- No ETH is required in the payer wallet for this verified EIP-3009 route; the facilitator submits the transaction and pays gas

Never place a private key or recovery phrase in chat, source code, committed `.env` files, screenshots, or a bounty submission.

## Install and run read-only checks

Open PowerShell in the project folder:

```powershell
npm ci
npm test
npm run inspect
npm run inspect-sentinel -- --token 0xYOUR_TOKEN_ADDRESS
npm run exact-preflight
```

- `inspect` fetches Scout's live card and unpaid HTTP 402 quote.
- `inspect-sentinel` fetches Sentinel's `scan_contract` card and unpaid HTTP 402 quote for the supplied token.
- `exact-preflight` checks the Robinhood Chain ID, USDG EIP-712 domain separator and EIP-3009 facet.
- Both commands are read-only and do not need a private key or a funded wallet.

Check a public address without signing:

```powershell
npm run wallet -- --address 0xYOUR_PUBLIC_ADDRESS
```

## Optional live calls

The live call above already satisfies the one-call demonstration. Running this command again creates **another real payment**. Only do so intentionally, with a funded test wallet, a locally configured key, and the exact interactive confirmation:

```powershell
npm run scout-once -- --yes-pay-real-money
```

A separate Sentinel call is available with the same one-call approval gate and a strict 0.020000 USDG ceiling:

```powershell
npm run sentinel-once -- --token 0xYOUR_TOKEN_ADDRESS --yes-pay-real-money
```

The Sentinel quote must exactly match its advertised price and use the `exact` scheme. The token address is required. The live Sentinel payment has **not** been executed or verified yet; a new successful receipt is required before claiming it as a second live entry.

If a request fails after signing, inspect `out/payment-journal.json` and the chain before attempting another payment. Do not retry an unknown settlement.

The two-agent `live` command remains disabled.

## Verify a transaction without a key

Anyone can independently verify a USDG payment receipt without a private key:

```powershell
npm run verify-receipt -- --hash 0xTRANSACTION_HASH --from 0xPAYER_ADDRESS --to 0xSCOUT_PAYTO --amount-usdg 0.01
```

The command checks chain ID, receipt status and the matching USDG `Transfer` event, then prints a Blockscout link.

## Demo

See the [75-second safe recording script](docs/DEMO_SCRIPT.md) for a guided review using the existing transaction. It makes no payment and uses no private key.

The local fixture demo is also available:

```powershell
npm run demo
```

The demo is a clearly labeled simulation. It is useful for reviewing the report layout but is **not** a live payment and must not be submitted as transaction evidence.

## Bounty evidence checklist

The verified Scout call is entry one. The Sentinel route is a distinct second build path; it is not bounty-valid until it has its own successful paid-call receipt.

- [x] Public GitHub repository
- [x] Successful paid Scout call
- [x] Transaction hash independently verified on Robinhood Chain
- [x] Public demo post: [X video post](<https://x.com/uledjend/status/2111979061144629432>)
- [ ] Bounty-page submission

## References

- [a2a.family x402 docs](https://a2a.family/docs/)
- [a2a.family technical paper](https://a2a.family/docs/whitepaper/)
- [a2a.family bounty page](https://a2a.family/bounties/)
- [USDG EIP-3009 verification implementation](https://github.com/nirholas/robinhood-chain-x402)
- [Security model](docs/SECURITY.md)
- [What is real versus simulated](docs/REAL_VS_SIMULATED.md)
