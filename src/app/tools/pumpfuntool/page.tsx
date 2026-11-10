import { Metadata } from "next";
import Link from "next/link";
import { PumpFunAnalytics } from "@/components/pumpfuntool/PumpFunAnalytics";

export const metadata: Metadata = {
  title: "PumpFun Analytics | Solcurity Tools",
  description: "Analyze PumpFun tokens with bonding curve tracking, holder analysis, trade history, and risk indicators",
};

export default function PumpFunAnalyticsPage() {
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

      <PumpFunAnalytics mint="FVohCadzbaig88VGBKXtcava3c5PaWczD7HKboCqpump" />
    </div>
  );
}