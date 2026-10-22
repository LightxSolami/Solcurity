import { Connection, PublicKey, LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import { groq } from "@/lib/groq";

export interface SvmAccountInfo {
  pubkey: string;
  lamports: number;
  sol: number;
  owner: string;
  executable: boolean;
  rentEpoch: number;
  dataSize: number;
}

export interface SvmTransactionInfo {
  signature: string;
  slot: number;
  blockTime: number | null;
  meta: {
    fee: number;
    success: boolean;
    logMessages: string[];
  };
}

export interface ProgramAnalysisResult {
  programId: string;
  analysis: string;
  riskLevel: "low" | "medium" | "high";
  recommendations: string[];
  potentialIssues: string[];
}

const DEFAULT_LOCAL_RPC = "http://127.0.0.1:8899";
let svmConnection: Connection | null = null;
let currentUrl: string = DEFAULT_LOCAL_RPC;

export function getSvmConnection(rpcUrl: string = DEFAULT_LOCAL_RPC): Connection {
  if (!svmConnection || currentUrl !== rpcUrl) {
    currentUrl = rpcUrl;
    svmConnection = new Connection(rpcUrl, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 30000,
    });
  }
  return svmConnection;
}

export function isSvmRunning(rpcUrl: string = DEFAULT_LOCAL_RPC): boolean {
  try {
    const connection = getSvmConnection(rpcUrl);
    connection.getEpochInfo();
    return true;
  } catch {
    return false;
  }
}

export async function getAccountInfo(
  pubkey: string,
  rpcUrl: string = DEFAULT_LOCAL_RPC
): Promise<SvmAccountInfo | null> {
  try {
    const connection = getSvmConnection(rpcUrl);
    const publicKey = new PublicKey(pubkey);
    const accountInfo = await connection.getAccountInfo(publicKey);

    if (!accountInfo) return null;

    return {
      pubkey,
      lamports: accountInfo.lamports,
      sol: accountInfo.lamports / LAMPORTS_PER_SOL,
      owner: accountInfo.owner.toBase58(),
      executable: accountInfo.executable,
      rentEpoch: accountInfo.rentEpoch ?? 0,
      dataSize: accountInfo.data.length,
    };
  } catch (error) {
    console.error("Error fetching account info:", error);
    return null;
  }
}

export async function getRecentTransactions(
  pubkey: string,
  limit: number = 20,
  rpcUrl: string = DEFAULT_LOCAL_RPC
): Promise<SvmTransactionInfo[]> {
  try {
    const connection = getSvmConnection(rpcUrl);
    const publicKey = new PublicKey(pubkey);
    const signatures = await connection.getSignaturesForAddress(publicKey, { limit });

    const transactions: SvmTransactionInfo[] = [];

    for (const sig of signatures) {
      const tx = await connection.getTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (tx) {
        transactions.push({
          signature: sig.signature,
          slot: sig.slot,
          blockTime: sig.blockTime ?? null,
          meta: {
            fee: tx.meta?.fee || 0,
            success: tx.meta ? tx.meta.err === null : false,
            logMessages: tx.meta?.logMessages || [],
          },
        });
      }
    }

    return transactions;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}

export async function airdropSol(
  pubkey: string,
  amount: number,
  rpcUrl: string = DEFAULT_LOCAL_RPC
): Promise<string | null> {
  try {
    const connection = getSvmConnection(rpcUrl);
    const publicKey = new PublicKey(pubkey);
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    const signature = await connection.requestAirdrop(publicKey, lamports);

    await connection.confirmTransaction(signature, "confirmed");

    return signature;
  } catch (error) {
    console.error("Error requesting airdrop:", error);
    return null;
  }
}

export async function analyzeProgramLogs(
  programId: string,
  logMessages: string[]
): Promise<ProgramAnalysisResult> {
  try {
    const logsText = logMessages.join("\n");

    const systemPrompt = `You are an expert Solana smart contract security analyst. Analyze the following Solana SVM program logs and provide:
1. Risk assessment (low/medium/high)
2. List of potential security issues found
3. Actionable recommendations
4. Brief explanation

Format your response as JSON with keys: riskLevel, potentialIssues, recommendations, analysis.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Analyze this Solana SVM program (ID: ${programId}) execution logs:\n\n${logsText.slice(0, 8000)}`,
        },
      ],
      model: "deepseek-r1-distill-llama-70b",
      temperature: 0.1,
      max_tokens: 2048,
    });

    const response = chatCompletion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(response);

    return {
      programId,
      analysis: parsed.analysis || "No analysis available",
      riskLevel: parsed.riskLevel || "low",
      recommendations: parsed.recommendations || [],
      potentialIssues: parsed.potentialIssues || [],
    };
  } catch (error) {
    console.error("Error analyzing program with AI:", error);
    return {
      programId,
      analysis: "Failed to analyze program with AI",
      riskLevel: "low",
      recommendations: [],
      potentialIssues: [],
    };
  }
}

export async function getProgramAccounts(
  programId: string,
  rpcUrl: string = DEFAULT_LOCAL_RPC
): Promise<{ pubkey: string; data: string }[]> {
  try {
    const connection = getSvmConnection(rpcUrl);
    const publicKey = new PublicKey(programId);

    const accounts = await connection.getProgramAccounts(publicKey, {
      encoding: "base64",
    });

    return accounts.map((acc) => ({
      pubkey: acc.pubkey.toBase58(),
      data: typeof acc.account.data === "string" ? acc.account.data : acc.account.data.toString("hex"),
    }));
  } catch (error) {
    console.error("Error fetching program accounts:", error);
    return [];
  }
}
