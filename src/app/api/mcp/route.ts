import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { getClientIp, RateLimiter } from "@/lib/rate-limit";
import { SolanaAddressSchema } from "@/lib/validators";
import { getCachedScan, setCachedScan } from "@/lib/cache";
import { runScan } from "@/services/scan.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const scanRateLimiter = new RateLimiter(6, 60_000);

function createServer(clientIp: string) {
  const server = new McpServer(
    {
      name: "solcurity",
      version: "1.0.0",
    },
    {
      instructions: "Read-only Solana Mainnet wallet security scans. Never request private keys, seed phrases, signatures, or transaction approval.",
    }
  );

  server.registerTool(
    "scan_solana_wallet",
    {
      title: "Scan Solana wallet",
      description: "Run a read-only Solana Mainnet wallet security scan using public RPC and return checks, risk findings, and limitations. This never signs or sends transactions.",
      inputSchema: {
        address: SolanaAddressSchema.describe("Public Solana wallet address to scan. Never provide a private key or seed phrase."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async ({ address }) => {
      const rateCheck = scanRateLimiter.check(clientIp);
      if (!rateCheck.allowed) {
        return {
          isError: true,
          content: [{ type: "text", text: "Scan rate limit reached. Wait briefly before trying again." }],
        };
      }

      try {
        const cached = getCachedScan(address);
        const result = cached && !cached.summary.partialScan && cached.score !== null
          ? cached
          : await runScan(address);

        if (!result.summary.partialScan && result.score !== null && result !== cached) {
          setCachedScan(address, result);
        }

        const report = {
          address: result.address,
          network: result.network,
          riskLevel: result.riskLevel,
          score: result.score,
          scanConfidence: result.scanConfidence,
          partialScan: result.summary.partialScan,
          checks: result.checks,
          findings: result.findings.slice(0, 12),
          scannedAt: result.scannedAt,
          notice: "Informational automated assessment only; not a guarantee of safety. UNKNOWN means the check could not establish a result.",
        };

        return {
          content: [{ type: "text", text: JSON.stringify(report, null, 2) }],
        };
      } catch {
        return {
          isError: true,
          content: [{ type: "text", text: "The Solana scan could not be completed. Retry later; no transaction was created or signed." }],
        };
      }
    }
  );

  return server;
}

export async function POST(request: Request) {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    maxRequestBodySize: 16_384,
  });
  const server = createServer(getClientIp(request.headers));

  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } catch (error) {
    console.error("MCP request failed:", error);
    await server.close();
    return Response.json({ error: "MCP request could not be handled." }, { status: 500 });
  }
}
