import type { Metadata } from "next";
import Link from "next/link";
import { ClaudeMcpSetup } from "@/components/ClaudeMcpSetup";

export const metadata: Metadata = {
  title: "Use Solcurity with Claude | Solcurity",
  description: "Connect Claude to Solcurity's read-only Solana Mainnet wallet scanner using MCP.",
};

const steps = [
  "In Claude, open Settings → Connectors and choose Add custom connector.",
  "Paste the Solcurity endpoint below. If prompted for authentication, choose No sign in.",
  "Enable the read-only scan_solana_wallet tool, then ask Claude to scan a public Solana address.",
];

export default function ClaudePage() {
  return (
    <div className="min-h-screen bg-solana-dark px-4 py-12 text-white sm:px-6">
      <article className="mx-auto max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-solana-blue">Solana security × Claude</p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Use Solcurity from Claude</h1>
        <p className="mt-4 max-w-3xl leading-7 text-white/65">
          Connect Solcurity as a remote MCP tool and ask Claude to run a real, read-only scan of a public Solana Mainnet wallet.
          The tool returns on-chain checks, findings, and unavailable-data warnings for Claude to explain.
        </p>

        <ClaudeMcpSetup />

        <section className="mt-10 rounded-2xl border border-white/10 bg-solana-card p-6">
          <h2 className="text-lg font-semibold">Connect your Claude account</h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-white/65">
            {steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          <p className="mt-4 text-sm text-white/50">
            Anthropic lists remote MCP custom connectors on Free and paid Claude plans; the Free plan has a connector limit.
            Setup screens can change, so check Anthropic&apos;s{" "}
            <a
              href="https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp"
              target="_blank"
              rel="noopener noreferrer"
              className="text-solana-blue underline underline-offset-2"
            >
              connector instructions
            </a>{" "}
            if the steps differ.
            This is a public remote MCP endpoint; no Solcurity account or API key is required.
          </p>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-solana-card p-5">
            <h2 className="font-semibold">What it can do</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/60">
              <li>Scan an address with public Mainnet RPC data.</li>
              <li>Return risk findings and per-check PASS / FAIL / UNKNOWN status.</li>
              <li>Help Claude explain the evidence and its limits.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-solana-card p-5">
            <h2 className="font-semibold">What it cannot do</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/60">
              <li>Access private keys, seed phrases, or connected wallets.</li>
              <li>Sign, send, or approve any transaction.</li>
              <li>Guarantee that a wallet or token is safe.</li>
            </ul>
          </div>
        </section>

        <p className="mt-6 rounded-xl border border-risk-moderate/20 bg-risk-moderate/5 p-4 text-sm leading-6 text-white/60">
          Scans are rate-limited and depend on public RPC availability. On-chain names, program metadata, and threat reports can be incomplete or misleading.
          Solcurity is an independent project and is not affiliated with or endorsed by Anthropic.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/scanner" className="rounded-xl bg-solana-purple/25 px-4 py-3 text-sm font-semibold text-white hover:bg-solana-purple/40">
            Try the wallet scanner
          </Link>
          <Link href="/faq" className="rounded-xl border border-white/10 px-4 py-3 text-sm text-white/70 hover:bg-white/5">
            Read the FAQ
          </Link>
        </div>
      </article>
    </div>
  );
}
