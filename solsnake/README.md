# SolSnake

SolSnake has a free practice client, an online WebSocket game server, and an
Anchor escrow program. The dashboard currently embeds the free practice client.

## Wagering status

**Mainnet is the intended launch network, but the game is not deployed or ready
for real-money play. Do not accept real SOL.** `PAID_ENABLED` defaults to
`false`; when enabled for testing, the server requires the configured RPC to
report Solana's Devnet genesis hash. The escrow source still has a placeholder
program ID and must not be deployed as-is.

The Devnet check is a server-side safeguard, not an on-chain network lock. The
program is cluster-agnostic; deploying it to Mainnet would expose the same
wagering instructions. Do not deploy it there.

The Next.js `/api/game` route (`../src/app/api/game/route.ts`) is not a paid
game backend: it keeps game state in process memory, does not collect an entry
fee when creating a game, and its payout action only reports amounts. Do not
use or advertise that route for wagering. A Mainnet client must use the
escrow program and verify the resulting on-chain state.

- Paid matches use five human players and no bots on a 32×32 grid. Each living
  player commits a signed cardinal move, then reveals it after all players have
  committed; the program resolves all revealed moves simultaneously. Reveals
  are bound to the match, round, player, direction, and a client-generated
  random salt.
- Snakes have a fixed three-cell body. Walls, self-collisions, head collisions,
  and collisions with another snake's body eliminate players. Reversing
  direction is rejected.
- The last surviving player receives the pool less a fixed 0.5% fee. The
  program resolves the game and transfers the payout; the server does not
  choose the winner.
- A no-survivor or 256-round draw lets each player reclaim their own entry
  immediately. A stalled match can be refunded after one hour.
- The free practice room plays against four bots. Paid five-player rooms are
  0.5, 1, or 10 SOL per player (Devnet SOL only while testing). The treasury
  is fixed to `DLbjcTvMHuvENT1336tdSRd9giHzJd5Uwo5WraqQ3k82`.

## Trust and audit requirements

Paid-game movement, collision resolution, elimination, and payout are handled
by the Solana program. The WebSocket server handles matchmaking and relays
on-chain state; it does not select moves or winners. Wallets sign each move
transaction directly.

The program, client, deployment process, refund and timeout paths, and game
rules still require independent security review and testing. Game-of-skill,
age, licensing, and geographic restrictions also require qualified legal
review. This implementation is not certified for real funds or mainnet.

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

Use the Solana Anchor toolchain and dedicated Devnet wallets. Never reuse a
production wallet or key. Keep `PAID_ENABLED=false` except during explicit
Devnet testing.

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

The program ID in `programs/solsnake_escrow/src/onchain.rs` is a placeholder.

## Mainnet launch gates

Mainnet wagering must remain disabled until all of these are complete:

1. Assign a unique program ID and synchronize the program, Anchor
   configuration, generated IDL, and client.
2. Pass local-validator integration tests for deposits, signed moves,
   settlement, draws, refunds, timeouts, retries, and failure cases.
3. Pass end-to-end Devnet tests with dedicated test wallets and verify every
   paid-game action against confirmed on-chain state. Remove the legacy
   `/api/game` route from any paid-game flow.
4. Complete an independent security review and obtain qualified legal review
   for the intended jurisdictions and game model.
5. Deploy the reviewed program to Mainnet, verify the deployed program and
   upgrade authority, and only then enable paid play after production
   verification.

The website being hosted on Vercel does not mean the game or escrow program is
deployed to Mainnet. Do not advertise Mainnet wagering as live before these
gates are met.

## Tests

```bash
cd solsnake/server
npm test
```

`tests/solsnake.ts` requires a local Solana validator and Anchor workspace.
The WebSocket matchmaking, browser wallet, multi-player round resolution,
draw refunds, and payout flows still need end-to-end testing before any
deployment review.
