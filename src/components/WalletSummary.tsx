import { ScanResult } from "@/lib/types";

export function WalletSummary({ result }: { result: ScanResult }) {
  const { wallet } = result;

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-white mb-4">Wallet Summary</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard label="Address" value={wallet.address.slice(0, 8) + "..." + wallet.address.slice(-6)} monospace />
        <StatCard label="SOL Balance" value={wallet.solBalance.toFixed(4)} monospace />
        <StatCard label="Token Accounts" value={wallet.tokenAccounts} />
        <StatCard label="NFT Count" value={wallet.nftAccounts} />
        <StatCard label="Transactions" value={wallet.transactionCount} />
        <StatCard label="First Activity" value={wallet.firstActivity ? new Date(wallet.firstActivity).toLocaleDateString() : "N/A"} />
        <StatCard label="Last Activity" value={wallet.lastActivity ? new Date(wallet.lastActivity).toLocaleDateString() : "N/A"} />
      </div>

      <div className="mt-4">
        <a
          href={`https://solscan.io/account/${wallet.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-solana-purple/20 border border-solana-purple/30 text-solana-blue rounded-xl hover:bg-solana-purple/30 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          View on Solscan
        </a>
      </div>
    </section>
  );
}

function StatCard({ label, value, monospace = false }: { label: string; value: string | number; monospace?: boolean }) {
  return (
    <div className="bg-solana-card rounded-xl border border-white/10 p-4">
      <p className="text-white/50 text-xs uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-white font-mono ${monospace ? "text-sm" : "text-base"}`}>{value}</p>
    </div>
  );
}