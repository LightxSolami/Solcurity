import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Games | Solcurity",
  description: "Play free Solana-themed games in the Solcurity game menu.",
};

export default function GamesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <header className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-solana-green">Solcurity Arcade</p>
        <h1 className="mt-3 text-4xl font-bold text-white">Games</h1>
        <p className="mt-3 max-w-2xl text-white/60">
          Take a break with free-to-play games. No wallet connection or SOL deposit is required.
        </p>
      </header>

      <Link
        href="/games/snake"
        className="group block max-w-xl rounded-2xl border border-white/10 bg-solana-card p-6 transition-colors hover:border-solana-green/40 hover:bg-solana-green/5"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-solana-green/10 text-solana-green" aria-hidden="true">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 12h5a3 3 0 1 0-3-3v6a3 3 0 1 0 3-3h7a3 3 0 1 0-3 3V9a3 3 0 1 0 3 3h4" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-white transition-colors group-hover:text-solana-green">
              SolSnake Arena
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Free practice against four bots is available now. Real Solana multiplayer is in development; no SOL is staked or paid out.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-solana-green">
              Play now
              <span aria-hidden="true">→</span>
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
