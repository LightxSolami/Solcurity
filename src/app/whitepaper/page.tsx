import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Whitepaper | Solcurity",
  description: "Solcurity - Automated Solana Wallet Security Assessment. Technical whitepaper and architecture overview.",
};

export default function WhitepaperPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <header className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Solcurity Whitepaper</h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto">
          Automated Solana Wallet Security Assessment Platform — Technical Architecture & Methodology
        </p>
        <div className="mt-6 flex items-center justify-center gap-4 text-white/50 text-sm">
          <span>Version 1.0</span>
          <span>•</span>
          <span>October 2024</span>
          <span>•</span>
          <Link href="https://github.com/LightxSolami/Solcurity" target="_blank" rel="noopener noreferrer" className="hover:text-white">
            GitHub
          </Link>
        </div>
      </header>

      <nav className="mb-12 p-4 bg-solana-card/50 border border-white/10 rounded-xl">
        <h2 className="text-lg font-semibold text-white mb-3">Table of Contents</h2>
        <ul className="space-y-1 text-white/60 text-sm">
          <li><a href="#abstract" className="hover:text-white">1. Abstract</a></li>
          <li><a href="#problem" className="hover:text-white">2. Problem Statement</a></li>
          <li><a href="#solution" className="hover:text-white">3. Solution Overview</a></li>
          <li><a href="#architecture" className="hover:text-white">4. Technical Architecture</a></li>
          <li><a href="#scanning" className="hover:text-white">5. Scanning Pipeline</a></li>
          <li><a href="#threat-intel" className="hover:text-white">6. Threat Intelligence</a></li>
          <li><a href="#risk-engine" className="hover:text-white">7. Risk Scoring Engine</a></li>
          <li><a href="#svm-explorer" className="hover:text-white">8. SVM Explorer</a></li>
          <li><a href="#tools" className="hover:text-white">9. Developer Tools</a></li>
          <li><a href="#security" className="hover:text-white">10. Security & Privacy</a></li>
          <li><a href="#roadmap" className="hover:text-white">11. Roadmap</a></li>
        </ul>
      </nav>

      <section id="abstract" className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">1. Abstract</h2>
        <div className="prose prose-invert max-w-none">
          <p className="text-white/70 leading-relaxed">
            Solcurity is an open-source, read-only tool for inspecting public Solana account, token, and recent transaction data.
            It reports the status and evidence of the checks it can perform. The platform consists of a wallet scanner,
            an SVM (Solana Virtual Machine) explorer, and a suite of developer tools.
          </p>
          <p className="text-white/70 leading-relaxed mt-4">
            Solcurity is not a substitute for a security audit and does not analyze program source code or detect
            smart-contract vulnerabilities. Authority state may be reported as a risk indicator, but it does not prove
            malicious activity. A numeric risk score is returned only when all applicable checks are available; scan
            confidence is reported separately.
          </p>
        </div>
      </section>

      <section id="problem" className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">2. Problem Statement</h2>
        <div className="prose prose-invert max-w-none">
          <p className="text-white/70 leading-relaxed">
            The Solana ecosystem processes thousands of transactions per second with billions in TVL. However, 
            users lack accessible tools to assess the security posture of wallets they interact with. Key problems include:
          </p>
          <ul className="list-disc list-inside text-white/70 space-y-2 mt-4">
            <li><strong>Wallet Drainers:</strong> Malicious contracts that empty wallets in a single transaction</li>
            <li><strong>Authority Abuse:</strong> Tokens with active mint/freeze authorities that can rug holders</li>
            <li><strong>Phishing & Impersonation:</strong> Lookalike addresses and fake token mints</li>
            <li><strong>Program Vulnerabilities:</strong> Unaudited or exploitable smart contracts</li>
            <li><strong>Information Asymmetry:</strong> Technical barrier to reading transaction logs and program data</li>
          </ul>
          <p className="text-white/70 leading-relaxed mt-4">
            Existing solutions are either manual (audit firms), centralized (closed-source scanners), or require 
            deep technical expertise to interpret raw blockchain data.
          </p>
        </div>
      </section>

      <section id="solution" className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">3. Solution Overview</h2>
        <div className="prose prose-invert max-w-none">
          <p className="text-white/70 leading-relaxed">
            Solcurity addresses these problems through automated, transparent, and user-friendly security analysis:
          </p>
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <div className="bg-solana-card border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-solana-purple/20 flex items-center justify-center text-solana-blue">
                  1
                </span>
                Wallet Scanner
              </h3>
              <p className="text-white/60">Inspect public account and bounded recent transaction data with explicit check status</p>
            </div>
            <div className="bg-solana-card border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-solana-purple/20 flex items-center justify-center text-solana-blue">
                  2
                </span>
                SVM Explorer
              </h3>
              <p className="text-white/60">Inspect selected SVM network data; optional AI summarizes retrieved logs and is not a code audit</p>
            </div>
            <div className="bg-solana-card border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-solana-purple/20 flex items-center justify-center text-solana-blue">
                  3
                </span>
                Developer Tools
              </h3>
              <p className="text-white/60">Address validator, RPC tester, token finder, transaction decoder</p>
            </div>
          </div>
        </div>
      </section>

      <section id="architecture" className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">4. Technical Architecture</h2>
        <div className="prose prose-invert max-w-none">
          <h3 className="text-xl font-semibold text-white mb-3">Stack</h3>
          <ul className="list-disc list-inside text-white/70 space-y-2">
            <li><strong>Framework:</strong> Next.js 14 (App Router, Server Components)</li>
            <li><strong>Language:</strong> TypeScript (strict mode)</li>
            <li><strong>Styling:</strong> Tailwind CSS (custom Solana theme)</li>
            <li><strong>Blockchain:</strong> @solana/web3.js v1.95, @solana/spl-token</li>
            <li><strong>AI:</strong> Groq SDK with qwen/qwen3.8-27b (free tier)</li>
            <li><strong>Validation:</strong> Zod schemas</li>
            <li><strong>Caching:</strong> In-memory LRU with TTL</li>
            <li><strong>Rate Limiting:</strong> Token bucket per IP</li>
            <li><strong>Testing:</strong> Jest + React Testing Library</li>
          </ul>

          <h3 className="text-xl font-semibold text-white mb-3 mt-8">RPC Endpoint Strategy</h3>
          <p className="text-white/70 leading-relaxed">
            Wallet scans use server-configured endpoints (`SOLANARPCURLS`, with legacy `SOLANARPCURL` support) and public Mainnet fallbacks.
            Endpoints are verified against the Mainnet genesis hash. Requests use a timeout, retry with exponential backoff, and endpoint cooldown;
            failures are surfaced as unavailable checks rather than empty successful results. Client-supplied endpoints are not accepted by wallet scans.
          </p>
        </div>
      </section>

      <section id="scanning" className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">5. Scanning Pipeline</h2>
        <div className="prose prose-invert max-w-none">
          <p className="text-white/70 leading-relaxed">
            The scan process runs independent data checks with Mainnet RPC failover:
          </p>
          <ol className="list-decimal list-inside text-white/70 space-y-4 mt-4">
            <li>
              <strong>Wallet Analysis</strong> — Account state, balance, and bounded recent signature history; unavailable values remain null
            </li>
            <li>
              <strong>Transaction Analysis</strong> — Retrieved transactions analyzed using actual balance changes, parsed instructions, and confirmed block times where present
            </li>
            <li>
              <strong>Token Analysis</strong> — SPL & Token-2022 accounts with mint/freeze authority detection, UI amount calculation
            </li>
            <li>
              <strong>Program Analysis</strong> — Unique program IDs observed in retrieved transaction metadata, matched against a local identifier registry
            </li>
            <li>
              <strong>Threat Intelligence</strong> — Server-side lookup against active, unexpired records from approved sources; no-match and unavailable results remain UNKNOWN absent authoritative negative coverage
            </li>
            <li>
              <strong>Risk Scoring</strong> — Findings weighted by severity and confidence. UNKNOWN is never PASS; the score is withheld when any applicable check is unavailable
            </li>
          </ol>
        </div>
      </section>

      <section id="threat-intel" className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">6. Threat Intelligence</h2>
        <div className="prose prose-invert max-w-none">
          <p className="text-white/70 leading-relaxed">
            The application has a local threat-intelligence data structure that supports cited entries. Its malicious-address list is currently empty:
          </p>
          <ul className="list-disc list-inside text-white/70 space-y-2 mt-4">
            <li><strong>Current entries:</strong> None; unknown addresses are not classified as malicious</li>
            <li><strong>Data freshness:</strong> No update timestamp is claimed when a trustworthy timestamp is unavailable</li>
            <li><strong>Program registry:</strong> Known identifiers are informational and are not a threat feed or safety endorsement</li>
          </ul>
          <p className="text-white/70 leading-relaxed mt-4">
            Because the malicious-address list is empty, the threat-intelligence check is UNKNOWN and a clean numeric score is withheld.
          </p>
        </div>
      </section>

      <section id="risk-engine" className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">7. Risk Scoring Engine</h2>
        <div className="prose prose-invert max-w-none">
          <p className="text-white/70 leading-relaxed">
            Findings are weighted by severity and confidence. The score starts at 100 and deductions are applied; higher scores indicate fewer detected risks. The score is null if any applicable check is UNKNOWN, and scan confidence is calculated separately from the share of applicable checks completed.
          </p>
          <table className="w-full border-collapse mt-4">
            <thead>
              <tr className="border-b border-white/20">
                <th className="text-left pb-2 text-white/50">Severity</th>
                <th className="text-left pb-2 text-white/50">Weight</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/10"><td className="py-2 text-white">CRITICAL</td><td className="py-2 text-white">25</td></tr>
              <tr className="border-b border-white/10"><td className="py-2 text-white">HIGH</td><td className="py-2 text-white">15</td></tr>
              <tr className="border-b border-white/10"><td className="py-2 text-white">MEDIUM</td><td className="py-2 text-white">8</td></tr>
              <tr className="border-b border-white/10"><td className="py-2 text-white">LOW</td><td className="py-2 text-white">3</td></tr>
              <tr className="border-b border-white/10"><td className="py-2 text-white">INFO</td><td className="py-2 text-white">1</td></tr>
            </tbody>
          </table>
          <div className="mt-4 grid grid-cols-4 gap-4">
            <div className="bg-solana-green/20 border border-solana-green/30 rounded-xl p-4 text-center">
              <p className="text-solana-green font-bold text-2xl">0-20</p>
              <p className="text-white/60 text-sm">LOW</p>
            </div>
            <div className="bg-solana-yellow/20 border border-solana-yellow/30 rounded-xl p-4 text-center">
              <p className="text-solana-yellow font-bold text-2xl">21-50</p>
              <p className="text-white/60 text-sm">MODERATE</p>
            </div>
            <div className="bg-risk-moderate/20 border border-risk-moderate/30 rounded-xl p-4 text-center">
              <p className="text-risk-moderate font-bold text-2xl">51-80</p>
              <p className="text-white/60 text-sm">HIGH</p>
            </div>
            <div className="bg-risk-critical/20 border border-risk-critical/30 rounded-xl p-4 text-center">
              <p className="text-risk-critical font-bold text-2xl">81-100</p>
              <p className="text-white/60 text-sm">CRITICAL</p>
            </div>
          </div>
        </div>
      </section>

      <section id="svm-explorer" className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">8. SVM Explorer</h2>
        <div className="prose prose-invert max-w-none">
          <p className="text-white/70 leading-relaxed">
            The SVM Explorer provides a local development environment interface for testing and debugging Solana programs:
          </p>
          <ul className="list-disc list-inside text-white/70 space-y-2 mt-4">
            <li><strong>Account Inspection:</strong> Balance, owner, type, rent exemption, data size</li>
            <li><strong>Token Holdings:</strong> SPL & Token-2022 with parsed balances</li>
            <li><strong>Transaction History:</strong> Parsed logs, fees, success status</li>
            <li><strong>Airdrop:</strong> SOL funding on local/devnet/testnet</li>
            <li><strong>AI Log Summary:</strong> Optional summary of retrieved transaction execution logs</li>
            <li><strong>Account Analysis:</strong> Optional AI summary of retrieved account, token, transaction, or log data</li>
            <li><strong>Program Accounts:</strong> All accounts owned by a program</li>
            <li><strong>Epoch Info:</strong> Current epoch, slot, transaction count, block height</li>
          </ul>
          <p className="text-white/70 leading-relaxed mt-4">
            AI output summarizes supplied data only; it does not inspect program source code, perform a smart-contract audit, or establish that a program is safe or vulnerable.
          </p>
          <p className="text-white/70 leading-relaxed mt-4">
            Available network targets depend on the configured SVM Explorer network selector. AI output summarizes retrieved data only and is not a security audit.
          </p>
        </div>
      </section>

      <section id="tools" className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">9. Developer Tools</h2>
        <div className="prose prose-invert max-w-none">
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="bg-solana-card border border-white/10 rounded-xl p-4">
              <h3 className="font-bold text-white mb-1">Address Validator</h3>
              <p className="text-white/60 text-sm">Validate & decode Solana public keys</p>
            </div>
            <div className="bg-solana-card border border-white/10 rounded-xl p-4">
              <h3 className="font-bold text-white mb-1">Lamports Converter</h3>
              <p className="text-white/60 text-sm">SOL ↔ Lamports conversion</p>
            </div>
            <div className="bg-solana-card border border-white/10 rounded-xl p-4">
              <h3 className="font-bold text-white mb-1">Transaction Decoder</h3>
              <p className="text-white/60 text-sm">Decode hex/base64 transaction data</p>
            </div>
            <div className="bg-solana-card border border-white/10 rounded-xl p-4">
              <h3 className="font-bold text-white mb-1">Program Registry</h3>
              <p className="text-white/60 text-sm">Known Solana program IDs reference</p>
            </div>
            <div className="bg-solana-card border border-white/10 rounded-xl p-4">
              <h3 className="font-bold text-white mb-1">RPC Tester</h3>
              <p className="text-white/60 text-sm">Benchmark RPC endpoint latency</p>
            </div>
            <div className="bg-solana-card border border-white/10 rounded-xl p-4">
              <h3 className="font-bold text-white mb-1">Token Account Finder</h3>
              <p className="text-white/60 text-sm">Find all token accounts for a wallet</p>
            </div>
          </div>
        </div>
      </section>

      <section id="security" className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">10. Security & Privacy</h2>
        <div className="prose prose-invert max-w-none">
          <ul className="list-disc list-inside text-white/70 space-y-2">
            <li><strong>No Private Keys:</strong> Never collected, stored, or transmitted</li>
            <li><strong>Public Data Only:</strong> All analysis uses publicly available on-chain data</li>
            <li><strong>No Tracking:</strong> No analytics, cookies, or user fingerprinting</li>
            <li><strong>Open Source:</strong> Full codebase auditable at <a href="https://github.com/LightxSolami/Solcurity" className="text-solana-blue hover:underline" target="_blank" rel="noopener noreferrer">github.com/LightxSolami/Solcurity</a></li>
            <li><strong>Rate Limited:</strong> Per-IP limits prevent abuse</li>
            <li><strong>Cached Results:</strong> Complete scan results may be cached; incomplete scans are not cached as successful results</li>
          </ul>
        </div>
      </section>

      <section id="roadmap" className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-4">11. Current Status & Roadmap</h2>
        <div className="prose prose-invert max-w-none">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-solana-card border border-white/10 rounded-xl p-4">
              <h3 className="font-bold text-white mb-2">Implemented</h3>
              <ul className="text-white/60 text-sm space-y-1">
                <li>Read-only wallet, token, and bounded recent transaction scans</li>
                <li>Per-check status and score withholding for incomplete scans</li>
                <li>Mainnet RPC fallback with endpoint verification and health handling</li>
                <li>SVM Explorer and developer tools</li>
              </ul>
            </div>
            <div className="bg-solana-card border border-white/10 rounded-xl p-4">
              <h3 className="font-bold text-white mb-2">Not yet implemented</h3>
              <ul className="text-white/60 text-sm space-y-1">
                <li>Verified, maintained threat-intelligence feed (the current malicious-address list is empty)</li>
                <li>Program deployment and upgrade-authority inspection</li>
                <li>Continuous monitoring and wallet relationship alerts</li>
                <li>Smart-contract source analysis or auditing</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-16 pt-8 border-t border-white/10 text-center text-white/50">
        <p className="mb-2">Solcurity is open source under MIT License</p>
        <p className="text-sm">
          <Link href="https://github.com/LightxSolami/Solcurity" target="_blank" rel="noopener noreferrer" className="text-solana-blue hover:underline">
            View on GitHub
          </Link>
        </p>
      </footer>
    </div>
  );
}