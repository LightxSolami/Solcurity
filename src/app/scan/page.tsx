import { Metadata } from "next";
import { ScanResults } from "@/components/ScanResults";

export const metadata: Metadata = {
  title: "Scan Results | Solcurity",
  description: "View your Solana wallet security scan results",
};

interface ScanPageProps {
  searchParams: Promise<{ address?: string }>;
}

export default async function ScanPage({ searchParams }: ScanPageProps) {
  const { address } = await searchParams;

  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-solana-dark px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">No address provided</h1>
          <p className="text-white/60">Please provide a wallet address to scan.</p>
        </div>
      </div>
    );
  }

  return <ScanResults address={address} />;
}