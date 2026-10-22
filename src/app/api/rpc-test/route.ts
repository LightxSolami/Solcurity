import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: "URL parameter required" }, { status: 400 });
    }

    const response = await fetch(url, {
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
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: data?.error?.message || `HTTP ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    let blockHeight = null;
    if (data.result?.context?.slot) {
      const blockRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "getBlockHeight",
          params: [],
        }),
      });
      if (blockRes.ok) {
        const blockData = await blockRes.json();
        blockHeight = blockData.result;
      }
    }

    return NextResponse.json({ blockHeight: data.result || blockHeight });
  } catch (error) {
    return NextResponse.json({ error: "Network error" }, { status: 500 });
  }
}
