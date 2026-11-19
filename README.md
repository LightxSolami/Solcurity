# Solcurity — Free Solana Wallet Security Scanner

A read-only web application that inspects public Solana account, token, and transaction data. Scans report unavailable checks explicitly; they do not guarantee wallet safety.

**Live Demo:** [solcurity.vercel.app](https://solcurity.vercel.app) (deploy to your own domain)

---

## Features

- **Public address only** — Never requests seed phrases, private keys, or wallet passwords
- **On-chain data** — Account state, SOL balance, parsed SPL/Token-2022 token accounts, recent transaction metadata, and observed program interactions
- **Fail-safe scan checks** — PASS, FAIL, UNKNOWN, or NOT_APPLICABLE; a score is withheld when data is unavailable
- **Separate confidence** — Scan confidence reflects check availability and is not the risk score
- **Threat intelligence** — Server-side Supabase records with evidence provenance, expiry, health reporting, pending community submissions, and manual moderation
- **Evidence-based findings** — Every warning shows evidence, confidence level, and recommended action
- **Privacy-conscious** — No accounts or scan-record storage; when Supabase screening is configured, target identifiers are sent to the server-side database for matching
- **Free to run** — Uses public Solana RPC; no paid API keys required
- **Rate limited & cached** — Protects RPC endpoints and improves response times
- **Mobile responsive** — Works on desktop, tablet, and mobile

---

## Architecture

```
src/
├── app/
│   ├── api/scan/route.ts          # POST /api/scan endpoint
│   ├── api/threat-intel/          # Public report and moderator APIs
│   ├── page.tsx                   # Homepage
│   ├── scan/page.tsx              # Scan results dashboard
│   ├── how-it-works/page.tsx      # Methodology documentation
│   ├── security/page.tsx          # Security & threat intel details
│   ├── privacy/page.tsx           # Privacy policy
│   └── about/page.tsx             # About page
├── components/
│   ├── WalletInput.tsx            # Address input with validation
│   ├── SecurityScore.tsx          # Score display with risk level
│   ├── WalletSummary.tsx          # Wallet stats cards
│   ├── FindingsList.tsx           # Expandable findings with evidence
│   ├── TokenExplorer.tsx          # Token holdings table
│   ├── TransactionExplorer.tsx    # Paginated transaction history
│   ├── ProgramInteractions.tsx    # Program interaction analysis
│   └── SecurityWarning.tsx        # Persistent security notice
├── lib/
│   ├── types.ts                   # TypeScript interfaces
│   ├── validators.ts              # Zod schemas for input validation
│   ├── solana-rpc.ts              # Solana RPC wrapper
│   ├── rate-limit.ts              # In-memory IP rate limiting
│   ├── cache.ts                   # LRU cache for scan results
│   ├── threat-intel/
│   │   ├── threat-intelligence.ts # Threat-intel screening entry point
│   │   └── supabase-repository.ts # Server-only database access
│   ├── analyzers/
│   │   ├── wallet-analyzer.ts     # Wallet existence, balance, age
│   │   ├── transaction-analyzer.ts# Transaction pattern analysis
│   │   ├── token-analyzer.ts      # SPL & Token-2022 analysis
│   │   └── program-analyzer.ts    # Program classification
│   └── scoring/
│       └── risk-engine.ts         # Score calculation & finding builder
├── services/
│   └── scan.service.ts            # Orchestrates full scan pipeline
└── __tests__/                     # Unit tests
supabase/migrations/               # Threat-intelligence schema and access controls
```

---

## Installation

```bash
# Clone the repository
git clone https://github.com/LightxSolami/Solcurity.git
cd Solcurity

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SOLANARPCURLS` | No | — | Comma- or whitespace-separated server-configured Solana RPC URLs; use Mainnet endpoints only for wallet scans |
| `SOLANARPCURL` | No | — | Legacy single custom RPC endpoint, tried before public Mainnet fallbacks |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public app URL (for CORS, etc.) |
| `NEXT_PUBLIC_PUMPFUN_TOKEN_URL` | No | — | Official Pump.fun coin URL (`https://pump.fun/coin/<mint>`) shown in the dashboard launch card |
| `RATE_LIMIT_MAX_REQUESTS` | No | `10` | Max scans per IP per window |
| `RATE_LIMIT_WINDOW_SECONDS` | No | `60` | Rate limit window in seconds |
| `CACHE_TTL_SECONDS` | No | `300` | Scan result cache TTL |
| `SUPABASE_URL` | No | — | Server-side Supabase project URL; required for live threat-intel storage |
| `SUPABASE_SERVICE_ROLE_KEY` | No | — | Server-only Supabase service-role key; never expose as `NEXT_PUBLIC_*` |
| `THREAT_INTEL_MODERATOR_TOKEN` | No | — | Server-only moderation credential; moderation routes remain unavailable until configured |

### RPC Configuration

Wallet scans are restricted to server-configured RPC endpoints and verify each endpoint's Mainnet genesis hash before use. Configure multiple endpoints to allow automatic failover. Requests have a timeout, retry with backoff, and skip recently failing endpoints.

Example: `SOLANARPCURLS=https://provider-a.example/rpc,https://provider-b.example/rpc`. Keep credentialed RPC URLs in server environment settings; do not expose them through `NEXT_PUBLIC_*` variables or client code. Public Mainnet fallbacks are used when configured endpoints fail.

### Supabase Threat Intelligence Setup

The Supabase integration is server-only. Add `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a strong `THREAT_INTEL_MODERATOR_TOKEN` to local `.env.local` and to the Vercel server environment. Do not use `NEXT_PUBLIC_` prefixes or commit real credentials. `.env.example` contains placeholders only.

Apply `supabase/migrations/202611180001_threat_intelligence.sql` to the Supabase project using its SQL editor or the Supabase CLI before enabling the database-backed dashboard or submissions. The migration creates the threat records, sources, reports, funding relationships, moderation audit, source health, and rate-limit structures. It seeds no threat records or sources. Until both credentials and migration are configured, threat lookups remain UNKNOWN and database-backed features must report unavailable, not empty/clean.

The project now requires Node.js 22 or newer for the installed Supabase SDK; configure the same runtime for local development and Vercel.

---

## Threat Intelligence Configuration

The scanner reads only active records from approved and enabled sources. An empty database, unmatched address, missing configuration, stale record, or database failure does not produce PASS. The current implementation does not provide authoritative negative-screening coverage, so threat-intelligence checks remain UNKNOWN unless that coverage is later implemented and verified.

Use `/threat-intel` to review active records, source health, and the explicit empty/unavailable state. Community reports are rate-limited, deduplicated and pending until a moderator reviews them. Approval requires a configured moderator token, review notes, an approved source, a manually selected status/confidence, and an expiry no more than 90 days away. Approving a report is a deliberate moderation action; submissions are never imported automatically.

To configure a source, an operator must independently verify its licensing/authorization basis and add it through the trusted server-side Supabase administration path. The current public application does not yet include a source-management interface. Do not insert unverified threat data or treat a source as authoritative for negative screening merely because it is configured.

The scanner uses a `ThreatIntelProviderAdapter` extension point. Supabase is the only implemented provider; Chainabuse and other external feeds are not integrated, and no provider currently supplies authoritative negative coverage.

### Source Attribution

Every scan result includes source links. `lastUpdated` is null when no trustworthy source-update timestamp is available.

---

## Security Considerations

### What This Scanner Does NOT Do

- ❌ Request or store private keys / seed phrases
- ❌ Execute any blockchain transactions
- ❌ Connect to user wallets (no wallet adapter)
- ❌ Guarantee wallet safety
- ❌ Track users across sessions
- ❌ Send scan addresses to third-party threat-intelligence feed APIs

### What This Scanner Does

- ✅ Queries public Solana RPC for on-chain data
- ✅ Analyzes public transaction history
- ✅ Reports per-check status, evidence-based findings, risk score when calculable, and separate scan confidence
- ✅ Uses observed balance deltas, parsed instructions, unique program IDs, and RPC block times where available
- ✅ Caches results to reduce RPC load
- ✅ Rate limits to prevent abuse

### Threat Model

| Threat | Mitigation |
|--------|------------|
| RPC endpoint abuse | IP rate limiting + request caching |
| XSS via blockchain metadata | All user-facing data sanitized; no `dangerouslySetInnerHTML` |
| Private key leakage | Never requested; input validation rejects non-address input |
| False sense of security | Clear disclaimers; confidence levels on every finding |
| Threat intel poisoning | Submissions remain pending; moderators must review evidence and select an approved source |

---

## API Documentation

### POST `/api/scan`

Scan a Solana wallet address.

**Request:**
```json
{
  "address": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
}
```

**Response (200):** Includes on-chain results, findings and sources, plus:
- `score`: number or `null` when any check is UNKNOWN
- `riskLevel`: LOW/MODERATE/HIGH/CRITICAL, UNKNOWN, or INCOMPLETE SCAN
- `scanConfidence`: percentage of applicable checks completed
- `checks`: per-check status (`PASS`, `FAIL`, `UNKNOWN`, `NOT_APPLICABLE`)
- `summary.checkCounts`: completed, failed, unavailable, and not-applicable counts
- Account values are nullable when they were not retrieved; no missing value is converted to zero

No threat records or sources are seeded. Until an approved source supplies an active match or a future authoritative negative-screening provider is implemented, the threat-intelligence check is UNKNOWN rather than clean.

**Error Responses:**
- `400` — Invalid address format
- `429` — Rate limit exceeded
- `500` — Unexpected server error
- `200` with UNKNOWN checks — Partial scan; risk score is null when any check is unavailable

### POST `/api/threat-intel/submissions`

Accepts a validated report with a Solana identifier, category, explanation, and HTTPS URL or transaction-signature evidence. Successful requests return `202` and remain pending. Duplicate reports return `409`; persistent rate limits return `429`; missing or unavailable storage returns `503` and does not report acceptance.

### GET/POST `/api/threat-intel/moderation`

Requires `Authorization: Bearer <THREAT_INTEL_MODERATOR_TOKEN>`. GET returns the pending queue and approved sources. POST accepts a moderator decision; approvals create a reviewed intelligence record atomically with the moderation audit action. Moderation is unavailable until a strong token is configured.

---

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

### Test Coverage

- Address validation (valid/invalid/edge cases)
- Risk score calculation (deterministic)
- Scan service error handling (RPC failure, partial responses, incomplete scan)
- RPC failover and Mainnet-only endpoint verification
- Transaction balance-delta parsing and unknown program classification
- Rate limiting logic
- Finding builder

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

Vercel automatically detects Next.js and configures build settings.

### Docker

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

Add `output: "standalone"` to `next.config.js` for standalone output.

### Manual Node.js

```bash
npm run build
npm start
```

Runs on port 3000 by default (configure with `PORT` env var).

---

## Limitations

| Limitation | Reason | Workaround |
|------------|--------|------------|
| No real-time monitoring | Point-in-time scan only | Re-scan periodically |
| No complete threat coverage | No authoritative negative-screening provider is configured; the database may be empty or partial | Add only authorized, reviewed, cited intelligence sources; unmatched addresses remain UNKNOWN |
| No smart contract audit | Program source code is not analyzed | Use a qualified auditor and dedicated analysis tools |
| RPC rate limits | Public endpoint constraints | Use dedicated RPC provider |
| Token metadata | Limited free metadata APIs | Shows "UNKNOWN" for unverified tokens |
| Bounded transaction history | The scanner loads a limited number of recent signatures and details | Use a dedicated archival/indexing service for full history |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with tests
4. Run `npm run lint && npm test`
5. Submit a pull request

### Priority Areas

- [ ] Expand threat intelligence sources with verifiable citations
- [ ] Improve Token-2022 extension detection (transfer hooks, confidential transfers)
- [ ] Add more sophisticated drainer pattern detection
- [ ] Implement WebSocket-based live updates
- [ ] Add export to PDF/JSON for reports
- [ ] Multi-language support

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Disclaimer

**This software is provided "as is" without warranty of any kind.** Solcurity is an automated risk assessment tool based on public blockchain data. It does not guarantee wallet safety, does not execute transactions, and should not be the sole basis for security decisions. Always verify findings independently and practice good operational security.

**Never enter your seed phrase or private key into any website.** Legitimate security tools never need your private keys to analyze public blockchain data.

---

## Acknowledgments

- [Solana Foundation](https://solana.com/) for the Solana blockchain
- [@solana/web3.js](https://github.com/solana-labs/solana-web3.js) team
- Security researchers who publish threat intelligence publicly
- The open-source community

---

**Built with ❤️ for the Solana ecosystem**