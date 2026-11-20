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
          <Link href="/scanner" className="text-white/60 hover:text-white text-sm">New Scan</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-16">
        <article className="prose prose-invert max-w-none">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">Privacy Policy</h1>

          <p className="text-white/80 mb-8"><strong>Last updated:</strong> November 2026</p>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Data We Collect</h2>
            <p className="text-white/80 mb-4">
              Solcurity is designed to be <strong>privacy-first</strong>. We collect minimal data:
            </p>
            <ul className="space-y-3 text-white/80">
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Public wallet address:</strong> Only when you submit a scan. This is public blockchain data.</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Telegram alerts:</strong> If you create an alert, the wallet address and Telegram user/chat IDs are stored in Supabase so scheduled checks can notify you. They remain until you remove the alert.</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Scan results:</strong> Generated from public blockchain data. Cached temporarily for performance.</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>IP address:</strong> Only for rate limiting (in-memory, not stored permanently).</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Data We Do NOT Collect</h2>
            <ul className="space-y-3 text-white/80">
              <li className="flex gap-3"><span className="text-risk-critical">▸</span> Seed phrases, private keys, or wallet passwords</li>
              <li className="flex gap-3"><span className="text-risk-critical">▸</span> Email addresses or phone numbers</li>
              <li className="flex gap-3"><span className="text-risk-critical">▸</span> User accounts or authentication tokens</li>
              <li className="flex gap-3"><span className="text-risk-critical">▸</span> Advertising or cross-site tracking identifiers</li>
              <li className="flex gap-3"><span className="text-risk-critical">▸</span> Analytics or behavioral data</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">How Data Is Used</h2>
            <ul className="space-y-3 text-white/80">
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> Public address → Query Solana RPC for public blockchain data</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> Generate security report → Return to you</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> Cache result (TTL: 5 min) → Avoid duplicate RPC calls</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> IP → read for scan rate-limit checks; reports use an HMAC hash for persistent rate limiting (the raw IP is not stored in the report database)</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Data Sharing</h2>
            <p className="text-white/80 mb-4">
              We do not sell your data. Requests to external services required for the features you use are:
            </p>
            <ul className="space-y-3 text-white/80">
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Solana RPC endpoint:</strong> To fetch public blockchain data (configurable via SOLANARPCURL).</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Supabase threat database:</strong> When configured, the scanner sends the scanned address and observed counterparties/program IDs to the project’s Supabase service for matching. These identifiers are not inserted as scan records by Solcurity; service-provider request logs may be subject to Supabase’s policies.</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Groq AI (optional):</strong> If you request an AI explanation, Solcurity sends the scan risk level, checks, and up to eight findings to Groq. The scanned wallet address is redacted from these fields before sending. Groq&apos;s own data handling and retention policies apply.</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Claude connector (optional):</strong> If you use the remote MCP connector, the public wallet address and resulting scan report are sent between Solcurity and Claude so Claude can use the tool and explain its results. Anthropic&apos;s data handling policies apply to that use.</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Telegram (optional):</strong> Bot commands and alert notifications are sent through Telegram. If you enable alerts, the wallet address and Telegram user/chat IDs are stored in the project&apos;s Supabase database until you remove the alert; Telegram&apos;s data handling policies also apply to your chats.</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Community reports:</strong> If you submit a report, the identifier, evidence, and explanation are stored in Supabase for moderation. The submission is retained until an operator deletes it under their retention policy.</li>
            </ul>
            <p className="text-white/70 mt-4">
              Your wallet address is sent to the Solana RPC endpoint you configure (or the default public endpoint)
              and, when Supabase threat screening is configured, to that database for matching. Scanner results are
              not intentionally stored as scan records by Solcurity. We do not send addresses to third-party threat
              intelligence APIs. AI features are optional and only run when you request them; using the Claude connector
              sends the requested public address and scan output to Claude for processing.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Data Retention</h2>
            <ul className="space-y-3 text-white/80">
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> Scan results: Cached in-memory for 5 minutes (configurable via CACHE_TTL_SECONDS)</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> Rate limit data: In-memory, expires after 60 seconds (configurable)</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> Telegram alert subscriptions: Retained in Supabase until removed using the bot&apos;s alert controls</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> Scan results are not stored as records; Telegram alert subscriptions are stored until removed</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Your Rights</h2>
            <p className="text-white/80 mb-4">
              Scans are not stored as scan records. If you create Telegram alerts, you can remove their stored subscription data using the bot&apos;s alert controls:
            </p>
            <ul className="space-y-3 text-white/80">
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> You can clear your browser cache to remove any client-side data</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> Server-side cache expires automatically</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> Use the bot&apos;s /alerts menu to remove individual subscriptions</li>
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