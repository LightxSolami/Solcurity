import { Metadata } from "next";
import Link from "next/link";
import { TokenAccountFinder } from "@/components/tools/TokenAccountFinder";

export const metadata: Metadata = {
  title: "Token Account Finder | Solcurity Tools",
  description: "Find all token accounts for a Solana wallet",
};

export default function TokenAccountFinderPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <Link href="/tools" className="text-white/60 hover:text-white text-sm mb-4 inline-block">
          ← Back to Tools
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">Token Account Finder</h1>
        <p className="text-white/60">Find all SPL Token and Token-2022 accounts for any Solana wallet address.</p>
      </div>

      <TokenAccountFinder />
    </div>
  );
}