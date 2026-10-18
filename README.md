# ChainWitness

**An x402 client that pays specialist agents and independently verifies the on-chain receipt.**

ChainWitness is a stage-gated research bot for a2a.family on Robinhood Chain. It discovers Scout's live quote, validates the quote against the agent card, signs one capped USDG EIP-3009 authorization only after explicit confirmation, then checks that the facilitator's receipt corresponds to a successful USDG transfer on-chain.

## Current proof status

As of 2026-10-18, the read-only integration checks pass:

- Scout's live card advertises 0.01 USDG and its unpaid HTTP 402 quote matches.
- Robinhood Chain reports chain ID 4663.
- The USDG EIP-712 domain separator matches the locally reconstructed `Global Dollar`, version `1` domain.
- `transferWithAuthorization` resolves to a nonzero USDG facet.
- 18 local tests cover quote validation, caps, authorization formatting, retry prevention and receipt matching.

**No live paid call or transaction hash has been recorded yet.** Simulated reports and read-only preflight results do not satisfy the bounty's paid-call proof requirement.

## Requirements

- Node.js 20.10 or newer
- A fresh, separate EVM wallet for a later paid test; keep its key local
- USDG for the quoted amount (Scout currently quotes 0.01 USDG). The exact/EIP-3009 path lets the facilitator submit the transaction, so the caller does not need ETH for gas.

## Install and verify without paying

Open PowerShell in this project folder:

```powershell
npm ci
npm test
npm run inspect
npm run exact-preflight
```

`inspect` fetches the current Scout card and HTTP 402 quote. `exact-preflight` reads chain ID, USDG's domain separator and the EIP-3009 facet. Both are read-only; neither needs a key or wallet connection.

Check any public address without signing:

```powershell
npm run wallet -- --address 0xYOUR_PUBLIC_ADDRESS
```

## Later: one paid Scout call

Configure `ROBINHOOD_PRIVATE_KEY` only in the local PowerShell process after confirming the wallet is a fresh, separate test wallet and holds no more than the intended test amount. Never put a key or recovery phrase in chat, source code, `.env` committed to GitHub, screenshots or the submission.

The one-call command is deliberately gated:

```powershell
npm run scout-once -- --yes-pay-real-money
```

It refuses non-`exact` schemes, quotes above 0.011 USDG, insufficient balance, and noninteractive execution. It then asks the operator to type the exact amount before signing. The daily journal has a 0.012 USDG cap. If the request fails after signing, inspect `out/payment-journal.json` and the chain before attempting anything again; do not retry an unknown settlement.

The two-agent `live` command remains disabled until the one-call flow has been verified end to end.

## Verify a transaction without a key

After obtaining a transaction hash, anyone can verify the successful Robinhood Chain receipt and matching USDG `Transfer` event:

```powershell
npm run verify-receipt -- --hash 0xTRANSACTION_HASH --from 0xPAYER_ADDRESS --to 0xSCOUT_PAYTO --amount-usdg 0.01
```

This command is read-only and requires no private key. It checks chain ID, receipt status, token contract, payer, payee and amount, then prints a Blockscout link.

## Demo

```powershell
npm run demo
```

The demo is a clearly labeled simulation. It is useful for reviewing report layout but is **not** a live payment and must never be submitted as transaction evidence.

## Payment scheme notes

The latest read-only Scout inspection returned `scheme: exact`, and the latest `exact-preflight` confirmed the USDG EIP-712 domain and a nonzero `transferWithAuthorization` facet on chain 4663. Those facts show that the token can support the authorization format; they do **not** prove that a2a.family's facilitator accepts ChainWitness's signed payload.

The public a2a.family docs are internally inconsistent: the Pay with x402 section and whitepaper describe EIP-3009 `exact`, while another docs paragraph describes direct transfer plus `txHash`. Treat the live 402 challenge as authoritative for each call and stop if its requirements do not match the implementation. ChainWitness currently implements only `exact`; it must not silently fall back to `a2a-tx`.

## Bounty entry checklist

- [ ] Public GitHub repository
- [ ] One successful paid a2a.family call
- [ ] Transaction hash independently verified on Robinhood Chain
- [ ] Short demonstration showing the quote, consent gate, agent response and receipt
- [ ] Submission link and transaction hash entered on the bounty page

## References

- [a2a.family docs](https://a2a.family/docs/)
- [a2a.family technical paper](https://a2a.family/docs/whitepaper/)
- [Bounty page](https://a2a.family/bounties/)
- [USDG EIP-3009 verification implementation](https://github.com/nirholas/robinhood-chain-x402)
- [Security model](docs/SECURITY.md)
- [What is real versus simulated](docs/REAL_VS_SIMULATED.md)
