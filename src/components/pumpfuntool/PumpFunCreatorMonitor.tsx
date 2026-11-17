"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

interface TokenTrade {
  signature: string;
  type: "buy" | "sell";
  solAmount: number;
  tokenAmount: number;
  price: number;
  timestamp: number;
  trader: string;
}

interface CreatorActivity {
  signature: string;
  slot: number;
  blockTime: number | null;
  success: boolean;
  detailsAvailable: boolean;
  solChange: number;
  tokenChanges: { mint: string; amount: number }[];
  counterparties: string[];
}

interface TokenAnalytics {
  token: {
    mint: string;
    name: string;
    symbol: string;
    creator: string;
    complete: boolean;
    marketUrl?: string;
    marketPairAddress?: string;
    dataSource?: "pumpfun" | "dexscreener" | "geckoterminal" | "onchain";
  };
  liquidity: { sol: number; tokens: number };
  bondingCurve: { available: boolean; progress: number | null };
  recentTrades: TokenTrade[];
}

interface AnalyticsResponse {
  analytics: TokenAnalytics;
  error?: string;
}

interface ActivityResponse {
  activities: CreatorActivity[];
  balanceSol: number;
  fetchedAt: number;
  error?: string;
}

interface ObservedTrader {
  address: string;
  trades: number;
  buys: number;
  sells: number;
  solVolume: number;
}

