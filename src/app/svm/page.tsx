import { Metadata } from "next";
import { SvmExplorer } from "@/components/SvmExplorer";

export const metadata: Metadata = {
  title: "SVM Explorer | Solcurity",
  description: "Explore Solana account data on Mainnet, test networks, or a local validator.",
};

export default function SvmPage() {
  return <SvmExplorer />;
}
