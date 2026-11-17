"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PumpFunAnalytics } from "@/components/pumpfuntool/PumpFunAnalytics";

export default function PumpFunAnalyticsPage() {
  const [mint, setMint] = useState("");
  const [analyzedMint, setAnalyzedMint] = useState("");

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-10 rounded-3xl border border-[#14f195]/20 bg-[radial-gradient(ellipse_at_90%_50%,rgba(20,241,149,0.12),transparent_42%),linear-gradient(120deg,rgba(7,22,17,0.96),rgba(12,12,23,0.98))] p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/pumpf.jpg"
              alt="Pump.fun"
              width={64}
              height={64}
              className="h-16 w-16 rounded-2xl object-cover"
            />
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14f195]/75">
                Token intelligence
              </p>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">Pump.fun Analytics</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/60">
                Explore bonding curves, holder distribution, live markets, and observed trades.
              </p>
            </div>
          </div>
          <Link href="/tools" className="inline-flex items-center gap-1 self-start text-sm text-white/55 transition hover:text-[#14f195] sm:self-center">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Tools
          </Link>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-[#14f195]/15 bg-[#080e0c] p-6">
        <label className="mb-3 block text-sm text-white/65">Enter Pump.fun token mint address</label>
        <form
          className="flex flex-col sm:flex-row gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setAnalyzedMint(mint.trim());
          }}
        >
          <input
            type="text"
            value={mint}
            onChange={(e) => setMint(e.target.value)}
            placeholder="Paste a PumpFun token mint address"
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-base text-white placeholder-white/40 focus:border-[#14f195]/60 focus:outline-none"
            maxLength={44}
            aria-label="PumpFun token mint address"
          />
          <button
            type="submit"
            disabled={!mint.trim()}
            className="rounded-xl border border-[#14f195]/30 bg-[#14f195] px-6 py-3 text-sm font-semibold text-[#04120c] transition-colors hover:bg-[#6affbd] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Analyze Token
          </button>
        </form>
        <p className="text-white/50 text-xs mt-2">Paste a token mint address, then select Analyze Token.</p>
      </div>

      {analyzedMint ? (
        <PumpFunAnalytics key={analyzedMint} mint={analyzedMint} />
      ) : (
        <div className="rounded-2xl border border-[#14f195]/15 bg-[#080e0c] p-8 text-center text-white/50">
          Enter a PumpFun token mint address to view its analytics.
        </div>
      )}
    </div>
  );
}