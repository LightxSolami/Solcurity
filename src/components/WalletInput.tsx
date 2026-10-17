"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export function WalletInput() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Scan failed");
      }

      router.push(`/scan?address=${encodeURIComponent(address)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter Solana wallet address (e.g., 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM)"
          className="w-full px-5 py-4 bg-solana-card border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-solana-purple focus:border-transparent text-base"
          disabled={loading}
          maxLength={44}
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-5 w-5 text-solana-blue" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>

      {error && (
        <p className="text-risk-critical text-sm text-center" role="alert">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !address.trim()}
        className="w-full py-4 bg-solana-purple text-white font-semibold rounded-xl hover:bg-solana-purple/90 focus:outline-none focus:ring-2 focus:ring-solana-purple focus:ring-offset-2 focus:ring-offset-solana-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
      >
        {loading ? "Scanning..." : "Scan Wallet"}
      </button>

      <p className="text-xs text-white/40 text-center">
        Example: <code className="font-mono text-white/60">9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM</code>
      </p>
    </form>
  );
}