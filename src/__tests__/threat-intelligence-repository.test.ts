import { createClient } from "@supabase/supabase-js";
import { ThreatIntelTarget } from "@/lib/types";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

const targets: ThreatIntelTarget[] = [{
  network: "solana-mainnet",
  entityType: "wallet",
  identifier: "11111111111111111111111111111111",
}];

type QueryResponse = {
  data: unknown;
  error: { code: string } | null;
  count: number | null;
};

const mockedCreateClient = createClient as jest.Mock;
const originalUrl = process.env.SUPABASE_URL;
const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function configureClient(response: QueryResponse) {
  const rpc = jest.fn().mockResolvedValue(response);
  mockedCreateClient.mockReturnValue({
    rpc,
  });
  return rpc;
}

describe("Supabase threat intelligence repository", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    mockedCreateClient.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    if (originalUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = originalUrl;
    if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it("reports missing configuration as unavailable", async () => {
    delete process.env.SUPABASE_URL;
    const { screenThreatIntelWithSupabase } = await import(
      "@/lib/threat-intel/supabase-repository"
    );

    await expect(screenThreatIntelWithSupabase(targets)).resolves.toMatchObject({
      status: "unavailable",
      reason: "not_configured",
    });
  });

  it("reports database failures as unavailable, not an empty result", async () => {
    const errorLog = jest.spyOn(console, "error").mockImplementation(() => undefined);
    configureClient({
      data: null,
      error: { code: "42P01" },
      count: null,
    });
    const { screenThreatIntelWithSupabase } = await import(
      "@/lib/threat-intel/supabase-repository"
    );

    await expect(screenThreatIntelWithSupabase(targets)).resolves.toMatchObject({
      status: "unavailable",
      reason: "database_unavailable",
    });
  });

  it("distinguishes a healthy empty database from unavailable screening", async () => {
    const rpc = configureClient({ data: [], error: null, count: 0 });
    const { screenThreatIntelWithSupabase } = await import(
      "@/lib/threat-intel/supabase-repository"
    );

    await expect(screenThreatIntelWithSupabase(targets)).resolves.toMatchObject({
      status: "available",
      recordCount: 0,
      targets: [{ target: targets[0], records: [] }],
    });
    expect(rpc).toHaveBeenCalledWith("screen_threat_intel_targets", {
      p_targets: targets,
    });
  });

  it("fails closed on malformed RPC response data", async () => {
    configureClient({ data: { unexpected: true }, error: null, count: null });
    const { screenThreatIntelWithSupabase } = await import(
      "@/lib/threat-intel/supabase-repository"
    );

    await expect(screenThreatIntelWithSupabase(targets)).resolves.toMatchObject({
      status: "unavailable",
      reason: "invalid_response",
    });
  });
});
