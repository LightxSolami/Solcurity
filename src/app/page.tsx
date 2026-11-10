import type { Metadata } from "next";
import { WalletTracker } from "@/components/WalletTracker";

export const metadata: Metadata = {
  title: "Live Wallet Activity Tracker | Solcurity",
  description:
    "Monitor public Solana wallet activity with a live transaction feed, balance changes, and explorer links.",
};

export default function HomePage() {
  return <WalletTracker />;
}
