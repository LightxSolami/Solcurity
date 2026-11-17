import { Metadata } from "next";
import { WalletTracker } from "@/components/WalletTracker";
import { PumpFunAnalytics } from "@/components/pumpfuntool/PumpFunAnalytics";

export const metadata: Metadata = {
  title: "Solcurity - Solana Wallet Intelligence & Security",
  description: "Read-only Solana wallet activity monitoring and on-chain security tools",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#050515] text-white">
      {/* Hero Section */}
      <header className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#050515] via-[#0a0f2a] to-[#050515] opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.15)_0%,_transparent_70%)]" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-solana-purple/20 bg-solana-purple/5 px-4 py-1.5 mb-6">
            <span className="h-2 w-2 rounded-full animate-pulse bg-solana-purple" />
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-solana-purple">Read-only On-Chain Data</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.02] tracking-tight mb-6">
            See the
            <span className="block bg-gradient-to-r from-solana-purple via-solana-blue to-solana-green bg-clip-text text-transparent">
              On-Chain Truth
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Monitor public Solana wallet activity and explore on-chain security tools.
            Enter an address to view its confirmed balance changes and recent transactions.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="#fly-map" className="px-8 py-4 rounded-xl border border-white/10 bg-white/5 text-white font-semibold hover:bg-white/10 transition-all text-lg">
              Fly Map Tracker
            </a>
          </div>
          
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Fly Map Tracker Section */}
        <section id="fly-map" className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-10 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Fly Map Wallet Tracker</h2>
              <p className="text-white/60 max-w-2xl mx-auto">Follow confirmed balance changes and transaction activity for a public Solana address.</p>
            </div>
            
            <div className="bg-[#050515]/50 border border-white/10 rounded-2xl">
              <WalletTracker />
            </div>
          </div>
        </section>

        {/* PumpFun Analytics Section */}
        <section className="py-20 px-4 bg-gradient-to-b from-transparent via-[#8b5cf6]/10 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="mb-10 text-center">
              <div className="inline-flex items-center gap-2 mb-4">
                <PumpFunIcon className="w-8 h-8 text-yellow-400" />
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-yellow-400">PumpFun Analytics</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
                  PumpFun Analytics
                </span>
              </h2>
              <p className="text-white/60 max-w-2xl mx-auto">
                Deep analytics for PumpFun tokens - bonding curve progress, holder distribution, trade history, and risk indicators for holders and traders.
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-400/10 via-orange-400/5 to-pink-400/10 border border-yellow-400/20 rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 via-transparent to-pink-400/5" />
              <div className="relative z-10">
                <div className="grid md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-yellow-400/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div>
                        <p className="text-white/60 text-xs uppercase tracking-wider">Price</p>
                        <p className="text-white font-bold text-lg truncate">$0.000123</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-yellow-400/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      </div>
                      <div>
                        <p className="text-white/60 text-xs uppercase tracking-wider">Holders</p>
                        <p className="text-white font-bold text-lg">1,234</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-yellow-400/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                      </div>
                      <div>
                        <p className="text-white/60 text-xs uppercase tracking-wider">24h Volume</p>
                        <p className="text-white font-bold text-lg">$1.2M</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-yellow-400/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                      </div>
                      <div>
                        <p className="text-white/60 text-xs uppercase tracking-wider">Curve Progress</p>
                        <p className="text-white font-bold text-lg">67%</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div>
                        <p className="text-white/60 text-sm">Enter PumpFun Token Mint</p>
                        <p className="text-white font-bold text-lg font-mono">FVohCadz...CQPump</p>
                      </div>
                    </div>
                    <a
                      href="/tools/pumpfuntool"
                      className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-semibold rounded-xl hover:brightness-110 transition-all text-sm"
                    >
                      Analyze Token
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="py-20 px-4 bg-gradient-to-b from-transparent via-[#0a0f2a]/50 to-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="mb-10 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Wallet Security Scanner</h2>
              <p className="text-white/60 max-w-2xl mx-auto">Automated security assessment for any Solana wallet - risk scoring, threat intelligence, and program analysis</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <FeatureCard 
                title="Risk Scoring"
                description="0-100 risk score with CRITICAL/HIGH/MEDIUM/LOW classification based on 50+ threat vectors"
                icon={<ShieldIcon />}
              />
              <FeatureCard 
                title="Threat Intelligence"
                description="Cross-referenced against known drainers, phishing addresses, sanctioned entities, and rugpulls"
                icon={<SearchIcon />}
              />
              <FeatureCard 
                title="Program Analysis"
                description="AI-powered analysis of smart contract interactions and token authority risks"
                icon={<CodeIcon />}
              />
            </div>
            
            <div className="mt-10 text-center">
              <a href="/scan" className="px-8 py-4 rounded-xl bg-gradient-to-r from-solana-purple to-solana-blue text-white font-semibold hover:brightness-110 transition-all text-lg inline-block">
                Scan Any Wallet
              </a>
            </div>
          </div>
        </section>

        {/* Tools Grid */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-10 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Developer Tools</h2>
              <p className="text-white/60 max-w-2xl mx-auto">Essential utilities for Solana development and analysis</p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ToolCard title="Address Validator" desc="Validate & decode Solana addresses" href="/tools/address-validator" />
              <ToolCard title="Lamports Converter" desc="SOL ↔ Lamports conversion" href="/tools/lamports-converter" />
              <ToolCard title="Transaction Decoder" desc="Decode hex transaction data" href="/tools/tx-decoder" />
              <ToolCard title="Program Registry" desc="Known Solana program IDs" href="/tools/program-registry" />
              <ToolCard title="RPC Tester" desc="Benchmark RPC endpoints" href="/tools/rpc-tester" />
              <ToolCard title="Token Finder" desc="Find SPL token accounts" href="/tools/token-accounts" />
              <ToolCard title="SVM Explorer" desc="Local validator & devnet tools" href="/svm" />
              <ToolCard title="Whitepaper" desc="Technical documentation" href="/whitepaper" />
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-white/40 text-sm">
            Solcurity - Open source Solana security platform.{' '}
            <a href="https://github.com/LightxSolami/Solcurity" target="_blank" rel="noopener noreferrer" className="text-solana-blue hover:underline">
              View on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-colors">
      <div className="w-12 h-12 rounded-xl bg-solana-purple/20 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-white/60">{description}</p>
    </div>
  );
}

function ToolCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <a href={href} className="block bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:bg-white/10 transition-colors">
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-white/60 text-sm">{desc}</p>
    </a>
  );
}

function PumpFunIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ShieldIcon() {
  return <svg className="w-6 h-6 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
}

function SearchIcon() {
  return <svg className="w-6 h-6 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
}

function CodeIcon() {
  return <svg className="w-6 h-6 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>;
}