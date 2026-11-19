import { NextRequest, NextResponse } from "next/server";
import { ScanRequestSchema } from "@/lib/validators";
import { runScan } from "@/services/scan.service";
import { getRateLimiter, getClientIp } from "@/lib/rate-limit";
import { getCachedScan, setCachedScan } from "@/lib/cache";
import { isConfiguredRpcUrl } from "@/lib/rpc-endpoints";

export async function POST(request: NextRequest) {
  const rateLimiter = getRateLimiter();
  const clientIp = getClientIp(request.headers);

  const rateCheck = rateLimiter.check(clientIp);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateCheck.resetAt - Date.now()) / 1000)) } }
    );
  }

  try {
    const body = await request.json();
    const parsed = ScanRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { address } = parsed.data;
    if (parsed.data.rpcUrl && !isConfiguredRpcUrl(parsed.data.rpcUrl)) {
      return NextResponse.json(
        { error: "RPC URL must be configured by the server before it can be used." },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = getCachedScan(address);
    if (cached && !cached.summary.partialScan && cached.score !== null) {
      return NextResponse.json(cached, {
        headers: {
          "X-RateLimit-Remaining": String(rateCheck.remaining),
          "X-RateLimit-Reset": String(Math.ceil(rateCheck.resetAt / 1000)),
        },
      });
    }

    // Run the scan
    const result = await runScan(address, parsed.data.rpcUrl);

    // Cache the result
    if (!result.summary.partialScan && result.score !== null) {
      setCachedScan(address, result);
    }

    return NextResponse.json(result, {
      headers: {
        "X-RateLimit-Remaining": String(rateCheck.remaining),
        "X-RateLimit-Reset": String(Math.ceil(rateCheck.resetAt / 1000)),
      },
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Internal server error during scan" },
      { status: 500 }
    );
  }
}