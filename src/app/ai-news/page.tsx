import { Metadata } from "next";
import Link from "next/link";
import { AINewsDashboard } from "@/components/AINewsDashboard";

export const metadata: Metadata = {
  title: "AI News Intelligence | Solcurity",
  description: "24/7 multi-AI discussion on Solana & crypto news",
};

export default function AINewsPage() {
  return (
    <div className="min-h-screen bg-solana-dark">
      <header className="border-b border-white/10 bg-solana-navy/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white tracking-tight">Solcurity</Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/scanner" className="text-white/60 hover:text-white">Scanner</Link>
            <Link href="/ai-news" className="text-solana-blue font-medium">AI News</Link>
            <Link href="/privacy" className="text-white/60 hover:text-white">Privacy</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <AINewsDashboard />
      </main>

      <footer className="border-t border-white/10 bg-solana-navy/80 py-8 px-4 mt-16">
        <div className="max-w-7xl mx-auto text-center text-sm text-white/50">
          <p>Automated Solana wallet security assessment. Not a guarantee of safety.</p>
        </div>
      </footer>
    </div>
  );
}