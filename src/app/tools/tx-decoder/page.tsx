"use client";

import { useState } from "react";

const INSTRUCTIONS = [
  { name: "Transfer", id: "2", description: "Simple SOL transfer" },
  { name: "Initialize Account", id: "1", description: "SPL Token initialize account" },
  { name: "Transfer Checked", id: "12", description: "SPL Token transfer checked" },
  { name: "Mint To", id: "10", description: "Mint tokens to an account" },
  { name: "Burn", id: "11", description: "Burn tokens" },
  { name: "Close Account", id: "9", description: "Close a token account" },
  { name: "Set Authority", id: "7", description: "Set authority on an account" },
];

export default function TxDecoderPage() {
  const [txData, setTxData] = useState("");
  const [decoded, setDecoded] = useState<any>(null);
  const [error, setError] = useState("");

  function decodeTransaction() {
    setError("");
    setDecoded(null);
    try {
      if (!txData.trim()) {
        setError("Please enter transaction data");
        return;
      }

      let data = txData.trim();

      if (data.startsWith("0x") || data.length % 2 !== 0) {
        try {
          const decodedBytes = Buffer.from(data, "base64");
          data = decodedBytes.toString("hex");
        } catch {}
      }

      const bytes = Buffer.from(data, "hex");
      const result: any = {
        length: bytes.length,
        hex: data.slice(0, 100) + (data.length > 100 ? "..." : ""),
        bytes: Array.from(bytes.slice(0, 64)),
        decodedHex: data.slice(0, 200) + (data.length > 200 ? "..." : ""),
      };

      const possibleProgramId = data.length >= 32 ? bytes.slice(0, 32).toString("hex") : null;
      if (possibleProgramId) {
        result.programId = possibleProgramId;
      }

      setDecoded(result);
    } catch (err) {
      setError("Failed to decode transaction data");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Transaction Decoder</h1>
        <p className="text-white/60">Decode and analyze Solana transaction data and instructions</p>
      </header>

      <div className="space-y-6">
        <div className="bg-solana-card rounded-2xl border border-white/10 p-6">
          <label className="block text-sm font-medium text-white/70 mb-2">Transaction Data (hex or base64)</label>
          <textarea
            value={txData}
            onChange={(e) => setTxData(e.target.value)}
            placeholder="Enter hex or base64 encoded transaction data..."
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono text-sm resize-y min-h-[120px] focus:outline-none focus:border-solana-purple"
          />
          <button
            onClick={decodeTransaction}
            disabled={!txData.trim()}
            className="mt-4 px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Decode
          </button>
        </div>

        {error && (
          <div className="bg-risk-critical/10 border border-risk-critical/30 rounded-xl p-4">
            <p className="text-risk-critical text-sm">{error}</p>
          </div>
        )}

        {decoded && (
          <div className="bg-solana-card rounded-2xl border border-white/10 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Decoded Data</h2>
            <div className="space-y-3">
              <div>
                <span className="text-white/50 text-sm">Total Bytes:</span>
                <span className="text-white font-mono ml-2">{decoded.length}</span>
              </div>
              {decoded.programId && (
                <div>
                  <span className="text-white/50 text-sm">Program ID (hex):</span>
                  <span className="text-white font-mono text-xs break-all block mt-1">{decoded.programId}</span>
                </div>
              )}
              <div>
                <span className="text-white/50 text-sm">Raw Data:</span>
                <pre className="text-white/70 font-mono text-xs bg-black/20 p-3 rounded-lg mt-2 overflow-x-auto">
                  {decoded.decodedHex}
                </pre>
              </div>
              <div>
                <span className="text-white/50 text-sm">First 64 bytes:</span>
                <div className="grid grid-cols-8 gap-1 mt-2">
                  {decoded.bytes.map((b: number, i: number) => (
                    <span key={i} className="text-white/70 font-mono text-xs bg-white/5 rounded px-1 py-0.5">
                      {b.toString(16).padStart(2, "0")}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-solana-card rounded-2xl border border-white/10 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Common Instruction Discriminators</h2>
          <p className="text-white/60 text-sm mb-4">These are the first 4 bytes of SPL Token program instructions:</p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-white/50 text-xs font-medium pb-2 text-left">Instruction</th>
                  <th className="text-white/50 text-xs font-medium pb-2 text-left">Discriminator</th>
                  <th className="text-white/50 text-xs font-medium pb-2 text-left">Description</th>
                </tr>
              </thead>
              <tbody>
                {INSTRUCTIONS.map((instr) => (
                  <tr key={instr.name} className="border-b border-white/5">
                    <td className="py-3 text-white/80">{instr.name}</td>
                    <td className="py-3 font-mono text-sm text-white/60">{instr.id}</td>
                    <td className="py-3 text-white/50 text-sm">{instr.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
