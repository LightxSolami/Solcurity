import { useState } from "react";
import { SecurityFinding } from "@/lib/types";

interface FindingsListProps {
  findings: SecurityFinding[];
  detailed?: boolean;
}

const SEVERITY_COLORS: Record<SecurityFinding["severity"], string> = {
  CRITICAL: "border-risk-critical bg-risk-critical/10 text-risk-critical",
  HIGH: "border-risk-high bg-risk-high/10 text-risk-high",
  MEDIUM: "border-risk-moderate bg-risk-moderate/10 text-risk-moderate",
  LOW: "border-risk-low bg-risk-low/10 text-risk-low",
  INFO: "border-white/20 bg-white/5 text-white/70",
};

const CONFIDENCE_COLORS: Record<SecurityFinding["confidence"], string> = {
  HIGH: "bg-risk-critical/20 text-risk-critical",
  MEDIUM: "bg-risk-moderate/20 text-risk-moderate",
  LOW: "bg-risk-low/20 text-risk-low",
};

export function FindingsList({ findings, detailed = false }: FindingsListProps) {
  if (findings.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <h3 className="text-xl font-semibold text-white mb-2">No findings detected</h3>
        <p className="text-white/50">No security issues were identified in this scan.</p>
        <p className="text-white/40 text-sm mt-2">This does not guarantee the wallet is safe. Always practice good security hygiene.</p>
      </div>
    );
  }

  const grouped = findings.reduce((acc, finding) => {
    if (!acc[finding.severity]) acc[finding.severity] = [];
    acc[finding.severity].push(finding);
    return acc;
  }, {} as Record<SecurityFinding["severity"], SecurityFinding[]>);

  const severityOrder: SecurityFinding["severity"][] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

  return (
    <div className="space-y-4">
      {severityOrder.map((severity) => {
        const severityFindings = grouped[severity];
        if (!severityFindings || severityFindings.length === 0) return null;

        return (
          <section key={severity} className="space-y-3">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs ${SEVERITY_COLORS[severity]}`}>
                {severity} ({severityFindings.length})
              </span>
            </h3>
            <div className="space-y-3">
              {severityFindings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} detailed={detailed} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function FindingCard({ finding, detailed }: { finding: SecurityFinding; detailed: boolean }) {
  const [expanded, setExpanded] = useState(false);

  if (!detailed) {
    return (
      <div className={`border-l-4 rounded-r-xl p-4 ${SEVERITY_COLORS[finding.severity]}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h4 className="font-semibold text-white mb-1">{finding.title}</h4>
            <p className="text-white/70 text-sm">{finding.description}</p>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs ${CONFIDENCE_COLORS[finding.confidence]}`}>
            {finding.confidence} Confidence
          </span>
        </div>
      </div>
    );
  }

  return (
    <details className={`group border-l-4 rounded-r-xl ${SEVERITY_COLORS[finding.severity]}`}>
      <summary className="p-4 flex items-start justify-between gap-4 cursor-pointer list-none">
        <div className="flex-1">
          <h4 className="font-semibold text-white mb-1">{finding.title}</h4>
          <p className="text-white/70 text-sm">{finding.description}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`px-2 py-0.5 rounded text-xs ${CONFIDENCE_COLORS[finding.confidence]}`}>
            {finding.confidence} Confidence
          </span>
          <svg className="w-5 h-5 text-white/40 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </summary>
      <div className="px-4 pb-4 border-t border-white/10 mt-4 space-y-4">
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Evidence</p>
          <p className="text-white/80 font-mono text-sm bg-white/5 p-3 rounded-lg whitespace-pre-wrap">{finding.evidence}</p>
        </div>
        <div>
          <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Recommendation</p>
          <p className="text-white/80 text-sm">{finding.recommendation}</p>
        </div>
        {finding.affectedAddresses && finding.affectedAddresses.length > 0 && (
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Affected Addresses</p>
            <div className="flex flex-wrap gap-2">
              {finding.affectedAddresses.map((addr) => (
                <code key={addr} className="px-2 py-1 bg-white/5 rounded text-white/70 font-mono text-xs">{addr}</code>
              ))}
            </div>
          </div>
        )}
        {finding.affectedTransactions && finding.affectedTransactions.length > 0 && (
          <div>
            <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Affected Transactions</p>
            <div className="flex flex-wrap gap-2">
              {finding.affectedTransactions.map((tx) => (
                <code key={tx} className="px-2 py-1 bg-white/5 rounded text-white/70 font-mono text-xs">{tx}</code>
              ))}
            </div>
          </div>
        )}
        <div className="pt-2 border-t border-white/10">
          <p className="text-white/40 text-xs">Category: {finding.category} | Detected: {new Date(finding.timestamp).toLocaleString()}</p>
        </div>
      </div>
    </details>
  );
}