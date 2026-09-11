# @x402solana/cli

Node CLIs for SOLGPT / x402.life: one-shot SIWX login (`x402`) and the paper OODA loop (`ooda`).

Source: [https://github.com/Solizardking/solgpt---nl-trading-desk--5-](https://github.com/Solizardking/solgpt---nl-trading-desk--5-)

```bash
npx -p @x402solana/cli x402 --origin https://x402.life
npx -p @x402solana/cli ooda --ticks 8 --seed 42 --sleep 0

npx -p @x402solana/cli x402 --help
npx -p @x402solana/cli x402 authorize --origin https://x402.life --secret-key <base58>
X402_SECRET_KEY=... npx -p @x402solana/cli x402 --origin https://x402.life

npx -p @x402solana/cli ooda --help
```

`x402` prints JSON `{ ok, token, walletAddress, userId }` then the Bearer token.
`ooda` runs the paper loop and exits with that loop's `exitCode`.

Use the Bearer on `POST /mcp`. The desk WebMCP guide at `/webmcp` copies these same shipped commands. The CLI never silent-signs or spends; `ooda` is paper-only.
