# Solcurity — Free Solana Wallet Security Scanner

A production-ready, privacy-first web application that scans any public Solana wallet address for suspicious activity, risky token interactions, scam indicators, and other security risks.

**Live Demo:** [solcurity.app](https://solcurity.app) (deploy to your own domain)

---

## Features

- **Public address only** — Never requests seed phrases, private keys, or wallet passwords
- **Comprehensive analysis** — Wallet existence, SOL balance, token holdings, transaction history, program interactions
- **Token-2022 support** — Detects Token-2022 extensions (transfer fees, hooks, permanent delegate, etc.)
- **Threat intelligence** — Pluggable architecture with cited sources (Solana Program Library, curated datasets)
- **Transparent scoring** — 0–100 risk score with explainable findings (CRITICAL/HIGH/MEDIUM/LOW/INFO)
- **Evidence-based findings** — Every warning shows evidence, confidence level, and recommended action
- **Privacy-first** — No accounts, no tracking, no persistent storage of wallet addresses
- **Free to run** — Uses public Solana RPC; no paid API keys required
- **Rate limited & cached** — Protects RPC endpoints and improves response times
- **Mobile responsive** — Works on desktop, tablet, and mobile

---

## Architecture

```
src/
├── app/
│   ├── api/scan/route.ts          # POST /api/scan endpoint
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
│   │   └── threat-intelligence.ts # Threat intel sources & lookups
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
```

---

## Installation

```bash
# Clone the repository
git clone https://github.com/solcurity/solcurity.git
cd solcurity

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
| `SOLANARPCURL` | No | `https://api.mainnet-beta.solana.com` | Solana mainnet RPC endpoint |
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Public app URL (for CORS, etc.) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `10` | Max scans per IP per window |
| `RATE_LIMIT_WINDOW_SECONDS` | No | `60` | Rate limit window in seconds |
| `CACHE_TTL_SECONDS` | No | `300` | Scan result cache TTL |

### RPC Configuration

The scanner works with any Solana mainnet RPC endpoint. For production, consider:

- **Free tier:** `https://api.mainnet-beta.solana.com` (rate limited)
- **Helius:** `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY`
- **QuickNode:** `https://your-endpoint.quiknode.pro/YOUR_TOKEN/`
- **Triton:** `https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY`
- **Self-hosted:** Run your own validator with Geyser plugins

Set `SOLANARPCURL` in your environment to use a custom endpoint.

---

## Threat Intelligence Configuration

The threat intelligence layer is in `src/lib/threat-intel/threat-intelligence.ts`.

### Adding Sources

1. Add a new entry to `THREAT_INTEL_SOURCES` array with name, URL, and description
2. Add verified malicious addresses to `CURATED_MALICIOUS` array with:
   - `address`: The Solana address
   - `classification`: Human-readable label
   - `type`: `"malicious" | "scam" | "phishing" | "drainer" | "program"`
   - `confidence`: `"LOW" | "MEDIUM" | "HIGH"`
   - `reason`: Why this is flagged
   - `source`: Source name
   - `sourceUrl`: URL to the source report

**Important:** Never fabricate entries. Every entry must be verifiable from a public source.

### Source Attribution

Every scan result includes a `sources` array showing which sources were consulted and when they were last updated.

---

## Security Considerations

### What This Scanner Does NOT Do

- ❌ Request or store private keys / seed phrases
- ❌ Execute any blockchain transactions
- ❌ Connect to user wallets (no wallet adapter)
- ❌ Guarantee wallet safety
- ❌ Track users across sessions
- ❌ Send wallet addresses to third-party security APIs (MVP uses local datasets)

### What This Scanner Does

- ✅ Queries public Solana RPC for on-chain data
- ✅ Analyzes public transaction history
- ✅ Checks addresses against curated threat intelligence
- ✅ Returns structured risk assessment with evidence
- ✅ Caches results to reduce RPC load
- ✅ Rate limits to prevent abuse

### Threat Model

| Threat | Mitigation |
|--------|------------|
| RPC endpoint abuse | IP rate limiting + request caching |
| XSS via blockchain metadata | All user-facing data sanitized; no `dangerouslySetInnerHTML` |
| Private key leakage | Never requested; input validation rejects non-address input |
| False sense of security | Clear disclaimers; confidence levels on every finding |
| Threat intel poisoning | All entries require source citations; no auto-classification |

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

**Response (200):**
```json
{
  "address": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "network": "solana-mainnet",
  "score": 82,
  "riskLevel": "LOW",
  "summary": {
    "totalFindings": 3,
    "criticalCount": 0,
    "highCount": 1,
    "mediumCount": 2,
    "lowCount": 0,
    "infoCount": 0,
    "partialScan": false,
    "failedChecks": []
  },
  "wallet": {
    "address": "...",
    "exists": true,
    "solBalance": 12.5,
    "lamports": 12500000000,
    "tokenAccounts": 8,
    "nftAccounts": 2,
    "transactionCount": 142,
    "firstActivity": "2023-01-15T10:30:00.000Z",
    "lastActivity": "2026-01-10T14:22:00.000Z",
    "approximateAgeDays": 1090
  },
  "transactions": [...],
  "tokens": [...],
  "programs": [...],
  "findings": [...],
  "sources": [...],
  "scannedAt": "2026-01-15T10:30:00.000Z"
}
```

**Error Responses:**
- `400` — Invalid address format
- `429` — Rate limit exceeded
- `500` — Internal server error (RPC failure, etc.)

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
- Scan service error handling (RPC failure, partial scan)
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
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
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
| Limited threat intel | No paid feeds in MVP | Add sources to `threat-intelligence.ts` |
| No smart contract audit | Static analysis only | Use dedicated audit tools |
| RPC rate limits | Public endpoint constraints | Use dedicated RPC provider |
| Token metadata | Limited free metadata APIs | Shows "UNKNOWN" for unverified tokens |
| NFT detection | Requires indexing | Basic detection via token accounts only |

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