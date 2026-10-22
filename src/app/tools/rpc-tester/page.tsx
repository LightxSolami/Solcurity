"use client";

import { useState } from "react";

const RPC_ENDPOINTS = [
  { name: "Solana Mainnet", url: "https://api.mainnet-beta.solana.com", free: true },
  { name: "Alchemy", url: "https://solana-mainnet.g.alchemy.com/v2/demo", free: true },
  { name: "Ankr", url: "https://rpc.ankr.com/solana", free: true },
  { name: "DRPC", url: "https://solana.drpc.org", free: true },
  { name: "Local Validator", url: "http://127.0.0.1:8899", free: false },
];

interface RpcTestResult {
  url: string;
  status: "pending" | "success" | "error";
  latency: number;
  blockHeight: number | null;
  errorMessage: string | null;
}

export default function RpcTesterPage() {
  const [results, setResults] = useState<RpcTestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [customUrl, setCustomUrl] = useState("");

  async function testEndpoint(url: string) {
    const result: RpcTestResult = {
      url,
      status: "pending",
      latency: 0,
      blockHeight: null,
      errorMessage: null,
    };

    setResults((prev) => {
      const filtered = prev.filter((r) => r.url !== url);
      return [...filtered, result];
    });

    const start = Date.now();

    try {
      const res = await fetch("/api/rpc-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const elapsed = Date.now() - start;
      const data = await res.json();

      setResults((prev) =>
        prev.map((r) =>
          r.url === url
            ? {
                ...r,
                status: res.ok ? "success" : "error",
                latency: elapsed,
                blockHeight: data.blockHeight || null,
                errorMessage: data.error || null,
              }
            : r
        )
      );
    } catch (err) {
      const elapsed = Date.now() - start;
      setResults((prev) =>
        prev.map((r) =>
          r.url === url
            ? {
                ...r,
                status: "error",
                latency: elapsed,
                errorMessage: "Network error",
              }
            : r
        )
      );
    }
  }

  async function testAll() {
    setTesting(true);
    setResults([]);

    for (const endpoint of RPC_ENDPOINTS) {
      await testEndpoint(endpoint.url);
    }

    setTesting(false);
  }

  async function testCustom() {
    if (!customUrl) return;
    await testEndpoint(customUrl);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">RPC Endpoint Tester</h1>
        <p className="text-white/60">Test and compare Solana RPC endpoint performance</p>
      </header>

      <div className="space-y-6">
        <div className="bg-solana-card rounded-2xl border border-white/10 p-6">
          <div className="flex gap-4">
            <button
              onClick={testAll}
              disabled={testing}
              className="px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {testing ? "Testing..." : "Test All Endpoints"}
            </button>
          </div>

          <div className="mt-4 flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-white/70 mb-1">Custom RPC URL</label>
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-solana-purple"
              />
            </div>
            <button
              onClick={testCustom}
              disabled={testing || !customUrl}
              className="px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Test
            </button>
          </div>
        </div>

        {results.length > 0 && (
          <div className="bg-solana-card rounded-2xl border border-white/10 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Test Results</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-white/50 text-xs font-medium pb-3 text-left">Endpoint</th>
                    <th className="text-white/50 text-xs font-medium pb-3 text-left">Status</th>
                    <th className="text-white/50 text-xs font-medium pb-3 text-left">Latency</th>
                    <th className="text-white/50 text-xs font-medium pb-3 text-left">Block Height</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.url} className="border-b border-white/5">
                      <td className="py-3">
                        <code className="text-white/70 font-mono text-xs break-all">{result.url}</code>
                      </td>
                      <td className="py-3">
                        {result.status === "success" && (
                          <span className="text-xs px-2 py-0.5 bg-solana-green/20 text-solana-green rounded-full">
                            OK
                          </span>
                        )}
                        {result.status === "error" && (
                          <span className="text-xs px-2 py-0.5 bg-risk-critical/20 text-risk-critical rounded-full">
                            Error
                          </span>
                        )}
                        {result.status === "pending" && (
                          <span className="text-xs px-2 py-0.5 bg-white/10 text-white/50 rounded-full">
                            Testing...
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-white/70 font-mono text-sm">{result.latency}ms</td>
                      <td className="py-3 text-white/70 font-mono text-sm">
                        {result.blockHeight ? result.blockHeight.toLocaleString() : result.errorMessage || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-solana-card rounded-2xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-2">About RPC Endpoints</h2>
          <p className="text-white/60 text-sm">
            Solana RPC endpoints have rate limits. Free public endpoints may return 403 errors
            when rate limits are exceeded. Consider using a dedicated RPC provider (Alchemy, QuickNode,
            Helius) for production usage.
          </p>
        </div>
      </div>
    </div>
  );
}
