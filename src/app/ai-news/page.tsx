import type { Metadata } from "next";
import { AINewsDashboard } from "@/components/AINewsDashboard";

export const metadata: Metadata = {
  title: "AI Debate | Solcurity",
  description: "A scheduled, multi-perspective debate on Solana ecosystem news.",
};

export default function AINewsPage() {
  return (
    <div className="min-h-screen bg-solana-dark px-4 py-8 sm:px-6">
      <main className="mx-auto max-w-7xl">
        <AINewsDashboard />
      </main>
    </div>
  );
}