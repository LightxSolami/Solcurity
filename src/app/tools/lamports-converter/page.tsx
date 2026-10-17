import { Metadata } from "next";
import Link from "next/link";
import { LamportsConverter } from "@/components/tools/LamportsConverter";

export const metadata: Metadata = {
  title: "Lamports Converter | Solcurity Tools",
  description: "Convert between SOL and lamports",
};

export default function LamportsConverterPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <Link href="/tools" className="text-white/60 hover:text-white text-sm mb-4 inline-block">
          ← Back to Tools
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">Lamports Converter</h1>
        <p className="text-white/60">Convert between SOL and lamports. 1 SOL = 1,000,000,000 lamports.</p>
      </div>

      <LamportsConverter />
    </div>
  );
}