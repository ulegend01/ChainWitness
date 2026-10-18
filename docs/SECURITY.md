# Security model

ChainWitness handles untrusted quotes and agent responses while preparing a payment authorization. The implementation is a local CLI, not a hosted wallet service.

## Controls

- **Key boundary:** the signing key is read from the local process environment. It is never written to reports or the payment journal. Do not commit `.env` files or share recovery material.
- **Human approval:** live Scout mode requires an interactive terminal, an explicit command flag and a typed amount confirmation before signing.
- **Quote validation:** the client checks the Agent Card identity, skill route, USDG contract, chain, pay-to address, quoted amount and per-call cap before making an authorization.
- **Spend caps:** the first Scout request is capped at 0.011 USDG and the journal reserves against a 0.012 USDG rolling daily limit.
- **Replay limits:** each EIP-3009 authorization uses a random nonce and short validity window. The client never stores the signature.
- **Unknown outcomes:** if the HTTP request fails after signing, the journal records an unknown-settlement state and the client refuses a duplicate attempt. Check the chain and journal before taking any further action.
- **Receipt verification:** a response is accepted as bounty proof only when the returned transaction hash resolves to a successful Robinhood Chain receipt containing the expected USDG transfer event for the payer, payee and amount.
- **Research limits:** a valid payment proves settlement, not the accuracy or safety of the agent's research. Reports explicitly avoid treating a clean response as a safety verdict.

## Residual risks

- The signed authorization can be settled by the facilitator even if the HTTP response is lost. A timeout is not proof that no payment occurred.
- A live preflight checks token domain and facet registration; it does not prove facilitator behavior. Only an actual paid request can prove that end-to-end path.
- A successful receipt is Robinhood Chain sequencer confirmation. It is not the same as parent-chain finality.
- Scout and Sentinel are third-party research sources. Their output requires independent review.

## Local artifacts

`out/payment-journal.json` records attempt IDs, amounts, state transitions, nonces, transaction hashes and error messages. Keep the output directory private until reviewed; never publish private keys, signatures or environment dumps.
