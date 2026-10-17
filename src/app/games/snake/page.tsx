import { Metadata } from "next";
import Link from "next/link";
import { SnakeGameLobby } from "@/components/games/SnakeGameLobby";

export const metadata: Metadata = {
  title: "Snake Arena | Solcurity",
  description: "5-player Snake game with SOL betting. Winner takes all!",
};

export default function SnakeGamePage() {
  return (
    <div className="min-h-screen bg-solana-dark">
      <header className="border-b border-white/10 bg-solana-navy/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2" aria-label="Solcurity Home">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-solana-purple to-solana-blue flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white tracking-tight">Solcurity</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Main navigation">
              <Link href="/" className="px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5">Scanner</Link>
              <Link href="/tools" className="px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5">Tools</Link>
              <Link href="/how-it-works" className="px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5">How It Works</Link>
              <Link href="/security" className="px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5">Security</Link>
              <Link href="/privacy" className="px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5">Privacy</Link>
              <Link href="/about" className="px-3 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5">About</Link>
            </nav>

            <div className="flex items-center gap-3">
              <Link href="/games/snake" className="px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Games
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <SnakeGameLobby />
      </main>

      <footer className="border-t border-white/10 bg-solana-navy/80 py-6 px-4">
        <div className="max-w-7xl mx-auto text-center text-sm text-white/50">
          <p>Automated Solana wallet security assessment. Not a guarantee of safety.</p>
          <p className="mt-1">Gambling involves risk. Only bet what you can afford to lose.</p>
        </div>
      </footer>
    </div>
  );
}