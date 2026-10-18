# Evidence: real versus simulated

## Verified live paid call

On 2026-10-18 at 23:12:01 UTC, ChainWitness completed one live paid call to a2a.family Scout:

- Scout skill: `grade_launches`
- Live quote: 10,000 base units = 0.010000 USDG
- Scheme: `exact` using EIP-3009 `transferWithAuthorization`
- Network: Robinhood Chain, chain ID 4663
- Scout response: one launch, `WEDGIE`, graded `D`
- Settlement: successful receipt at block 92149556
- Transaction: [view on Blockscout](https://robinhoodchain.blockscout.com/tx/0x9bf2ef3529a35c3ee2c3e15fc548483e1b00bfa0a30231250153d6dec8f4fee9)

The receipt independently decodes to a USDG `transferWithAuthorization` call and a 10,000-base-unit transfer from the test payer to Scout's pay-to address. ChainWitness verified the returned receipt before reporting success. See [PAID_CALL_PROOF.md](PAID_CALL_PROOF.md) for the full evidence record and a read-only reproduction command.

This is one live transaction, not a simulated fixture. It proves the payment path worked for this call; it does not prove Scout's response is accurate or that a future request will have the same result.

## Verified read-only integration

Before the paid call, read-only checks showed:

- Scout's Agent Card listed `grade_launches` at 0.01 USD.
- Scout's unpaid HTTP 402 response quoted 10,000 USDG base units with `scheme: exact` and the same pay-to address as its card.
- RPC reported chain ID 4663.
- USDG `DOMAIN_SEPARATOR()` matched the reconstructed EIP-712 domain for `Global Dollar`, version `1`.
- USDG `getFacet(transferWithAuthorization)` returned a nonzero facet address.

These checks established that the current quote and token configuration were consistent with EIP-3009. By themselves, they could not prove facilitator acceptance; the successful live receipt above provides that end-to-end evidence.

## Simulation

`npm run demo` creates a report from fixture data. It sends no network requests and makes no payments. Its report is labeled `SIMULATED` and is for checking presentation only; it is not bounty evidence.

## Bounty evidence

The repository is public, and the live payment transaction is linked above. The remaining participant task is to publish the demo post and submit its URL with the transaction hash on the bounty page.
