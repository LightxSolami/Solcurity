"use client";

import { useState, useEffect } from "react";
import { SvmAccountInfo, SvmTransactionInfo, ProgramAnalysisResult } from "@/lib/svm";

interface ApiResponse<T> {
  [key: string]: T;
}

interface CheckResponse {
  running: boolean;
}

interface AccountResponse extends ApiResponse<SvmAccountInfo | null> {
  account: SvmAccountInfo | null;
}

interface TransactionsResponse extends ApiResponse<SvmTransactionInfo[]> {
  transactions: SvmTransactionInfo[];
}

interface AirdropResponse {
  signature: string | null;
  amount: number;
}

interface AnalyzeResponse extends ApiResponse<ProgramAnalysisResult> {
  analysis: ProgramAnalysisResult;
}

interface ProgramsResponse {
  accounts: { pubkey: string; data: string }[];
}

export function SvmExplorer() {
  const [rpcUrl, setRpcUrl] = useState("http://127.0.0.1:8899");
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pubkey, setPubkey] = useState("");
  const [account, setAccount] = useState<SvmAccountInfo | null>(null);
  const [transactions, setTransactions] = useState<SvmTransactionInfo[]>([]);
  const [analysisResult, setAnalysisResult] = useState<ProgramAnalysisResult | null>(null);
  const [programAccounts, setProgramAccounts] = useState<{ pubkey: string; data: string }[]>([]);
   const [airdropped, setAirdropped] = useState<AirdropResponse | null>(null);
   const [error, setError] = useState<string | null>(null);

  const API_BASE = "/api/svm";

  useEffect(() => {
    checkSvmStatus();
  }, [rpcUrl]);

  async function checkSvmStatus() {
    try {
      const res = await fetch(`${API_BASE}?action=check&rpcUrl=${encodeURIComponent(rpcUrl)}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(err.error || "Failed to check SVM status");
        setIsRunning(false);
        return;
      }
      const data = await res.json() as CheckResponse;
      setIsRunning(data.running);
      if (!data.running) {
        setError("SVM is not running. Start a local validator with: solana-test-validator");
      } else {
        setError(null);
      }
    } catch (err) {
      setIsRunning(false);
      setError("Cannot connect to SVM. Is the local validator running?");
    }
  }

  async function fetchAccount() {
    if (!pubkey) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "account", pubkey, rpcUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(err.error || "Failed to fetch account");
        return;
      }
      const data = await res.json() as AccountResponse;
      setAccount(data.account);
      if (!data.account) {
        setError("Account not found");
      }
    } catch (err) {
      setError("Network error. Is the SVM endpoint accessible?");
    } finally {
      setLoading(false);
    }
  }

  async function fetchTransactions() {
    if (!pubkey) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "transactions", pubkey, rpcUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(err.error || "Failed to fetch transactions");
        return;
      }
      const data = await res.json() as TransactionsResponse;
      setTransactions(data.transactions);
    } catch (err) {
      setError("Network error. Is the SVM endpoint accessible?");
    } finally {
      setLoading(false);
    }
  }

  async function requestAirdrop(amount?: number) {
    if (!pubkey) return;
    const airdropAmount = amount || Math.random() * 5 + 0.1;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "airdrop", pubkey, amount: airdropAmount, rpcUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(err.error || "Failed to request airdrop");
        return;
      }
      const data = await res.json() as AirdropResponse;
      setAirdropped(data);
      if (!data.signature) {
        setError("Airdrop failed. Check if the local validator is running.");
      }
    } catch (err) {
      setError("Network error. Is the SVM endpoint accessible?");
    } finally {
      setLoading(false);
    }
  }

  async function analyzeProgram() {
    if (!pubkey || transactions.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const allLogs = transactions.flatMap((tx) => tx.meta.logMessages);
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", programId: pubkey, logs: allLogs, rpcUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(err.error || "Failed to analyze program");
        return;
      }
      const data = await res.json() as AnalyzeResponse;
      setAnalysisResult(data.analysis);
    } catch (err) {
      setError("Network error. Is the SVM endpoint accessible?");
    } finally {
      setLoading(false);
    }
  }

  async function fetchProgramAccounts() {
    if (!pubkey) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "programs", programId: pubkey, rpcUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(err.error || "Failed to fetch program accounts");
        return;
      }
      const data = await res.json() as ProgramsResponse;
      setProgramAccounts(data.accounts);
    } catch (err) {
      setError("Network error. Is the SVM endpoint accessible?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-solana-dark px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">SVM Explorer</h1>
          <p className="text-white/60">Local Solana Virtual Machine explorer for testing and debugging</p>
        </div>

        <div className="bg-solana-card rounded-2xl border border-white/10 p-6 mb-6">
      <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-white/70 mb-1">RPC URL</label>
              <select
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-solana-purple"
              >
                <option value="http://127.0.0.1:8899">Local Validator (solana-test-validator)</option>
                <option value="https://api.devnet.solana.com">Devnet</option>
                <option value="https://api.testnet.solana.com">Testnet</option>
              </select>
            </div>
            <div className="flex items-end">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                isRunning
                  ? "bg-solana-green/20 text-solana-green"
                  : "bg-risk-critical/20 text-risk-critical"
              }`}>
                {isRunning ? "SVM Running" : "SVM Not Running"}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-white/70 mb-1">Account PublicKey</label>
              <input
                type="text"
                value={pubkey}
                onChange={(e) => setPubkey(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-solana-purple"
                placeholder="Enter Solana public key"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={checkSvmStatus}
                className="px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors text-sm"
              >
                Refresh Status
              </button>
            </div>
          </div>
        </div>

        <div className="bg-solana-card rounded-2xl border border-white/10 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">SVM Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchAccount}
              disabled={loading || !pubkey || !isRunning}
              className="px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Fetch Account
            </button>
            <button
              onClick={fetchTransactions}
              disabled={loading || !pubkey || !isRunning}
              className="px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Fetch Transactions
            </button>
            <button
              onClick={() => requestAirdrop()}
              disabled={loading || !pubkey || !isRunning}
              className="px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Random Airdrop
            </button>
            <button
              onClick={() => requestAirdrop(1)}
              disabled={loading || !pubkey || !isRunning}
              className="px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Airdrop 1 SOL
            </button>
            <button
              onClick={analyzeProgram}
              disabled={loading || !pubkey || transactions.length === 0}
              className="px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              AI Analyze Program
            </button>
            <button
              onClick={fetchProgramAccounts}
              disabled={loading || !pubkey || !isRunning}
              className="px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Program Accounts
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-solana-card rounded-2xl border border-white/10 p-6 mb-6">
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-solana-blue/30 border-t-solana-blue rounded-full animate-spin"></div>
              <span className="text-white/50 ml-3">Processing...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-risk-critical/10 border border-risk-critical/30 rounded-xl p-4 mb-6">
            <p className="text-risk-critical text-sm">{error}</p>
          </div>
        )}

        {account && (
          <div className="bg-solana-card rounded-2xl border border-white/10 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Account Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-white/50 text-sm">PublicKey</p>
                <p className="text-white font-mono text-sm break-all">{account.pubkey}</p>
              </div>
              <div>
                <p className="text-white/50 text-sm">Balance</p>
                <p className="text-white font-mono">{account.sol.toFixed(6)} SOL ({account.lamports} lamports)</p>
              </div>
              <div>
                <p className="text-white/50 text-sm">Owner</p>
                <p className="text-white font-mono text-sm break-all">{account.owner}</p>
              </div>
              <div>
                <p className="text-white/50 text-sm">Executable</p>
                <p className="text-white">{account.executable ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-white/50 text-sm">Data Size</p>
                <p className="text-white">{account.dataSize} bytes</p>
              </div>
              <div>
                <p className="text-white/50 text-sm">Rent Epoch</p>
                <p className="text-white">{account.rentEpoch}</p>
              </div>
            </div>
          </div>
        )}

        {airdropped && airdropped.signature && (
          <div className="bg-solana-card rounded-2xl border border-white/10 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Airdrop Successful</h2>
            <p className="text-white/70 mb-2">Amount: {airdropped.amount.toFixed(4)} SOL</p>
            <p className="text-white/70 font-mono text-sm break-all">{airdropped.signature}</p>
          </div>
        )}

        {transactions.length > 0 && (
          <div className="bg-solana-card rounded-2xl border border-white/10 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Recent Transactions</h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {transactions.map((tx) => (
                <div key={tx.signature} className="border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white/50 font-mono text-xs break-all">{tx.signature.slice(0, 16)}...{tx.signature.slice(-12)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      tx.meta.success
                        ? "bg-solana-green/20 text-solana-green"
                        : "bg-risk-critical/20 text-risk-critical"
                    }`}>
                      {tx.meta.success ? "Success" : "Failed"}
                    </span>
                  </div>
                  <p className="text-white/50 text-xs mb-2">
                    Slot: {tx.slot} • Fee: {tx.meta.fee / LAMPORTS_PER_SOL} SOL
                  </p>
                  {tx.meta.logMessages.length > 0 && (
                    <div className="mt-2">
                      <p className="text-white/50 text-xs mb-1">Logs:</p>
                      <pre className="text-xs text-white/70 bg-black/20 p-2 rounded-lg overflow-x-auto max-h-24 overflow-y-auto">
                        {tx.meta.logMessages.join("\n").slice(0, 500)}
                        {tx.meta.logMessages.join("\n").length > 500 && "..."}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {analysisResult && (
          <div className="bg-solana-card rounded-2xl border border-white/10 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">AI Program Analysis</h2>
            <div className="mb-4">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                analysisResult.riskLevel === "high"
                  ? "bg-risk-critical/20 text-risk-critical"
                  : analysisResult.riskLevel === "medium"
                  ? "bg-risk-moderate/20 text-risk-moderate"
                  : "bg-solana-green/20 text-solana-green"
              }`}>
                Risk: {analysisResult.riskLevel}
              </span>
            </div>
            <p className="text-white/70 mb-4">{analysisResult.analysis}</p>

            {analysisResult.potentialIssues.length > 0 && (
              <div className="mb-4">
                <h3 className="text-white font-medium mb-2">Potential Issues</h3>
                <ul className="list-disc list-inside text-white/60 text-sm space-y-1">
                  {analysisResult.potentialIssues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysisResult.recommendations.length > 0 && (
              <div>
                <h3 className="text-white font-medium mb-2">Recommendations</h3>
                <ul className="list-disc list-inside text-white/60 text-sm space-y-1">
                  {analysisResult.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {programAccounts.length > 0 && (
          <div className="bg-solana-card rounded-2xl border border-white/10 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Program Accounts ({programAccounts.length})
            </h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {programAccounts.slice(0, 50).map((acc) => (
                <div key={acc.pubkey} className="border border-white/10 rounded-lg p-3">
                  <p className="text-white/50 font-mono text-xs break-all">{acc.pubkey}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center text-white/50 text-sm">
          <p className="mb-2">To use SVM Explorer, run a local validator:</p>
          <code className="bg-black/20 px-2 py-1 rounded mb-2 inline-block">
            solana-test-validator
          </code>
          <p className="mt-4 text-xs text-white/40">
            Install Solana CLI from: https://solana.com/docs/intro/getting-started
            <br />
            Tip: The installed Solana CLI v1.18.17 may need the full validator binary.
            Alternatively, use devnet: <code className="bg-black/20 px-1 rounded">https://api.devnet.solana.com</code>
          </p>
        </div>
      </div>
    </div>
  );
}

const LAMPORTS_PER_SOL = 1000000000;
