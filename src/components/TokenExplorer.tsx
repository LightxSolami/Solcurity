import { useState } from "react";
import { TokenInfo } from "@/lib/types";

interface TokenExplorerProps {
  tokens: TokenInfo[];
}

export function TokenExplorer({ tokens }: TokenExplorerProps) {
  if (tokens.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-xl font-semibold text-white mb-2">No tokens found</h3>
        <p className="text-white/50">This wallet does not hold any SPL or Token-2022 tokens.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
            <th className="pb-3 font-medium">Token</th>
            <th className="pb-3 font-medium">Mint</th>
            <th className="pb-3 font-medium text-right">Balance</th>
            <th className="pb-3 font-medium">Authority</th>
            <th className="pb-3 font-medium">Risk</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {tokens.map((token) => (
            <TokenRow key={token.mintAddress} token={token} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TokenRow({ token }: { token: TokenInfo }) {
  const [expanded, setExpanded] = useState(false);

  const getRiskBadge = () => {
    if (token.suspicious) return <span className="px-2 py-0.5 rounded text-xs bg-risk-moderate/20 text-risk-moderate">Suspicious</span>;
    return <span className="px-2 py-0.5 rounded text-xs bg-risk-low/20 text-risk-low">Clean</span>;
  };

  return (
    <>
      <tr className="hover:bg-white/5 transition-colors">
        <td className="py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-solana-purple/20 flex items-center justify-center">
              <span className="text-xs font-semibold text-solana-blue">{token.symbol.slice(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <p className="font-medium text-white">{token.symbol}</p>
              <p className="text-white/50 text-xs">{token.name}</p>
            </div>
          </div>
        </td>
        <td className="py-3">
          <code className="text-white/60 font-mono text-xs">{token.mintAddress.slice(0, 8)}...{token.mintAddress.slice(-6)}</code>
        </td>
        <td className="py-3 text-right font-mono text-white">{token.uiAmount.toLocaleString()}</td>
        <td className="py-3">
          <div className="flex gap-1">
            {token.mintAuthorityActive && (
              <span className="px-2 py-0.5 rounded text-xs bg-risk-moderate/20 text-risk-moderate">Mint Active</span>
            )}
            {token.freezeAuthorityActive && (
              <span className="px-2 py-0.5 rounded text-xs bg-risk-moderate/20 text-risk-moderate">Freeze Active</span>
            )}
            {token.isToken2022 && (
              <span className="px-2 py-0.5 rounded text-xs bg-solana-blue/20 text-solana-blue">Token-2022</span>
            )}
            {!token.mintAuthorityActive && !token.freezeAuthorityActive && !token.isToken2022 && (
              <span className="px-2 py-0.5 rounded text-xs bg-risk-low/20 text-risk-low">No Auth</span>
            )}
          </div>
        </td>
        <td className="py-3">
          {getRiskBadge()}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-white/5">
          <td colSpan={5} className="py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Mint Address</p>
                <p className="font-mono text-white/80">{token.mintAddress}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Decimals</p>
                <p className="text-white">{token.decimals}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Raw Balance</p>
                <p className="font-mono text-white/80">{token.balance}</p>
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Type</p>
                <p className="text-white">{token.isToken2022 ? "Token-2022" : "SPL Token"}</p>
              </div>
              {token.riskIndicators.length > 0 && (
                <div className="md:col-span-4">
                  <p className="text-white/50 text-xs uppercase tracking-wider mb-2">Risk Indicators</p>
                  <ul className="space-y-1">
                    {token.riskIndicators.map((indicator, i) => (
                      <li key={i} className="text-white/70 text-sm flex items-center gap-2">
                        <svg className="w-4 h-4 text-risk-moderate flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {indicator}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}