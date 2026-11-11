"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";

interface Holder {
  address: string;
  balance: number;
  percentage: number;
}

interface Trade {
  signature: string;
  type: "buy" | "sell";
  solAmount: number;
  tokenAmount: number;
  price: number;
  timestamp: number;
  trader: string;
}

interface Analytics {
  token: {
    mint: string;
    name: string;
    symbol: string;
    creator: string;
    createdTimestamp: number;
    totalSupply: number;
    complete: boolean;
    dataSource?: "pumpfun" | "dexscreener";
    dexId?: string;
    marketUrl?: string;
  };
  price: { sol: number; usd: number | null; marketCap: number; marketCapUsd: number | null };
  bondingCurve: {
    progress: number | null;
    solNeeded: number | null;
    tokensRemaining: number | null;
    available: boolean;
  };
  holders: {
    topAccountCount: number;
    top10Percentage: number;
    top20Percentage: number;
    available: boolean;
    holders: Holder[];
  };
  liquidity: { sol: number; tokens: number };
  recentTrades: Trade[];
}

interface PumpFunAnalyticsProps {
  mint: string;
  rpcUrl?: string;
}

type AnalyticsTab = "overview" | "holders" | "trades" | "curve";

function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "N/A";
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function formatPriceUsd(value: number | null): string {
  if (value === null) return "N/A";
  if (Math.abs(value) < 1) {
    return `$${value.toLocaleString("en-US", {
      useGrouping: false,
      maximumSignificantDigits: 4,
    })}`;
  }
  return `$${formatCompact(value)}`;
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="bg-solana-card border border-white/10 rounded-2xl p-5">
      <p className="text-white/50 text-xs uppercase tracking-wider">{label}</p>
      <p className="text-white font-bold text-xl mt-2 break-words">{value}</p>
      {detail && <p className="text-white/50 text-xs mt-1">{detail}</p>}
    </div>
  );
}

