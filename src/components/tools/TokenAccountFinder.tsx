"use client";

import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { createSolanaConnection } from "@/lib/solana-rpc";

interface TokenAccount {
  mint: string;
  programId: string;
  owner: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  isToken2022: boolean;
}

export function TokenAccountFinder() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<TokenAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ spl: 0, t2022: 0, totalValue: 0 });

  const findAccounts = async () => {
    if (!address.trim()) return;

    setLoading(true);
    setError(null);
    setAccounts([]);

    try {
      const connection = createSolanaConnection();
      const pubkey = new PublicKey(address.trim());

      const [splResponse, t2022Response] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(pubkey, {
          programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        }),
        connection.getParsedTokenAccountsByOwner(pubkey, {
          programId: new PublicKey("TokenzQdBNbLqP5VEh89ASGF8P25BN8cGxqZ"),
        }),
      ]);

      const allAccounts: TokenAccount[] = [];

      const processAccounts = (response: any, is2022: boolean) => {
        for (const account of response.value) {
          const parsed = account.account.data.parsed?.info;
          if (!parsed) continue;

          const mint = parsed.mint;
          const tokenAmount = parsed.tokenAmount;
          const uiAmount = tokenAmount?.uiAmount ?? 0;

          if (uiAmount === 0) continue;

          allAccounts.push({
            mint,
            programId: is2022 ? "TokenzQdBNbLqP5VEh89ASGF8P25BN8cGxqZ" : "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
            owner: parsed.owner,
            amount: tokenAmount?.amount?.toString() || "0",
            decimals: tokenAmount?.decimals || 0,
            uiAmount,
            isToken2022: is2022,
          });
        }
      };

      processAccounts(splResponse, false);
      processAccounts(t2022Response, true);

      setAccounts(allAccounts);
      setStats({
        spl: allAccounts.filter(a => !a.isToken2022).length,
        t2022: allAccounts.filter(a => a.isToken2022).length,
        totalValue: allAccounts.reduce((sum, a) => sum + a.uiAmount, 0),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch token accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") findAccounts();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="bg-solana-card border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-white/60 text-sm mb-2">Wallet Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter wallet address (e.g., 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM)"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-solana-purple focus:border-transparent"
              maxLength={44}
            />
          </div>
          <button
            onClick={findAccounts}
            disabled={loading || !address.trim()}
            className="px-6 py-3 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl font-medium hover:bg-solana-purple/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Searching...
              </span>
            ) : (
              "Find Accounts"
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-risk-critical/10 border border-risk-critical/30 rounded-xl p-4 text-risk-critical">
          {error}
        </div>
      )}

      {/* Stats */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="SPL Tokens" value={stats.spl} color="#3b82f6" icon={<TokenIcon />} />
          <StatCard label="Token-2022" value={stats.t2022} color="#14F195" icon={<Token2022Icon />} />
          <StatCard label="Total Tokens" value={stats.totalValue.toLocaleString()} color="#9945FF" icon={<TotalIcon />} />
        </div>
      )}

      {/* Results Table */}
      {accounts.length > 0 && (
        <div className="bg-solana-card border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-semibold text-white">Token Accounts ({accounts.length})</h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter by mint, symbol..."
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-solana-purple text-sm w-64"
                id="filter-input"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
                  <th className="pb-3 pr-4 pl-4 font-medium">Mint Address</th>
                  <th className="pb-3 pr-4 font-medium text-right">Amount</th>
                  <th className="pb-3 pr-4 font-medium">Decimals</th>
                  <th className="pb-3 pr-4 font-medium">Type</th>
                  <th className="pb-3 pr-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10" id="accounts-tbody">
                {accounts.map((account, i) => (
                  <tr key={i} className="hover:bg-white/5 transition-colors filter-row">
                    <td className="py-3 pr-4 pl-4">
                      <code className="text-white/70 font-mono text-sm">{account.mint.slice(0, 8)}...{account.mint.slice(-6)}</code>
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-white">{account.uiAmount.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-white/60">{account.decimals}</td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded text-xs ${account.isToken2022 ? "bg-solana-green/20 text-solana-green" : "bg-solana-blue/20 text-solana-blue"}`}>
                        {account.isToken2022 ? "Token-2022" : "SPL Token"}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(account.mint)}
                          className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-white/70 hover:text-white text-xs transition-colors"
                          title="Copy mint address"
                        >
                          Copy
                        </button>
                        <a
                          href={`https://solscan.io/token/${account.mint}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-white/70 hover:text-white text-xs transition-colors"
                          title="View on Solscan"
                        >
                          Solscan
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 border-t border-white/10 text-white/50 text-sm">
            Showing {accounts.length} token accounts with non-zero balance. Zero-balance accounts are hidden.
          </div>
        </div>
      )}

      {accounts.length === 0 && !loading && address && !error && (
        <div className="bg-solana-card border border-white/10 rounded-2xl p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12a5 5 0 0110 0 5 5 0 01-10 0zM12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
          </svg>
          <h3 className="text-lg font-semibold text-white mb-2">No Token Accounts Found</h3>
          <p className="text-white/50">This wallet holds no SPL or Token-2022 tokens with non-zero balance.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-solana-card border border-white/10 rounded-2xl p-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <div>
          <p className="text-white/50 text-sm">{label}</p>
          <p className="font-bold text-white text-2xl">{value}</p>
        </div>
      </div>
    </div>
  );
}

function TokenIcon() {
  return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function Token2022Icon() {
  return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
function TotalIcon() {
  return <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
}