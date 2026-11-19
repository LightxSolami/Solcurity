import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security & Threat Intelligence | Solcurity",
  description: "Learn about Solcurity's security methodology and threat intelligence sources",
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-solana-dark">
      <header className="border-b border-white/10 bg-solana-navy/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white tracking-tight">Solcurity</h1>
          <Link href="/scanner" className="text-white/60 hover:text-white text-sm">New Scan</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-16">
        <article className="prose prose-invert max-w-none">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-8">Security Methodology</h1>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Threat Intelligence Sources</h2>
            <p className="text-white/80 mb-6">
              Scanner lookups use server-side records only when their source is approved and enabled. The database is not comprehensive, and no sources or threat records are seeded by this repository.
            </p>
            <div className="space-y-4">
              <SourceCard
                name="Known Solana program registry"
                url="https://github.com/LightxSolami/Solcurity/blob/main/src/lib/threat-intel/threat-intelligence.ts"
                description="A local identifier list for core and ecosystem programs; registry presence is not a security endorsement."
                lastUpdated={null}
                entries={16}
              />
            </div>
            <p className="mt-4">
              <Link href="/threat-intel" className="text-solana-blue hover:underline">
                View live database health, records, sources, and reporting workflow →
              </Link>
            </p>
            <p className="mt-4 text-sm text-risk-moderate">
              Empty, partial, unavailable, stale, disputed, or revoked data never produces a clean result. No authoritative negative-screening provider is currently implemented, so unmatched addresses remain UNKNOWN.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Classification Definitions</h2>
            <div className="space-y-4">
              <ClassificationCard
                label="Known identifier"
                color="text-solana-blue bg-solana-blue/20"
                description="Program IDs in the local registry. Presence does not establish that a program is safe."
              />
              <ClassificationCard
                label="Unknown"
                color="text-white/60 bg-white/10"
                description="Programs or addresses not in our databases. Not automatically malicious."
              />
              <ClassificationCard
                label="Suspicious"
                color="text-risk-high bg-risk-high/20"
                description="No standalone suspicious-pattern classifier is currently implemented."
              />
              <ClassificationCard
                label="Malicious / Confirmed"
                color="text-risk-critical bg-risk-critical/20"
                description="Shown only for active, unexpired records marked confirmed by an approved source. Unknown addresses are not labeled malicious."
              />
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">Scoring Methodology</h2>
            <p className="text-white/80 mb-4">
              The score (0–100) starts at 100 and deductions are applied per finding:
            </p>
            <table className="w-full mb-6">
              <thead>
                <tr className="border-b border-white/20 text-white/60 text-sm">
                  <th className="text-left pb-2">Severity</th>
                  <th className="text-left pb-2">Base Weight</th>
                  <th className="text-left pb-2">High Confidence</th>
                  <th className="text-left pb-2">Medium Confidence</th>
                  <th className="text-left pb-2">Low Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                <tr><td className="py-2 text-risk-critical">CRITICAL</td><td className="py-2">25</td><td className="py-2">25</td><td className="py-2">19</td><td className="py-2">13</td></tr>
                <tr><td className="py-2 text-risk-high">HIGH</td><td className="py-2">15</td><td className="py-2">15</td><td className="py-2">12</td><td className="py-2">8</td></tr>
                <tr><td className="py-2 text-risk-moderate">MEDIUM</td><td className="py-2">8</td><td className="py-2">8</td><td className="py-2">6</td><td className="py-2">4</td></tr>
                <tr><td className="py-2 text-risk-low">LOW</td><td className="py-2">3</td><td className="py-2">3</td><td className="py-2">2</td><td className="py-2">2</td></tr>
                <tr><td className="py-2 text-white/60">INFO</td><td className="py-2">1</td><td className="py-2">1</td><td className="py-2">1</td><td className="py-2">1</td></tr>
              </tbody>
            </table>
            <p className="text-white/70">
              <strong>Risk Levels:</strong> 90–100 LOW, 70–89 MODERATE, 40–69 HIGH, 0–39 CRITICAL
            </p>
            <p className="text-white/70 mt-4">
              A score is shown only when no applicable check is UNKNOWN. Scan confidence is a separate percentage based on check availability. If a critical check is unavailable, the result is marked INCOMPLETE SCAN; unavailable data is never counted as a pass.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-white mb-4">False Positive Protection</h2>
            <p className="text-white/80 mb-4">
              We do NOT classify an address as malicious merely because:
            </p>
            <ul className="space-y-2 text-white/80 list-disc list-inside">
              <li>It is new or has few transactions</li>
              <li>It owns an unknown token</li>
              <li>It has an active mint or freeze authority (reported as a risk indicator, not proof of malice)</li>
              <li>It interacts with a new program</li>
              <li>It receives unsolicited tokens or NFTs</li>
              <li>It has a large balance or many transactions</li>
            </ul>
            <p className="text-white/70 mt-4">
              Some may be reported as risk indicators, but they are not proof of malicious activity. A threat classification requires an active record with cited evidence from an approved source; community submissions remain pending until reviewed.
            </p>
          </section>
        </article>
      </main>

      <footer className="border-t border-white/10 bg-solana-navy/80 py-8 px-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-white/50">
          <p>Automated Solana wallet security assessment. Not a guarantee of safety.</p>
        </div>
      </footer>
    </div>
  );
}

function SourceCard({ name, url, description, lastUpdated, entries }: {
  name: string;
  url: string;
  description: string;
  lastUpdated: string | null;
  entries: number;
}) {
  return (
    <div className="bg-solana-card rounded-xl border border-white/10 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-white mb-1">{name}</h3>
          <p className="text-white/70 text-sm mb-2">{description}</p>
          <div className="flex flex-wrap gap-4 text-xs text-white/50">
            <span>Entries: {entries}</span>
            <span>Last updated: {lastUpdated || "Not provided"}</span>
          </div>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-solana-blue hover:underline text-sm flex-shrink-0">
          View Source
        </a>
      </div>
    </div>
  );
}

function ClassificationCard({ label, color, description }: {
  label: string;
  color: string;
  description: string;
}) {
  return (
    <div className="bg-solana-card rounded-xl border border-white/10 p-4">
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>{label}</span>
        <p className="text-white/70 text-sm">{description}</p>
      </div>
    </div>
  );
}