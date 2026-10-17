import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Solcurity",
  description: "Solcurity's privacy policy - how we handle your data",
};

export default function PrivacyPage() {
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
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">Privacy Policy</h1>

          <p className="text-white/80 mb-8"><strong>Last updated:</strong> January 2026</p>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Data We Collect</h2>
            <p className="text-white/80 mb-4">
              Solcurity is designed to be <strong>privacy-first</strong>. We collect minimal data:
            </p>
            <ul className="space-y-3 text-white/80">
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Public wallet address:</strong> Only when you submit a scan. This is public blockchain data.</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Scan results:</strong> Generated from public blockchain data. Cached temporarily for performance.</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>IP address:</strong> Only for rate limiting (in-memory, not stored permanently).</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Data We Do NOT Collect</h2>
            <ul className="space-y-3 text-white/80">
              <li className="flex gap-3"><span className="text-risk-critical">▸</span> Seed phrases, private keys, or wallet passwords</li>
              <li className="flex gap-3"><span className="text-risk-critical">▸</span> Email addresses or personal information</li>
              <li className="flex gap-3"><span className="text-risk-critical">▸</span> User accounts or authentication tokens</li>
              <li className="flex gap-3"><span className="text-risk-critical">▸</span> Persistent tracking identifiers</li>
              <li className="flex gap-3"><span className="text-risk-critical">▸</span> Analytics or behavioral data</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">How Data Is Used</h2>
            <ul className="space-y-3 text-white/80">
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> Public address → Query Solana RPC for public blockchain data</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> Generate security report → Return to you</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> Cache result (TTL: 5 min) → Avoid duplicate RPC calls</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> IP → Rate limit (in-memory, auto-expires)</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Data Sharing</h2>
            <p className="text-white/80 mb-4">
              We do not sell or share your data. The only external requests made are:
            </p>
            <ul className="space-y-3 text-white/80">
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Solana RPC endpoint:</strong> To fetch public blockchain data (configurable via SOLANARPCURL).</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Threat intelligence sources:</strong> We use local curated datasets; no external API calls for threat intel in the MVP.</li>
            </ul>
            <p className="text-white/70 mt-4">
              Your wallet address is sent to the Solana RPC endpoint you configure (or the default public endpoint).
              This is necessary to retrieve public blockchain data. We do not send addresses to third-party security APIs.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Data Retention</h2>
            <ul className="space-y-3 text-white/80">
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> Scan results: Cached in-memory for 5 minutes (configurable via CACHE_TTL_SECONDS)</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> Rate limit data: In-memory, expires after 60 seconds (configurable)</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> No persistent database storage of wallet addresses or scan results</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Your Rights</h2>
            <p className="text-white/80 mb-4">
              Since we don&apos;t store personal data persistently, there&apos;s no data to delete. However:
            </p>
            <ul className="space-y-3 text-white/80">
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> You can clear your browser cache to remove any client-side data</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> Server-side cache expires automatically</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Security</h2>
            <ul className="space-y-3 text-white/80">
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> All communication over HTTPS</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> No private keys ever transmitted</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> Rate limiting prevents abuse</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> Input validation on all endpoints</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Contact</h2>
            <p className="text-white/80">
              Questions about this policy? Open an issue on our <a href="https://github.com/solcurity/solcurity" className="text-solana-blue hover:underline" target="_blank" rel="noopener noreferrer">GitHub repository</a>.
            </p>
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