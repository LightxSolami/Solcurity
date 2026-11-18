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
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
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
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
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
