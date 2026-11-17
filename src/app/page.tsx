import { Metadata } from "next";
import Image from "next/image";
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
            className="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-[#14f195]/20 bg-[radial-gradient(ellipse_at_90%_50%,rgba(20,241,149,0.12),transparent_42%),linear-gradient(120deg,rgba(7,22,17,0.96),rgba(12,12,23,0.98))] p-5 transition hover:border-[#14f195]/45 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div className="flex items-center gap-4">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#14f195]/25 bg-[#14f195]/10"
              >
                <Image src="/pumpf.jpg" alt="Pump.fun" width={56} height={56} className="h-full w-full object-cover" />
              </span>
              <span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[#14f195]/75">
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
            <span className="inline-flex items-center gap-2 self-start rounded-xl border border-[#14f195]/25 bg-[#14f195]/10 px-4 py-2.5 text-sm font-semibold text-[#14f195] transition group-hover:bg-[#14f195]/20 sm:self-auto">
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
            Fly map tracker
          </Link>
        </div>
      </section>
    </div>
  );
}
