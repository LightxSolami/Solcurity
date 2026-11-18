import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

const footerGroups = [
  {
    title: "Explore",
    links: [
      { href: "/", label: "Wallet tracker" },
      { href: "/scanner", label: "Wallet scanner" },
      { href: "/svm", label: "SVM explorer" },
      { href: "/tools", label: "Tools" },
      { href: "/tools/pumpfuntool", label: "Token analytics" },
      { href: "/bubble-map", label: "Fly map tracker" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/security", label: "Security" },
      { href: "/threat-intel", label: "Threat intelligence" },
      { href: "/faq", label: "FAQ" },
      { href: "/whitepaper", label: "Whitepaper" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/about", label: "About Solcurity" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export const metadata: Metadata = {
  metadataBase: new URL("https://solcurity.app"),
  title: "Solcurity | Solana Security Intelligence",
  description:
    "Read-only Solana wallet security and on-chain activity intelligence, grounded in public transaction data.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Solcurity",
    title: "Solcurity",
    description: "Live Solana wallet activity monitoring and security tools.",
    images: [
      {
        url: "/icons/solcurity-social.png",
        width: 1200,
        height: 630,
        alt: "Solcurity logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Solcurity",
    description: "Live Solana wallet activity monitoring and security tools.",
    images: ["/icons/solcurity-social.png"],
  },
  keywords: [
    "solana",
    "wallet security",
    "solana scanner",
    "crypto security",
    "blockchain security",
    "solana wallet",
    "SPL token",
    "risk assessment",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-solana-dark min-h-screen flex flex-col">
        <NavBar />
        <main className="flex-1">
          {children}
        </main>
        <footer className="site-footer border-t px-4 py-10 sm:px-6 sm:py-12">
          <div className="site-footer__content mx-auto max-w-7xl">
            <div className="grid gap-10 border-b border-white/[0.08] pb-9 sm:grid-cols-[1.4fr_2fr] lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
              <div className="max-w-sm">
                <Link href="/" className="inline-flex items-center" aria-label="Solcurity home">
                  <Image
                    src="/solcurity-logo.png"
                    alt="Solcurity"
                    width={256}
                    height={79}
                    className="h-8 w-auto object-contain"
                  />
                </Link>
                <p className="mt-3 max-w-xs text-sm leading-6 text-white/45">
                  Solana wallet security and activity intelligence. Read-only by design.
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <a
                    href="https://x.com/SolcurityTools"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Follow us on X"
                    className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white/60 transition-all hover:bg-white/10 hover:border-white/20 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 9.24-3.908 3.908-8.502-9.24-8.26 7.227h3.308l7.71-8.82z"/>
                    </svg>
                  </a>
                  <a
                    href="https://t.me/solurityofficial"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Join our Telegram"
                    className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white/60 transition-all hover:bg-white/10 hover:border-white/20 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M11.944 2A10 10 0 002 12c0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.56 9.56 0 0112 6.84c.85 0 1.7.12 2.5.34 1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.94.36.31.68.92.68 1.86 0 1.34-.01 2.42-.01 2.75 0 .27.18.58.69.48A10 10 0 0022 12c0-5.52-4.48-10-10-10z"/>
                    </svg>
                  </a>
                  <a
                    href="https://github.com/LightxSolami/Solcurity"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="View on GitHub"
                    className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-white/60 transition-all hover:bg-white/10 hover:border-white/20 hover:text-white"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </a>
                </div>
              </div>
              {footerGroups.map((group) => (
                <nav key={group.title} aria-label={`${group.title} links`}>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                    {group.title}
                  </h2>
                  <ul className="mt-4 space-y-3">
                    {group.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="text-sm text-white/45 transition-colors hover:text-white"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
            <div className="flex flex-col gap-2 pt-5 text-xs leading-5 text-white/35 sm:flex-row sm:items-center sm:justify-between">
              <p>Automated wallet security assessments are informational and cannot guarantee safety.</p>
              <p>Public-chain data only · No wallet connection required to monitor</p>
              <div className="flex items-center gap-4">
                <a
                  href="https://x.com/SolcurityTools"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-white transition-colors"
                  aria-label="X"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 9.24-3.908 3.908-8.502-9.24-8.26 7.227h3.308l7.71-8.82z"/>
                  </svg>
                </a>
                <a
                  href="https://t.me/solurityofficial"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-white transition-colors"
                  aria-label="Telegram"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11.944 2A10 10 0 002 12c0 4.42 2.87 8.17 6.84 9.5.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.6-3.37-1.34-3.37-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.55-1.11-4.55-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.56 9.56 0 0112 6.84c.85 0 1.7.12 2.5.34 1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.94.36.31.68.92.68 1.86 0 1.34-.01 2.42-.01 2.75 0 .27.18.58.69.48A10 10 0 0022 12c0-5.52-4.48-10-10-10z"/>
                  </svg>
                </a>
                <a
                  href="https://github.com/LightxSolami/Solcurity"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-white transition-colors"
                  aria-label="GitHub"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
