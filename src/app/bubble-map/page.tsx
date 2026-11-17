import { Metadata } from "next";
import { WalletFlowTracker } from "@/components/WalletFlowTracker";

export const metadata: Metadata = {
  title: "Fly Map Wallet Tracker | Solcurity",
  description: "Interactive map of recent public Solana wallet transactions and decoded balance changes.",
};

interface WalletFlowPageProps {
  searchParams: { address?: string | string[] };
}

export default function WalletFlowPage({ searchParams }: WalletFlowPageProps) {
  const address = typeof searchParams.address === "string" ? searchParams.address : "";
  return <WalletFlowTracker initialAddress={address} />;
}
