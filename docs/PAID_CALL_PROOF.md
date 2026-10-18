# Verified paid call: Scout

This record documents ChainWitness's one-call live x402 payment for the a2a.family bounty.

## Result

| Field | Verified value |
|---|---|
| Agent | Scout |
| Skill | `grade_launches` |
| Network | Robinhood Chain, chain ID `4663` |
| Asset | USDG, contract `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` |
| Amount | `10000` base units = `0.010000 USDG` |
| Payment scheme | EIP-3009 `exact`, `transferWithAuthorization` |
| Recipient | `0x0a64498810C29C3Ac3b9557940b70A095dc745D9` (Scout) |
| Transaction | [`0x9bf2ef3529a35c3ee2c3e15fc548483e1b00bfa0a30231250153d6dec8f4fee9`](https://robinhoodchain.blockscout.com/tx/0x9bf2ef3529a35c3ee2c3e15fc548483e1b00bfa0a30231250153d6dec8f4fee9) |
| Block | `92149556` |
| Chain timestamp | `2026-10-18 23:12:01 UTC` |
| Receipt | Successful |

## Independent receipt inspection

The Robinhood Chain receipt shows:

- The USDG contract executed `transferWithAuthorization`.
- The signed authorization payer was the separate test wallet.
- The token transfer moved exactly 10,000 base units from that wallet to Scout's pay-to address.
- The transaction was successful; the outer transaction was submitted by Scout's facilitator address, which paid the chain gas.

ChainWitness also checked the response receipt against the chain receipt and matching USDG transfer before printing `REAL SETTLEMENT VERIFIED`.

## Agent response

Scout returned one launch, `WEDGIE`, with grade `D`. This is the agent's response, not an independent token-safety verdict. A paid receipt proves settlement; it does not prove the quality of the agent's research.

## Reproduce the read-only receipt check

From a local clone, this verifies the transaction without a private key:

```powershell
npm run verify-receipt -- --hash 0x9bf2ef3529a35c3ee2c3e15fc548483e1b00bfa0a30231250153d6dec8f4fee9 --from 0x43dfaF755D818884D2D9D065255aA2458999fDcA --to 0x0a64498810C29C3Ac3b9557940b70A095dc745D9 --amount-usdg 0.01
```

The paid call is one-use evidence. Running `npm run scout-once -- --yes-pay-real-money` again creates a new real payment and is not needed to reproduce this receipt check.