function truncate(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-5)}`;
}

function getObservedTraders(trades: TokenTrade[]): ObservedTrader[] {
  const traders = new Map<string, ObservedTrader>();
  for (const trade of trades) {
    if (!trade.trader) continue;
    const observed = traders.get(trade.trader) ?? {
      address: trade.trader,
      trades: 0,
      buys: 0,
      sells: 0,
      solVolume: 0,
    };
    observed.trades += 1;
    observed.buys += trade.type === "buy" ? 1 : 0;
    observed.sells += trade.type === "sell" ? 1 : 0;
    observed.solVolume += trade.solAmount;
    traders.set(trade.trader, observed);
  }
  return Array.from(traders.values())
    .sort((left, right) => right.trades - left.trades || right.solVolume - left.solVolume)
    .slice(0, 8);
}

export function PumpFunCreatorMonitor() {
  const [mintInput, setMintInput] = useState("");
  const [analytics, setAnalytics] = useState<TokenAnalytics | null>(null);
  const [creatorActivities, setCreatorActivities] = useState<CreatorActivity[]>([]);
  const [creatorBalance, setCreatorBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [following, setFollowing] = useState(false);
  const [error, setError] = useState("");
  const [activityError, setActivityError] = useState("");
  const activityController = useRef<AbortController | null>(null);
  const requestId = useRef(0);

  const loadCreatorActivity = useCallback(async (address: string) => {
    activityController.current?.abort();
    const controller = new AbortController();
    activityController.current = controller;
    setActivityLoading(true);
    setActivityError("");
    try {
      const params = new URLSearchParams({ address, limit: "5" });
      const response = await fetch(`/api/wallet-tracker?${params.toString()}`, {
        signal: controller.signal,
      });
      const data = (await response.json()) as ActivityResponse;
      if (!response.ok) {
        throw new Error(data.error || "Could not load creator wallet activity.");
      }
      if (!controller.signal.aborted) {
        setCreatorActivities(data.activities);
        setCreatorBalance(data.balanceSol);
      }
    } catch (loadError) {
      if (!controller.signal.aborted) {
        const message =
          loadError instanceof Error ? loadError.message : "Could not load creator wallet activity.";
        const normalizedMessage =
          message.includes("Failed to fetch") || message.includes("fetch")
            ? "Wallet activity is temporarily unavailable from the current RPC provider."
            : message;
        setActivityError(normalizedMessage);
      }
    } finally {
      if (activityController.current === controller) {
        activityController.current = null;
        setActivityLoading(false);
      }
    }
  }, []);

  const analyzeToken = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const mint = mintInput.trim();
    if (!mint) return;

    activityController.current?.abort();
    activityController.current = null;
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError("");
    setActivityError("");
    setActivityLoading(false);
    setAnalytics(null);
    setCreatorActivities([]);
    setCreatorBalance(null);
    setFollowing(false);
    try {
      const response = await fetch("/api/pumpfuntool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", mint }),
      });
      const data = (await response.json()) as AnalyticsResponse;
      if (!response.ok) {
        throw new Error(data.error || "Could not analyze this token.");
      }
      if (!data.analytics) {
        throw new Error("The token analytics service returned no data.");
      }
      if (currentRequestId !== requestId.current) return;

      setAnalytics(data.analytics);
      setLoading(false);
      if (data.analytics.token.creator) {
        void loadCreatorActivity(data.analytics.token.creator);
      }
    } catch (loadError) {
      if (currentRequestId === requestId.current) {
        setError(loadError instanceof Error ? loadError.message : "Could not analyze this token.");
      }
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!following || !analytics?.token.creator) return;
    const interval = window.setInterval(() => {
      void loadCreatorActivity(analytics.token.creator);
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [analytics?.token.creator, following, loadCreatorActivity]);

  useEffect(() => () => {
    requestId.current += 1;
    activityController.current?.abort();
  }, []);

  const observedTraders = analytics ? getObservedTraders(analytics.recentTrades) : [];
  const creatorSells = analytics?.recentTrades.filter(
    (trade) => trade.trader === analytics.token.creator && trade.type === "sell"
  ).length ?? 0;

  return (
    <section className="tracker-panel rounded-2xl p-5 sm:p-7" aria-label="Pump.fun creator monitor">
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-solana-purple">
          Token creator / wallet flow
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Follow the deployer. Watch the chain.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-white/55">
          Enter a Pump.fun token mint to look up its on-chain creator, monitor public wallet movements,
          and inspect observed token traders.
        </p>
      </div>

      <form onSubmit={analyzeToken} className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="min-w-0">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
            Solana token mint
          </span>
          <input
            value={mintInput}
            onChange={(event) => setMintInput(event.target.value)}
            placeholder="Paste a Pump.fun token mint address"
            maxLength={44}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-xl border border-white/10 bg-[#080b18]/80 px-4 py-3.5 font-mono text-sm text-white outline-none transition placeholder:text-white/25 focus:border-solana-purple/50 focus:ring-2 focus:ring-solana-purple/10"
            aria-label="Pump.fun token mint address"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !mintInput.trim()}
          className="self-end rounded-xl border border-solana-purple/30 bg-solana-purple/15 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-solana-purple/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Analyzing token..." : "Find creator"}
        </button>
      </form>

      {loading && (
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-solana-purple/20 bg-solana-purple/5 p-4" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-solana-purple/30 border-t-solana-blue" />
          <span className="text-sm text-white/70">Reading token market data and on-chain creator account…</span>
        </div>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-risk-moderate/20 bg-risk-moderate/5 px-4 py-3 text-sm text-risk-moderate" role="alert">
          {error}
        </p>
      )}

      {analytics && (
        <div className="mt-6 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="Token" value={`${analytics.token.name} (${analytics.token.symbol})`} />
            <Metric
              label="Market liquidity"
              value={analytics.liquidity.sol > 0 ? `${analytics.liquidity.sol.toFixed(3)} SOL` : "Unavailable"}
            />
            <Metric
              label={analytics.token.dataSource === "geckoterminal" && analytics.token.marketPairAddress
                ? "Market status"
                : "Bonding curve"}
              value={analytics.token.dataSource === "geckoterminal" && analytics.token.marketPairAddress
                ? "Market pool"
                : analytics.bondingCurve.available
                  ? `${analytics.bondingCurve.progress?.toFixed(1) ?? "—"}%`
                  : analytics.token.complete ? "Graduated" : "Unavailable"}
            />
          </div>
          {analytics.token.marketUrl && (
            <p className="-mt-2 text-right">
              <a
                href={analytics.token.marketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-solana-blue transition hover:text-white"
              >
                Open live market ↗
              </a>
            </p>
          )}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <section className="rounded-xl border border-white/10 bg-black/15 p-4 sm:p-5" aria-label="Creator wallet activity">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">Creator wallet</h3>
                  {analytics.token.creator ? (
                    <a
                      href={`https://solscan.io/account/${encodeURIComponent(analytics.token.creator)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block break-all font-mono text-xs text-solana-blue hover:underline"
                    >
                      {analytics.token.creator}
                    </a>
                  ) : (
                    <p className="mt-2 text-sm text-white/50">
                      The current data sources could not verify a creator address for this token.
                    </p>
                  )}
                </div>
                {analytics.token.creator && (
                  <button
                    type="button"
                    onClick={() => setFollowing((current) => !current)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                      following
                        ? "border-solana-blue/30 bg-solana-blue/10 text-solana-blue"
                        : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {following ? "Following · 15s updates" : "Follow creator"}
                  </button>
                )}
              </div>

              {analytics.token.creator && (
                <>
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/50">
                    <span>Balance: <strong className="font-mono text-white/80">{creatorBalance === null ? "—" : `${creatorBalance.toFixed(4)} SOL`}</strong></span>
                    <span>{activityLoading ? "Syncing wallet…" : `${creatorActivities.length} recent transactions`}</span>
                    {creatorSells > 0 && (
                      <span className="rounded-md border border-risk-critical/25 bg-risk-critical/10 px-2 py-1 text-risk-critical">
                        {creatorSells} creator sell{creatorSells === 1 ? "" : "s"} in loaded trades
                      </span>
                    )}
                  </div>
                  {activityError && (
                    <p className="mt-3 text-xs text-risk-moderate" role="status">{activityError}</p>
                  )}
                  {creatorActivities.length > 0 ? (
                    <div className="mt-4 divide-y divide-white/[0.06]">
                      {creatorActivities.slice(0, 6).map((activity) => (
                        <article key={activity.signature} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <a
                              href={`https://solscan.io/tx/${encodeURIComponent(activity.signature)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs text-solana-blue hover:underline"
                            >
                              {truncate(activity.signature)}
                            </a>
                            <p className="mt-1 text-[11px] text-white/40">
                              {activity.blockTime ? new Date(activity.blockTime * 1000).toLocaleString() : `Slot ${activity.slot}`}
                              {activity.counterparties[0] && ` · Signer ${truncate(activity.counterparties[0])}`}
                            </p>
                            {activity.tokenChanges.length > 0 && (
                              <p className="mt-1 break-all text-[11px] text-white/45">
                                {activity.tokenChanges.slice(0, 2).map((change) => (
                                  <span key={change.mint} className="mr-2">
                                    {change.amount > 0 ? "+" : ""}{change.amount.toLocaleString("en-US", { maximumFractionDigits: 4 })} · {truncate(change.mint)}
                                  </span>
                                ))}
                                {activity.tokenChanges.length > 2 && `+${activity.tokenChanges.length - 2} more token changes`}
                              </p>
                            )}
                          </div>
                          <p className={`font-mono text-xs ${activity.solChange < 0 ? "text-white/75" : "text-solana-blue"}`}>
                            {activity.detailsAvailable
                              ? `${activity.solChange > 0 ? "+" : ""}${activity.solChange.toFixed(4)} SOL`
                              : "Transaction details unavailable"}
                          </p>
                        </article>
                      ))}
                    </div>
                  ) : !activityLoading && !activityError ? (
                    <p className="mt-4 text-xs text-white/40">No recent creator transactions were returned by the selected RPC.</p>
                  ) : null}
                </>
              )}
            </section>

            <section className="rounded-xl border border-white/10 bg-black/15 p-4 sm:p-5" aria-label="Observed token traders">
              <h3 className="font-semibold text-white">Observed token traders</h3>
              <p className="mt-1 text-xs leading-5 text-white/45">
                Wallets present in the loaded market trades. Trading activity alone does not establish insider status.
              </p>
              {observedTraders.length ? (
                <div className="mt-3 divide-y divide-white/[0.06]">
                  {observedTraders.map((trader) => (
                    <div key={trader.address} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <a
                          href={`/scan?address=${encodeURIComponent(trader.address)}`}
                          className="font-mono text-xs text-solana-blue hover:underline"
                        >
                          {truncate(trader.address)}
                        </a>
                        <p className="mt-1 text-[11px] text-white/40">
                          {trader.trades} trades · {trader.buys} buys · {trader.sells} sells
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-xs text-white/70">
                        {trader.solVolume.toFixed(3)} SOL
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-white/45">No recent swaps are currently reported for this token&apos;s market.</p>
              )}
            </section>
          </div>

          <p className="text-[11px] leading-5 text-white/35">
            Public-chain observations are not proof of intent or coordination. The tracker cannot predict a rug pull;
            it can surface creator movements and recent market activity for your own review.
          </p>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
