import { getThreatIntelAdminClient } from "@/lib/threat-intel/supabase-client";
import {
  CommunitySubmissionSchema,
  ModeratorDecisionSchema,
} from "@/lib/threat-intel/submission-schema";
import { submitCommunityReport } from "@/lib/threat-intel/submission-service";

jest.mock("@/lib/threat-intel/supabase-client", () => ({
  getThreatIntelAdminClient: jest.fn(),
}));

const mockedGetAdminClient = getThreatIntelAdminClient as jest.Mock;
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const validSubmission = CommunitySubmissionSchema.parse({
  network: "solana-mainnet",
  entityType: "wallet",
  identifier: "11111111111111111111111111111111",
  category: "malicious_wallet",
  evidenceKind: "url",
  evidenceValue: "https://example.org/report/123",
  explanation: "This report includes a transaction and supporting evidence.",
});

describe("threat intelligence community submissions", () => {
  beforeEach(() => {
    mockedGetAdminClient.mockReset();
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  afterAll(() => {
    if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
  });

  it("accepts valid public identifiers and HTTPS evidence", () => {
    expect(CommunitySubmissionSchema.safeParse(validSubmission).success).toBe(true);
    expect(CommunitySubmissionSchema.safeParse({
      ...validSubmission,
      entityType: "transaction_signature",
      identifier: "1".repeat(64),
      category: "suspicious_funding",
    }).success).toBe(true);
  });

  it("rejects invalid addresses, missing evidence, and non-HTTPS evidence", () => {
    expect(CommunitySubmissionSchema.safeParse({
      ...validSubmission,
      identifier: "not-a-solana-address",
    }).success).toBe(false);
    expect(CommunitySubmissionSchema.safeParse({
      ...validSubmission,
      evidenceValue: "",
    }).success).toBe(false);
    expect(CommunitySubmissionSchema.safeParse({
      ...validSubmission,
      evidenceValue: "http://example.org/report",
    }).success).toBe(false);
  });

  it("requires a source and expiry before moderator approval", () => {
    expect(ModeratorDecisionSchema.safeParse({
      submissionId: "00000000-0000-4000-8000-000000000001",
      action: "approved",
      notes: "Reviewed the evidence.",
    }).success).toBe(false);
  });

  it("fails closed when the database is unavailable", async () => {
    mockedGetAdminClient.mockReturnValue({
      status: "unavailable",
      reason: "not_configured",
    });

    await expect(
      submitCommunityReport(validSubmission, "192.0.2.1")
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("handles concurrent duplicate submissions through the database uniqueness constraint", async () => {
    let insertCount = 0;
    const client = {
      rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
      from: jest.fn(() => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(async () => {
              insertCount += 1;
              if (insertCount === 1) {
                return {
                  data: { id: "00000000-0000-4000-8000-000000000002" },
                  error: null,
                };
              }
              return { data: null, error: { code: "23505" } };
            }),
          })),
        })),
      })),
    };
    mockedGetAdminClient.mockReturnValue({
      status: "available",
      client,
    });

    const results = await Promise.all([
      submitCommunityReport(validSubmission, "192.0.2.1"),
      submitCommunityReport(validSubmission, "192.0.2.1"),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(["created", "duplicate"]);
    expect(client.rpc).toHaveBeenCalledTimes(2);
  });
});
