"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { ScanResult } from "@/lib/types";

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

function getFindingSeverityColor(severity: ScanResult["findings"][number]["severity"]) {
  switch (severity) {
    case "CRITICAL":
      return "text-risk-critical";
    case "HIGH":
      return "text-risk-high";
    case "MEDIUM":
      return "text-risk-moderate";
    case "LOW":
      return "text-risk-low";
    default:
      return "text-white/50";
  }
}

type ActivitySignal = "flagged" | "failed" | "review" | "confirmed" | "unknown";

function getActivityFinding(
  activity: WalletActivity,
  scanResult: ScanResult | null
): ScanResult["findings"][number] | undefined {
  return scanResult?.findings.find((finding) =>
    finding.affectedTransactions?.includes(activity.signature)
  );
}

function getActivitySignal(activity: WalletActivity, scanResult: ScanResult | null): ActivitySignal {
  const scannedTransaction = scanResult?.transactions.find(
    (transaction) => transaction.signature === activity.signature
  );
  const finding = getActivityFinding(activity, scanResult);
  if (
    scannedTransaction?.riskStatus === "flagged" ||
    finding?.severity === "CRITICAL" ||
    finding?.severity === "HIGH"
  ) {
    return "flagged";
  }
  if (scannedTransaction?.riskStatus === "suspicious" || finding) return "review";
  if (!activity.success) return "failed";
  if (!activity.detailsAvailable) return "unknown";
  return "confirmed";
}

