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
function DollarIcon() {
  return <svg className="w-5 h-5 text-solana-green" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08.402 2.599 1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function ChartIcon() {
  return <svg className="w-5 h-5 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}
function LiquidityIcon() {
  return <svg className="w-5 h-5 text-solana-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08.402 2.599 1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function HoldersIcon() {
  return <svg className="w-5 h-5 text-solana-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}
function HomeIcon({ className = "" }: { className?: string }) {
  return <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 001 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}
function UsersIcon({ className = "" }: { className?: string }) {
  return <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
}
function ActivityIcon({ className = "" }: { className?: string }) {
  return <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>;
}
function TrendingUpIcon({ className = "" }: { className?: string }) {
  return <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
}

function InfoSection({ title, items }: { title: string; items: Array<{ label: string; value: string; color?: string }> }) {
  return (
    <div className="bg-white/5 rounded-xl p-4">
      <h3 className="text-white font-medium mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between py-2 border-b border-white/5 last:border-0">
            <span className="text-white/60 text-sm">{item.label}</span>
            <span className={`text-white font-mono text-sm ${item.color || ""}`}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoBox({ label, value, color = "text-white" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-4 text-center">
      <p className="text-white/60 text-xs uppercase tracking-wider">{label}</p>
      <p className={`text-white font-bold text-2xl ${color}`}>{value}</p>
    </div>
  );
}

function RiskIndicator({ label, value, level, description }: { label: string; value: string; level: "high" | "medium" | "low"; description: string }) {
  const colors = {
    high: { bg: "bg-risk-critical/20", text: "text-risk-critical", border: "border-risk-critical/30" },
    medium: { bg: "bg-risk-moderate/20", text: "text-risk-moderate", border: "border-risk-moderate/30" },
    low: { bg: "bg-solana-green/20", text: "text-solana-green", border: "border-solana-green/30" }
  };
  
  const c = colors[level];
  
  return (
    <div className={`${c.bg} ${c.border} border rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/60 text-sm">{label}</span>
        <span className={`${c.text} font-bold text-lg`}>{value}</span>
      </div>
      <p className="text-white/50 text-xs">{description}</p>
    </div>
  );
}

function OverviewTab({ analytics }: { analytics: any }) {
  const { token, price, liquidity, recentTrades } = analytics;
  
  const buyVolume = recentTrades.filter((t: any) => t.type === "buy").reduce((sum: number, t: any) => sum + t.solAmount, 0);
  const sellVolume = recentTrades.filter((t: any) => t.type === "sell").reduce((sum: number, t: any) => sum + t.solAmount, 0);
  const buyCount = recentTrades.filter((t: any) => t.type === "buy").length;
  const sellCount = recentTrades.filter((t: any) => t.type === "sell").length;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/5 rounded-xl p-4">
          <h3 className="text-white font-medium mb-3">Token Info</h3>
          <div className="space-y-2">
            {[
              { label: "Total Supply", value: formatNumber(analytics.token.totalSupply) },
              { label: "Created", value: format(new Date(analytics.token.createdTimestamp * 1000), "PPpp") },
              { label: "Creator", value: `${analytics.token.creator.slice(0, 8)}...${analytics.token.creator.slice(-6)}` },
              { label: "Complete", value: analytics.token.complete ? "Yes (Raydium)" : "No (Bonding Curve)" }
            ].map((item, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-white/60 text-sm">{item.label}</span>
                <span className="text-white font-mono text-sm">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/5 rounded-xl p-4">
          <h3 className="text-white font-medium mb-3">Liquidity & Price</h3>
          <div className="space-y-2">
            {[
              { label: "SOL Reserves", value: formatSol(analytics.liquidity.sol) },
              { label: "Token Reserves", value: formatNumber(analytics.liquidity.tokens) },
              { label: "Current Price", value: `${formatSol(analytics.price.sol)} / ${formatUsd(analytics.price.usd)}` },
              { label: "Market Cap", value: `${formatUsd(analytics.price.marketCapUsd)} (${formatSol(analytics.price.marketCap)})` }
            ].map((item, i) => (
              <div key={i} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-white/60 text-sm">{item.label}</span>
                <span className="text-white font-mono text-sm">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-white font-medium mb-3">Recent Activity (50 trades)</h3>
        <div className="space-y-2">
          {[
            { label: "Buy Volume", value: formatSol(analytics.recentTrades.filter((t: any) => t.type === "buy").reduce((sum: number, t: any) => sum + t.solAmount, 0)), color: "text-solana-green" },
            { label: "Sell Volume", value: formatSol(analytics.recentTrades.filter((t: any) => t.type === "sell").reduce((sum: number, t: any) => sum + t.solAmount, 0)), color: "text-risk-critical" },
            { label: "Buy Orders", value: analytics.recentTrades.filter((t: any) => t.type === "buy").length.toString() },
            { label: "Sell Orders", value: analytics.recentTrades.filter((t: any) => t.type === "sell").length.toString() },
            { label: "Net Flow", value: formatSol(analytics.recentTrades.filter((t: any) => t.type === "buy").reduce((sum: number, t: any) => sum + t.solAmount, 0) - analytics.recentTrades.filter((t: any) => t.type === "sell").reduce((sum: number, t: any) => sum + t.solAmount, 0)), color: "text-solana-green" }
          ].map((item, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-white/60 text-sm">{item.label}</span>
              <span className={`text-white font-mono text-sm ${item.color || ""}`}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-white font-medium mb-3">Risk Indicators</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { label: "Concentration Risk", value: formatPercentage(analytics.holders.top10Percentage), level: analytics.holders.top10Percentage > 80 ? "high" : analytics.holders.top10Percentage > 50 ? "medium" : "low", description: "Top 10 holders control this % of supply" },
            { label: "Liquidity Depth", value: formatSol(analytics.liquidity.sol), level: analytics.liquidity.sol < 10 ? "high" : analytics.liquidity.sol < 50 ? "medium" : "low", description: "SOL in bonding curve" },
            { label: "Curve Progress", value: analytics.bondingCurve.progress.toFixed(1) + "%", level: analytics.bondingCurve.progress > 80 ? "low" : analytics.bondingCurve.progress > 50 ? "medium" : "high", description: analytics.bondingCurve.progress > 80 ? "Near completion (Raydium migration)" : "Early stage, higher volatility" }
          ].map((item, i) => (
            <div key={i} className={`bg-${item.level === "high" ? "risk-critical" : item.level === "medium" ? "risk-moderate" : "solana-green"}/20 border-${item.level === "high" ? "risk-critical" : item.level === "medium" ? "risk-moderate" : "solana-green"}/30 border rounded-xl p-4`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/60 text-sm">{item.label}</span>
                <span className={`text-${item.level === "high" ? "risk-critical" : item.level === "medium" ? "risk-moderate" : "solana-green"} font-bold text-lg`}>{item.value}</span>
              </div>
              <p className="text-white/50 text-xs">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HoldersTab({ holders }: { holders: any }) {
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <p className="text-white/60 text-xs uppercase tracking-wider">Top Accounts</p>
          <p className="text-white font-bold text-2xl">{holders.topAccountCount}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <p className="text-white/60 text-xs uppercase tracking-wider">Top 10 %</p>
          <p className="text-white font-bold text-2xl text-solana-yellow">{holders.top10Percentage.toFixed(1)}%</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <p className="text-white/60 text-xs uppercase tracking-wider">Top 20 Accounts</p>
          <p className="text-white font-bold text-2xl text-solana-blue">{holders.top20Percentage.toFixed(1)}%</p>
        </div>
      </div>

      <div className="bg-white/5 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
              <th className="pb-3 pl-4 font-medium">Rank</th>
              <th className="pb-3 pl-4 font-medium">Address</th>
              <th className="pb-3 pr-4 font-medium text-right">Balance</th>
              <th className="pb-3 pr-4 font-medium text-right">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {holders.holders.slice(0, 20).map((holder: any, i: number) => (
              <tr key={holder.address} className="hover:bg-white/5 transition-colors">
                <td className="py-3 pl-4 text-white/50 text-sm font-mono">#{i + 1}</td>
                <td className="py-3 pl-4">
                  <span className="text-white font-mono text-sm">{holder.address.slice(0, 8)}...{holder.address.slice(-6)}</span>
                </td>
                <td className="py-3 pr-4 text-right font-mono text-white">{formatNumber(holder.balance)}</td>
                <td className="py-3 pr-4 text-right text-white/60">{holder.percentage.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TradesTab({ trades }: { trades: any[] }) {
  return (
    <div className="space-y-4">
      <div className="bg-white/5 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
              <th className="pb-3 pl-4 font-medium">Time</th>
              <th className="pb-3 pl-4 font-medium">Type</th>
              <th className="pb-3 pr-4 font-medium text-right">SOL</th>
              <th className="pb-3 pr-4 font-medium text-right">Tokens</th>
              <th className="pb-3 pr-4 font-medium text-right">Price</th>
              <th className="pb-3 pl-4 font-medium">Trader</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {trades.slice(0, 50).map((trade: any, i: number) => (
              <tr key={i} className="hover:bg-white/5 transition-colors">
                <td className="py-3 pl-4 text-white/50 text-sm">{format(new Date(trade.timestamp * 1000), "HH:mm:ss")}</td>
                <td className="py-3 pl-4">
                  <span className={`px-2 py-0.5 rounded text-xs ${trade.type === "buy" ? "bg-solana-green/20 text-solana-green" : "bg-risk-critical/20 text-risk-critical"}`}>
                    {trade.type.toUpperCase()}
                  </span>
                </td>
                <td className="py-3 pr-4 text-right font-mono text-white">{trade.solAmount.toFixed(4)}</td>
                <td className="py-3 pr-4 text-right font-mono text-white/70">{formatNumber(trade.tokenAmount)}</td>
                <td className="py-3 pr-4 text-right font-mono text-white/70">{trade.price.toFixed(8)}</td>
                <td className="py-3 pl-4">
                  <span className="text-white/60 font-mono text-xs">{trade.trader.slice(0, 8)}...{trade.trader.slice(-6)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CurveTab({ bondingCurve, token }: { bondingCurve: any; token: any }) {
  const progress = bondingCurve.progress;
  
  return (
    <div className="space-y-6">
      <div className="bg-white/5 rounded-2xl p-6">
        <h3 className="text-white font-medium mb-4">Bonding Curve Progress</h3>
        
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/60">Progress to Raydium Migration</span>
            <span className="text-white font-bold">{progress.toFixed(1)}%</span>
          </div>
          <div className="h-4 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-solana-purple to-solana-blue rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 text-center">
          <div className="bg-solana-card border border-white/10 rounded-xl p-4">
            <p className="text-white/50 text-sm">SOL Needed</p>
            <p className="text-white font-bold text-lg">{bondingCurve.solNeeded.toFixed(2)} SOL</p>
          </div>
          <div className="bg-solana-card border border-white/10 rounded-xl p-4">
            <p className="text-white/50 text-sm">Tokens Remaining</p>
            <p className="text-white font-bold text-lg">{formatNumber(bondingCurve.tokensRemaining)}</p>
          </div>
          <div className="bg-solana-card border border-white/10 rounded-xl p-4">
            <p className="text-white/50 text-sm">Target SOL</p>
            <p className="text-white font-bold text-lg">85 SOL</p>
          </div>
        </div>
      </div>

      <div className="bg-white/5 rounded-xl p-4">
        <h3 className="text-white font-medium mb-3">How It Works</h3>
        <div className="space-y-2 text-white/70 text-sm">
          <p>&bull; PumpFun uses a bonding curve: price increases as more tokens are bought</p>
          <p>&bull; 85 SOL collected &rarr; Migration to Raydium (liquidity locked)</p>
          <p>&bull; Early buyers get better prices; price increases exponentially</p>
          <p>&bull; 1% fee on trades goes to creator; 5% dev fee on migration</p>
          {token.complete && <p className="text-solana-green">&check; This token has completed its bonding curve and migrated to Raydium!</p>}
        </div>
      </div>
    </div>
  );
}

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