export function PumpFunAnalytics({ mint, rpcUrl }: PumpFunAnalyticsProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnalytics() {
      setLoading(true);
      setError(null);
      setAnalytics(null);
      try {
        const response = await fetch("/api/pumpfuntool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "analyze",
            mint,
            ...(rpcUrl ? { rpcUrl } : {}),
          }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to load token analytics");
        }
        if (!data.analytics) {
          throw new Error("The analytics service returned no token data");
        }
        setAnalytics(data.analytics as Analytics);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load token analytics");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadAnalytics();
    return () => controller.abort();
  }, [mint, rpcUrl]);

  if (loading) {
    return (
      <div className="bg-solana-card border border-white/10 rounded-2xl p-8 text-center text-white/70" role="status">
        Loading token analytics...
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6" role="status">
        <p className="text-white font-medium">{error || "No token analytics were returned."}</p>
        <p className="text-white/60 text-sm mt-2">
          Check the mint address. If market-data providers are temporarily unavailable, please try again later.
        </p>
        <Link href="/tools" className="inline-block mt-4 text-solana-blue hover:text-white text-sm">
          Back to all tools
        </Link>
      </div>
    );
  }

  const { token, price, bondingCurve, holders, liquidity, recentTrades } = analytics;
  const tabs: Array<{ id: AnalyticsTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "holders", label: "Top holders" },
    { id: "trades", label: "Recent trades" },
    { id: "curve", label: "Bonding curve" },
  ];

  return (
    <div className="space-y-6">
      <section className="bg-solana-card border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {token.name} <span className="text-white/60">({token.symbol})</span>
            </h2>
            <p className="text-white/60 text-sm font-mono mt-2 break-all">{token.mint}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={`https://pump.fun/coin/${token.mint}`} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl text-sm">
              View on Pump.fun
            </a>
            {token.marketUrl && (
              <a href={token.marketUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-xl text-sm">
                View market
              </a>
            )}
          </div>
        </div>
        {token.dataSource === "dexscreener" && (
          <p className="mt-4 text-sm text-white/60" role="note">
            Market pricing is supplied by DEX Screener because Pump.fun&apos;s API is unavailable. Bonding-curve and trade data are shown only when provided by their source.
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4" aria-label="Token metrics">
        <Metric label="Price" value={formatPriceUsd(price.usd)} detail={`${price.sol.toFixed(8)} SOL`} />
        <Metric label="Market cap" value={price.marketCapUsd === null ? "N/A" : `$${formatCompact(price.marketCapUsd)}`} detail={`${formatCompact(price.marketCap)} SOL`} />
        <Metric label="Liquidity" value={`${liquidity.sol.toFixed(4)} SOL`} detail={`${formatCompact(liquidity.tokens)} tokens`} />
        <Metric label="Top accounts" value={holders.available ? holders.topAccountCount.toString() : "N/A"} detail={holders.available ? `Top 10 hold ${holders.top10Percentage.toFixed(2)}%` : "RPC holder data unavailable"} />
      </section>

      <section className="bg-solana-card border border-white/10 rounded-2xl overflow-hidden">
        <nav className="flex overflow-x-auto border-b border-white/10" aria-label="Analytics sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={`px-5 py-4 text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id ? "text-solana-blue border-b-2 border-solana-blue" : "text-white/60 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-6">
          {activeTab === "overview" && (
            <div className="grid md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <h3 className="text-white font-semibold">Token information</h3>
                <p className="text-white/60">Supply: <span className="text-white">{formatCompact(token.totalSupply / 1e6)}</span></p>
                <p className="text-white/60">{token.dataSource === "dexscreener" ? "Market pair created" : "Created"}: <span className="text-white">{token.createdTimestamp ? format(new Date(token.createdTimestamp * 1000), "PPpp") : "N/A"}</span></p>
                <p className="text-white/60">Creator: <span className="text-white font-mono break-all">{token.creator || "N/A"}</span></p>
                {token.dexId && <p className="text-white/60">Market: <span className="text-white">{token.dexId}</span></p>}
              </div>
              <div className="space-y-3">
                <h3 className="text-white font-semibold">Liquidity</h3>
                <p className="text-white/60">SOL reserve: <span className="text-white">{liquidity.sol.toFixed(4)} SOL</span></p>
                <p className="text-white/60">Token reserve: <span className="text-white">{formatCompact(liquidity.tokens)}</span></p>
                <p className="text-white/60">Market capitalization: <span className="text-white">{price.marketCapUsd === null ? "N/A" : `$${formatCompact(price.marketCapUsd)}`}</span></p>
              </div>
            </div>
          )}

          {activeTab === "holders" && (
            !holders.available ? (
              <p className="text-white/60">Holder data is unavailable from the selected RPC endpoint.</p>
            ) : holders.holders.length === 0 ? (
              <p className="text-white/60">No token accounts with a positive balance were returned.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-white/50 text-left border-b border-white/10"><th className="py-3 pr-4">Owner</th><th className="py-3 pr-4 text-right">Balance</th><th className="py-3 text-right">Supply</th></tr></thead>
                  <tbody>
                    {holders.holders.map((holder) => (
                      <tr key={holder.address} className="border-b border-white/5 text-white/80">
                        <td className="py-3 pr-4 font-mono break-all">{holder.address}</td>
                        <td className="py-3 pr-4 text-right">{formatCompact(holder.balance)}</td>
                        <td className="py-3 text-right">{holder.percentage.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeTab === "trades" && (
            recentTrades.length === 0 ? (
              <p className="text-white/60">Recent individual trades are not available from the current market-data provider.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-white/50 text-left border-b border-white/10"><th className="py-3 pr-4">Time</th><th className="py-3 pr-4">Side</th><th className="py-3 pr-4 text-right">SOL</th><th className="py-3 text-right">Trader</th></tr></thead>
                  <tbody>
                    {recentTrades.map((trade, index) => (
                      <tr key={trade.signature || `${trade.timestamp}-${index}`} className="border-b border-white/5 text-white/80">
                        <td className="py-3 pr-4">{trade.timestamp ? format(new Date(trade.timestamp * 1000), "PPpp") : "N/A"}</td>
                        <td className={`py-3 pr-4 ${trade.type === "buy" ? "text-solana-green" : "text-risk-critical"}`}>{trade.type.toUpperCase()}</td>
                        <td className="py-3 pr-4 text-right">{trade.solAmount.toFixed(4)}</td>
                        <td className="py-3 text-right font-mono">{trade.trader.slice(0, 8)}…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeTab === "curve" && (
            !bondingCurve.available ? (
              <p className="text-white/60">Bonding-curve reserves are not provided by the market-data fallback.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between text-sm text-white/70"><span>Progress</span><span>{bondingCurve.progress?.toFixed(1)}%</span></div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-solana-blue rounded-full" style={{ width: `${bondingCurve.progress ?? 0}%` }} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4 text-sm text-white/70">
                  <p>SOL needed: <span className="text-white">{bondingCurve.solNeeded?.toFixed(2) ?? "N/A"}</span></p>
                  <p>Tokens remaining: <span className="text-white">{bondingCurve.tokensRemaining === null ? "N/A" : formatCompact(bondingCurve.tokensRemaining)}</span></p>
                </div>
              </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}

export default PumpFunAnalytics;
