"use client";

import { useState, useEffect } from "react";
import { SvmAccountInfo, SvmTransactionInfo, ProgramAnalysisResult, TokenAccountInfo, EpochInfo } from "@/lib/svm";

interface CheckResponse {
  running: boolean;
}

interface AccountResponse {
  account: SvmAccountInfo | null;
  tokens: TokenAccountInfo[];
}

interface TransactionsResponse {
  transactions: SvmTransactionInfo[];
}

interface TokensResponse {
  tokens: TokenAccountInfo[];
}

interface AirdropResponse {
  signature: string | null;
  amount: number;
}

interface AnalyzeResponse {
  analysis: ProgramAnalysisResult;
}

interface ProgramsResponse {
  accounts: { pubkey: string; owner: string; data: string; lamports: number }[];
}

interface EpochResponse {
  epoch: EpochInfo | null;
}

export function SvmExplorer() {
  const [rpcUrl, setRpcUrl] = useState("http://127.0.0.1:8899");
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pubkey, setPubkey] = useState("");
  const [account, setAccount] = useState<SvmAccountInfo | null>(null);
  const [tokens, setTokens] = useState<TokenAccountInfo[]>([]);
  const [transactions, setTransactions] = useState<SvmTransactionInfo[]>([]);
  const [epoch, setEpoch] = useState<EpochInfo | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ProgramAnalysisResult | null>(null);
  const [programAccounts, setProgramAccounts] = useState<{ pubkey: string; owner: string; data: string; lamports: number }[]>([]);
  const [comprehensiveAnalysis, setComprehensiveAnalysis] = useState<any>(null);
  const [airdropped, setAirdropped] = useState<AirdropResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("");

  const API_BASE = "/api/svm";
  const LAMPORTS_PER_SOL = 1000000000;

  useEffect(() => {
    checkSvmStatus();
    fetchEpochInfo();
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
    } catch {
      setIsRunning(false);
      setError("Cannot connect to SVM. Is the local validator running?");
    }
  }

  async function fetchEpochInfo() {
    try {
      const res = await fetch(`${API_BASE}?action=epoch&rpcUrl=${encodeURIComponent(rpcUrl)}`);
      if (res.ok) {
        const data = await res.json() as EpochResponse;
        setEpoch(data.epoch);
      }
    } catch {
      // Silently handle epoch fetch errors
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
      setTokens(data.tokens || []);
      if (!data.account) {
        setError("Account not found");
      }
    } catch {
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
    } catch {
      setError("Network error. Is the SVM endpoint accessible?");
    } finally {
      setLoading(false);
    }
  }

  async function fetchTokens() {
    if (!pubkey) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tokens", pubkey, rpcUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(err.error || "Failed to fetch tokens");
        return;
      }
      const data = await res.json() as TokensResponse;
      setTokens(data.tokens || []);
    } catch {
      setError("Network error. Is the SVM endpoint accessible?");
    } finally {
      setLoading(false);
    }
  }

  async function requestAirdrop(amount?: number) {
    if (!pubkey) return;
    const airdropAmount = amount || (customAmount ? parseFloat(customAmount) : Math.random() * 5 + 0.1);
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
    } catch {
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
    } catch {
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
    } catch {
      setError("Network error. Is the SVM endpoint accessible?");
    } finally {
      setLoading(false);
    }
  }

  async function runComprehensiveAnalysis() {
    if (!pubkey) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze-account", pubkey, rpcUrl }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setError(err.error || "Failed to run comprehensive analysis");
        return;
      }
      const data = await res.json();
      setComprehensiveAnalysis(data.analysis);
    } catch {
      setError("Network error. Is the SVM endpoint accessible?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-solana-dark px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">SVM Explorer</h1>
          <p className="text-white/60">Local Solana Virtual Machine explorer for testing and debugging</p>
        </div>

        <div className="bg-solana-card rounded-2xl border border-white/10 p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-white/70 mb-1">RPC Endpoint</label>
              <select
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-solana-purple"
                style={{ backgroundColor: "#111133", color: "white" }}
              >
                <option value="http://127.0.0.1:8899" style={{ backgroundColor: "#111133", color: "white" }}>Local Validator (solana-test-validator)</option>
                <option value="https://api.devnet.solana.com" style={{ backgroundColor: "#111133", color: "white" }}>Devnet</option>
                <option value="https://api.testnet.solana.com" style={{ backgroundColor: "#111133", color: "white" }}>Testnet</option>
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

        {epoch && (
          <div className="bg-solana-card rounded-2xl border border-white/10 p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div>
                <p className="text-white/50 text-xs">Epoch</p>
                <p className="text-white font-mono text-sm">{Number(epoch.epoch)}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs">Slot Index</p>
                <p className="text-white font-mono text-sm">{Number(epoch.slotIndex)}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs">Slots in Epoch</p>
                <p className="text-white font-mono text-sm">{Number(epoch.slotInEpoch)}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs">Transactions</p>
                <p className="text-white font-mono text-sm">{Number(epoch.transactionCount)}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs">Block Height</p>
                <p className="text-white font-mono text-sm">{Number(epoch.blockHeight)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-solana-card rounded-2xl border border-white/10 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">SVM Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchAccount}
              disabled={loading || !pubkey || !isRunning}
              className="px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Fetch Account & Tokens
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
              Random Airdrop (0.1-5 SOL)
            </button>
            <button
              onClick={() => requestAirdrop(1)}
              disabled={loading || !pubkey || !isRunning}
              className="px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Airdrop 1 SOL
            </button>
            <div className="flex gap-2 items-end">
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Amount"
                className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-solana-purple"
                min="0"
                step="0.01"
              />
              <button
                onClick={() => requestAirdrop(parseFloat(customAmount))}
                disabled={loading || !pubkey || !isRunning || !customAmount}
                className="px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                Airdrop Custom
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
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
            <button
              onClick={runComprehensiveAnalysis}
              disabled={loading || !pubkey}
              className="px-4 py-2 bg-solana-blue/20 border border-solana-blue/30 text-solana-blue rounded-xl font-medium hover:bg-solana-blue/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Comprehensive AI Analysis
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
                <p className="text-white/60 font-mono text-sm break-all">{account.owner}</p>
              </div>
              <div>
                <p className="text-white/50 text-sm">Account Type</p>
                <p className="text-white/80 text-sm">{account.accountType || "Unknown"}</p>
              </div>
              <div>
                <p className="text-white/50 text-sm">Executable</p>
                <p className="text-white/80">{account.executable ? "Yes" : "No"}</p>
              </div>
              <div>
                <p className="text-white/50 text-sm">Rent Exempt</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  account.rentExempt
                    ? "bg-solana-green/20 text-solana-green"
                    : "bg-risk-moderate/20 text-risk-moderate"
                }`}>
                  {account.rentExempt ? "Yes" : "No"}
                </span>
              </div>
              <div>
                <p className="text-white/50 text-sm">Data Size</p>
                <p className="text-white/80">{account.dataSize} bytes</p>
              </div>
              <div>
                <p className="text-white/50 text-sm">Rent Epoch</p>
                <p className="text-white/80">{account.rentEpoch}</p>
              </div>
            </div>
          </div>
        )}

        {tokens.length > 0 && (
          <div className="bg-solana-card rounded-2xl border border-white/10 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Token Holdings ({tokens.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-white/50 text-xs font-medium pb-3">Mint</th>
                    <th className="text-white/50 text-xs font-medium pb-3">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((token) => (
                    <tr key={token.pubkey} className="border-b border-white/5">
                      <td className="py-3">
                        <p className="text-white/80 font-mono text-xs break-all">{token.mint}</p>
                        <p className="text-white/50 text-xs">{token.decimals} decimals</p>
                      </td>
                      <td className="py-3">
                        <p className="text-white/80 font-mono">{token.tokenAmount}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {airdropped && airdropped.signature && (
          <div className="bg-solana-card rounded-2xl border border-white/10 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Airdrop Successful</h2>
            <p className="text-white/70 mb-2">Amount: {airdropped.amount.toFixed(4)} SOL</p>
            <p className="text-white/60 font-mono text-xs break-all">{airdropped.signature}</p>
          </div>
        )}

        {transactions.length > 0 && (
          <div className="bg-solana-card rounded-2xl border border-white/10 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Recent Transactions</h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {transactions.map((tx) => (
                <div key={tx.signature} className="border border-white/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white/50 font-mono text-xs break-all">
                      {tx.signature.slice(0, 16)}...{tx.signature.slice(-12)}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      tx.meta.success
                        ? "bg-solana-green/20 text-solana-green"
                        : "bg-risk-critical/20 text-risk-critical"
                    }`}>
                      {tx.meta.success ? "Success" : "Failed"}
                    </span>
                  </div>
                  <p className="text-white/50 text-xs mb-2">
                    Slot: {tx.slot} • Fee: {(tx.meta.fee / LAMPORTS_PER_SOL).toFixed(6)} SOL
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

        {comprehensiveAnalysis && (
          <div className="bg-solana-card rounded-2xl border border-white/10 p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Comprehensive AI Analysis
            </h2>
            
            <div className="mb-4">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                comprehensiveAnalysis.riskLevel === "high"
                  ? "bg-risk-critical/20 text-risk-critical"
                  : comprehensiveAnalysis.riskLevel === "medium"
                  ? "bg-risk-moderate/20 text-risk-moderate"
                  : "bg-solana-green/20 text-solana-green"
              }`}>
                Risk Level: {comprehensiveAnalysis.riskLevel?.toUpperCase() || "UNKNOWN"}
              </span>
              {comprehensiveAnalysis.score !== undefined && (
                <span className="ml-3 text-white/50 text-sm">
                  Score: {comprehensiveAnalysis.score}/100
                </span>
              )}
            </div>

            {comprehensiveAnalysis.summary && (
              <p className="text-white/70 mb-4">{comprehensiveAnalysis.summary}</p>
            )}

            {comprehensiveAnalysis.analysis && (
              <div className="prose prose-invert max-w-none mb-4">
                <p className="text-white/70">{comprehensiveAnalysis.analysis}</p>
              </div>
            )}

            {comprehensiveAnalysis.potentialIssues?.length > 0 && (
              <div className="mb-4">
                <h3 className="text-white font-medium mb-2">Potential Issues</h3>
                <ul className="list-disc list-inside text-white/60 text-sm space-y-1">
                  {comprehensiveAnalysis.potentialIssues.map((issue: string, i: number) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {comprehensiveAnalysis.recommendations?.length > 0 && (
              <div className="mb-4">
                <h3 className="text-white font-medium mb-2">Recommendations</h3>
                <ul className="list-disc list-inside text-white/60 text-sm space-y-1">
                  {comprehensiveAnalysis.recommendations.map((rec: string, i: number) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {comprehensiveAnalysis.account && (
              <div className="border-t border-white/10 pt-4 mt-4">
                <h3 className="text-white font-medium mb-2">Account Data Analyzed</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><span className="text-white/50">Address:</span> <span className="text-white font-mono break-all">{comprehensiveAnalysis.account.pubkey}</span></div>
                  <div><span className="text-white/50">Balance:</span> <span className="text-white">{comprehensiveAnalysis.account.sol} SOL</span></div>
                  <div><span className="text-white/50">Type:</span> <span className="text-white/80">{comprehensiveAnalysis.account.accountType || "Unknown"}</span></div>
                  <div><span className="text-white/50">Owner:</span> <span className="text-white/60 font-mono break-all">{comprehensiveAnalysis.account.owner}</span></div>
                </div>
              </div>
            )}

            {comprehensiveAnalysis.tokens?.length > 0 && (
              <div className="border-t border-white/10 pt-4 mt-4">
                <h3 className="text-white font-medium mb-2">Token Accounts ({comprehensiveAnalysis.tokens.length})</h3>
                <div className="space-y-2">
                  {comprehensiveAnalysis.tokens.map((token: any, i: number) => (
                    <div key={i} className="bg-white/5 rounded-lg p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60">Mint:</span>
                        <span className="text-white font-mono break-all">{token.mint}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">Balance:</span>
                        <span className="text-white">{token.tokenAmount} ({token.decimals} decimals)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {comprehensiveAnalysis.transactions?.length > 0 && (
              <div className="border-t border-white/10 pt-4 mt-4">
                <h3 className="text-white font-medium mb-2">Recent Transactions ({comprehensiveAnalysis.transactions.length})</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {comprehensiveAnalysis.transactions.slice(0, 10).map((tx: any, i: number) => (
                    <div key={i} className="bg-white/5 rounded-lg p-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-white/60 font-mono">{tx.signature?.slice(0, 16)}...</span>
                        <span className={tx.meta?.success ? "text-solana-green" : "text-risk-critical"}>
                          {tx.meta?.success ? "Success" : "Failed"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
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
                  <div className="flex justify-between">
                    <p className="text-white/50 font-mono text-xs break-all">{acc.pubkey}</p>
                    <span className="text-white/40 text-xs">{(acc.lamports / LAMPORTS_PER_SOL).toFixed(9)} SOL</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center text-white/50 text-sm">
          <p className="mb-2">To use SVM Explorer, run a local validator:</p>
          <code className="bg-black/20 px-3 py-1 rounded mb-2 inline-block">
            solana-test-validator
          </code>
          <p className="mt-4 text-xs text-white/40">
            Install Solana CLI from: https://solana.com/docs/intro/getting-started
            <br />
            Alternatively, use devnet: <code className="bg-black/20 px-1 rounded">https://api.devnet.solana.com</code>
          </p>
        </div>
      </div>
    </div>
  );
}
