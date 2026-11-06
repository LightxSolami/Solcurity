"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";

const navItems = [
  { href: "/", label: "Snake Arena" },
  { href: "/scanner", label: "Scanner" },
  { href: "/svm", label: "SVM Explorer" },
  { href: "/tools", label: "Tools" },
  { href: "/whitepaper", label: "Whitepaper" },
  { href: "/faq", label: "FAQ" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/security", label: "Security" },
  { href: "/privacy", label: "Privacy" },
  { href: "/about", label: "About" },
];

export function NavBar() {
  const pathname = usePathname();
  const { wallet, connect, disconnect } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-white/10 bg-solana-navy/90 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between gap-2 h-16">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Solcurity Home">
            <Image
              src="/solcurity-logo.png"
              alt="Solcurity"
              width={120}
              height={36}
              priority
              className="h-9 w-[120px] object-contain"
            />
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0 lg:flex" role="navigation" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                  pathname === item.href
                    ? "bg-solana-purple/20 text-solana-blue border border-solana-purple/30"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/scan"
              className="hidden whitespace-nowrap sm:inline-flex items-center gap-2 px-3 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors text-xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Scan Wallet
            </Link>

            {wallet.connected ? (
              <button
                onClick={disconnect}
                className="whitespace-nowrap px-3 py-2 bg-solana-card border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/5 transition-colors text-xs font-mono"
                title={wallet.publicKey || ""}
              >
                {wallet.publicKey?.slice(0, 6)}...{wallet.publicKey?.slice(-4)}
              </button>
            ) : (
              <button
                onClick={connect}
                className="whitespace-nowrap px-3 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors text-xs"
              >
                Connect Wallet
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/10">
            <div className="px-2 pt-2 pb-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    pathname === item.href
                      ? "bg-solana-purple/20 text-solana-blue border border-solana-purple/30"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
