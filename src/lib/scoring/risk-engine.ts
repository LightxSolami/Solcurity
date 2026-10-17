import { SecurityFinding, Severity, ScanResult, RiskLevel } from "@/lib/types";

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  CRITICAL: 25,
  HIGH: 15,
  MEDIUM: 8,
  LOW: 3,
  INFO: 1,
};

const CONFIDENCE_MULTIPLIER: Record<"LOW" | "MEDIUM" | "HIGH", number> = {
  LOW: 0.5,
  MEDIUM: 0.75,
  HIGH: 1.0,
};

/**
 * Calculate the security score (0-100) from findings.
 * 100 = lowest risk, 0 = highest risk.
 * Each finding reduces the score based on severity and confidence.
 * Base score starts at 100 and deductions are applied.
 */
export function calculateScore(findings: SecurityFinding[]): number {
  let score = 100;

  for (const finding of findings) {
    const baseWeight = SEVERITY_WEIGHTS[finding.severity];
    const confidenceMultiplier = CONFIDENCE_MULTIPLIER[finding.confidence];
    const deduction = Math.ceil(baseWeight * confidenceMultiplier);
    score = Math.max(0, score - deduction);
  }

  return score;
}

export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 90) return "LOW";
  if (score >= 70) return "MODERATE";
  if (score >= 40) return "HIGH";
  return "CRITICAL";
}

export function generateSummary(findings: SecurityFinding[], partialScan = false, failedChecks: string[] = []) {
  return {
    totalFindings: findings.length,
    criticalCount: findings.filter((f) => f.severity === "CRITICAL").length,
    highCount: findings.filter((f) => f.severity === "HIGH").length,
    mediumCount: findings.filter((f) => f.severity === "MEDIUM").length,
    lowCount: findings.filter((f) => f.severity === "LOW").length,
    infoCount: findings.filter((f) => f.severity === "INFO").length,
    partialScan,
    failedChecks,
  };
}

/**
 * Build a finding with all required fields for transparency.
 */
export function buildFinding(
  severity: Severity,
  category: SecurityFinding["category"],
  title: string,
  description: string,
  evidence: string,
  confidence: SecurityFinding["confidence"],
  recommendation: string,
  affectedAddresses?: string[],
  affectedTransactions?: string[]
): SecurityFinding {
  return {
    id: `${category}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    severity,
    category,
    title,
    description,
    evidence,
    confidence,
    recommendation,
    affectedAddresses,
    affectedTransactions,
    timestamp: new Date().toISOString(),
  };
}