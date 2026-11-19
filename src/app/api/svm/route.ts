import { NextRequest, NextResponse } from "next/server";
import { getAccountInfo, getRecentTransactions, airdropSol, analyzeProgramLogs, getProgramAccounts, getTokenAccounts, getSvmHealth } from "@/lib/svm";
import { DEFAULT_SVM_RPC_URL, getSvmNetworkLabel, isSupportedSvmRpcUrl } from "@/lib/svm-network";
import { SolanaAddressSchema } from "@/lib/validators";
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
  pubkey: SolanaAddressSchema.optional(),
  amount: z.number().optional(),
  rpcUrl: z.string().url().optional(),
  programId: SolanaAddressSchema.optional(),
  logs: z.array(z.string()).optional(),
});

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const searchParams = Object.fromEntries(url.searchParams.entries());
  const action = searchParams.action as string;

  if (action === "check") {
    const rpcUrl = searchParams.rpcUrl || DEFAULT_SVM_RPC_URL;
    if (!isSupportedSvmRpcUrl(rpcUrl)) {
      return NextResponse.json({ error: "Unsupported RPC endpoint." }, { status: 400 });
    }
    try {
      const health = await getSvmHealth(rpcUrl);
      return NextResponse.json(health);
    } catch (error) {
      console.error("SVM RPC health check failed:", error);
      return NextResponse.json(
        { running: false, error: "All configured RPC endpoints for this network are unavailable." },
        { status: 502 }
      );
    }
  }

  if (action === "epoch") {
    const rpcUrl = searchParams.rpcUrl || DEFAULT_SVM_RPC_URL;
    if (!isSupportedSvmRpcUrl(rpcUrl)) {
      return NextResponse.json({ error: "Unsupported RPC endpoint." }, { status: 400 });
    }
    try {
      const health = await getSvmHealth(rpcUrl);
      return NextResponse.json({ epoch: health.epoch, endpoint: health.endpoint });
    } catch (error) {
      console.error("SVM epoch request failed:", error);
      return NextResponse.json({ error: "RPC epoch data is unavailable." }, { status: 502 });
    }
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
    const rpcUrl = data.rpcUrl || DEFAULT_SVM_RPC_URL;
    if (!isSupportedSvmRpcUrl(rpcUrl)) {
      return NextResponse.json({ error: "Unsupported RPC endpoint." }, { status: 400 });
    }
    const network = getSvmNetworkLabel(rpcUrl);

    switch (data.action) {
      case "check": {
        const health = await getSvmHealth(rpcUrl);
        return NextResponse.json(health);
      }

      case "account": {
        if (!data.pubkey) {
          return NextResponse.json({ error: "pubkey required" }, { status: 400 });
        }
        const info = await getAccountInfo(data.pubkey, rpcUrl);
        const tokens = await getTokenAccounts(data.pubkey, rpcUrl);
        return NextResponse.json({ account: info, tokens, network });
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
        const result = await airdropSol(data.pubkey, amount, rpcUrl);
        if (result.error) {
          return NextResponse.json({ error: result.error, amount }, { status: 400 });
        }
        return NextResponse.json({ signature: result.signature, amount });
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
        const tokens = await getTokenAccounts(data.pubkey, rpcUrl);
        const txs = await getRecentTransactions(data.pubkey, 20, rpcUrl);

        // Use Groq for comprehensive analysis
        let groq: any;
        try {
          const { groq: groqClient } = await import("@/lib/groq");
          groq = groqClient;
        } catch (importError) {
          console.error("Failed to import Groq client:", importError);
          return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
        }

        if (!groq || !process.env.GROQ_API_KEY) {
          console.error("Groq client not initialized or API key missing");
          return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
        }

        const accountSummary = info ? `
Account: ${info.pubkey}
Network: ${network}
Account balance: ${info.sol} SOL (${info.lamports} lamports) on ${network}
Owner: ${info.owner}
Type: ${info.accountType || "Unknown"}
Executable: ${info.executable}
Rent Exempt: ${info.rentExempt}
Data Size: ${info.dataSize} bytes
` : `Account not found on ${network}`;

        const tokensSummary = tokens.length > 0 ? tokens.map(t => `
  - Mint: ${t.mint}
    Balance: ${t.tokenAmount} (${t.amount} raw, ${t.decimals} decimals)
    Owner: ${t.owner}
`).join("") : "No token accounts found";

        const txSummary = txs.length > 0 ? txs.map(tx => {
          const logs = tx.meta.logMessages
            ? `${tx.meta.logMessages.slice(0, 3).join("; ")}${tx.meta.logMessages.length > 3 ? "..." : ""}`
            : "unavailable";
          return `
  - Signature: ${tx.signature.slice(0, 16)}...
    Slot: ${tx.slot}
    Fee: ${tx.meta.fee} lamports
    Success: ${tx.meta.success}
    Logs: ${logs}
`;
        }).join("") : "No recent transactions";

        const systemPrompt = `You are a Solana blockchain security analyst. Analyze the provided account data and provide a comprehensive security assessment.
All balance values are specific to the named RPC network. Never describe a Devnet or Testnet balance as a Mainnet or total wallet balance. Do not state, estimate, round, or reinterpret SOL balances or token amounts; the exact RPC values are displayed separately by the application. Do not infer dormancy from missing transaction data.

Format your response as JSON with these keys:
- riskLevel: "low" | "medium" | "high"
- summary: brief one-sentence overview
- analysis: detailed analysis (3-5 paragraphs)
- potentialIssues: array of strings
- recommendations: array of strings
- score: number 0-100 (higher = more risky)`;

        let chatCompletion: any;
        try {
          chatCompletion = await groq.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `Analyze this Solana account comprehensively. The selected RPC network is ${network}; make clear that any account balance is specific to this network and is not the wallet's balance on other clusters.\n\n${accountSummary}\n\nToken Accounts:\n${tokensSummary}\n\nRecent Transactions:\n${txSummary}\n\nProvide a complete security assessment including risk level, potential issues, and actionable recommendations.`,
              },
            ],
            model: "qwen/qwen3.8-27b",
            temperature: 0.1,
            max_tokens: 3000,
            response_format: { type: "json_object" },
          });
        } catch (groqError: any) {
          console.error("Groq API error:", groqError);
          return NextResponse.json({ 
            error: "AI analysis failed. Verify the provider configuration and retry.",
          }, { status: 502 });
        }

        const response = chatCompletion.choices[0]?.message?.content;
        if (!response) {
          return NextResponse.json({ error: "AI analysis returned an empty response." }, { status: 502 });
        }
        let parsed: any;
        try {
          parsed = JSON.parse(response);
        } catch (parseError) {
          console.error("Failed to parse Groq response:", parseError);
          return NextResponse.json({ error: "Invalid AI response format" }, { status: 502 });
        }

        return NextResponse.json({
          analysis: {
            ...parsed,
            account: info,
            network,
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
      { error: "SVM request failed; verify RPC availability and retry." },
      { status: 502 }
    );
  }
}
