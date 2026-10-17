import { ScanResult } from "@/lib/types";

export function SecurityScore({ result }: { result: ScanResult }) {
  const getRiskColor = (level: ScanResult["riskLevel"]) => {
    switch (level) {
      case "LOW": return "text-risk-low bg-risk-low/20 border-risk-low/30";
      case "MODERATE": return "text-risk-moderate bg-risk-moderate/20 border-risk-moderate/30";
      case "HIGH": return "text-risk-high bg-risk-high/20 border-risk-high/30";
      case "CRITICAL": return "text-risk-critical bg-risk-critical/20 border-risk-critical/30";
    }
  };

  return (
    <section className="mt-8">
      <div className="bg-solana-card rounded-2xl border border-white/10 p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="text-center md:text-left">
            <p className="text-white/60 text-sm uppercase tracking-wider mb-2">Security Score</p>
            <div className="flex items-baseline justify-center md:justify-start gap-2">
              <span className="text-5xl md:text-7xl font-bold text-white">{result.score}</span>
              <span className="text-white/40 text-2xl md:text-3xl">/ 100</span>
            </div>
          </div>

          <div className="text-center">
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${getRiskColor(result.riskLevel)}`}>
              {result.riskLevel} RISK
            </span>
            <p className="mt-2 text-white/50 text-sm">Automated risk assessment</p>
          </div>

          <div className="text-center md:text-right">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-risk-critical">{result.summary.criticalCount}</p>
                <p className="text-xs text-white/50">Critical</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-risk-high">{result.summary.highCount}</p>
                <p className="text-xs text-white/50">High</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-risk-moderate">{result.summary.mediumCount}</p>
                <p className="text-xs text-white/50">Medium</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-risk-low">{result.summary.lowCount}</p>
                <p className="text-xs text-white/50">Low</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-white/70">{result.summary.infoCount}</p>
                <p className="text-xs text-white/50">Info</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl">
                <p className="text-2xl font-bold text-white">{result.summary.totalFindings}</p>
                <p className="text-xs text-white/50">Total</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}