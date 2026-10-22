import { Metadata } from "next";
import { SvmExplorer } from "@/components/SvmExplorer";

export const metadata: Metadata = {
  title: "SVM Explorer | Solcurity",
  description: "Local Solana Virtual Machine explorer for testing and debugging",
};

export default function SvmPage() {
  return <SvmExplorer />;
}
