import { Metadata } from "next";
import Link from "next/link";
import { PumpFunCreatorMonitor } from "@/components/pumpfuntool/PumpFunCreatorMonitor";
import { WalletTracker } from "@/components/WalletTracker";

export const metadata: Metadata = {
  title: "Solcurity | Solana Wallet & Token Monitor",
  description:
    "Scan public Solana wallets, review security findings, and follow token creator and market activity.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#050515] text-white">
      <WalletTracker />

      <section className="px-4 pb-8 sm:px-6" aria-label="Pump.fun analytics">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/tools/pumpfuntool"
            className="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-[#f5a623]/25 bg-[radial-gradient(ellipse_at_90%_50%,rgba(245,166,35,0.14),transparent_42%),linear-gradient(120deg,rgba(26,18,12,0.96),rgba(12,12,23,0.98))] p-5 transition hover:border-[#f5a623]/50 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div className="flex items-center gap-4">
              <span
                role="img"
                aria-label="Pump.fun"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#f5a623]/25 bg-[#f5a623]/10 text-[11px] font-black italic tracking-tight text-[#ffc466]"
              >
                pump.fun
              </span>
              <span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#ffc466]/70">
                  Pump.fun · Token intelligence
                </span>
                <span className="mt-1 block text-lg font-semibold text-white">
                  PumpFun Analytics
                </span>
                <span className="mt-1 block text-sm text-white/50">
                  Explore bonding curves, holders, live markets, and recent trades.
                </span>
              </span>
            </div>
            <span className="inline-flex items-center gap-2 self-start rounded-xl border border-[#f5a623]/25 bg-[#f5a623]/10 px-4 py-2.5 text-sm font-semibold text-[#ffc466] transition group-hover:bg-[#f5a623]/20 sm:self-auto">
              Open analytics
              <span aria-hidden="true">→</span>
            </span>
          </Link>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6" aria-labelledby="creator-monitor-heading">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-solana-purple">
              Token investigation / 02
            </p>
            <h2 id="creator-monitor-heading" className="sr-only">Pump.fun creator monitor</h2>
          </div>
          <PumpFunCreatorMonitor />
        </div>
      </section>

      <section className="border-t border-white/[0.06] px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-3">
          <Link
            href="/scanner"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
          >
            Full wallet scanner
          </Link>
          <Link
            href="/bubble-map"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 transition hover:border-white/20 hover:text-white"
          >
            Wallet map
          </Link>
        </div>
      </section>
    </div>
  );
}
