# SolSnake

SolSnake has a free practice client, an online WebSocket game server, and an
Anchor escrow program. The dashboard currently embeds the free practice client.

## Wagering status

**Wagering is unaudited and must not be used with real funds. Mainnet is
explicitly disabled in the server.** `PAID_ENABLED` defaults to `false`; when
enabled for testing, the server requires the configured RPC to report Solana's
Devnet genesis hash. The escrow source still has a placeholder program ID and
must not be deployed as-is.

The Devnet check is a server-side safeguard, not an on-chain network lock. The
program is cluster-agnostic; deploying it to Mainnet would expose the same
wagering instructions. Do not deploy it there.

The current test configuration is:

- Five human players; no bots in paid matches.
- Entry tiers: 0.05, 0.1, 0.5, or 1 SOL (Devnet SOL only).
- Winner receives the pool less a fixed 0.5% fee (50 basis points).
- All five match wallets must sign the exact settlement transaction before
  the server can submit it. The on-chain escrow checks each signer against the
  deposited player list.
- The program locks the fee treasury to
  `DLbjcTvMHuvENT1336tdSRd9giHzJd5Uwo5WraqQ3k82`.
- Players can reclaim their own entry after the one-hour timeout if a match is
  not settled.

## Trust and audit requirements

The game simulation and its elimination decisions still run on the server.
Unanimous player approval prevents unilateral settlement to a different
participant, but it does not independently prove who was last alive: all
players must inspect the result and refuse to sign a false settlement. A
deterministic replay or independently verifiable game proof is still needed
to remove that trust assumption.

The program, server, client, deployment process, refund and timeout paths, and
match-result model all require independent security review and testing. Game
of chance/skill, age, licensing, and geographic restrictions also require
qualified legal review. Do not set up a mainnet deployment based on this
prototype.

## Free online server

The free multiplayer Worker serves the online client and WebSocket endpoint
from one Cloudflare hostname. From `solsnake/cloudflare`, run `npm ci`,
`npx wrangler login`, then `npm run deploy`. Wrangler creates the SQLite-backed
Durable Object on first deployment. No RPC key or wallet secret is needed.
Once deployed, set
`NEXT_PUBLIC_SOLSNAKE_SERVER_URL` in the Vercel project's Production
environment to the Worker URL and redeploy Vercel.
The Snake Arena page then embeds the online server; without that setting it
continues to show the practice game. Cloudflare's free plan has daily Durable
Object request and compute limits; the shared lobby can queue concurrent
players, but usage may be throttled if the account exceeds those limits.

For a local end-to-end check, run `npm run dev` in one terminal and
`npm run test:local` in another from `solsnake/cloudflare`.

```bash
cd server
npm install
npm start
```

Open `http://localhost:8080/online.html` in multiple browser tabs. The
dashboard practice game is available separately at `/games/snake`.

## Devnet-only wagering tests

Use the Solana Anchor toolchain and a dedicated Devnet server key. Never reuse
a production wallet or key. Keep `PAID_ENABLED=false` unless explicitly
testing the escrow flow on Devnet.

The server requires `CLUSTER=devnet`, a Devnet RPC endpoint, the deployed
program ID, a server keypair, and the fixed developer treasury in
`.env.example`. Startup checks the RPC's genesis hash before opening a paid
server. A Mainnet RPC is refused.

```bash
cd solsnake
yarn install
anchor build
anchor test
```

The program ID in `programs/solsnake_escrow/src/lib.rs` is a placeholder.
Deployment and ID synchronization are intentionally not documented as a
launch recipe; obtain an independent review before preparing any deployment.

## Tests

```bash
cd solsnake/server
npm test
```

`tests/solsnake.ts` requires a local Solana validator and Anchor workspace.
The WebSocket wagering flow and browser wallet flow also need integration
tests before audit sign-off.
