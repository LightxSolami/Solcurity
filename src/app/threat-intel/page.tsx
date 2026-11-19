import type { Metadata } from "next";
import Link from "next/link";
import { CommunityReportForm } from "@/components/threat-intel/CommunityReportForm";
import { ModerationConsole } from "@/components/threat-intel/ModerationConsole";
import { getThreatIntelDashboardData } from "@/lib/threat-intel/supabase-repository";

export const metadata: Metadata = {
  title: "Threat Intelligence | Solcurity",
  description: "Cited, moderated Solana threat-intelligence records and database status.",
};

export const dynamic = "force-dynamic";

const categoryLabels: Record<string, string> = {
  malicious_wallet: "Malicious wallet",
  scam_token: "Scam token",
  malicious_program: "Malicious program",
  drainer: "Drainer",
  phishing: "Phishing",
  suspicious_funding: "Suspicious funding",
  sanctions_exposure: "Sanctions exposure",
  other: "Other",
};

export default async function ThreatIntelligencePage() {
  const data = await getThreatIntelDashboardData();
  const categories = Array.from(new Set(data.records.map((record) => record.category)));
  const activeRecordCount = data.confirmedCount + data.suspectedCount;

  return (
    <div className="min-h-screen bg-solana-dark px-4 py-10 text-white sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="mb-9">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-solana-blue">
            Evidence-led · Human reviewed
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Threat Intelligence
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/55">
            Cited reports with review status and freshness. This database is not comprehensive;
            absence of a match is not evidence that an address is safe.
          </p>
        </header>

        <section
          aria-label="Threat intelligence database status"
          className={`rounded-2xl border p-5 sm:p-6 ${
            data.status === "available"
              ? "border-solana-blue/20 bg-solana-blue/[0.045]"
              : "border-risk-moderate/25 bg-risk-moderate/[0.045]"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                Database health
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                {data.status === "available" ? "Connected" : "Unavailable"}
              </h2>
              <p className="mt-1 text-sm text-white/55">
                {data.status === "available"
                  ? `Last database update: ${formatDate(data.lastDatabaseUpdate)}`
                  : describeUnavailableReason(data.reason)}
              </p>
            </div>
            <span className={`w-fit rounded-full border px-3 py-1 text-xs ${
              data.status === "available"
                ? "border-solana-blue/25 bg-solana-blue/10 text-[#b8ecd1]"
                : "border-risk-moderate/25 bg-risk-moderate/10 text-risk-moderate"
            }`}>
              {data.status === "available" ? "Database reachable" : "Coverage unavailable"}
            </span>
          </div>

          {data.status === "available" && (
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <StatCard label="Confirmed active reports" value={data.confirmedCount} />
              <StatCard label="Suspected active reports" value={data.suspectedCount} />
              <StatCard label="Approved sources" value={data.sources.length} />
            </div>
          )}

          {data.status === "available" && activeRecordCount === 0 && (
            <p className="mt-5 rounded-xl border border-risk-moderate/20 bg-risk-moderate/[0.06] p-4 text-sm leading-6 text-white/65">
              No active threat records are currently available in this database. An empty result
              is not a clean screening or proof of safety; scanner threat-intelligence checks
              remain UNKNOWN unless a provider returns fresh, authoritative negative coverage.
            </p>
          )}
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
          <section aria-labelledby="recent-reports" className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
                  Reviewed intelligence
                </p>
                <h2 id="recent-reports" className="mt-1 text-xl font-semibold text-white">
                  Recently verified reports
                </h2>
              </div>
              <span className="text-xs text-white/40">
                {data.records.length} most recent active record{data.records.length === 1 ? "" : "s"}
              </span>
            </div>

            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2" aria-label="Categories in recent reports">
                {categories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/60"
                  >
                    {categoryLabels[category] || category}
                  </span>
                ))}
              </div>
            )}

            {data.status === "unavailable" ? (
              <EmptyPanel>
                The database could not be queried. No threat coverage result is available.
              </EmptyPanel>
            ) : data.records.length === 0 ? (
              <EmptyPanel>
                There are no active reviewed records to display. This is not a clean bill of
                health for any wallet, token, or program.
              </EmptyPanel>
            ) : (
              <div className="space-y-3">
                {data.records.map((record) => (
                  <article
                    key={record.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase ${
                        record.status === "confirmed"
                          ? "border-risk-critical/25 bg-risk-critical/10 text-risk-critical"
                          : "border-risk-moderate/25 bg-risk-moderate/10 text-risk-moderate"
                      }`}>
                        {record.status}
                      </span>
                      <span className="text-xs text-white/45">{categoryLabels[record.category] || record.category}</span>
                      <span className="text-xs text-white/35">· {record.network}</span>
                    </div>
                    <p className="mt-3 break-all font-mono text-sm text-white/85">
                      {record.identifier}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/65">{record.explanation}</p>
                    <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-white/35">Confidence</dt>
                        <dd className="mt-1 text-white/65">{record.confidence}</dd>
                      </div>
                      <div>
                        <dt className="text-white/35">Source</dt>
                        <dd className="mt-1">
                          <a
                            href={record.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-solana-blue hover:underline"
                          >
                            {record.source} ↗
                          </a>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-white/35">First observed</dt>
                        <dd className="mt-1 text-white/65">{formatDate(record.firstObservedAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-white/35">Last verified · expires</dt>
                        <dd className="mt-1 text-white/65">
                          {formatDate(record.lastVerifiedAt)} · {formatDate(record.expiresAt)}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-4 border-t border-white/[0.07] pt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">
                        Evidence
                      </p>
                      <ul className="mt-2 space-y-2">
                        {record.evidence.map((evidence, index) => (
                          <li key={`${record.id}-${index}`} className="break-all text-xs">
                            {evidence.kind === "url" && isHttpsUrl(evidence.value) ? (
                              <a
                                href={evidence.value}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-solana-blue hover:underline"
                              >
                                {evidence.value} ↗
                              </a>
                            ) : (
                              <code className="text-white/60">
                                {evidence.kind}: {evidence.value}
                              </code>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold">Source health</h2>
              {data.status === "available" && data.sourceHealth.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {data.sourceHealth.map((source) => (
                    <div
                      key={source.name}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3"
                    >
                      <span className="text-sm text-white/70">{source.name}</span>
                      <span className="text-xs text-white/45">
                        {source.status} · last success {formatDate(source.lastSuccessAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-white/45">
                  No source-health checks are configured. Database connectivity does not establish
                  that threat coverage is complete or current.
                </p>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-solana-blue">
                Community reporting
              </p>
              <h2 className="mt-2 text-xl font-semibold">Submit evidence for review</h2>
              <p className="mt-2 mb-5 text-sm leading-6 text-white/50">
                Reports are rate-limited, deduplicated and stored as pending. Submissions are not
                displayed as threats until a moderator reviews the evidence.
              </p>
              <CommunityReportForm />
            </section>
          </aside>
        </div>

        <div className="mt-8">
          <ModerationConsole />
        </div>

        <p className="mt-8 text-xs leading-5 text-white/35">
          This is a point-in-time, partial intelligence dataset, not an audit or guarantee of
          wallet safety. See the{" "}
          <Link href="/security" className="text-solana-blue hover:underline">
            security methodology
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 p-4">
      <p className="text-xs text-white/45">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-sm leading-6 text-white/50">
      {children}
    </div>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "Not available";
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toLocaleString() : "Invalid timestamp";
}

function describeUnavailableReason(reason: string | undefined): string {
  if (reason === "not_configured") return "Supabase server credentials are not configured.";
  if (reason === "invalid_configuration") return "Supabase server configuration is invalid.";
  if (reason === "invalid_response") return "The database returned invalid threat-intelligence data.";
  return "The database could not be reached. Screening remains unavailable.";
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
