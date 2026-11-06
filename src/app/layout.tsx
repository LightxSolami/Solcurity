import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  metadataBase: new URL("https://solcurity.app"),
  title: "Free Solana Wallet Security Scanner | Solcurity",
  description:
    "Scan a Solana wallet address for suspicious transactions, risky tokens, malicious addresses, and other security indicators. Free automated security analysis.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Solcurity",
    title: "Solcurity",
    description:
      "Free Solana wallet security scanner and Snake Arena practice game.",
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
    description:
      "Free Solana wallet security scanner and Snake Arena practice game.",
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
        <footer className="site-footer border-t py-6 px-4">
          <div className="site-footer__content max-w-7xl mx-auto text-center text-sm text-white/60">
            <p>Automated Solana wallet security assessment. Not a guarantee of safety.</p>
            <p className="mt-1">No automated scanner can guarantee that a wallet is safe.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
