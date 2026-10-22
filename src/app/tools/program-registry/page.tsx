import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Program ID Registry | Solcurity Tools",
  description: "Browse known Solana program IDs and addresses",
};

const PROGRAMS = [
  { name: "System Program", id: "11111111111111111111111111111111", category: "System" },
  { name: "BPF Loader", id: "BPFLoader1111111111111111111111111111111111", category: "System" },
  { name: "BPF Loader v2", id: "BPFLoader2111111111111111111111111111111111", category: "System" },
  { name: "BPF Upgradeable Loader", id: "BPFLoaderUpgradeab1e11111111111111111111111", category: "System" },
  { name: "Stake Program", id: "Stake11111111111111111111111111111111", category: "System" },
  { name: "Vote Program", id: "Vote11111111111111111111111111111111111", category: "System" },
  { name: "Native Loader", id: "NativeLoader1111111111111111111111111111111", category: "System" },
  { name: "SPL Token Program", id: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", category: "Token" },
  { name: "Token-2022 Program", id: "TokenzQdBNbLqP5VEh89ASGF8P25BN8cGxqZ", category: "Token" },
  { name: "SPL Associated Token Account", id: "ATokenGPo11111111111111111111111111111111111", category: "Token" },
  { name: "Memo Program", id: "Memo1UhkKDLTkQnmE3sHtd3sJjv3c3tMmJ5oX8e4gZ3q", category: "Utility" },
  { name: "Memo Program v2", id: "Memo1UhkKDLTkQnmE3sHtd3sJjv3c3tMmJ5oX8e4gZ3q", category: "Utility" },
  { name: "Compute Budget", id: "ComputeBudget111111111111111111111111111111", category: "System" },
  { name: "Ed25519 Program", id: "Ed255191uDqwUete1111111111111111111111111111", category: "System" },
  { name: "Secp256k1 Program", id: "Keccak160k11111111111111111111111111111111111", category: "System" },
];

export default function ProgramRegistryPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Program ID Registry</h1>
        <p className="text-white/60">Browse known Solana program IDs and system addresses</p>
      </header>

      <div className="space-y-6">
        {Array.from(new Set(PROGRAMS.map((p) => p.category))).map((category) => (
          <div key={category} className="bg-solana-card rounded-2xl border border-white/10 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">{category} Programs</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-white/50 text-xs font-medium pb-3 text-left">Program Name</th>
                    <th className="text-white/50 text-xs font-medium pb-3 text-left">Program ID</th>
                  </tr>
                </thead>
                <tbody>
                  {PROGRAMS.filter((p) => p.category === category).map((program) => (
                    <tr key={program.id} className="border-b border-white/5">
                      <td className="py-3 text-white/80">{program.name}</td>
                      <td className="py-3">
                        <code className="text-white/60 font-mono text-xs break-all">{program.id}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div className="bg-solana-card rounded-2xl border border-white/10 p-6">
          <h2 className="text-xl font-semibold text-white mb-2">About This Registry</h2>
          <p className="text-white/60 text-sm">
            This registry contains known Solana system program IDs and commonly used SPL program addresses.
            When analyzing transactions or wallets, comparing program IDs against this list helps identify
            trusted vs. unknown programs.
          </p>
        </div>
      </div>
    </div>
  );
}
