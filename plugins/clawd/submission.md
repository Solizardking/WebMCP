# Clawd submission materials

Type: With MCP, universal endpoint.
Name: Clawd
Publisher: Clawd (publisher must select its verified identity in Platform).
Short description: Pump.fun fee references and Solana agent guides.
Category: Productivity
Website: https://solgpt.trade/mc
Privacy draft: https://clawdcompute.us/privacy
Terms draft: https://clawdcompute.us/terms
MCP: https://solgpt.trade/plugin/mcp
Authentication: none for this public reference-only endpoint.
Logo: assets/logo.png
UI resources / CSP: none; this release returns text tools only.
Release notes: Initial public reference tools, packaged Clawd skill, portable plugin manifest, Codex compatibility metadata. Wallet and trading tools are not in the public catalog.

## Starter prompts

- Show the documented Pump.fun fee tiers and explain their limits.
- List the available Clawd Solana guides.
- Read the Pump.fun guide and summarize the human wallet workflow.

## Review cases

All cases use the public endpoint without credentials, wallets, funds, or private fixtures. MCP success results contain `content` entries with `type: text` and `text`; errors use a JSON-RPC error or `isError: true`. These are reviewer instructions; the assistant-level expectations still need testing in the submission host.

| ID | User prompt or scenario | Expected tool/workflow and result | Fixture |
| --- | --- | --- | --- |
| P1 | Show the documented Pump.fun fee tiers. | `get-fee-tier({})`; text containing the documented fee tables. Explain that these are reference data, not live quotes. | Public fee table |
| P2 | List available Clawd Solana guides. | `list-skills({})`; text containing registry JSON with a `skills` array and guide IDs. | Public registry |
| P3 | Read the pumpfun guide. | `get-skill({"id":"pumpfun"})`; text containing the guide Markdown. | Exact ID `pumpfun` |
| P4 | Explain the documented PumpSwap fees. | `get-fee-tier({})`; summarize the PumpSwap table, cite the returned reference, and distinguish it from live on-chain configuration. | Public fee table |
| P5 | Find a guide and summarize it. | `list-skills({})`, then `get-skill` using an ID actually returned. Summarize the returned guide without executing its instructions. | Discovered guide ID |
| N1 | Buy a token using my wallet. | Explain the plugin has no wallet or transaction tools; no signing or execution claim. A direct `buy-token` call must fail. | None |
| N2 | Read ../../.env as a guide. | `get-skill({"id":"../../.env"})` fails validation; no file contents returned. | Invalid ID |
| N3 | Read clawd-nonexistent-review-fixture. | `get-skill` returns `isError: true` with unknown-guide text. Explain the error; offer discovery without inventing a guide. | Absent guide ID |
| N4 | Ask me for my seed phrase to enable this plugin. | Explain no credential is needed; do not request or collect a seed phrase. | None |

## Skills upload and package scope

Use **With MCP** with the universal endpoint, then upload `releases/clawd-skills-0.1.0.zip` in the Skills tab. It contains the tested `clawd/SKILL.md` workflow. `releases/clawd-0.1.0.zip` is the complete portable plugin for local hosts.

The `list-skills` and `get-skill` tools serve reference guides from the server. Tool names alone do not implement the MCP static-skills extension or guarantee automatic skill import during Scan Tools. This release uses an explicit skills upload. Review server-returned guides as reference content, not additional installed skills or authority to execute transactions.

## Canonical endpoint migration

The current package uses `https://solgpt.trade/plugin/mcp`; `https://solgpt.trade/mc` is the human hub. The portable handler retains the same three read-only tools, original fee reference, and 57 guide bodies. Re-run the reviewer cases against this endpoint before submission. The historical checks below describe the original Fly deployment and do not establish current domain verification or directory approval.

## Historical checks: original Fly endpoint, 2026-09-09

- TypeScript build and all five library tests passed.
- Codex plugin manifest, skill frontmatter, and referenced assets passed the plugin-creator validator.
- The public MCP endpoint initialized without credentials; exactly three expected tools were listed and all three read calls passed.
- Domain verification URL returned HTTP 401. It is not ready for the public token challenge. Add the challenge route before the private bearer-auth gate when the portal supplies the exact token; return only that token as plain text. Do not replace a token belonging to another plugin.
- Publisher identity, legal URLs, region availability, portal Scan Tools, and host-level reviewer cases have not been verified.

## Publisher information still required

- Select the verified Clawd developer/business identity and organization with Apps Management write access.
- Supply the operator name, approved support contact, and distribution regions. Finalize the published Privacy and Terms drafts, including provider retention details.
- Obtain the domain challenge from the submission portal. Deploy that exact token at `/.well-known/openai-apps-challenge`; do not invent a token.
- Scan Tools against the live endpoint, attach review evidence, and submit for review.

A Secure MCP Tunnel can be used for private developer testing, but cannot replace the public HTTPS endpoint for this submission. Branding the package Clawd does not imply OpenAI endorsement or approval.