export function WalletTracker() {
  const [addressInput, setAddressInput] = useState("");
  const [watchedAddress, setWatchedAddress] = useState("");
  const [activities, setActivities] = useState<WalletActivity[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [detailsAvailable, setDetailsAvailable] = useState<boolean | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [selectedActivitySignature, setSelectedActivitySignature] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const latestSignature = useRef<string | null>(null);
  const requestInFlight = useRef(false);
  const backlog = useRef<{ before: string; until: string } | null>(null);
  const scanController = useRef<AbortController | null>(null);
  const scanRequestId = useRef(0);

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

  const scanWallet = async (address: string) => {
    scanController.current?.abort();
    const controller = new AbortController();
    scanController.current = controller;
    const requestId = ++scanRequestId.current;
    setIsScanning(true);
    setScanError("");
    setScanResult(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
        signal: controller.signal,
      });
      const data = (await response.json()) as ScanResult & { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Wallet security scan failed.");
      }
      if (requestId === scanRequestId.current) setScanResult(data);
    } catch (scanRequestError) {
      if (!controller.signal.aborted && requestId === scanRequestId.current) {
        setScanError(
          scanRequestError instanceof Error
            ? scanRequestError.message
            : "Wallet security scan failed."
        );
      }
    } finally {
      if (!controller.signal.aborted && requestId === scanRequestId.current) {
        setIsScanning(false);
      }
    }
  };

  const startTracking = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const address = addressInput.trim();
    if (!address) return;

    setIsLoading(true);
    setError("");
    setActivities([]);
    setSelectedActivitySignature(null);
    setBalance(null);
    setScanResult(null);
    await scanWallet(address);
    latestSignature.current = null;
    backlog.current = null;
    try {
      const result = await requestActivity(address, { limit: INITIAL_LIMIT });
      setWatchedAddress(address);
      setActivities(result.activities);
      setSelectedActivitySignature(result.activities[0]?.signature ?? null);
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
      setDetailsAvailable((current) =>
        current === false ? current : result.detailsAvailable
      );
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

  useEffect(() => () => {
    scanController.current?.abort();
  }, []);

  const stopTracking = () => setIsTracking(false);
  const visibleActivities = activities.filter((activity) => {
    if (filter === "incoming") return isIncoming(activity);
    if (filter === "outgoing") return isOutgoing(activity);
    if (filter === "other") return !isIncoming(activity) && !isOutgoing(activity);
    return true;
  });

  const selectedActivity =
    visibleActivities.find((activity) => activity.signature === selectedActivitySignature) ??
    visibleActivities[0] ??
    null;
  const decodedActivities = activities.filter((activity) => activity.detailsAvailable);
  const hasUndecodedActivity = decodedActivities.length < activities.length;
  const incomingCount = decodedActivities.filter(isIncoming).length;
  const outgoingCount = decodedActivities.filter(isOutgoing).length;
  const activityCountDetail = !watchedAddress
    ? "Load a wallet to count"
    : hasUndecodedActivity
      ? `From ${decodedActivities.length} decoded ${decodedActivities.length === 1 ? "event" : "events"}`
      : "In the loaded feed";
  const activityCountsUnavailable =
    !watchedAddress || isLoading || (activities.length > 0 && decodedActivities.length === 0);

  return (
    <section className="wallet-tracker min-h-[calc(100dvh-8rem)] overflow-hidden px-4 py-8 sm:px-6 lg:py-12">
      <div className="tracker-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-solana-blue/20 bg-solana-blue/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-solana-blue">
            <span className={`h-2 w-2 rounded-full ${isTracking ? "animate-pulse bg-solana-blue" : "bg-white/30"}`} />
            Solana mainnet · read only
          </div>
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-white/35">
            <span className="h-px w-8 bg-white/15" />
            No custody · Public data
          </div>
        </div>

        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="py-2">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-solana-blue">
              Wallet security · Live monitoring
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Security starts with
              <span className="tracker-gradient block">visibility.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/55 sm:text-base">
              Scan any public Solana wallet, review the evidence, then follow confirmed SOL and token
              activity as it happens.
            </p>
          </div>

          <div className="tracker-atom mx-auto flex h-48 w-48 items-center justify-center sm:h-56 sm:w-56" aria-hidden="true">
            <div className="tracker-atom__orbit tracker-atom__orbit--one"><span /></div>
            <div className="tracker-atom__orbit tracker-atom__orbit--two"><span /></div>
            <div className="tracker-atom__orbit tracker-atom__orbit--three"><span /></div>
            <div className="tracker-atom__nucleus"><span /></div>
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
              placeholder="Paste a public address to scan and monitor"
              maxLength={44}
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-white/10 bg-solana-dark/80 px-4 py-3.5 font-mono text-sm text-white outline-none transition placeholder:text-white/25 focus:border-solana-blue/50 focus:ring-2 focus:ring-solana-blue/10"
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
              {isLoading ? "Scanning wallet..." : "Scan & track wallet"}
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

        {isScanning && (
          <section className="tracker-panel mt-5 overflow-hidden rounded-2xl p-5" role="status" aria-live="polite">
            <div className="flex items-center gap-3">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-solana-blue/25 border-t-solana-blue" />
              <div>
                <h2 className="text-sm font-semibold text-white">Scanning public on-chain activity</h2>
                <p className="mt-1 text-xs text-white/45">
                  Checking wallet state, transaction patterns, token authorities, and threat intelligence…
                </p>
              </div>
            </div>
            <div className="tracker-scan-track mt-4" aria-hidden="true">
              <span className="tracker-scan-line" />
            </div>
          </section>
        )}

        {scanError && (
          <p className="mt-5 rounded-xl border border-risk-moderate/20 bg-risk-moderate/5 px-4 py-3 text-sm text-risk-moderate" role="status">
            Security scan unavailable: {scanError} The live activity monitor can still be used.
          </p>
        )}

        {scanResult && (
          <section className="tracker-panel mt-5 rounded-2xl p-5 sm:p-6" aria-label="Wallet scan results">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">Wallet security scan</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <p className="font-mono text-3xl font-semibold text-white">{scanResult.score}<span className="text-base text-white/40"> / 100</span></p>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
                    {scanResult.riskLevel} RISK
                  </span>
                </div>
                <p className="mt-2 text-sm text-white/55">
                  {scanResult.summary.totalFindings} findings · {scanResult.summary.criticalCount} critical · {scanResult.summary.highCount} high
                  {scanResult.summary.partialScan ? " · Partial scan (some RPC checks unavailable)" : ""}
                </p>
              </div>
              <a
                href={`/scan?address=${encodeURIComponent(scanResult.address)}`}
                className="rounded-lg border border-solana-purple/25 bg-solana-purple/10 px-4 py-2 text-xs font-medium text-solana-blue transition hover:bg-solana-purple/20"
              >
                Open full scan
              </a>
            </div>
            {scanResult.findings.length > 0 ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {scanResult.findings.slice(0, 4).map((finding) => (
                  <article key={finding.id} className="rounded-xl border border-white/10 bg-black/15 p-3">
                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${getFindingSeverityColor(finding.severity)}`}>
                      {finding.severity} · {finding.category.replaceAll("_", " ")}
                    </p>
                    <h3 className="mt-1 text-sm font-medium text-white/85">{finding.title}</h3>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/45">{finding.description}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-solana-blue/10 bg-solana-blue/[0.03] p-3 text-sm text-white/55">
                No findings were returned by the completed checks. This is not a guarantee that the wallet is safe.
              </p>
            )}
          </section>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="Current balance" value={balance === null ? "—" : `${formatAmount(balance, 4)} SOL`} detail="Confirmed network balance" />
          <StatCard
            label="Incoming activity"
            value={activityCountsUnavailable ? "—" : String(incomingCount).padStart(2, "0")}
            detail={activityCountDetail}
            accent="text-solana-blue"
          />
          <StatCard
            label="Outgoing activity"
            value={activityCountsUnavailable ? "—" : String(outgoingCount).padStart(2, "0")}
            detail={activityCountDetail}
            accent="text-solana-purple"
          />
        </div>

        <section className="tracker-panel mt-6 rounded-2xl p-4 sm:p-6" aria-label="Wallet activity scanner">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${isTracking ? "animate-pulse bg-solana-blue" : "bg-white/25"}`} />
                <h2 className="text-lg font-semibold text-white">Transaction scanner</h2>
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/45">
                  {visibleActivities.length} EVENTS
                </span>
              </div>
              <p className="mt-1 text-xs text-white/40">
                {lastUpdated
                  ? `Last synced ${new Date(lastUpdated).toLocaleTimeString()}`
                  : "Enter an address to load its latest activity."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden items-center gap-3 text-[10px] text-white/40 md:flex" aria-label="Transaction signal legend">
                <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#62c99b] shadow-[0_0_8px_rgba(98,201,155,0.45)]" />Confirmed</span>
                <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-risk-critical shadow-[0_0_8px_rgba(255,60,90,0.55)]" />Flagged / failed</span>
                <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-300" />Unverified</span>
              </div>
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
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="tracker-event-list max-h-[34rem] overflow-y-auto rounded-xl border border-white/[0.07] bg-black/15 p-3" role="list" aria-label="Recent transactions">
                {visibleActivities.map((activity, index) => {
                  const signal = getActivitySignal(activity, scanResult);
                  return (
                    <ActivityPoint
                      key={activity.signature}
                      activity={activity}
                      signal={signal}
                      selected={selectedActivity?.signature === activity.signature}
                      isNew={index === 0 && isTracking}
                      onSelect={() => setSelectedActivitySignature(activity.signature)}
                    />
                  );
                })}
              </div>
              {selectedActivity ? (
                <ActivityDetails
                  activity={selectedActivity}
                  signal={getActivitySignal(selectedActivity, scanResult)}
                  finding={getActivityFinding(selectedActivity, scanResult)}
                  watchedAddress={watchedAddress}
                />
              ) : null}
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
          RPC providers may limit history or delay updates. Green marks decoded, confirmed transactions with no scan flag;
          red marks failed or flagged activity. A signal is not proof of insider intent.
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

function ActivityPoint({
  activity,
  signal,
  selected,
  isNew,
  onSelect,
}: {
  activity: WalletActivity;
  signal: ActivitySignal;
  selected: boolean;
  isNew: boolean;
  onSelect: () => void;
}) {
  const incoming = isIncoming(activity);
  const outgoing = isOutgoing(activity);
  const direction = incoming && !outgoing ? "Incoming" : outgoing && !incoming ? "Outgoing" : "Interaction";
  const statusLabel = {
    flagged: "Flagged",
    failed: "Failed",
    review: "Review",
    confirmed: "Confirmed",
    unknown: "Unverified",
  }[signal];
  const dotColor = {
    flagged: "bg-risk-critical shadow-[0_0_12px_rgba(255,60,90,0.8)]",
    failed: "bg-risk-critical shadow-[0_0_12px_rgba(255,60,90,0.8)]",
    review: "bg-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.65)]",
    confirmed: "bg-[#62c99b] shadow-[0_0_10px_rgba(98,201,155,0.5)]",
    unknown: "bg-amber-300/70",
  }[signal];
  const statusColor = {
    flagged: "text-risk-critical",
    failed: "text-risk-critical",
    review: "text-amber-200",
    confirmed: "text-[#62c99b]",
    unknown: "text-amber-200/75",
  }[signal];
  return (
    <div role="listitem" className={`tracker-event-point relative border-l pl-4 ${isNew ? "tracker-entry" : ""}`}>
      <span className={`absolute -left-[5px] top-5 h-2.5 w-2.5 rounded-full ring-4 ring-[#0a0c18] ${dotColor}`} aria-hidden="true" />
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className={`mb-1 w-full rounded-lg border px-3 py-3 text-left transition-colors ${
          selected
            ? "border-solana-blue/25 bg-solana-blue/[0.06]"
            : "border-transparent hover:border-white/10 hover:bg-white/[0.03]"
        }`}
      >
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${statusColor}`}>{statusLabel}</span>
              <span className="text-[10px] text-white/35">{direction}</span>
            </span>
            <span className="mt-1.5 block truncate font-mono text-xs text-white/70">
              {truncate(activity.signature, 12, 8)}
            </span>
            <span className="mt-1 block text-[10px] text-white/35">
              {activity.blockTime ? new Date(activity.blockTime * 1000).toLocaleString() : `Slot ${activity.slot}`}
            </span>
          </span>
          <span className="shrink-0 text-right">
            {activity.detailsAvailable && activity.solChange !== 0 ? (
              <span className={`block font-mono text-xs ${activity.solChange > 0 ? "text-[#62c99b]" : "text-white/70"}`}>
                {activity.solChange > 0 ? "+" : ""}{formatAmount(activity.solChange, 4)} SOL
              </span>
            ) : (
              <span className="block text-[10px] text-white/35">{activity.detailsAvailable ? "Program call" : "Decode unavailable"}</span>
            )}
          </span>
        </span>
      </button>
    </div>
  );
}

function ActivityDetails({
  activity,
  signal,
  finding,
  watchedAddress,
}: {
  activity: WalletActivity;
  signal: ActivitySignal;
  finding?: ScanResult["findings"][number];
  watchedAddress: string;
}) {
  const signalLabels: Record<ActivitySignal, string> = {
    flagged: "Flagged by security checks",
    failed: "Failed transaction",
    review: "Review finding",
    confirmed: "Confirmed on-chain · no flag returned",
    unknown: "Transaction details unavailable",
  };
  const signalStyle: Record<ActivitySignal, string> = {
    flagged: "border-risk-critical/30 bg-risk-critical/10 text-risk-critical",
    failed: "border-risk-critical/30 bg-risk-critical/10 text-risk-critical",
    review: "border-amber-300/25 bg-amber-300/5 text-amber-200",
    confirmed: "border-[#62c99b]/25 bg-[#62c99b]/5 text-[#62c99b]",
    unknown: "border-amber-300/20 bg-amber-300/[0.04] text-amber-200/75",
  };
  const incoming = isIncoming(activity);
  const outgoing = isOutgoing(activity);

  return (
    <aside className="tracker-detail-panel rounded-xl border border-white/[0.08] bg-solana-dark/70 p-4 sm:p-5" aria-label="Selected transaction details">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">Selected transaction</p>
          <h3 className="mt-1 break-all font-mono text-sm text-white/85">{truncate(activity.signature, 14, 10)}</h3>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${signalStyle[signal]}`}>
          {signalLabels[signal]}
        </span>
      </div>
      {finding && (
        <div className="mt-4 rounded-lg border border-risk-critical/20 bg-risk-critical/[0.04] p-3">
          <p className={`text-[10px] font-semibold uppercase tracking-wider ${getFindingSeverityColor(finding.severity)}`}>
            {finding.severity} · {finding.category.replaceAll("_", " ")}
          </p>
          <p className="mt-1 text-sm font-medium text-white/85">{finding.title}</p>
          <p className="mt-1 text-xs leading-5 text-white/50">{finding.description}</p>
        </div>
      )}
      {!activity.detailsAvailable && (
        <p className="mt-4 rounded-lg border border-amber-300/15 bg-amber-300/[0.035] p-3 text-xs leading-5 text-amber-100/70">
          The RPC returned this transaction signature but could not decode its instructions or balance changes.
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <DetailValue label="Status" value={activity.success ? "Confirmed" : "Failed"} />
        <DetailValue
          label="Direction"
          value={!activity.detailsAvailable
            ? "Unavailable"
            : incoming && !outgoing
              ? "Incoming"
              : outgoing && !incoming
                ? "Outgoing"
                : "Interaction"}
        />
        <DetailValue
          label="SOL change"
          value={activity.detailsAvailable
            ? `${activity.solChange > 0 ? "+" : ""}${formatAmount(activity.solChange, 6)} SOL`
            : "Unavailable"}
        />
        <DetailValue
          label="Network fee"
          value={activity.feeLamports === null
            ? "Unavailable"
            : `${(activity.feeLamports / 1_000_000_000).toFixed(6)} SOL`}
        />
        <DetailValue label="Slot" value={String(activity.slot)} />
        <DetailValue
          label="Time"
          value={activity.blockTime ? new Date(activity.blockTime * 1000).toLocaleString() : "Unavailable"}
        />
        <DetailValue
          label="Token changes"
          value={!activity.detailsAvailable
            ? "Unavailable"
            : activity.tokenChanges.length > 0
              ? `${activity.tokenChanges.length} asset${activity.tokenChanges.length === 1 ? "" : "s"}`
              : "None"}
        />
      </div>
      {activity.tokenChanges.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">Token movements</p>
          <ul className="mt-2 space-y-2">
            {activity.tokenChanges.map((change) => (
              <li key={change.mint} className="flex flex-wrap justify-between gap-2 rounded-lg bg-white/[0.025] px-3 py-2 text-xs">
                <a
                  href={`https://solscan.io/token/${encodeURIComponent(change.mint)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-solana-blue hover:underline"
                >
                  {truncate(change.mint, 8, 6)}
                </a>
                <span className={`font-mono ${change.amount > 0 ? "text-[#62c99b]" : "text-white/70"}`}>
                  {change.amount > 0 ? "+" : ""}{formatAmount(change.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">Wallet</p>
          <a href={`https://solscan.io/account/${encodeURIComponent(watchedAddress)}`} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all font-mono text-[11px] text-solana-blue hover:underline">
            {truncate(watchedAddress, 7, 6)}
          </a>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">Other signers</p>
          {!activity.detailsAvailable ? (
            <p className="mt-1 text-xs text-white/40">Unavailable from RPC</p>
          ) : activity.counterparties.length > 0 ? (
            <ul className="mt-1 space-y-1">
              {activity.counterparties.slice(0, 3).map((counterparty) => (
                <li key={counterparty}>
                  <a href={`https://solscan.io/account/${encodeURIComponent(counterparty)}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-solana-blue hover:underline">
                    {truncate(counterparty, 7, 6)}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-white/40">None identified</p>
          )}
        </div>
      </div>
      {activity.programs.length > 0 && activity.detailsAvailable && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/35">Programs</p>
          <ul className="mt-1 space-y-1">
            {activity.programs.slice(0, 5).map((program) => (
              <li key={program} className="break-all font-mono text-[10px] text-white/50">{program}</li>
            ))}
          </ul>
        </div>
      )}
      <a
        href={`https://solscan.io/tx/${encodeURIComponent(activity.signature)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-2 rounded-lg border border-solana-blue/20 bg-solana-blue/[0.04] px-3 py-2 text-xs font-medium text-solana-blue transition hover:bg-solana-blue/10"
      >
        View full transaction ↗
      </a>
    </aside>
  );
}

function DetailValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <p className="text-[9px] font-medium uppercase tracking-[0.13em] text-white/35">{label}</p>
      <p className="mt-1 break-words text-xs text-white/75">{value}</p>
    </div>
  );
}

