import {
  calculateScore,
  scoreToRiskLevel,
  generateSummary,
  buildFinding,
} from "@/lib/scoring/risk-engine";
import { SecurityFinding, Severity } from "@/lib/types";

describe("Risk Engine", () => {
  describe("calculateScore", () => {
    it("returns 100 for no findings", () => {
      expect(calculateScore([])).toBe(100);
    });

    it("applies CRITICAL finding with HIGH confidence", () => {
      const findings = [
        createFinding("CRITICAL", "HIGH"),
      ];
      // 100 - 25 * 1.0 = 75
      expect(calculateScore(findings)).toBe(75);
    });

    it("applies CRITICAL finding with MEDIUM confidence", () => {
      const findings = [
        createFinding("CRITICAL", "MEDIUM"),
      ];
      // 100 - 25 * 0.75 = 81.25 -> 81
      expect(calculateScore(findings)).toBe(81);
    });

    it("applies CRITICAL finding with LOW confidence", () => {
      const findings = [
        createFinding("CRITICAL", "LOW"),
      ];
      // 100 - Math.ceil(25 * 0.5) = 100 - 13 = 87
      expect(calculateScore(findings)).toBe(87);
    });

    it("applies HIGH finding with HIGH confidence", () => {
      const findings = [
        createFinding("HIGH", "HIGH"),
      ];
      // 100 - 15 * 1.0 = 85
      expect(calculateScore(findings)).toBe(85);
    });

    it("applies MEDIUM finding with HIGH confidence", () => {
      const findings = [
        createFinding("MEDIUM", "HIGH"),
      ];
      // 100 - 8 * 1.0 = 92
      expect(calculateScore(findings)).toBe(92);
    });

    it("applies LOW finding with HIGH confidence", () => {
      const findings = [
        createFinding("LOW", "HIGH"),
      ];
      // 100 - 3 * 1.0 = 97
      expect(calculateScore(findings)).toBe(97);
    });

    it("applies INFO finding with HIGH confidence", () => {
      const findings = [
        createFinding("INFO", "HIGH"),
      ];
      // 100 - 1 * 1.0 = 99
      expect(calculateScore(findings)).toBe(99);
    });

    it("accumulates multiple findings", () => {
      const findings = [
        createFinding("HIGH", "HIGH"),
        createFinding("MEDIUM", "HIGH"),
        createFinding("LOW", "HIGH"),
      ];
      // 100 - 15 - 8 - 3 = 74
      expect(calculateScore(findings)).toBe(74);
    });

    it("never goes below 0", () => {
      const findings = Array(10).fill(null).map(() => createFinding("CRITICAL", "HIGH"));
      expect(calculateScore(findings)).toBe(0);
    });

    it("rounds correctly", () => {
      const findings = [createFinding("HIGH", "MEDIUM")];
      // 100 - Math.ceil(15 * 0.75) = 100 - 12 = 88
      expect(calculateScore(findings)).toBe(88);
    });
  });

  describe("scoreToRiskLevel", () => {
    const testCases = [
      { score: 100, level: "LOW" },
      { score: 95, level: "LOW" },
      { score: 90, level: "LOW" },
      { score: 89, level: "MODERATE" },
      { score: 80, level: "MODERATE" },
      { score: 70, level: "MODERATE" },
      { score: 69, level: "HIGH" },
      { score: 50, level: "HIGH" },
      { score: 40, level: "HIGH" },
      { score: 39, level: "CRITICAL" },
      { score: 20, level: "CRITICAL" },
      { score: 0, level: "CRITICAL" },
    ];

    test.each(testCases)("score $score -> $level", ({ score, level }) => {
      expect(scoreToRiskLevel(score)).toBe(level);
    });
  });

  describe("generateSummary", () => {
    it("counts findings by severity", () => {
      const findings = [
        createFinding("CRITICAL", "HIGH"),
        createFinding("HIGH", "HIGH"),
        createFinding("HIGH", "MEDIUM"),
        createFinding("MEDIUM", "HIGH"),
        createFinding("LOW", "HIGH"),
        createFinding("INFO", "HIGH"),
      ];

      const summary = generateSummary(findings, false, []);

      expect(summary.totalFindings).toBe(6);
      expect(summary.criticalCount).toBe(1);
      expect(summary.highCount).toBe(2);
      expect(summary.mediumCount).toBe(1);
      expect(summary.lowCount).toBe(1);
      expect(summary.infoCount).toBe(1);
      expect(summary.partialScan).toBe(false);
      expect(summary.failedChecks).toEqual([]);
    });

    it("includes partial scan info", () => {
      const summary = generateSummary([], true, ["token_accounts", "mint_info:XYZ"]);
      expect(summary.partialScan).toBe(true);
      expect(summary.failedChecks).toEqual(["token_accounts", "mint_info:XYZ"]);
    });
  });

  describe("buildFinding", () => {
    it("creates finding with all required fields", () => {
      const finding = buildFinding(
        "HIGH",
        "threat_intel",
        "Test Finding",
        "Test description",
        "Test evidence",
        "HIGH",
        "Test recommendation",
        ["addr1", "addr2"],
        ["tx1"]
      );

      expect(finding.id).toMatch(/^threat_intel-\d+-[a-z0-9]+$/);
      expect(finding.severity).toBe("HIGH");
      expect(finding.category).toBe("threat_intel");
      expect(finding.title).toBe("Test Finding");
      expect(finding.description).toBe("Test description");
      expect(finding.evidence).toBe("Test evidence");
      expect(finding.confidence).toBe("HIGH");
      expect(finding.recommendation).toBe("Test recommendation");
      expect(finding.affectedAddresses).toEqual(["addr1", "addr2"]);
      expect(finding.affectedTransactions).toEqual(["tx1"]);
      expect(new Date(finding.timestamp).getTime()).not.toBeNaN();
    });

    it("handles optional arrays as undefined", () => {
      const finding = buildFinding(
        "MEDIUM",
        "token",
        "Test",
        "Desc",
        "Evidence",
        "MEDIUM",
        "Rec"
      );

      expect(finding.affectedAddresses).toBeUndefined();
      expect(finding.affectedTransactions).toBeUndefined();
    });
  });
});

function createFinding(severity: Severity, confidence: SecurityFinding["confidence"]): SecurityFinding {
  return buildFinding(
    severity,
    "test",
    "Test",
    "Test",
    "Test",
    confidence,
    "Test"
  );
}