"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import Link from "next/link";

interface PumpFunAnalyticsData {
  token: {
    mint: string;
    name: string;
    symbol: string;
    uri: string;
    bondingCurve: string;
    associatedBondingCurve: string;
    creator: string;
    createdTimestamp: number;
    virtualSolReserves: number;
    virtualTokenReserves: number;
    realSolReserves: number;
    realTokenReserves: number;
    totalSupply: number;
    complete: boolean;
  };
  price: {
    sol: number;
    usd: number | null;
    marketCap: number;
    marketCapUsd: number | null;
  };
  bondingCurve: {
    progress: number;
    solNeeded: number;
    tokensRemaining: number;
  };
  holders: {
    topAccountCount: number;
    top10Percentage: number;
    top20Percentage: number;
    holders: Array<{ address: string; balance: number; percentage: number }>;
  };
  liquidity: {
    sol: number;
    tokens: number;
  };
  creator: {
    address: string;
    tokensCreated: number;
    totalVolume: number;
  };
  recentTrades: Array<{
    signature: string;
    type: "buy" | "sell";
    solAmount: number;
    tokenAmount: number;
    price: number;
    timestamp: number;
    trader: string;
  }>;
}

interface PumpFunAnalyticsProps {
  mint: string;
  rpcUrl?: string;
}

function formatNumber(num: number, decimals = 2): string {
  if (num >= 1e9) return (num / 1e9).toFixed(decimals) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(decimals) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(decimals) + "K";
  return num.toFixed(decimals);
}

function formatSol(num: number): string {
  return num.toFixed(4) + " SOL";
}

function formatUsd(num: number | null): string {
  return num === null ? "N/A" : "$" + formatNumber(num, 2);
}

function formatPercentage(num: number): string {
  return num.toFixed(2) + "%";
}

// Icons
export function PumpFunAnalytics({ mint, rpcUrl }: PumpFunAnalyticsProps) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "holders" | "trades" | "curve">("overview");

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/pumpfuntool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "analyze", mint, rpcUrl: rpcUrl || "https://api.mainnet-beta.solana.com" })
        });
        const data = await res.json();
        if (!res.ok) {
          setError(res.status >= 500 ? "service-unavailable" : data.error || "Failed to fetch analytics");
          return;
        }
        setAnalytics(data.analytics);
      } catch {
        setError("service-unavailable");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [mint, rpcUrl]);

  if (loading) {
    return (
      <div className="bg-solana-card border border-white/10 rounded-2xl p-8">
        <div className="flex items-center justify-center py-12">
          <div className="w-12 h-12 border-4 border-solana-purple/30 border-t-solana-blue rounded-full animate-spin"></div>
          <span className="ml-4 text-white/70 text-lg">Analyzing PumpFun token...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6" role="status">
        <p className="text-white font-medium">
          {error === "service-unavailable"
            ? "Pump.fun analytics are temporarily unavailable."
            : error === "Token not found on Pump.fun"
              ? "This token was not found on Pump.fun."
              : error}
        </p>
        <p className="text-white/60 text-sm mt-2">
          {error === "service-unavailable"
            ? "This does not affect the other Solana tools. Please try again later."
            : "Check the mint address and try again."}
        </p>
        <Link href="/tools" className="inline-block mt-4 text-solana-blue hover:text-white text-sm">
          Back to all tools
        </Link>
      </div>
    );
  }

  if (!analytics) return null;

  const { token, price, bondingCurve, holders, liquidity, creator, recentTrades } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-solana-card border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-solana-purple to-solana-blue flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{token.symbol}</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{token.name}</h2>
              <p className="text-white/60 text-sm font-mono">{token.mint.slice(0, 8)}...{token.mint.slice(-6)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={`https://pump.fun/coin/${token.mint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors text-sm"
            >
              View on PumpFun
            </a>
            <a
              href={`https://solscan.io/token/${token.mint}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-xl hover:bg-white/10 transition-colors text-sm"
            >
              Solscan
            </a>
          </div>
        </div>

        {token.complete && (
          <div className="mt-4 p-3 bg-solana-green/10 border border-solana-green/30 rounded-xl text-solana-green text-sm">
            &check; Bonding curve complete - Token migrated to Raydium
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-solana-card border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-solana-purple/20 flex items-center justify-center">
              <DollarIcon />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/60 text-xs uppercase tracking-wider">Price</p>
              <p className="text-white font-bold text-lg truncate">{formatUsd(price.usd)}</p>
              <p className="text-white/50 text-xs">{formatSol(price.sol)}</p>
            </div>
          </div>
        </div>
        <div className="bg-solana-card border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-solana-purple/20 flex items-center justify-center">
              <ChartIcon />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/60 text-xs uppercase tracking-wider">Market Cap</p>
              <p className="text-white font-bold text-lg truncate">{formatUsd(price.marketCapUsd)}</p>
              <p className="text-white/50 text-xs">{formatSol(price.marketCap)}</p>
            </div>
          </div>
        </div>
        <div className="bg-solana-card border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-solana-purple/20 flex items-center justify-center">
              <LiquidityIcon />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/60 text-xs uppercase tracking-wider">Liquidity</p>
              <p className="text-white font-bold text-lg truncate">{formatSol(liquidity.sol)}</p>
              <p className="text-white/50 text-xs">{formatNumber(liquidity.tokens)} tokens</p>
            </div>
          </div>
        </div>
        <div className="bg-solana-card border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-solana-purple/20 flex items-center justify-center">
              <HoldersIcon />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/60 text-xs uppercase tracking-wider">Largest Holders</p>
              <p className="text-white font-bold text-lg truncate">{holders.topAccountCount.toString()}</p>
              <p className="text-white/50 text-xs">Top 10: {holders.top10Percentage.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-solana-card border border-white/10 rounded-2xl overflow-hidden">
        <div className="border-b border-white/10">
          <nav className="flex" aria-label="Tabs">
            {[
              { id: "overview", label: "Overview", icon: <HomeIcon className="w-4 h-4" /> },
              { id: "holders", label: "Holders", icon: <UsersIcon className="w-4 h-4" /> },
              { id: "trades", label: "Recent Trades", icon: <ActivityIcon className="w-4 h-4" /> },
              { id: "curve", label: "Bonding Curve", icon: <TrendingUpIcon className="w-4 h-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-solana-blue border-b-2 border-solana-blue bg-solana-purple/5"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === "overview" && <OverviewTab analytics={analytics} />}
          {activeTab === "holders" && <HoldersTab holders={holders} />}
          {activeTab === "trades" && <TradesTab trades={recentTrades} />}
          {activeTab === "curve" && <CurveTab bondingCurve={bondingCurve} token={analytics.token} />}
        </div>
      </div>
    </div>
  );
}