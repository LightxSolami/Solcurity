import {
  ThreatIntelEntry,
  ThreatIntelNegativeScreening,
  ThreatIntelScreeningResult,
  ThreatIntelTarget,
} from "@/lib/types";
import { evaluateThreatIntelScreening } from "@/lib/threat-intel/evaluation";

const now = Date.parse("2026-11-18T00:00:00.000Z");
const target: ThreatIntelTarget = {
  network: "solana-mainnet",
  entityType: "wallet",
  identifier: "SyntheticTestWallet111111111111111111111111111",
};

describe("threat intelligence screening evaluation", () => {
  it("fails on an active confirmed match", () => {
    const result = evaluateThreatIntelScreening(
      screening([record()]),
      [target],
      now
    );

    expect(result.status).toBe("FAIL");
    expect(result.activeMatches[0].status).toBe("confirmed");
  });

  it("keeps suspected matches distinct from confirmed matches", () => {
    const result = evaluateThreatIntelScreening(
      screening([record({ status: "suspected", confidence: "MEDIUM" })]),
      [target],
      now
    );

    expect(result.status).toBe("FAIL");
    expect(result.activeMatches[0]).toMatchObject({
      status: "suspected",
      confidence: "MEDIUM",
    });
  });

  it("does not turn a miss in a populated partial database into PASS", () => {
    const result = evaluateThreatIntelScreening(
      screening([], { recordCount: 500 }),
      [target],
      now
    );

    expect(result.status).toBe("UNKNOWN");
  });

  it.each(["disputed", "revoked"] as const)(
    "does not treat a %s report as an active match",
    (status) => {
      const result = evaluateThreatIntelScreening(
        screening([record({ status })]),
        [target],
        now
      );

      expect(result.status).toBe("UNKNOWN");
      expect(result.activeMatches).toEqual([]);
      expect(result.inactiveMatches).toHaveLength(1);
    }
  );

  it("does not treat expired intelligence as confirmed", () => {
    const result = evaluateThreatIntelScreening(
      screening([record({ expiresAt: "2026-11-17T23:59:59.000Z" })]),
      [target],
      now
    );

    expect(result.status).toBe("UNKNOWN");
    expect(result.activeMatches).toEqual([]);
    expect(result.inactiveMatches).toHaveLength(1);
  });

  it("keeps empty and unavailable databases UNKNOWN", () => {
    expect(
      evaluateThreatIntelScreening(screening([]), [target], now).status
    ).toBe("UNKNOWN");
    expect(
      evaluateThreatIntelScreening(
        { status: "unavailable", targets: [], recordCount: 0, updatedAt: null },
        [target],
        now
      ).status
    ).toBe("UNKNOWN");
  });

  it("passes only with fresh, authoritative, in-scope negative screening", () => {
    const negative: ThreatIntelNegativeScreening = {
      authoritative: true,
      sourceId: "test-source",
      source: "Test provider",
      sourceUrl: "https://example.test/screen",
      network: target.network,
      entityTypes: ["wallet"],
      checkedAt: "2026-11-17T00:00:00.000Z",
      expiresAt: "2026-11-19T00:00:00.000Z",
    };

    expect(
      evaluateThreatIntelScreening(
        screening([], { negativeScreening: negative }),
        [target],
        now
      ).status
    ).toBe("PASS");

    expect(
      evaluateThreatIntelScreening(
        screening([], {
          negativeScreening: { ...negative, entityTypes: ["program"] },
        }),
        [target],
        now
      ).status
    ).toBe("UNKNOWN");
  });
});

function record(
  overrides: Partial<ThreatIntelEntry> = {}
): ThreatIntelEntry {
  return {
    id: "synthetic-test-record",
    network: target.network,
    entityType: target.entityType,
    identifier: target.identifier,
    category: "malicious_wallet",
    confidence: "HIGH",
    status: "confirmed",
    firstObservedAt: "2026-01-01T00:00:00.000Z",
    lastVerifiedAt: "2026-11-01T00:00:00.000Z",
    expiresAt: "2026-12-01T00:00:00.000Z",
    explanation: "Synthetic fixture for unit testing only.",
    source: "Synthetic test source",
    sourceId: "synthetic-test-source",
    sourceUrl: "https://example.test/report",
    evidence: [{ kind: "url", value: "https://example.test/report" }],
    ...overrides,
  };
}

function screening(
  records: ThreatIntelEntry[],
  options: {
    recordCount?: number;
    negativeScreening?: ThreatIntelNegativeScreening;
  } = {}
): ThreatIntelScreeningResult {
  return {
    status: "available",
    recordCount: options.recordCount ?? records.length,
    updatedAt: "2026-11-17T00:00:00.000Z",
    targets: [{
      target,
      records,
      negativeScreening: options.negativeScreening,
    }],
  };
}
