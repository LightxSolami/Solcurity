import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PumpFunCreatorMonitor } from "@/components/pumpfuntool/PumpFunCreatorMonitor";
import { WalletTracker } from "@/components/WalletTracker";
import { getPumpFunTokenLink } from "@/lib/pumpfun-token-link";

export const metadata: Metadata = {
  title: "Solcurity | Solana Security Intelligence",
  description:
    "Scan public Solana wallets, review security findings, and follow token creator and market activity.",
};

export default function HomePage() {
  const pumpFunTokenLink = getPumpFunTokenLink(process.env.NEXT_PUBLIC_PUMPFUN_TOKEN_URL);

  return (
    <div className="min-h-screen bg-solana-dark text-white">
      <WalletTracker />

      <section className="px-4 pb-8 sm:px-6" aria-label="Fly Map wallet tracker">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/bubble-map"
            className="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-solana-blue/20 bg-[radial-gradient(ellipse_at_85%_50%,rgba(98,201,155,0.09),transparent_40%),linear-gradient(115deg,rgba(13,22,20,0.98),rgba(10,15,17,0.98))] p-5 transition hover:border-solana-blue/35 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-solana-blue/20 bg-solana-blue/[0.07] text-solana-blue">
                <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" aria-hidden="true">
                  <path d="M6 22 13 10l7 12 6-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="6" cy="22" r="2.5" fill="#62C99B" />
                  <circle cx="13" cy="10" r="2.5" fill="#AAB8B0" />
                  <circle cx="20" cy="22" r="2.5" fill="#62C99B" />
                  <circle cx="26" cy="12" r="2.5" fill="#AAB8B0" />
                </svg>
              </span>
              <span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-solana-blue">
                  Public activity · Interactive map
                </span>
                <span className="mt-1 block text-lg font-semibold text-white">
                  Fly Map wallet tracker
                </span>
                <span className="mt-1 block text-sm text-white/50">
                  Follow recent transactions, filter activity, and inspect each event.
                </span>
              </span>
            </div>
            <span className="inline-flex items-center gap-2 self-start rounded-xl border border-solana-blue/20 bg-solana-blue/[0.07] px-4 py-2.5 text-sm font-semibold text-[#b8ecd1] transition group-hover:bg-solana-blue/[0.12] sm:self-auto">
              Open Fly Map
              <span aria-hidden="true">→</span>
            </span>
          </Link>
        </div>
      </section>

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

<section className="px-4 pb-8 sm:px-6" aria-label="Solcurity token launch">
        <div className="mx-auto max-w-7xl">
          <div className="relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-solana-blue/20 bg-[radial-gradient(ellipse_at_88%_50%,rgba(98,201,155,0.075),transparent_40%),linear-gradient(120deg,rgba(12,19,17,0.96),rgba(12,16,18,0.98))] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-solana-blue/20 bg-solana-blue/[0.07] text-solana-blue">
                <svg viewBox="0 0 32 32" className="h-7 w-7" fill="none" aria-hidden="true">
                  <path d="M16 3.5 27 8v7.4c0 6.2-4.1 10.8-11 13.1C9.1 26.2 5 21.6 5 15.4V8l11-4.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="m11.5 16 3 3 6-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-solana-blue">
                  Solcurity · Official launch details
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  The token CA will be shared here
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-white/50">
                  We&apos;ll post the official mint address and direct Pump.fun link here when it launches.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:min-w-64 sm:items-end">
              <div className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 sm:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  Token CA / mint
                </p>
                {pumpFunTokenLink ? (
                  <p className="mt-1 break-all font-mono text-xs text-white/80">{pumpFunTokenLink.mint}</p>
                ) : (
                  <p className="mt-1 text-sm text-white/55">To be announced at launch</p>
                )}
              </div>
              {pumpFunTokenLink ? (
                <a
                  href={pumpFunTokenLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-solana-blue/20 bg-solana-blue/[0.07] px-4 py-2.5 text-sm font-semibold text-[#b8ecd1] transition hover:bg-solana-blue/[0.12]"
                >
                  Open token on Pump.fun <span aria-hidden="true">↗</span>
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex cursor-not-allowed items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/35"
                >
                  Pump.fun link coming soon
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-8 sm:px-6" aria-label="Perps DEX">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/perps"
            className="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-[#eab308]/20 bg-[radial-gradient(ellipse_at_85%_50%,rgba(234,179,8,0.12),transparent_40%),linear-gradient(115deg,rgba(13,22,20,0.98),rgba(10,15,17,0.98))] p-5 transition hover:border-[#eab308]/35 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#eab308]/25 bg-[#eab308]/10">
                <svg viewBox="0 0 32 32" className="h-8 w-8 text-[#eab308]" fill="none" aria-hidden="true">
                  <path d="M16 4v24M4 16h24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M16 8a8 8 0 018 8M16 24a8 8 0 008-8M16 8a8 8 0 00-8 8M16 24a8 8 0 01-8-8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4,4" />
                </svg>
              </span>
              <span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#eab308]/75">
                  Perps & Options DEX · Proprietary AMMs
                </span>
                <span className="mt-1 block text-lg font-semibold text-white">
                  Perps DEX
                </span>
                <span className="mt-1 block text-sm text-white/50">
                  Trade perpetuals & options with best execution via Smart Order Routing across Jupiter, Drift, Phoenix & CEXs.
                </span>
              </span>
            </div>
            <span className="inline-flex items-center gap-2 self-start rounded-xl border border-[#eab308]/25 bg-[#eab308]/10 px-4 py-2.5 text-sm font-semibold text-[#eab308] transition group-hover:bg-[#eab308]/20 sm:self-auto">
              Open Perps DEX
              <span aria-hidden="true">→</span>
            </span>
          </Link>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6" aria-labelledby="creator-monitor-heading">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-solana-blue">
              Token intelligence
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
