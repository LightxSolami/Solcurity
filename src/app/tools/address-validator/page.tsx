import { Metadata } from "next";
import Link from "next/link";
import { AddressValidator } from "@/components/tools/AddressValidator";

export const metadata: Metadata = {
  title: "Address Validator | Solcurity Tools",
  description: "Validate and decode Solana public keys",
};

export default function AddressValidatorPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <Link href="/tools" className="text-white/60 hover:text-white text-sm mb-4 inline-block">
          ← Back to Tools
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">Address Validator</h1>
        <p className="text-white/60">Validate and decode Solana public keys. Check format, length, and network.</p>
      </div>

      <AddressValidator />
    </div>
  );
}