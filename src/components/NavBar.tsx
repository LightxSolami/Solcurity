"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";

const navItems = [
  { href: "/", label: "Tracker" },
  { href: "/scanner", label: "Scanner" },
  { href: "/bubble-map", label: "Fly Map" },
  { href: "/perps", label: "Perps DEX" },
  { href: "/svm", label: "SVM Explorer" },
  { href: "/threat-intel", label: "Threat Intel" },
  { href: "/tools", label: "Tools" },
  { href: "/games", label: "Games" },
];

export function NavBar() {
  const pathname = usePathname();
  const { wallet, connect, disconnect } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isActive = (href: string) =>
    href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-solana-navy/95 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-[4.25rem] items-center justify-between gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Solcurity home">
            <Image
              src="/solcurity-logo.png"
              alt="Solcurity"
              width={256}
              height={79}
              priority
              className="h-8 w-auto object-contain sm:h-9"
            />
            <span className="hidden border-l border-white/10 pl-3 xl:flex xl:flex-col">
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-solana-blue">
                Solana security
              </span>
              <span className="mt-0.5 text-[10px] text-white/40">Public-chain intelligence</span>
            </span>
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-solana-blue/[0.09] text-solana-blue"
                    : "text-white/50 hover:bg-white/[0.04] hover:text-white/90"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/scan"
              className="hidden whitespace-nowrap sm:inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2 text-xs font-medium text-white/65 transition-colors hover:border-solana-blue/25 hover:bg-solana-blue/[0.06] hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Scan Wallet
            </Link>

            {wallet.connected ? (
              <button
                onClick={disconnect}
                className="whitespace-nowrap rounded-xl border border-solana-blue/20 bg-solana-blue/[0.07] px-3 py-2 font-mono text-xs text-white/80 transition-colors hover:bg-solana-blue/[0.12] hover:text-white"
                title={wallet.publicKey || ""}
              >
                {wallet.publicKey?.slice(0, 6)}...{wallet.publicKey?.slice(-4)}
              </button>
            ) : (
              <button
                onClick={connect}
                className="whitespace-nowrap rounded-xl border border-solana-blue/25 bg-solana-blue/[0.09] px-3 py-2 text-xs font-semibold text-[#b8ecd1] transition-colors hover:bg-solana-blue/[0.15]"
              >
                Connect Wallet
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white lg:hidden"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {mobileMenuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m6 6 12 12M18 6 6 18" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav id="mobile-navigation" className="border-t border-white/[0.07] py-3 lg:hidden" aria-label="Mobile navigation">
            <div className="grid gap-1 sm:grid-cols-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-solana-blue/[0.09] text-solana-blue"
                      : "text-white/55 hover:bg-white/[0.04] hover:text-white/90"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

export const Header = NavBar;
