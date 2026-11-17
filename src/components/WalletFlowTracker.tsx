"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

interface WalletActivity {
  signature: string;
  slot: number;
  blockTime: number | null;
  success: boolean;
  detailsAvailable: boolean;
  solChange: number;
  tokenChanges: { mint: string; amount: number }[];
  counterparties: string[];
  programs: string[];
  feeLamports: number | null;
}

interface ActivityResponse {
  address: string;
  balanceSol: number;
  activities: WalletActivity[];
  fetchedAt: number;
  error?: string;
}

type ActivityFilter = "all" | "incoming" | "outgoing" | "other" | "unverified";

const ACTIVITY_LIMIT = 24;
const REFRESH_INTERVAL = 15_000;

function isIncoming(activity: WalletActivity) {
  return activity.solChange > 0 || activity.tokenChanges.some((token) => token.amount > 0);
}

function isOutgoing(activity: WalletActivity) {
  return activity.solChange < 0 || activity.tokenChanges.some((token) => token.amount < 0);
}

function shortAddress(address: string, start = 7, end = 5) {
  return `${address.slice(0, start)}…${address.slice(-end)}`;
}

function formatAmount(value: number, digits = 4) {
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function eventColor(activity: WalletActivity) {
  if (!activity.success) return "#ff4d6d";
  if (!activity.detailsAvailable) return "#fbbf24";
  if (isIncoming(activity) && !isOutgoing(activity)) return "#62c99b";
  if (isOutgoing(activity) && !isIncoming(activity)) return "#87958f";
  return "#b1c2b9";
}

export function WalletFlowTracker({ initialAddress = "" }: { initialAddress?: string }) {
  const [addressInput, setAddressInput] = useState(initialAddress);
  const [watchedAddress, setWatchedAddress] = useState("");
  const [activities, setActivities] = useState<WalletActivity[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [selectedSignature, setSelectedSignature] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState("");
  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);

  const loadActivities = useCallback(async (address: string, silent = false) => {
    if (silent && inFlightRef.current) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestId = ++requestIdRef.current;
    inFlightRef.current = true;
    setError("");
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({
        address,
        limit: String(ACTIVITY_LIMIT),
      });
      const response = await fetch(`/api/wallet-tracker?${params.toString()}`, {
        signal: controller.signal,
      });
      const data = (await response.json()) as ActivityResponse;
      if (!response.ok) {
        throw new Error(data.error || "Could not load wallet transaction activity.");
      }
      if (requestId !== requestIdRef.current) return;

      setWatchedAddress(address);
      setActivities(data.activities);
      setBalance(data.balanceSol);
      setLastUpdated(data.fetchedAt);
      setSelectedSignature((current) =>
        data.activities.some((activity) => activity.signature === current)
          ? current
          : data.activities[0]?.signature ?? null
      );
      setIsTracking(true);
    } catch (requestError) {
      if (!controller.signal.aborted && requestId === requestIdRef.current) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Could not load wallet transaction activity."
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        inFlightRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!initialAddress) return;
    setAddressInput(initialAddress);
    void loadActivities(initialAddress);
  }, [initialAddress, loadActivities]);

  useEffect(() => {
    if (!isTracking || !watchedAddress) return;
    const interval = window.setInterval(() => {
      void loadActivities(watchedAddress, true);
    }, REFRESH_INTERVAL);
    return () => window.clearInterval(interval);
  }, [isTracking, loadActivities, watchedAddress]);

  useEffect(() => () => {
    requestIdRef.current += 1;
    controllerRef.current?.abort();
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const address = addressInput.trim();
    if (!address) return;
    setWatchedAddress("");
    setActivities([]);
    setSelectedSignature(null);
    setBalance(null);
    setLastUpdated(null);
    setIsTracking(false);
    void loadActivities(address);
  };

  const visibleActivities = useMemo(
    () => activities.filter((activity) => {
      if (filter === "incoming") return activity.detailsAvailable && isIncoming(activity);
      if (filter === "outgoing") return activity.detailsAvailable && isOutgoing(activity);
      if (filter === "other") {
        return activity.detailsAvailable && !isIncoming(activity) && !isOutgoing(activity);
      }
      if (filter === "unverified") return !activity.detailsAvailable;
      return true;
    }),
    [activities, filter]
  );
  const selectedActivity =
    visibleActivities.find((activity) => activity.signature === selectedSignature) ??
    visibleActivities[0] ??
    null;

  const plottedActivities = visibleActivities.slice(0, 24).map((activity, index, list) => {
    const ring = index < 12 ? 155 : 245;
    const ringIndex = index < 12 ? index : index - 12;
    const ringCount = index < 12 ? Math.min(list.length, 12) : Math.min(list.length - 12, 12);
    const angle = -Math.PI / 2 + (ringIndex / Math.max(1, ringCount)) * Math.PI * 2;
    return {
      activity,
      x: 490 + Math.cos(angle) * ring,
      y: 250 + Math.sin(angle) * ring * 0.72,
    };
  });

  return (
    <div className="min-h-screen bg-solana-dark px-4 py-8 text-white sm:px-6 lg:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-solana-blue">
              On-chain activity / live map
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Fly Map <span className="text-white/45">Wallet Tracker</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
              Explore recent transactions for a public Solana wallet. Every point comes from its RPC signature history;
              unavailable transaction details stay clearly marked.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-solana-blue/20 bg-solana-blue/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-solana-blue/80">
            <span className={`h-1.5 w-1.5 rounded-full ${isTracking ? "animate-pulse bg-solana-blue" : "bg-white/30"}`} />
            {isTracking ? "Live · 15s refresh" : "Read-only"}
          </span>
        </div>

        <form onSubmit={submit} className="tracker-panel grid gap-3 rounded-2xl p-4 sm:grid-cols-[1fr_auto]">
          <label className="min-w-0">
            <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Solana wallet address
            </span>
            <input
              value={addressInput}
              onChange={(event) => setAddressInput(event.target.value)}
              placeholder="Paste a wallet address to map its recent activity"
              maxLength={44}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-white/10 bg-solana-dark/80 px-4 py-3 font-mono text-sm text-white outline-none transition placeholder:text-white/25 focus:border-solana-blue/50 focus:ring-2 focus:ring-solana-blue/10"
              aria-label="Solana wallet address"
            />
          </label>
          <div className="flex items-end gap-2">
            {watchedAddress && (
              <>
                <button
                  type="button"
                  onClick={() => setIsTracking((current) => !current)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs text-white/65 transition hover:bg-white/10"
                >
                  {isTracking ? "Pause" : "Resume"}
                </button>
                <button
                  type="button"
                  onClick={() => void loadActivities(watchedAddress)}
                  disabled={refreshing || loading}
                  className="rounded-xl border border-solana-purple/25 bg-solana-purple/10 px-3 py-3 text-xs text-solana-blue transition hover:bg-solana-purple/20 disabled:opacity-50"
                >
                  Refresh
                </button>
              </>
            )}
            <button
              type="submit"
              disabled={loading || !addressInput.trim()}
              className="tracker-button rounded-xl px-5 py-3 text-sm font-semibold text-[#07120f] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Loading map…" : "Track wallet"}
            </button>
          </div>
        </form>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-risk-moderate/20 bg-risk-moderate/5 px-4 py-3 text-sm text-risk-moderate">
            {error}
          </p>
        )}

        {watchedAddress && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/40">
            <span className="font-mono">WATCHING {shortAddress(watchedAddress, 10, 8)}</span>
            <span>
              {balance === null ? "Balance unavailable" : `${formatAmount(balance)} SOL balance`}
              {lastUpdated ? ` · Synced ${new Date(lastUpdated).toLocaleTimeString()}` : ""}
              {refreshing ? " · Syncing…" : ""}
            </span>
          </div>
        )}

        <section className="tracker-panel mt-6 overflow-hidden rounded-2xl" aria-label="Interactive wallet flow map">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
            <div>
              <h2 className="font-semibold text-white">Transaction flow map</h2>
              <p className="mt-1 text-[11px] text-white/40">
                {visibleActivities.length
                  ? `Showing ${plottedActivities.length} of ${visibleActivities.length} filtered transactions`
                  : "A live map will appear when a wallet is loaded"}
              </p>
            </div>
            <div className="flex flex-wrap gap-1 rounded-lg border border-white/10 bg-black/20 p-1" role="group" aria-label="Filter map activity">
              {(["all", "incoming", "outgoing", "other", "unverified"] as ActivityFilter[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  aria-pressed={filter === option}
                  className={`rounded-md px-2.5 py-1.5 text-[10px] capitalize transition ${
                    filter === option ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {loading && activities.length === 0 ? (
            <div className="flex min-h-72 items-center justify-center text-sm text-white/45" role="status">
              Loading recent transaction signatures…
            </div>
          ) : !watchedAddress ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-solana-blue/20 bg-solana-blue/[0.06] text-lg text-solana-blue" aria-hidden="true">⌁</span>
              <p className="text-sm font-medium text-white/75">Start with a wallet address</p>
              <p className="mt-1 max-w-md text-xs leading-5 text-white/40">
                The graph uses real transaction signatures and decoded balance changes returned by the configured RPC.
              </p>
            </div>
          ) : visibleActivities.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <p className="text-sm font-medium text-white/75">
                {activities.length ? "No transactions match this filter" : "No recent transactions returned"}
              </p>
              <p className="mt-1 max-w-md text-xs leading-5 text-white/40">
                {activities.length
                  ? "Choose another filter to inspect the loaded activity."
                  : "The RPC returned no signatures for this wallet. Refresh to check again."}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto bg-solana-dark">
                <svg
                  viewBox="0 0 980 500"
                  className="block h-[390px] min-w-[760px] w-full sm:h-[480px]"
                  role="img"
                  aria-label="Interactive graph of recent wallet transactions"
                >
                  <defs>
                    <pattern id="wallet-flow-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
                    </pattern>
                    <radialGradient id="wallet-flow-glow">
                      <stop offset="0%" stopColor="#62c99b" stopOpacity=".2" />
                      <stop offset="100%" stopColor="#62c99b" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <rect width="980" height="500" fill="url(#wallet-flow-grid)" />
                  <circle cx="490" cy="250" r="112" fill="none" stroke="rgba(98,201,155,0.13)" strokeDasharray="3 8" />
                  <circle cx="490" cy="250" r="202" fill="none" stroke="rgba(98,201,155,0.08)" strokeDasharray="2 10" />

                  {plottedActivities.map(({ activity, x, y }) => (
                    <line
                      key={`edge-${activity.signature}`}
                      x1="490"
                      y1="250"
                      x2={x}
                      y2={y}
                      stroke={eventColor(activity)}
                      strokeOpacity={selectedActivity?.signature === activity.signature ? ".58" : ".2"}
                      strokeWidth={selectedActivity?.signature === activity.signature ? "2" : "1"}
                    />
                  ))}

                  {plottedActivities.map(({ activity, x, y }) => {
                    const selected = selectedActivity?.signature === activity.signature;
                    const color = eventColor(activity);
                    return (
                      <g
                        key={activity.signature}
                        role="button"
                        tabIndex={0}
                        aria-pressed={selected}
                        aria-label={`${activity.success ? "Confirmed" : "Failed"} transaction ${shortAddress(activity.signature)}${activity.detailsAvailable ? `, ${formatAmount(activity.solChange)} SOL net change` : ", transaction details unavailable"}`}
                        onClick={() => setSelectedSignature(activity.signature)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedSignature(activity.signature);
                          }
                        }}
                        className="cursor-pointer outline-none"
                      >
                        <circle cx={x} cy={y} r="18" fill="transparent" pointerEvents="all" />
                        {selected && <circle cx={x} cy={y} r="25" fill={color} fillOpacity=".12" />}
                        <circle
                          cx={x}
                          cy={y}
                          r={selected ? 9 : 7}
                          fill={color}
                          stroke={selected ? "#fff" : color}
                          strokeWidth={selected ? 2 : 1}
                        />
                        <text
                          x={x}
                          y={y + 22}
                          textAnchor="middle"
                          className="fill-white/55 font-mono text-[9px]"
                        >
                          {shortAddress(activity.signature, 4, 3)}
                        </text>
                      </g>
                    );
                  })}

                  <circle cx="490" cy="250" r="58" fill="url(#wallet-flow-glow)" />
                  <circle cx="490" cy="250" r="35" fill="#15201b" stroke="#62c99b" strokeOpacity=".75" strokeWidth="2" />
                  <circle cx="490" cy="250" r="5" fill="#62c99b" />
                  <text x="490" y="304" textAnchor="middle" className="fill-white/75 font-mono text-[10px]">
                    {shortAddress(watchedAddress, 6, 5)}
                  </text>
                  <text x="490" y="322" textAnchor="middle" className="fill-white/35 text-[9px] uppercase tracking-[2px]">
                    Watched wallet
                  </text>
                </svg>
              </div>

              <div className="grid gap-4 border-t border-white/[0.07] p-4 sm:p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-white/45" aria-label="Flow map legend">
                  <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#62c99b]" />Incoming</span>
                  <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#87958f]" />Outgoing</span>
                  <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#b1c2b9]" />Interaction</span>
                  <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-300" />Details unavailable</span>
                  <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#ff4d6d]" />Failed</span>
                </div>

                {selectedActivity ? (
                  <article className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4" aria-label="Selected map transaction">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35">Selected transaction</p>
                        <a
                          href={`https://solscan.io/tx/${encodeURIComponent(selectedActivity.signature)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block break-all font-mono text-[11px] text-solana-blue hover:underline"
                        >
                          {shortAddress(selectedActivity.signature, 12, 8)}
                        </a>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] ${
                        !selectedActivity.success
                          ? "border-risk-critical/25 bg-risk-critical/10 text-risk-critical"
                          : selectedActivity.detailsAvailable
                            ? "border-solana-blue/20 bg-solana-blue/[0.05] text-solana-blue"
                            : "border-amber-300/20 bg-amber-300/[0.05] text-amber-200"
                      }`}>
                        {!selectedActivity.success
                          ? "Failed"
                          : selectedActivity.detailsAvailable
                            ? "Decoded"
                            : "Unverified"}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-[10px]">
                      <Detail label="SOL change" value={selectedActivity.detailsAvailable
                        ? `${selectedActivity.solChange > 0 ? "+" : ""}${formatAmount(selectedActivity.solChange)} SOL`
                        : "Unavailable"} />
                      <Detail label="Slot" value={String(selectedActivity.slot)} />
                      <Detail label="Time" value={selectedActivity.blockTime
                        ? new Date(selectedActivity.blockTime * 1000).toLocaleString()
                        : "Unavailable"} />
                      <Detail label="Token changes" value={selectedActivity.detailsAvailable
                        ? String(selectedActivity.tokenChanges.length)
                        : "Unavailable"} />
                    </div>
                  </article>
                ) : (
                  <p className="text-xs text-white/40">Select a transaction point to inspect it.</p>
                )}
              </div>
              <p className="border-t border-white/[0.06] px-4 py-3 text-[10px] leading-5 text-white/30 sm:px-5">
                Each point represents a real signature associated with the watched wallet; lines connect the wallet to its transactions, not to an inferred recipient. Unknown or missing RPC details are not treated as zero-value transfers or evidence of intent.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-black/20 px-2.5 py-2">
      <p className="text-[8px] uppercase tracking-[0.12em] text-white/35">{label}</p>
      <p className="mt-1 break-words text-white/70">{value}</p>
    </div>
  );
}
