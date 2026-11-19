import {
  ThreatIntelEntry,
  ThreatIntelScreeningResult,
  ThreatIntelTarget,
} from "@/lib/types";

export interface ThreatIntelEvaluation {
  status: "PASS" | "FAIL" | "UNKNOWN";
  activeMatches: ActiveThreatIntelEntry[];
  inactiveMatches: ThreatIntelEntry[];
}

export type ActiveThreatIntelEntry = ThreatIntelEntry & {
  status: "confirmed" | "suspected";
};

export function evaluateThreatIntelScreening(
  screening: ThreatIntelScreeningResult,
  expectedTargets: ThreatIntelTarget[],
  now = Date.now()
): ThreatIntelEvaluation {
  if (screening.status !== "available" || expectedTargets.length === 0) {
    return { status: "UNKNOWN", activeMatches: [], inactiveMatches: [] };
  }

  const targetResults = expectedTargets.map((target) =>
    screening.targets.find((result) =>
      sameTarget(result.target, target)
    )
  );
  if (targetResults.some((result) => !result)) {
    return { status: "UNKNOWN", activeMatches: [], inactiveMatches: [] };
  }

  const activeMatches: ActiveThreatIntelEntry[] = [];
  const inactiveMatches: ThreatIntelEntry[] = [];

  for (let index = 0; index < targetResults.length; index += 1) {
    const targetResult = targetResults[index];
    const target = expectedTargets[index];
    if (!targetResult) continue;

    for (const record of targetResult.records) {
      if (!sameTarget(record, target)) {
        return { status: "UNKNOWN", activeMatches: [], inactiveMatches: [] };
      }

      if (isActiveRecord(record, now)) {
        activeMatches.push(record);
      } else {
        inactiveMatches.push(record);
      }
    }
  }

  if (activeMatches.length > 0) {
    return { status: "FAIL", activeMatches, inactiveMatches };
  }

  const hasAuthoritativeNegativeCoverage = targetResults.every((result, index) => {
    const negative = result?.negativeScreening;
    const target = expectedTargets[index];
    if (!negative) return false;

    const checkedAt = Date.parse(negative.checkedAt);
    const expiresAt = Date.parse(negative.expiresAt);
    return (
      negative.authoritative &&
      negative.sourceId.length > 0 &&
      negative.source.length > 0 &&
      isHttpsUrl(negative.sourceUrl) &&
      negative.network === target.network &&
      negative.entityTypes.includes(target.entityType) &&
      Number.isFinite(checkedAt) &&
      checkedAt <= now &&
      Number.isFinite(expiresAt) &&
      expiresAt > now
    );
  });

  return {
    status: hasAuthoritativeNegativeCoverage ? "PASS" : "UNKNOWN",
    activeMatches,
    inactiveMatches,
  };
}

function isActiveRecord(
  record: ThreatIntelEntry,
  now: number
): record is ActiveThreatIntelEntry {
  if (record.status !== "confirmed" && record.status !== "suspected") return false;

  const firstObservedAt = Date.parse(record.firstObservedAt);
  const lastVerifiedAt = Date.parse(record.lastVerifiedAt);
  const expiresAt = Date.parse(record.expiresAt);
  return (
    Number.isFinite(firstObservedAt) &&
    Number.isFinite(lastVerifiedAt) &&
    Number.isFinite(expiresAt) &&
    firstObservedAt <= lastVerifiedAt &&
    lastVerifiedAt <= now &&
    expiresAt > now
  );
}

function sameTarget(
  left: Pick<ThreatIntelTarget, "network" | "entityType" | "identifier">,
  right: ThreatIntelTarget
): boolean {
  return (
    left.network === right.network &&
    left.entityType === right.entityType &&
    left.identifier === right.identifier
  );
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
