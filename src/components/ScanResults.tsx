"use client";

import { useEffect, useState } from "react";
import { ScanResult, SecurityFinding, TokenInfo, TransactionInfo, ProgramInteraction } from "@/lib/types";
import { SecurityScore } from "@/components/SecurityScore";
import { WalletSummary } from "@/components/WalletSummary";
import { FindingsList } from "@/components/FindingsList";
import { TokenExplorer } from "@/components/TokenExplorer";
import { TransactionExplorer } from "@/components/TransactionExplorer";
import { ProgramInteractions } from "@/components/ProgramInteractions";
import { SecurityWarning } from "@/components/SecurityWarning";
import Link from "next/link";

interface ScanResultsProps {
  address: string;
}

const SCAN_STEPS = [
  { id: "wallet", label: "Wallet lookup", desc: "Fetching balance, age & token accounts" },
  { id: "transactions", label: "Transaction history", desc: "Analyzing recent transfers & patterns" },
  { id: "tokens", label: "Token holdings", desc: "Checking SPL & Token-2022 tokens" },
  { id: "programs", label: "Program interactions", desc: "Identifying contract interactions" },
  { id: "threat_intel", label: "Threat intelligence", desc: "Cross-referencing malicious databases" },
  { id: "scoring", label: "Risk scoring", desc: "Calculating security score" },
];

