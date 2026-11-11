import { Metadata } from "next";
import { FuturisticWalletTracker } from "@/components/FuturisticWalletTracker";

export const metadata: Metadata = {
  title: "Solcurity - Solana Wallet Intelligence & Security",
  description: "Real-time wallet tracking, insider detection, PumpFun analytics, and on-chain security scanning",
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
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-solana-purple">Live On-Chain Intelligence</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[1.02] tracking-tight mb-6">
            See the
            <span className="block bg-gradient-to-r from-solana-purple via-solana-blue to-solana-green bg-clip-text text-transparent">
              On-Chain Truth
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/60 max-w-3xl mx-auto mb-10 leading-relaxed">
            Real-time wallet tracking, insider detection, PumpFun analytics, and automated security scanning.
            Monitor whale movements, identify coordinated clusters, and scan any wallet for risks.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="#fly-map" className="px-8 py-4 rounded-xl border border-white/10 bg-white/5 text-white font-semibold hover:bg-white/10 transition-all text-lg">
              Fly Map Tracker
            </a>
          </div>
          
          {/* Live Stats Preview */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <StatPreview label="WALLETS TRACKED" value="150K+" color="text-solana-blue" />
            <StatPreview label="INSIDERS DETECTED" value="2,847" color="text-red-500" />
            <StatPreview label="24H VOLUME" value="$2.4B+" color="text-solana-green" />
            <StatPreview label="SCANS COMPLETED" value="89,234" color="text-solana-purple" />
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
              <p className="text-white/60 max-w-2xl mx-auto">Real-time 3D visualization of wallet movements, insider clusters, and transaction flows with insider detection</p>
            </div>
            
            <div className="bg-[#050515]/50 border border-white/10 rounded-2xl overflow-hidden" style={{ height: "70vh" }}>
              <FuturisticWalletTracker />
            </div>
          </div>
        </section>

        {/* Security Scanner Section */}
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

function StatPreview({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
      <p className={`font-mono text-3xl md:text-4xl font-bold ${color}`}>{value}</p>
      <p className="mt-2 text-xs text-white/50 uppercase tracking-wider">{label}</p>
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

function ShieldIcon() {
  return <svg className="w-6 h-6 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
}

function SearchIcon() {
  return <svg className="w-6 h-6 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
}

function CodeIcon() {
  return <svg className="w-6 h-6 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>;
}