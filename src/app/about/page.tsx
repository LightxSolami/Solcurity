import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Solcurity | Free Solana Wallet Security Scanner",
  description: "Learn about Solcurity - a free, open-source Solana wallet security scanner",
};

export default function AboutPage() {
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
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">About Solcurity</h1>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Mission</h2>
            <p className="text-white/80 mb-4">
              Solcurity is a free, open-source Solana wallet security scanner. Our mission is to make
              automated security analysis accessible to everyone in the Solana ecosystem — no fees,
              no account required, no private keys ever requested.
            </p>
            <p className="text-white/80">
              We believe security tooling should be a public good, not a paywalled service.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Core Principles</h2>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <span className="text-solana-blue text-2xl">1</span>
                <div>
                  <h3 className="font-semibold text-white">Never request private keys</h3>
                  <p className="text-white/70">Only public addresses. Seed phrases and private keys are never collected, stored, or transmitted.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-solana-blue text-2xl">2</span>
                <div>
                  <h3 className="font-semibold text-white">No false guarantees</h3>
                  <p className="text-white/70">We provide automated risk assessments, not safety guarantees. Every finding includes evidence and confidence.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-solana-blue text-2xl">3</span>
                <div>
                  <h3 className="font-semibold text-white">Transparency first</h3>
                  <p className="text-white/70">All threat intelligence sources are cited. Disagreements between sources are shown. Scoring methodology is documented.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-solana-blue text-2xl">4</span>
                <div>
                  <h3 className="font-semibold text-white">Free & open</h3>
                  <p className="text-white/70">Built on free/public resources. No paid API keys required for core functionality.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-solana-blue text-2xl">5</span>
                <div>
                  <h3 className="font-semibold text-white">Privacy by design</h3>
                  <p className="text-white/70">No user accounts, no tracking, no persistent storage of wallet addresses.</p>
                </div>
              </li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Technology Stack</h2>
            <ul className="space-y-2 text-white/80">
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Framework:</strong> Next.js 14 (App Router)</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Language:</strong> TypeScript (strict mode)</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Styling:</strong> Tailwind CSS</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Solana SDK:</strong> @solana/web3.js</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Validation:</strong> Zod</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Testing:</strong> Jest + React Testing Library</li>
              <li className="flex gap-3"><span className="text-solana-blue">▸</span> <strong>Deployment:</strong> Vercel (or any Node.js platform)</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Open Source</h2>
            <p className="text-white/80 mb-4">
              Solcurity is open source. The code is available on GitHub:
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="https://github.com/solcurity/solcurity" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl hover:bg-solana-purple/30 transition-colors text-sm font-medium">
                View on GitHub
              </a>
              <a href="https://github.com/solcurity/solcurity/issues" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium">
                Report Issue
              </a>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Disclaimer</h2>
            <div className="p-4 bg-risk-critical/10 border border-risk-critical/30 rounded-xl">
              <p className="text-white font-semibold mb-2">This is an automated security assessment tool.</p>
              <ul className="space-y-2 text-white/80 list-disc list-inside">
                <li>Results are based on publicly available blockchain data at the time of scanning</li>
                <li>No automated scanner can guarantee wallet safety</li>
                <li>This tool does not execute transactions or manage funds</li>
                <li>Always verify findings independently before taking action</li>
                <li>Use at your own risk</li>
              </ul>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Contributing</h2>
            <p className="text-white/80 mb-4">
              Contributions welcome! Areas where help is needed:
            </p>
            <ul className="space-y-2 text-white/80 list-disc list-inside">
              <li>Expanding threat intelligence sources (with verifiable citations)</li>
              <li>Improving Token-2022 extension analysis</li>
              <li>Adding more sophisticated transaction pattern detection</li>
              <li>Performance optimizations for RPC calls</li>
              <li>Test coverage improvements</li>
              <li>Documentation and translation</li>
            </ul>
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