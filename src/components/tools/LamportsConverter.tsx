"use client";

import { useState } from "react";

export function LamportsConverter() {
  const [sol, setSol] = useState("");
  const [lamports, setLamports] = useState("");
  const [activeField, setActiveField] = useState<"sol" | "lamports">("sol");

  const handleSolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSol(value);
    if (activeField === "sol") {
      const lamportsValue = parseFloat(value) * 1_000_000_000;
      setLamports(Number.isInteger(lamportsValue) ? lamportsValue.toString() : lamportsValue.toFixed(0));
    }
  };

  const handleLamportsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLamports(value);
    if (activeField === "lamports") {
      const solValue = parseInt(value, 10) / 1_000_000_000;
      setSol(solValue.toString());
    }
  };

  const handleFocus = (field: "sol" | "lamports") => {
    setActiveField(field);
  };

  // Quick conversion buttons
  const quickAmounts = [0.001, 0.01, 0.1, 0.5, 1, 2, 5, 10, 100];

  return (
    <div className="space-y-6">
      {/* Converter */}
      <div className="bg-solana-card border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Convert</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SOL Input */}
          <div className={`${activeField === "sol" ? "ring-2 ring-solana-purple" : ""} bg-white/5 rounded-xl p-4 transition-all`}>
            <label className="block text-white/60 text-sm mb-2">SOL</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={sol}
                onChange={handleSolChange}
                onFocus={() => handleFocus("sol")}
                placeholder="0.000000000"
                step="0.000000001"
                min="0"
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-solana-purple focus:border-transparent text-xl font-mono"
                inputMode="decimal"
              />
              <span className="text-white/50 font-mono">SOL</span>
            </div>
          </div>

          {/* Lamports Input */}
          <div className={`${activeField === "lamports" ? "ring-2 ring-solana-blue" : ""} bg-white/5 rounded-xl p-4 transition-all`}>
            <label className="block text-white/60 text-sm mb-2">Lamports</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={lamports}
                onChange={handleLamportsChange}
                onFocus={() => handleFocus("lamports")}
                placeholder="0"
                step="1"
                min="0"
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-solana-blue focus:border-transparent text-xl font-mono"
                inputMode="numeric"
              />
              <span className="text-white/50 font-mono">LAMPORTS</span>
            </div>
          </div>
        </div>

        {/* Swap Button */}
        <button
          onClick={() => {
            const temp = sol;
            setSol(lamports);
            setLamports(temp);
            setActiveField(activeField === "sol" ? "lamports" : "sol");
          }}
          className="mt-4 w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18m-4 4l4-4m0 0l4 4m-4-4h-18" />
          </svg>
          Swap Fields
        </button>
      </div>

      {/* Quick Amounts */}
      <div className="bg-solana-card border border-white/10 rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-4">Quick Amounts</h3>
        <div className="flex flex-wrap gap-2">
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              onClick={() => {
                setSol(amount.toString());
                setLamports((amount * 1_000_000_000).toString());
                setActiveField("sol");
              }}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:text-white hover:bg-white/10 hover:border-solana-purple/30 transition-all text-sm font-mono"
            >
              {amount} SOL
            </button>
          ))}
        </div>
      </div>

      {/* Reference Table */}
      <div className="bg-solana-card border border-white/10 rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-4">Common Conversions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
                <th className="pb-3 pr-4 font-medium">SOL</th>
                <th className="pb-3 pr-4 font-medium text-right">Lamports</th>
                <th className="pb-3 pr-4 font-medium text-right">Micro-lamports</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {[
                { sol: "0.000000001", lamports: "1", micro: "1,000" },
                { sol: "0.000001", lamports: "1,000", micro: "1,000,000" },
                { sol: "0.001", lamports: "1,000,000", micro: "1,000,000,000" },
                { sol: "0.01", lamports: "10,000,000", micro: "10,000,000,000" },
                { sol: "0.1", lamports: "100,000,000", micro: "100,000,000,000" },
                { sol: "1", lamports: "1,000,000,000", micro: "1,000,000,000,000" },
                { sol: "10", lamports: "10,000,000,000", micro: "10,000,000,000,000" },
                { sol: "100", lamports: "100,000,000,000", micro: "100,000,000,000,000" },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 pr-4 font-mono text-white">{row.sol}</td>
                  <td className="py-3 pr-4 font-mono text-right text-solana-blue">{row.lamports}</td>
                  <td className="py-3 pr-4 font-mono text-right text-white/60">{row.micro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="bg-solana-card border border-white/10 rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-4">About Lamports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white/60">
          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="font-medium text-white mb-2">What are Lamports?</h4>
            <p>Lamports are the smallest unit of SOL, named after Leslie Lamport. They allow for precise accounting of fractional SOL amounts.</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="font-medium text-white mb-2">Conversion Formula</h4>
            <ul className="space-y-1 font-mono">
              <li><code>lamports = SOL × 1,000,000,000</code></li>
              <li><code>SOL = lamports ÷ 1,000,000,000</code></li>
            </ul>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="font-medium text-white mb-2">Use Cases</h4>
            <ul className="space-y-1">
              <li>• Transaction fees (measured in lamports)</li>
              <li>• Rent exemption calculations</li>
              <li>• Precise token transfers</li>
              <li>• Program instruction budgets</li>
            </ul>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="font-medium text-white mb-2">Precision</h4>
            <p>JavaScript uses 64-bit floats which can lose precision for large numbers. Use <code className="bg-white/10 px-1 rounded">BigInt</code> for exact calculations in production code.</p>
          </div>
        </div>
      </div>
    </div>
  );
}