"use client";

import { WalletInput } from "@/components/WalletInput";
import { SecurityWarning } from "@/components/SecurityWarning";
import Link from "next/link";

export default function HomePage() {
  return (
    <section className="flex-1 flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-3xl text-center">
        <div className="mb-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-solana-purple/20 border border-solana-purple/30 text-solana-blue text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-solana-blue animate-pulse"></span>
            Live Solana Mainnet
          </span>
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
          Check Your Solana Wallet Security
        </h1>
        <p className="text-lg md:text-xl text-white/70 mb-10 max-w-2xl mx-auto">
          Scan any public Solana wallet address for suspicious activity, risky token interactions,
          scam indicators, and other security risks.
        </p>

        <WalletInput />

        <div className="mt-8 flex justify-center">
          <a
            href="https://pump.fun/coin/FVohCadzbaig88VGBKXtcava3c5PaWczD7HKboCqpump"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-xl text-white hover:bg-purple-500/30 transition-colors text-sm"
          >
            <img
              src="https://pump.fun/favicon.ico"
              alt="Pump Fun"
              className="w-4 h-4 object-contain"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = 'none';
              }}
            />
            PumpFun: FVohCadz...CQPump
          </a>
        </div>

        <SecurityWarning />

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <FeatureCard
            icon={<ShieldIcon />}
            title="Threat Intelligence"
            desc="Checks against curated malicious address databases with source citations"
          />
          <FeatureCard
            icon={<TokenIcon />}
            title="Token Analysis"
            desc="SPL & Token-2022 support with mint/freeze authority detection"
          />
          <FeatureCard
            icon={<ChartIcon />}
            title="Visual Maps"
            desc="Interactive bubble maps for token holder visualization"
          />
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link
            href="/how-it-works"
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm"
          >
            How It Works
          </Link>
          <Link
            href="/security"
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm"
          >
            Security Methodology
          </Link>
          <Link
            href="/privacy"
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-solana-card rounded-2xl border border-white/10 p-6 hover:border-solana-purple/30 transition-colors">
      <div className="w-12 h-12 rounded-lg bg-solana-purple/20 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-white/60 text-sm">{desc}</p>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg className="w-6 h-6 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function TokenIcon() {
  return (
    <svg className="w-6 h-6 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="w-6 h-6 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}