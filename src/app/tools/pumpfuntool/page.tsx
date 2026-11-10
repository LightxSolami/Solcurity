"use client";

import { useState } from "react";
import Link from "next/link";
import { PumpFunAnalytics } from "@/components/pumpfuntool/PumpFunAnalytics";

export default function PumpFunAnalyticsPage() {
  const [mint, setMint] = useState("FVohCadzbaig88VGBKXtcava3c5PaWczD7HKboCqpump");

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="mb-10">
        <Link href="/tools" className="text-white/60 hover:text-white text-sm mb-4 inline-block flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Tools
        </Link>
        <h1 className="text-4xl font-bold text-white mb-2">PumpFun Analytics</h1>
        <p className="text-white/60 max-w-2xl">Deep analytics for PumpFun tokens - bonding curve progress, holder distribution, trade history, and risk indicators for holders and traders.</p>
      </div>

      <div className="mb-8 bg-solana-card border border-white/10 rounded-2xl p-6">
        <label className="block text-white/60 text-sm mb-3">Enter PumpFun Token Mint Address</label>
        <div className="flex gap-3">
          <input
            type="text"
            value={mint}
            onChange={(e) => setMint(e.target.value)}
            placeholder="e.g., FVohCadzbaig88VGBKXtcava3c5PaWczD7HKboCqpump"
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-solana-purple text-base font-mono"
            maxLength={44}
          />
          <button
            onClick={() => setMint("FVohCadzbaig88VGBKXtcava3c5PaWczD7HKboCqpump")}
            className="px-6 py-3 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors text-sm"
          >
            Default Token
          </button>
        </div>
        <p className="text-white/50 text-xs mt-2">Paste any PumpFun token mint address (44 characters, base58)</p>
      </div>

      <PumpFunAnalytics mint={mint} />
    </div>
  );
}