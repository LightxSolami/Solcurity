"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";

export function AddressValidator() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const validate = () => {
    if (!address.trim()) return;

    const cleanAddress = address.trim();
    const validation = validateSolanaAddress(cleanAddress);
    
    setResult(validation);
    
    // Add to history
    setHistory(prev => {
      const newHistory = [cleanAddress, ...prev.filter(a => a !== cleanAddress)];
      return newHistory.slice(0, 10);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") validate();
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="bg-solana-card border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-white/60 text-sm mb-2">Solana Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter Solana address (e.g., 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM)"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-solana-purple focus:border-transparent"
              maxLength={44}
            />
          </div>
          <button
            onClick={validate}
            disabled={!address.trim()}
            className="px-6 py-3 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            Validate
          </button>
        </div>
      </div>

      {/* Result Section */}
      {result && (
        <div className="bg-solana-card border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${result.valid ? "bg-solana-green/20" : "bg-risk-critical/20"}`}>
              <svg className={`w-6 h-6 ${result.valid ? "text-solana-green" : "text-risk-critical"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {result.valid ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                )}
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{result.valid ? "Valid Address" : "Invalid Address"}</h3>
              <p className="text-white/50 text-sm">{result.valid ? "This is a properly formatted Solana public key" : result.error}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <InfoCard label="Format" value={result.format} />
            <InfoCard label="Length" value={`${result.length} characters`} />
            <InfoCard label="Network" value={result.network} />
          </div>

          <div className="space-y-3">
            <h4 className="text-white/60 text-sm uppercase tracking-wider">Decoded Information</h4>
            <div className="bg-white/5 rounded-xl p-4 font-mono text-sm text-white/80 overflow-x-auto">
              <div><span className="text-white/50">Base58: </span>{result.address}</div>
              <div><span className="text-white/50">Bytes: </span>{result.bytes} bytes</div>
              <div><span className="text-white/50">Prefix: </span>{result.prefix}</div>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-solana-card border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold text-white mb-4">Recent Validations</h3>
          <div className="flex flex-wrap gap-2">
            {history.map((addr, i) => (
              <button
                key={i}
                onClick={() => {
                  setAddress(addr);
                  setResult(validateSolanaAddress(addr));
                }}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm font-mono"
              >
                {addr.slice(0, 8)}...{addr.slice(-6)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Reference */}
      <div className="bg-solana-card border border-white/10 rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-4">Quick Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="font-medium text-white mb-2">Valid Solana Address</h4>
            <ul className="space-y-1 text-white/60">
              <li>• 32-44 characters</li>
              <li>• Base58 encoding (no 0, O, I, l)</li>
              <li>• Ed25519 public key</li>
              <li>• Mainnet: starts with various chars</li>
            </ul>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <h4 className="font-medium text-white mb-2">Common Prefixes</h4>
            <ul className="space-y-1 text-white/60">
              <li>• System Program: <code className="bg-white/10 px-1 rounded">11111111111111111111111111111111</code></li>
              <li>• SPL Token: <code className="bg-white/10 px-1 rounded">TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA</code></li>
              <li>• Token-2022: <code className="bg-white/10 px-1 rounded">TokenzQdBNbLqP5VEh89ASGF8P25BN8cGxqZ</code></li>
              <li>• Wrapped SOL: <code className="bg-white/10 px-1 rounded">So11111111111111111111111111111111111111112</code></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ValidationResult {
  valid: boolean;
  address: string;
  format: string;
  length: number;
  network: string;
  bytes: number;
  prefix: string;
  error?: string;
}

function validateSolanaAddress(address: string): ValidationResult {
  const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/;
  const cleanAddress = address.trim();

  if (!cleanAddress) {
    return { valid: false, address: "", format: "Empty", length: 0, network: "Unknown", bytes: 0, prefix: "", error: "Address is empty" };
  }

  if (cleanAddress.length < 32 || cleanAddress.length > 44) {
    return { valid: false, address: cleanAddress, format: "Invalid Length", length: cleanAddress.length, network: "Unknown", bytes: 0, prefix: cleanAddress.slice(0, 4), error: `Invalid length: ${cleanAddress.length} (must be 32-44)` };
  }

  if (!BASE58_REGEX.test(cleanAddress)) {
    return { valid: false, address: cleanAddress, format: "Invalid Characters", length: cleanAddress.length, network: "Unknown", bytes: 0, prefix: cleanAddress.slice(0, 4), error: "Contains invalid Base58 characters" };
  }

  try {
    new PublicKey(cleanAddress);
    const bytes = cleanAddress.length;
    return {
      valid: true,
      address: cleanAddress,
      format: "Valid Base58 Ed25519 Public Key",
      length: cleanAddress.length,
      network: "Solana Mainnet",
      bytes: 32, // Ed25519 public key is 32 bytes
      prefix: cleanAddress.slice(0, 4),
    };
  } catch {
    return { valid: false, address: cleanAddress, format: "Invalid Public Key", length: cleanAddress.length, network: "Unknown", bytes: 0, prefix: cleanAddress.slice(0, 4), error: "Failed to decode as Ed25519 public key" };
  }
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 rounded-xl p-4">
      <p className="text-white/50 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className="font-mono text-white text-lg">{value}</p>
    </div>
  );
}