export function ScanResults({ address }: ScanResultsProps) {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatuses, setStepStatuses] = useState<Record<string, "pending" | "active" | "done">>({});
  const [activeTab, setActiveTab] = useState<"overview" | "tokens" | "transactions" | "programs" | "findings" | "rockets">("overview");

  useEffect(() => {
    // Initialize step statuses
    const initialStatuses: Record<string, "pending" | "active" | "done"> = {};
    SCAN_STEPS.forEach((step) => {
      initialStatuses[step.id] = "pending";
    });
    setStepStatuses(initialStatuses);
    setScanProgress(0);
    setCurrentStep(0);

    async function fetchScan() {
      try {
        // Simulate progress updates for better UX
        const progressInterval = setInterval(() => {
          setScanProgress((prev) => {
            if (prev >= 90) return prev;
            return prev + Math.random() * 3;
          });
        }, 300);

        // Update steps as we progress
        const stepInterval = setInterval(() => {
          setCurrentStep((prev) => {
            if (prev >= SCAN_STEPS.length - 1) return prev;
            setStepStatuses((statuses) => {
              const newStatuses = { ...statuses };
              if (prev >= 0) newStatuses[SCAN_STEPS[prev].id] = "done";
              if (prev + 1 < SCAN_STEPS.length) newStatuses[SCAN_STEPS[prev + 1].id] = "active";
              return newStatuses;
            });
            return prev + 1;
          });
        }, 800);

        const response = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address }),
        });

        clearInterval(progressInterval);
        clearInterval(stepInterval);

        // Complete all steps
        setStepStatuses((statuses) => {
          const newStatuses = { ...statuses };
          Object.keys(newStatuses).forEach((key) => {
            newStatuses[key] = "done";
          });
          return newStatuses;
        });
        setScanProgress(100);
        setCurrentStep(SCAN_STEPS.length - 1);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Scan failed");
        }

        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load scan results");
      } finally {
        setLoading(false);
      }
    }

    fetchScan();
  }, [address]);

  if (loading) {
    return <ScanProgress steps={SCAN_STEPS} progress={scanProgress} currentStep={currentStep} stepStatuses={stepStatuses} address={address} />;
  }

  if (error || !result) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-risk-critical/20 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-risk-critical" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">Scan Failed</h1>
        <p className="text-risk-critical mb-6">{error || "Unknown error"}</p>
        <Link href="/" className="text-solana-blue hover:underline">Try another scan</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Wallet Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-solana-purple to-solana-blue flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Scan Results</h1>
              <p className="text-white/50 text-sm font-mono">{address}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/bubble-map?address=${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Open Rocket Map
            </Link>
            <a
              href={`https://solscan.io/account/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View on Solscan
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              New Scan
            </Link>
          </div>
        </div>

        {result.summary.partialScan && (
          <div className="mb-6 p-4 bg-risk-moderate/10 border border-risk-moderate/30 rounded-xl">
            <div className="flex items-center gap-2 text-risk-moderate">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">
                <strong>Partial scan — </strong>some security checks could not be completed:{" "}
                {result.summary.failedChecks.join(", ")}
              </span>
            </div>
          </div>
        )}
      </div>

      <SecurityWarning />

      <SecurityScore result={result} />

      <WalletSummary result={result} />

      <div className="mt-8 border-b border-white/10">
        <nav className="flex flex-wrap gap-1 pb-[-1px] -mb-px" role="tablist">
          {[
            { id: "overview", label: "Overview", icon: <HomeIcon /> },
            { id: "findings", label: "Findings", icon: <AlertIcon /> },
            { id: "tokens", label: "Tokens", icon: <TokenIcon /> },
            { id: "rockets", label: "Rocket Map", icon: <RocketIcon /> },
            { id: "transactions", label: "Transactions", icon: <ActivityIcon /> },
            { id: "programs", label: "Programs", icon: <CubeIcon /> },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-xl transition-colors ${
                activeTab === tab.id
                  ? "bg-solana-card text-white border-b-2 border-solana-purple"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6" role="tabpanel">
        {activeTab === "overview" && (
          <FindingsList findings={result.findings} />
        )}
        {activeTab === "findings" && (
          <FindingsList findings={result.findings} detailed />
        )}
        {activeTab === "tokens" && (
          <TokenExplorer tokens={result.tokens} />
        )}
        {activeTab === "rockets" && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-solana-purple/20 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Rocket Map</h3>
            <p className="text-white/60 mb-6 max-w-md mx-auto">Open the full-screen Rocket Map in a new window for an immersive Google Maps-style experience with interactive rockets, orbital mechanics, and real-time token data.</p>
            <a
              href={`/bubble-map?address=${result.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              Launch Rocket Map
            </a>
          </div>
        )}
        {activeTab === "transactions" && (
          <TransactionExplorer transactions={result.transactions} />
        )}
        {activeTab === "programs" && (
          <ProgramInteractions programs={result.programs} />
        )}
      </div>

      <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-white/50">
        <p>Automated Solana wallet security assessment. Not a guarantee of safety.</p>
        <p className="mt-1">No automated scanner can guarantee that a wallet is safe.</p>
        <p className="mt-2">Data sources: {result.sources.map((s) => s.name).join(", ")}</p>
        <p className="mt-4 text-xs">Scanned at {new Date(result.scannedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}

function ScanProgress({ steps, progress, currentStep, stepStatuses, address }: {
  steps: typeof SCAN_STEPS;
  progress: number;
  currentStep: number;
  stepStatuses: Record<string, "pending" | "active" | "done">;
  address: string;
}) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-20">
      <div className="w-full max-w-2xl">
        {/* Address being scanned */}
        <div className="mb-8 text-center">
          <p className="text-white/50 text-sm mb-2">Scanning wallet</p>
          <p className="font-mono text-white text-lg">{address.slice(0, 8)}...{address.slice(-6)}</p>
        </div>

        {/* Overall Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/70 font-medium">Overall Progress</span>
            <span className="text-solana-blue font-mono text-lg">{Math.round(progress)}%</span>
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-solana-purple to-solana-blue rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Progress */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const status = stepStatuses[step.id] || "pending";
            const isCurrent = index === currentStep;
            const isDone = status === "done";

            return (
              <div
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                  isCurrent ? "bg-solana-purple/10 border border-solana-purple/30" : "bg-solana-card border border-white/10"
                }`}
              >
                {/* Step indicator */}
                <div className="relative flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      isDone
                        ? "bg-solana-green text-white"
                        : isCurrent
                        ? "bg-solana-purple text-white animate-pulse"
                        : "bg-white/10 text-white/40"
                    }`}
                  >
                    {isDone ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  {/* Connecting line */}
                  {index < steps.length - 1 && (
                    <div className="absolute left-5 top-10 w-0.5 h-12 bg-white/10" />
                  )}
                </div>

                {/* Step info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`font-medium ${isCurrent ? "text-solana-blue" : isDone ? "text-white" : "text-white/60"}`}>
                      {step.label}
                    </span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 text-xs bg-solana-purple/20 text-solana-blue rounded-full animate-pulse">
                        Active
                      </span>
                    )}
                    {isDone && (
                      <span className="px-2 py-0.5 text-xs bg-solana-green/20 text-solana-green rounded-full">
                        Done
                      </span>
                    )}
                  </div>
                  <p className="text-white/50 text-sm">{step.desc}</p>
                </div>

                {/* Mini progress for current step */}
                {isCurrent && (
                  <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-solana-purple to-solana-blue rounded-full animate-pulse"
                      style={{ width: `${(progress % 20) * 5}%` }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Animated particles */}
        <div className="mt-10 h-20 relative overflow-hidden">
          <AnimatedParticles count={20} />
        </div>
      </div>
    </div>
  );
}

function AnimatedParticles({ count }: { count: number }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 5,
    duration: Math.random() * 3 + 2,
  }));

  return (
    <div className="absolute inset-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-solana-blue/30 animate-float"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

// Icons
function HomeIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
}
function AlertIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
}
function TokenIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function RocketIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
}
function ActivityIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
}
function CubeIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 15l3-3 3 3M8 9l3 3-3 3" /></svg>;
}