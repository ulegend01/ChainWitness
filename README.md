# ChainWitness

**A safety-gated x402 client that hires Scout, pays once, and verifies the USDG settlement on Robinhood Chain.**

ChainWitness discovers Scout's live offer, checks its HTTP 402 quote against the agent card, signs one capped EIP-3009 authorization only after exact operator confirmation, and independently verifies the resulting on-chain USDG transfer before reporting success.

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

See [the proof record](docs/PAID_CALL_PROOF.md) for the receipt fields and verification procedure. A paid receipt proves settlement, not the accuracy or safety of Scout's research.

## Safety design

- **Quote binding:** validates the live Scout card, skill resource, pay-to address, token, network, amount and payment scheme before signing.
- **Exact-only payment:** requires the `exact` EIP-3009 scheme; it never falls back to a transaction-hash payment.
- **Human consent:** requires an interactive terminal and the exact quoted amount typed at the prompt.
- **Hard caps:** refuses quotes above 0.011 USDG and applies a 0.012 USDG rolling daily journal cap.
- **No blind retries:** if a request fails after signing, ChainWitness records an uncertain state and instructs the operator to inspect the journal and chain before any retry.
- **Independent receipt verification:** checks the chain ID, transaction status, USDG contract, payer, recipient and exact amount.

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
npm run exact-preflight
```

- `inspect` fetches Scout's live card and unpaid HTTP 402 quote.
- `exact-preflight` checks the Robinhood Chain ID, USDG EIP-712 domain separator and EIP-3009 facet.
- Both commands are read-only and do not need a private key or a funded wallet.

Check a public address without signing:

```powershell
npm run wallet -- --address 0xYOUR_PUBLIC_ADDRESS
```

## Optional: make another paid Scout call

The live call above already satisfies the one-call demonstration. Running this command again creates **another real payment**. Only do so intentionally, with a funded test wallet, a locally configured key, and the exact interactive confirmation:

```powershell
npm run scout-once -- --yes-pay-real-money
```

If the request fails after signing, inspect `out/payment-journal.json` and the chain before attempting another payment. Do not retry an unknown settlement.

The two-agent `live` command remains disabled.

## Verify a transaction without a key

Anyone can independently verify a USDG payment receipt without a private key:

```powershell
npm run verify-receipt -- --hash 0xTRANSACTION_HASH --from 0xPAYER_ADDRESS --to 0xSCOUT_PAYTO --amount-usdg 0.01
```

The command checks chain ID, receipt status and the matching USDG `Transfer` event, then prints a Blockscout link.

## Demo

```powershell
npm run demo
```

The demo is a clearly labeled simulation. It is useful for reviewing the report layout but is **not** a live payment and must not be submitted as transaction evidence.

## Bounty evidence checklist

- [x] Public GitHub repository
- [x] Successful paid Scout call
- [x] Transaction hash independently verified on Robinhood Chain
- [ ] Public demo post and bounty-page submission

## References

- [a2a.family x402 docs](https://a2a.family/docs/)
- [a2a.family technical paper](https://a2a.family/docs/whitepaper/)
- [a2a.family bounty page](https://a2a.family/bounties/)
- [USDG EIP-3009 verification implementation](https://github.com/nirholas/robinhood-chain-x402)
- [Security model](docs/SECURITY.md)
- [What is real versus simulated](docs/REAL_VS_SIMULATED.md)
