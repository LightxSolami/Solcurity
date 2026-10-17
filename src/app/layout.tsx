import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Free Solana Wallet Security Scanner | Solcurity",
  description:
    "Scan a Solana wallet address for suspicious transactions, risky tokens, malicious addresses, and other security indicators. Free automated security analysis.",
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
        <footer className="border-t border-white/10 bg-solana-navy/80 py-6 px-4">
          <div className="max-w-7xl mx-auto text-center text-sm text-white/50">
            <p>Automated Solana wallet security assessment. Not a guarantee of safety.</p>
            <p className="mt-1">No automated scanner can guarantee that a wallet is safe.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
