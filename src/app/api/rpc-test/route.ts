import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validatePublicRpcUrl } from "@/lib/public-rpc-url";

const RpcTestRequestSchema = z.object({
  url: z.string().min(1).max(2048),
});

export async function POST(request: NextRequest) {
  try {
    const parsedRequest = RpcTestRequestSchema.safeParse(await request.json());
    if (!parsedRequest.success) {
      return NextResponse.json({ error: "A valid RPC URL is required" }, { status: 400 });
    }

    const endpoint = await validatePublicRpcUrl(parsedRequest.data.url);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBlockHeight",
        params: [],
      }),
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `RPC endpoint returned HTTP ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    if (data.error) {
      return NextResponse.json(
        { error: data.error.message || "RPC request failed" },
        { status: 502 }
      );
    }

    if (!Number.isSafeInteger(data.result) || data.result < 0) {
      return NextResponse.json({ error: "RPC returned an invalid block height" }, { status: 502 });
    }

    return NextResponse.json({ blockHeight: data.result });
  } catch (error) {
    if (error instanceof Error && (
      error.message.startsWith("Enter a valid") ||
      error.message.startsWith("RPC endpoints") ||
      error.message.startsWith("RPC endpoint must")
    )) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("RPC test failed:", error);
    return NextResponse.json({ error: "Unable to test the RPC endpoint" }, { status: 502 });
  }
}
