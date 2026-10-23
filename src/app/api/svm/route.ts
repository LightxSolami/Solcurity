import { NextRequest, NextResponse } from "next/server";
import { getAccountInfo, getRecentTransactions, airdropSol, analyzeProgramLogs, getProgramAccounts, isSvmRunning, getTokenAccounts, getEpochInfo } from "@/lib/svm";
import { z } from "zod";

const SvmActionSchema = z.object({
  action: z.enum([
    "check",
    "account",
    "transactions",
    "airdrop",
    "analyze",
    "analyze-account",
    "programs",
    "tokens",
    "epoch",
  ]),
  pubkey: z.string().optional(),
  amount: z.number().optional(),
  rpcUrl: z.string().optional(),
  programId: z.string().optional(),
  logs: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const action = searchParams.action as string;

  if (action === "check") {
    const rpcUrl = searchParams.rpcUrl || "http://127.0.0.1:8899";
    const running = await isSvmRunning(rpcUrl);
    return NextResponse.json({ running });
  }

  if (action === "epoch") {
    const rpcUrl = searchParams.rpcUrl || "http://127.0.0.1:8899";
    const epoch = await getEpochInfo(rpcUrl);
    return NextResponse.json({ epoch });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = SvmActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const rpcUrl = data.rpcUrl || "http://127.0.0.1:8899";

    switch (data.action) {
      case "check": {
        const running = await isSvmRunning(rpcUrl);
        return NextResponse.json({ running });
      }

      case "account": {
        if (!data.pubkey) {
          return NextResponse.json({ error: "pubkey required" }, { status: 400 });
        }
        const info = await getAccountInfo(data.pubkey, rpcUrl);
        const tokens = info ? await getTokenAccounts(data.pubkey, rpcUrl) : [];
        return NextResponse.json({ account: info, tokens });
      }

      case "transactions": {
        if (!data.pubkey) {
          return NextResponse.json({ error: "pubkey required" }, { status: 400 });
        }
        const txs = await getRecentTransactions(data.pubkey, 20, rpcUrl);
        return NextResponse.json({ transactions: txs });
      }

      case "tokens": {
        if (!data.pubkey) {
          return NextResponse.json({ error: "pubkey required" }, { status: 400 });
        }
        const tokens = await getTokenAccounts(data.pubkey, rpcUrl);
        return NextResponse.json({ tokens });
      }

      case "airdrop": {
        if (!data.pubkey) {
          return NextResponse.json({ error: "pubkey required" }, { status: 400 });
        }
        const amount = data.amount || Math.random() * 5 + 0.1;
        const signature = await airdropSol(data.pubkey, amount, rpcUrl);
        return NextResponse.json({ signature, amount });
      }

      case "analyze": {
        if (!data.programId || !data.logs) {
          return NextResponse.json({ error: "programId and logs required" }, { status: 400 });
        }
        const result = await analyzeProgramLogs(data.programId, data.logs);
        return NextResponse.json({ analysis: result });
      }

      case "programs": {
        if (!data.programId) {
          return NextResponse.json({ error: "programId required" }, { status: 400 });
        }
        const accounts = await getProgramAccounts(data.programId, rpcUrl);
        return NextResponse.json({ accounts });
      }

      case "analyze-account": {
        if (!data.pubkey) {
          return NextResponse.json({ error: "pubkey required" }, { status: 400 });
        }
        const info = await getAccountInfo(data.pubkey, rpcUrl);
        const tokens = info ? await getTokenAccounts(data.pubkey, rpcUrl) : [];
        const txs = await getRecentTransactions(data.pubkey, 20, rpcUrl);

        // Use Groq for comprehensive analysis
        const { groq } = await import("@/lib/groq");

        const accountSummary = info ? `
Account: ${info.pubkey}
Balance: ${info.sol} SOL (${info.lamports} lamports)
Owner: ${info.owner}
Type: ${info.accountType || "Unknown"}
Executable: ${info.executable}
Rent Exempt: ${info.rentExempt}
Data Size: ${info.dataSize} bytes
` : "Account not found";

        const tokensSummary = tokens.length > 0 ? tokens.map(t => `
  - Mint: ${t.mint}
    Balance: ${t.tokenAmount} (${t.amount} raw, ${t.decimals} decimals)
    Owner: ${t.owner}
`).join("") : "No token accounts found";

        const txSummary = txs.length > 0 ? txs.map(tx => `
  - Signature: ${tx.signature.slice(0, 16)}...
    Slot: ${tx.slot}
    Fee: ${tx.meta.fee} lamports
    Success: ${tx.meta.success}
    Logs: ${tx.meta.logMessages.slice(0, 3).join("; ")}${tx.meta.logMessages.length > 3 ? "..." : ""}
`).join("") : "No recent transactions";

        const systemPrompt = `You are a Solana blockchain security analyst. Analyze the provided account data and provide a comprehensive security assessment.

Format your response as JSON with these keys:
- riskLevel: "low" | "medium" | "high"
- summary: brief one-sentence overview
- analysis: detailed analysis (3-5 paragraphs)
- potentialIssues: array of strings
- recommendations: array of strings
- score: number 0-100 (higher = more risky)`;

        const chatCompletion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Analyze this Solana account comprehensively:\n\n${accountSummary}\n\nToken Accounts:\n${tokensSummary}\n\nRecent Transactions:\n${txSummary}\n\nProvide a complete security assessment including risk level, potential issues, and actionable recommendations.`,
            },
          ],
          model: "qwen/qwen3.8-27b",
          temperature: 0.1,
          max_tokens: 3000,
          response_format: { type: "json_object" },
        });

        const response = chatCompletion.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(response);

        return NextResponse.json({
          analysis: {
            ...parsed,
            account: info,
            tokens,
            transactions: txs,
          },
        });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("SVM API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
