# Evidence: real versus simulated

## Verified live (read-only)

Read-only checks rerun 2026-10-18 against a2a.family and Robinhood Chain:

- Scout's Agent Card lists `grade_launches` at 0.01 USD.
- Scout's unpaid HTTP 402 response quotes 10,000 USDG base units with `scheme: exact` and the same pay-to address as its card.
- The public a2a.family docs conflict: one section describes EIP-3009 `exact`; another describes a direct transfer plus `txHash`. The live Scout 402 currently returns `exact`.
- RPC reports chain ID 4663.
- USDG `DOMAIN_SEPARATOR()` equals the reconstructed EIP-712 domain for `Global Dollar`, version `1`.
- USDG `getFacet(transferWithAuthorization)` returns a nonzero facet address.

These checks prove the current quote and token configuration are consistent with the EIP-3009 path. They do **not** prove that a signed authorization has been accepted or settled by the facilitator. See [SECURITY.md](SECURITY.md) for residual risks.

## Not yet verified

- No `X-PAYMENT` authorization has been submitted.
- No paid Scout response has been received.
- No settlement transaction hash or on-chain payment receipt exists for this project yet.
- The two-agent workflow is not enabled for live use.

## Simulation

`npm run demo` creates a report from fixture data. It sends no network requests and no payments. The report is labeled `SIMULATED`; it is for checking presentation only and is not bounty evidence.

## Required live proof

A valid entry still needs one real paid a2a.family call, the returned agent response, and a successful Robinhood Chain USDG transfer receipt. `npm run verify-receipt` checks the hash independently without a wallet key.
