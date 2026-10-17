import { ProgramInteraction } from "@/lib/types";

interface ProgramInteractionsProps {
  programs: ProgramInteraction[];
}

export function ProgramInteractions({ programs }: ProgramInteractionsProps) {
  if (programs.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-16 h-16 mx-auto text-white/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <h3 className="text-xl font-semibold text-white mb-2">No program interactions</h3>
        <p className="text-white/50">No program interactions were detected in recent transactions.</p>
      </div>
    );
  }

  const getClassificationBadge = (classification: ProgramInteraction["classification"]) => {
    const colors = {
      known: "bg-solana-blue/20 text-solana-blue",
      unknown: "bg-white/10 text-white/60",
      suspicious: "bg-risk-high/20 text-risk-high",
      malicious: "bg-risk-critical/20 text-risk-critical",
    };
    return <span className={`px-2 py-0.5 rounded text-xs ${colors[classification]}`}>{classification}</span>;
  };

  return (
    <div className="space-y-3">
      {programs.map((program) => (
        <div key={program.programId} className="bg-solana-card rounded-xl border border-white/10 p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-solana-purple/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-solana-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">{program.programName || "Unknown Program"}</p>
                <p className="text-white/50 text-sm font-mono">{program.programId}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-white/60">{program.interactionCount} interactions</span>
              <span className="text-white/50">Last: {new Date(program.lastInteraction).toLocaleDateString()}</span>
              {getClassificationBadge(program.classification)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}