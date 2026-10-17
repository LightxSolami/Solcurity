import { Metadata } from "next";
import Link from "next/link";
import { RocketMapFullScreen } from "@/components/RocketMapFullScreen";

export const metadata: Metadata = {
  title: "Rocket Map | Solcurity",
  description: "Interactive token holder visualization with rockets for Solana wallets - Google Maps style",
};

interface RocketMapPageProps {
  searchParams: Promise<{ address?: string }>;
}

export default async function RocketMapPage({ searchParams }: RocketMapPageProps) {
  const { address } = await searchParams;

  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-solana-dark px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">No address provided</h1>
          <p className="text-white/60">Please provide a wallet address to visualize.</p>
        </div>
      </div>
    );
  }

  return (
    <html lang="en">
      <head>
        <title>Rocket Map - {address.slice(0, 8)}...{address.slice(-6)} | Solcurity</title>
        <meta name="description" content="Interactive token holder visualization with rockets for Solana wallet" />
      </head>
      <body className="bg-solana-dark min-h-screen flex flex-col">
        <RocketMapClient address={address} />
      </body>
    </html>
  );
}

function RocketMapClient({ address }: { address: string }) {
  return (
    <div className="flex-1 flex flex-col">
      {/* Minimal header for popup window */}
      <header className="border-b border-white/10 bg-solana-navy/90 backdrop-blur-sm px-4 py-3">
        <div className="max-w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2" target="_top">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-solana-purple to-solana-blue flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="font-bold text-white">Solcurity</span>
            </Link>
            <span className="text-white/40">/</span>
            <span className="text-white/70 font-mono text-sm">{address.slice(0, 8)}...{address.slice(-6)}</span>
            <span className="text-white/40">/</span>
            <span className="px-2 py-0.5 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded text-xs font-medium">Rocket Map</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/scan?address=${address}`}
              target="_top"
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors text-xs"
            >
              Full Report
            </a>
            <a
              href={`https://solscan.io/account/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-lg hover:bg-solana-purple/30 transition-colors text-xs"
            >
              Solscan
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 relative">
        <RocketMapFullScreen address={address} />
      </main>
    </div>
  );
}