import { useState, useMemo } from "react";
import { TransactionInfo } from "@/lib/types";

interface TransactionExplorerProps {
  transactions: TransactionInfo[];
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <h3 className="text-xl font-semibold text-white mb-2">No transactions found</h3>
      <p className="text-white/50">No recent transactions were retrieved for this wallet.</p>
    </div>
  );
}

export function TransactionExplorer({ transactions }: TransactionExplorerProps) {
  const [sortConfig, setSortConfig] = useState<{ key: keyof TransactionInfo; direction: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      if (!sortConfig) return b.blockTime - a.blockTime;
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [transactions, sortConfig]);

  const paginated = sortedTransactions.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(sortedTransactions.length / pageSize);

  if (transactions.length === 0) {
    return <EmptyState />;
  }

  const requestSort = (key: keyof TransactionInfo) => {
    setSortConfig((current) => ({
      key,
      direction: current?.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getRiskBadge = (status: TransactionInfo["riskStatus"]) => {
    switch (status) {
      case "flagged": return <span className="px-2 py-0.5 rounded text-xs bg-risk-critical/20 text-risk-critical">Flagged</span>;
      case "suspicious": return <span className="px-2 py-0.5 rounded text-xs bg-risk-high/20 text-risk-high">Suspicious</span>;
      default: return <span className="px-2 py-0.5 rounded text-xs bg-risk-low/20 text-risk-low">Clean</span>;
    }
  };

  const getDirectionBadge = (dir: TransactionInfo["direction"]) => {
    const colors = {
      incoming: "bg-risk-low/20 text-risk-low",
      outgoing: "bg-risk-high/20 text-risk-high",
      internal: "bg-white/10 text-white/60",
    };
    return <span className={`px-2 py-0.5 rounded text-xs ${colors[dir]}`}>{dir}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 text-white/50 text-xs uppercase tracking-wider">
              <th className="pb-3 pr-4 cursor-pointer hover:text-white" onClick={() => requestSort("blockTime")}>
                Date/Time
              </th>
              <th className="pb-3 pr-4">Signature</th>
              <th className="pb-3 pr-4 cursor-pointer hover:text-white" onClick={() => requestSort("direction")}>
                Direction
              </th>
              <th className="pb-3 pr-4 text-right cursor-pointer hover:text-white" onClick={() => requestSort("solAmount")}>
                SOL Amount
              </th>
              <th className="pb-3 pr-4">Counterparty/Program</th>
              <th className="pb-3 pr-4">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {paginated.map((tx) => (
              <tr key={tx.signature} className="hover:bg-white/5 transition-colors">
                <td className="py-3 pr-4 text-white/70 text-sm">
                  {new Date(tx.blockTime * 1000).toLocaleString()}
                </td>
                <td className="py-3 pr-4">
                  <code className="text-white/60 font-mono text-xs">{tx.signature.slice(0, 12)}...{tx.signature.slice(-8)}</code>
                </td>
                <td className="py-3 pr-4">{getDirectionBadge(tx.direction)}</td>
                <td className="py-3 pr-4 text-right font-mono text-white">{tx.solAmount.toFixed(6)}</td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-1">
                    {tx.programInteractions.slice(0, 3).map((pid, i) => (
                      <code key={i} className="px-2 py-0.5 bg-white/5 rounded text-white/60 font-mono text-xs">{pid.slice(0, 8)}...</code>
                    ))}
                    {tx.programInteractions.length > 3 && (
                      <span className="px-2 py-0.5 bg-white/5 rounded text-white/50 text-xs">+{tx.programInteractions.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="py-3 pr-4">{getRiskBadge(tx.riskStatus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 bg-solana-card border border-white/10 rounded-lg text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Previous
          </button>
          <span className="text-white/60 text-sm">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 bg-solana-card border border-white/10 rounded-lg text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}