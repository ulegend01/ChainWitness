# 75-second demo recording script

This walkthrough uses the existing verified transaction. It does not make a payment and does not need a wallet key.

## Before recording

- Start from the public repository page or a clean local clone.
- Close wallet extension popups and hide unrelated browser tabs.
- Ensure no terminal displays environment variables, key input, recovery phrases or `.env` contents.
- Use the read-only receipt verifier below. Do not run the paid-call command.

## Shot list and narration

### 0:00–0:08 — State the result

**Show:** Repository title and the “Verified live result” section of README.

**Say:** “This is ChainWitness, an x402 client that hired Scout once and independently checked the payment on Robinhood Chain.”

### 0:08–0:20 — Show the receipt

**Show:** Open the linked Blockscout transaction. Frame the successful status and USDG transfer.

**Say:** “The real call was exactly 0.010000 USDG. The receipt records the USDG authorization settlement to Scout.”

### 0:20–0:45 — Reproduce verification without secrets

**Show:** In a clean terminal, run:

```powershell
npm ci
npm run verify-receipt -- --hash 0x9bf2ef3529a35c3ee2c3e15fc548483e1b00bfa0a30231250153d6dec8f4fee9 --from 0x43dfaF755D818884D2D9D065255aA2458999fDcA --to 0x0a64498810C29C3Ac3b9557940b70A095dc745D9 --amount-usdg 0.01
```

**Say:** “Anyone can verify the receipt from public chain data. This command needs no private key and sends no transaction.”

### 0:45–1:03 — Explain the design

**Show:** The safety bullets in README or the Mermaid flow in [REVIEWER_WALKTHROUGH.md](REVIEWER_WALKTHROUGH.md).

**Say:** “ChainWitness binds the quote to the advertised offer, requires exact human approval before signing, and checks the chain receipt before it reports success. The facilitator paid gas, so the payer needed no ETH.”

### 1:03–1:15 — Close with evidence and limits

**Show:** Repository URL and the transaction link.

**Say:** “This proves one real x402 payment settled. It does not claim the agent's research is correct. The repo contains the code and a key-free verification command.”

## Post-production checklist

- Keep the terminal output readable; crop away unrelated personal information.
- Do not show a private key, recovery phrase, environment variables, wallet seed screens or local payment journal.
- Keep the transaction link visible in the post text so reviewers can inspect it directly.
- Label any `npm run demo` fixture as a simulation; it is separate from this live transaction.
