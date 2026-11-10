"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

interface WalletActivity {
  signature: string;
  slot: number;
  blockTime: number | null;
  success: boolean;
  detailsAvailable: boolean;
  solChange: number;
  tokenChanges: { mint: string; amount: number }[];
  counterparties: string[];
  feeLamports: number | null;
}

interface TrackerResponse {
  address: string;
  balanceSol: number;
  activities: WalletActivity[];
  detailsAvailable: boolean;
  hasMore: boolean;
  fetchedAt: number;
}

type ActivityFilter = "all" | "incoming" | "outgoing" | "other";

const INITIAL_LIMIT = 20;
const LIVE_LIMIT = 50;
const REFRESH_INTERVAL = 15_000;

function isIncoming(activity: WalletActivity) {
  return activity.solChange > 0 || activity.tokenChanges.some((token) => token.amount > 0);
}

function isOutgoing(activity: WalletActivity) {
  return activity.solChange < 0 || activity.tokenChanges.some((token) => token.amount < 0);
}

function formatAmount(amount: number, maximumFractionDigits = 5) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(amount);
}

function truncate(value: string, start = 8, end = 6) {
  return `${value.slice(0, start)}...${value.slice(-end)}`;
}

export function WalletTracker() {
  const [addressInput, setAddressInput] = useState("");
  const [watchedAddress, setWatchedAddress] = useState("");
  const [activities, setActivities] = useState<WalletActivity[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [detailsAvailable, setDetailsAvailable] = useState<boolean | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const latestSignature = useRef<string | null>(null);
  const requestInFlight = useRef(false);
  const backlog = useRef<{ before: string; until: string } | null>(null);

  const requestActivity = useCallback(
    async (
      address: string,
      options: { before?: string; until?: string; limit: number }
    ): Promise<TrackerResponse> => {
      const params = new URLSearchParams({
        address,
        limit: String(options.limit),
      });
      if (options.before) params.set("before", options.before);
      if (options.until) params.set("until", options.until);

      const response = await fetch(`/api/wallet-tracker?${params.toString()}`);
      const data = (await response.json()) as TrackerResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Could not retrieve wallet activity.");
      }
      return data;
    },
    []
  );

  const startTracking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const address = addressInput.trim();
    if (!address) return;

    setIsLoading(true);
    setError("");
    setActivities([]);
    setBalance(null);
    latestSignature.current = null;
    backlog.current = null;
    try {
      const result = await requestActivity(address, { limit: INITIAL_LIMIT });
      setWatchedAddress(address);
      setActivities(result.activities);
      setBalance(result.balanceSol);
      setDetailsAvailable(result.detailsAvailable);
      setHasMore(result.hasMore);
      latestSignature.current = result.activities[0]?.signature ?? null;
      setLastUpdated(result.fetchedAt);
      setIsTracking(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not retrieve wallet activity."
      );
      setIsTracking(false);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshLatest = useCallback(async () => {
    if (!watchedAddress || requestInFlight.current) return;
    requestInFlight.current = true;
    setIsRefreshing(true);
    setError("");
    try {
      const previousLatest = latestSignature.current;
      const result = await requestActivity(watchedAddress, {
        limit: LIVE_LIMIT,
        ...(backlog.current
          ? { before: backlog.current.before, until: backlog.current.until }
          : previousLatest
            ? { until: previousLatest }
            : {}),
      });
      if (result.activities.length > 0) {
        setActivities((current) => {
          const known = new Set(current.map((activity) => activity.signature));
          const additions = result.activities.filter(
            (activity) => !known.has(activity.signature)
          );
          return [...additions, ...current].sort((a, b) => b.slot - a.slot);
        });
        if (!backlog.current) {
          latestSignature.current = result.activities[0].signature;
        }
      }
      setBalance(result.balanceSol);
      setDetailsAvailable((current) =>
        current === false ? result.detailsAvailable : current
      );
      setLastUpdated(result.fetchedAt);
      if (backlog.current) {
        if (result.hasMore && result.activities.length > 0) {
          backlog.current.before = result.activities[result.activities.length - 1].signature;
        } else {
          backlog.current = null;
        }
      } else if (result.hasMore && previousLatest && result.activities.length > 0) {
        backlog.current = {
          before: result.activities[result.activities.length - 1].signature,
          until: previousLatest,
        };
      }
      if (backlog.current) {
        setError("High activity detected. Catching up; keep the monitor open.");
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not refresh wallet activity."
      );
    } finally {
      requestInFlight.current = false;
      setIsRefreshing(false);
    }
  }, [requestActivity, watchedAddress]);

  const loadOlder = async () => {
    const oldestSignature = activities[activities.length - 1]?.signature;
    if (!watchedAddress || !oldestSignature) return;

    setIsRefreshing(true);
    setError("");
    try {
      const result = await requestActivity(watchedAddress, {
        before: oldestSignature,
        limit: INITIAL_LIMIT,
      });
      setActivities((current) => [...current, ...result.activities]);
      setHasMore(result.hasMore);
      setBalance(result.balanceSol);
      setLastUpdated(result.fetchedAt);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load older activity."
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isTracking || !watchedAddress) return;
    const interval = window.setInterval(() => {
      void refreshLatest();
    }, REFRESH_INTERVAL);
    return () => window.clearInterval(interval);
  }, [isTracking, refreshLatest, watchedAddress]);

  const stopTracking = () => setIsTracking(false);
  const visibleActivities = activities.filter((activity) => {
    if (filter === "incoming") return isIncoming(activity);
    if (filter === "outgoing") return isOutgoing(activity);
    if (filter === "other") return !isIncoming(activity) && !isOutgoing(activity);
    return true;
  });

  const incomingCount = activities.filter(isIncoming).length;
  const outgoingCount = activities.filter(isOutgoing).length;

  return (
    <section className="wallet-tracker min-h-[calc(100dvh-8rem)] overflow-hidden px-4 py-8 sm:px-6 lg:py-12">
      <div className="tracker-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-solana-blue/20 bg-solana-blue/5 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-solana-blue">
            <span className={`h-2 w-2 rounded-full ${isTracking ? "animate-pulse bg-solana-blue" : "bg-white/30"}`} />
            Solana mainnet monitor
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="h-px w-8 bg-solana-purple/50" />
            READ-ONLY · PUBLIC CHAIN DATA
          </div>
        </div>

        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="py-2">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-solana-purple">
              Wallet signal / 01
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Watch the
              <span className="tracker-gradient block">on-chain pulse.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
              Follow public Solana wallet activity as it lands. See SOL and token balance changes,
              transaction status, and on-chain signatures in one live feed.
            </p>
          </div>

          <div className="tracker-radar mx-auto flex h-48 w-48 items-center justify-center sm:h-56 sm:w-56" aria-hidden="true">
            <div className="tracker-radar__ring tracker-radar__ring--outer" />
            <div className="tracker-radar__ring tracker-radar__ring--middle" />
            <div className="tracker-radar__ring tracker-radar__ring--inner" />
            <div className="tracker-radar__sweep" />
            <div className="tracker-radar__core">
              <svg viewBox="0 0 24 24" className="h-8 w-8 text-solana-blue" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 3 4.5 6v5.5c0 4.4 3.2 7.7 7.5 9.5 4.3-1.8 7.5-5.1 7.5-9.5V6L12 3Z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <span className="tracker-radar__blip tracker-radar__blip--one" />
            <span className="tracker-radar__blip tracker-radar__blip--two" />
            <span className="tracker-radar__blip tracker-radar__blip--three" />
          </div>
        </div>

        <form
          onSubmit={startTracking}
          className="tracker-panel mt-8 grid gap-3 rounded-2xl p-4 sm:grid-cols-[1fr_auto] sm:p-5"
        >
          <label className="min-w-0">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
              Solana wallet address
            </span>
            <input
              value={addressInput}
              onChange={(event) => setAddressInput(event.target.value)}
              placeholder="Paste a public address to start monitoring"
              maxLength={44}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-white/10 bg-[#080b18]/80 px-4 py-3.5 font-mono text-sm text-white outline-none transition placeholder:text-white/25 focus:border-solana-blue/50 focus:ring-2 focus:ring-solana-blue/10"
              aria-label="Solana wallet address"
            />
          </label>
          {isTracking ? (
            <button
              type="button"
              onClick={stopTracking}
              className="self-end rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10"
            >
              Pause monitor
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading || !addressInput.trim()}
              className="tracker-button self-end rounded-xl px-6 py-3.5 text-sm font-semibold text-[#07120f] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Connecting signal..." : watchedAddress ? "Track this wallet" : "Start tracking"}
            </button>
          )}
        </form>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-white/35">
          <span>Updates every 15 seconds while this page is open.</span>
          {watchedAddress && (
            <span className="font-mono">
              WATCHING {truncate(watchedAddress, 10, 8)}
            </span>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-risk-moderate/20 bg-risk-moderate/5 px-4 py-3 text-sm text-risk-moderate" role="status">
            {error}
          </p>
        )}
        {detailsAvailable === false && !error && (
          <p className="mt-4 rounded-xl border border-risk-moderate/20 bg-risk-moderate/5 px-4 py-3 text-sm text-risk-moderate" role="status">
            Transaction signatures are available, but this RPC could not decode some transaction details. Try refreshing in a moment.
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="Current balance" value={balance === null ? "—" : `${formatAmount(balance, 4)} SOL`} detail="Confirmed network balance" />
          <StatCard label="Incoming activity" value={String(incomingCount).padStart(2, "0")} detail="In the loaded feed" accent="text-solana-blue" />
          <StatCard label="Outgoing activity" value={String(outgoingCount).padStart(2, "0")} detail="In the loaded feed" accent="text-solana-purple" />
        </div>

        <section className="tracker-panel mt-6 rounded-2xl p-4 sm:p-6" aria-label="Wallet activity feed">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${isTracking ? "animate-pulse bg-solana-blue" : "bg-white/25"}`} />
                <h2 className="text-lg font-semibold text-white">Activity stream</h2>
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/45">
                  {activities.length} EVENTS
                </span>
              </div>
              <p className="mt-1 text-xs text-white/40">
                {lastUpdated
                  ? `Last synced ${new Date(lastUpdated).toLocaleTimeString()}`
                  : "Enter an address to load its latest activity."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-white/10 bg-black/20 p-1" role="group" aria-label="Filter activity">
                {(["all", "incoming", "outgoing", "other"] as ActivityFilter[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFilter(option)}
                    className={`rounded-md px-2.5 py-1.5 text-[11px] capitalize transition ${
                      filter === option ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {watchedAddress && (
                <button
                  type="button"
                  onClick={() => void refreshLatest()}
                  disabled={isRefreshing}
                  className="rounded-lg border border-solana-purple/25 bg-solana-purple/10 px-3 py-2 text-xs font-medium text-solana-blue transition hover:bg-solana-purple/20 disabled:opacity-50"
                >
                  {isRefreshing ? "Syncing..." : "Refresh"}
                </button>
              )}
            </div>
          </div>

          {visibleActivities.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-6 text-center">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-solana-blue/15 bg-solana-blue/5">
                <span className="h-2 w-2 rounded-full bg-solana-blue/70" />
              </div>
              <p className="text-sm font-medium text-white/70">
                {activities.length ? "No events match this filter" : "Your signal feed is standing by"}
              </p>
              <p className="mt-1 max-w-md text-xs leading-5 text-white/35">
                {activities.length
                  ? "Choose another filter to see more activity."
                  : "Paste a public Solana address above to load recent transactions and begin monitoring."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {visibleActivities.map((activity, index) => (
                <ActivityRow key={activity.signature} activity={activity} isNew={index === 0 && isTracking} />
              ))}
            </div>
          )}

          {hasMore && watchedAddress && activities.length > 0 && (
            <button
              type="button"
              onClick={() => void loadOlder()}
              disabled={isRefreshing}
              className="mt-4 w-full rounded-xl border border-white/10 py-3 text-xs font-medium text-white/55 transition hover:border-white/20 hover:text-white disabled:opacity-50"
            >
              Load older activity
            </button>
          )}
        </section>

        <p className="mx-auto mt-5 max-w-4xl text-center text-[11px] leading-5 text-white/30">
          Read-only monitor of public Solana data. It does not identify wallet owners or guarantee a complete feed;
          RPC providers may limit history or delay updates. Keep this page open for live polling.
        </p>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  detail,
  accent = "text-white",
}: {
  label: string;
  value: string;
  detail: string;
  accent?: string;
}) {
  return (
    <div className="tracker-panel rounded-2xl px-5 py-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold ${accent}`}>{value}</p>
      <p className="mt-1 text-xs text-white/35">{detail}</p>
    </div>
  );
}

function ActivityRow({ activity, isNew }: { activity: WalletActivity; isNew: boolean }) {
  const incoming = isIncoming(activity);
  const outgoing = isOutgoing(activity);
  const direction = incoming && !outgoing ? "Incoming" : outgoing && !incoming ? "Outgoing" : "Interaction";
  const directionColor = incoming && !outgoing
    ? "text-solana-blue border-solana-blue/20 bg-solana-blue/5"
    : outgoing && !incoming
      ? "text-solana-purple border-solana-purple/20 bg-solana-purple/5"
      : "text-white/55 border-white/10 bg-white/5";

  return (
    <article className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 ${isNew ? "tracker-entry" : ""}`}>
      <div className="flex min-w-0 items-start gap-3">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${directionColor}`}>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" d={incoming && !outgoing ? "M12 19V5m0 0-5 5m5-5 5 5" : outgoing && !incoming ? "M12 5v14m0 0 5-5m-5 5-5-5" : "M7 12h10m0 0-4-4m4 4-4 4"} />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${directionColor}`}>
              {direction}
            </span>
            <span className={`text-[10px] ${!activity.detailsAvailable ? "text-risk-moderate" : activity.success ? "text-white/35" : "text-risk-critical"}`}>
              {!activity.detailsAvailable ? "Details unavailable" : activity.success ? "Confirmed" : "Failed"}
            </span>
          </div>
          <p className="mt-1.5 font-mono text-xs text-white/55">
            {activity.signature.slice(0, 14)}…{activity.signature.slice(-8)}
          </p>
          <p className="mt-1 text-[11px] text-white/30">
            {activity.blockTime ? new Date(activity.blockTime * 1000).toLocaleString() : "Time unavailable"}
            {" · "}Slot {activity.slot}
            {activity.counterparties[0] && <>{" · "}Signer {truncate(activity.counterparties[0], 5, 4)}</>}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pl-12 sm:justify-end sm:pl-0">
        <div className="text-left sm:text-right">
          {activity.solChange !== 0 ? (
            <p className={`font-mono text-sm font-semibold ${activity.solChange > 0 ? "text-solana-blue" : "text-white/75"}`}>
              {activity.solChange > 0 ? "+" : ""}{formatAmount(activity.solChange)} SOL
            </p>
          ) : (
            activity.tokenChanges.length === 0 && (
              <p className="font-mono text-sm text-white/45">Program interaction</p>
            )
          )}
          {activity.tokenChanges.map((change) => (
            <p
              key={change.mint}
              className={`mt-1 font-mono text-[10px] ${change.amount > 0 ? "text-solana-blue/80" : "text-white/45"}`}
            >
              {change.amount > 0 ? "+" : ""}{formatAmount(change.amount)} · {truncate(change.mint, 5, 4)}
            </p>
          ))}
          {activity.feeLamports !== null && (
            <p className="mt-1 text-[10px] text-white/30">
              Fee {(activity.feeLamports / 1_000_000_000).toFixed(6)} SOL
            </p>
          )}
        </div>
        <a
          href={`https://solscan.io/tx/${activity.signature}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-white/10 px-3 py-2 text-[11px] text-white/45 transition hover:border-solana-purple/30 hover:text-solana-blue"
        >
          Explorer ↗
        </a>
      </div>
    </article>
  );
}
