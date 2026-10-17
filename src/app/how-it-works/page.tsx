import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How It Works | Solcurity",
  description: "Learn how Solcurity scans Solana wallets for security risks",
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-solana-dark">
      <header className="border-b border-white/10 bg-solana-navy/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white tracking-tight">Solcurity</h1>
          <Link href="/" className="text-white/60 hover:text-white text-sm">New Scan</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-16">
        <article className="prose prose-invert max-w-none">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">How This Scan Works</h1>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">What the Scanner Checks</h2>
            <ul className="space-y-3 text-white/80">
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Wallet existence & balance:</strong> SOL balance, token account count, transaction count, approximate wallet age.</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Transaction history:</strong> Recent transactions analyzed for suspicious transfers, interactions with flagged addresses, unusual patterns.</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Token holdings:</strong> All SPL Token and Token-2022 holdings with mint/freeze authority status, risk indicators.</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Program interactions:</strong> Solana programs the wallet has interacted with, classified as known/unknown/suspicious/malicious.</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Threat intelligence:</strong> Addresses, tokens, and programs checked against curated threat-intelligence sources.</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Drainer indicators:</strong> Patterns that could indicate wallet-drainer activity.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">What It Cannot Check</h2>
            <ul className="space-y-3 text-white/80">
              <li className="flex gap-3"><span className="text-risk-critical">▸</span> <strong>Private keys / seed phrases:</strong> Never requested, never stored, never transmitted.</li>
              <li className="flex gap-3"><span className="text-risk-critical">▸</span> <strong>Off-chain activity:</strong> Phishing emails, social engineering, compromised devices.</li>
              <li className="flex gap-3"><span className="text-risk-critical">▸</span> <strong>Future transactions:</strong> Only historical data is analyzed.</li>
              <li className="flex gap-3"><span className="text-risk-critical">▸</span> <strong>Smart contract code:</strong> Program code is not audited.</li>
              <li className="flex gap-3"><span className="text-risk-critical">▸</span> <strong>Real-time monitoring:</strong> This is a point-in-time scan.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Data Sources</h2>
            <ul className="space-y-3 text-white/80">
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Solana RPC:</strong> Public mainnet RPC endpoint (configurable via SOLANARPCURL).</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Threat intelligence:</strong> Curated dataset with source citations (see Security page).</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Solana Program Library:</strong> Verified program IDs from official documentation.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Limitations & False Positives</h2>
            <ul className="space-y-3 text-white/80">
              <li className="flex gap-3"><span className="text-risk-moderate">▸</span> <strong>New addresses/programs:</strong> Not automatically malicious just because they are new.</li>
              <li className="flex gap-3"><span className="text-risk-moderate">▸</span> <strong>Active mint/freeze authority:</strong> Common in legitimate tokens (e.g., stablecoins).</li>
              <li className="flex gap-3"><span className="text-risk-moderate">▸</span> <strong>Unsolicited tokens/NFTs:</strong> Receiving them does not mean compromise.</li>
              <li className="flex gap-3"><span className="text-risk-moderate">▸</span> <strong>High transaction volume:</strong> Not automatically suspicious.</li>
              <li className="flex gap-3"><span className="text-risk-moderate">▸</span> <strong>Confidence levels:</strong> Every finding includes LOW/MEDIUM/HIGH confidence.</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Why a Score Is Not a Guarantee</h2>
            <p className="text-white/80 mb-4">
              The security score (0–100) is an <strong>automated risk assessment</strong> based on publicly available
              blockchain data. It reflects the <em>weight of evidence</em> from the checks we perform. It does not
              account for:
            </p>
            <ul className="space-y-2 text-white/80 list-disc list-inside">
              <li>Private key compromise that hasn&apos;t resulted in on-chain activity yet</li>
              <li>Social engineering or phishing that hasn&apos;t executed</li>
              <li>Zero-day vulnerabilities in programs the wallet interacts with</li>
              <li>Off-chain factors (device security, email compromise, etc.)</li>
            </ul>
            <div className="mt-6 p-4 bg-risk-critical/10 border border-risk-critical/30 rounded-xl">
              <p className="text-white font-semibold">No automated scanner can guarantee that a wallet is safe.</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Why You Should Never Enter Private Keys</h2>
            <p className="text-white/80 mb-4">
              This scanner <strong>only requires a public Solana wallet address</strong>. Anyone asking for your
              seed phrase, private key, or wallet password to &ldquo;scan&rdquo; your wallet is attempting to steal your funds.
            </p>
            <div className="p-4 bg-risk-critical/10 border border-risk-critical/30 rounded-xl">
              <p className="text-white font-semibold text-lg">Never enter your seed phrase or private key anywhere.</p>
              <p className="text-white/70 mt-2">Legitimate security tools never need your private keys to analyze public blockchain data.</p>
            </div>
          </section>
        </article>
      </main>

      <footer className="border-t border-white/10 bg-solana-navy/80 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-white/50">
          <p>Automated Solana wallet security assessment. Not a guarantee of safety.</p>
        </div>
      </footer>
    </div>
  );
}