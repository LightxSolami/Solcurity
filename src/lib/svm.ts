import { Connection, PublicKey, LAMPORTS_PER_SOL, type AccountInfo } from "@solana/web3.js";
import { groq } from "@/lib/groq";

export interface SvmAccountInfo {
  pubkey: string;
  lamports: number;
  sol: number;
  owner: string;
  executable: boolean;
  rentEpoch: number;
  dataSize: number;
  rentExempt: boolean;
  accountType?: string;
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

export interface TokenAccountInfo {
  pubkey: string;
  mint: string;
  owner: string;
  amount: number;
  decimals: number;
  tokenAmount: string;
}

export interface ProgramAnalysisResult {
  programId: string;
  analysis: string;
  riskLevel: "low" | "medium" | "high";
  recommendations: string[];
  potentialIssues: string[];
}

export interface EpochInfo {
  slotIndex: number;
  slotInEpoch: number;
  epoch: number;
  transactionCount: number;
  blockHeight: number;
}

const DEFAULT_LOCAL_RPC = "http://127.0.0.1:8899";
const DEVNET_RPC = "https://api.devnet.solana.com";
const TESTNET_RPC = "https://api.testnet.solana.com";
const ALCHEMY_RPC = "https://solana-mainnet.g.alchemy.com/v2/demo";
const ANKR_RPC = "https://rpc.ankr.com/solana";
const DRPC_RPC = "https://solana.drpc.org";

const RPC_FALLBACKS = [DEVNET_RPC, TESTNET_RPC, ALCHEMY_RPC, ANKR_RPC, DRPC_RPC];

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

export async function isSvmRunning(rpcUrl: string = DEFAULT_LOCAL_RPC): Promise<boolean> {
  try {
    const connection = getSvmConnection(rpcUrl);
    await connection.getEpochInfo();
    return true;
  } catch {
    return false;
  }
}

export async function testRpcEndpoint(rpcUrl: string): Promise<{ ok: boolean; latency: number; error?: string }> {
  try {
    const start = Date.now();
    const connection = new Connection(rpcUrl, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 10000,
    });
    await connection.getEpochInfo();
    return { ok: true, latency: Date.now() - start };
  } catch (error: any) {
    return { ok: false, latency: 0, error: error.message || String(error) };
  }
}

export async function findWorkingRpc(): Promise<string> {
  const currentUrlTest = await testRpcEndpoint(currentUrl);
  if (currentUrlTest.ok) {
    return currentUrl;
  }

  for (const fallback of RPC_FALLBACKS) {
    const result = await testRpcEndpoint(fallback);
    if (result.ok) {
      return fallback;
    }
  }

  return DEFAULT_LOCAL_RPC;
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

    const accountType = getAccountType(publicKey, accountInfo);

    const rentThreshold = await connection.getMinimumBalanceForRentExemption(accountInfo.data.length);

    return {
      pubkey,
      lamports: accountInfo.lamports,
      sol: accountInfo.lamports / LAMPORTS_PER_SOL,
      owner: accountInfo.owner.toBase58(),
      executable: accountInfo.executable,
      rentEpoch: accountInfo.rentEpoch ?? 0,
      dataSize: accountInfo.data.length,
      rentExempt: accountInfo.lamports >= rentThreshold,
      accountType,
    };
  } catch (error) {
    console.error("Error fetching account info:", error);
    return null;
  }
}

export async function getTokenAccounts(
  pubkey: string,
  rpcUrl: string = DEFAULT_LOCAL_RPC
): Promise<TokenAccountInfo[]> {
  try {
    const connection = getSvmConnection(rpcUrl);
    const publicKey = new PublicKey(pubkey);

    const accounts: TokenAccountInfo[] = [];

    const tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    }).catch(() => ({ value: [] }));

    const token2022Accounts = await connection.getTokenAccountsByOwner(publicKey, {
      programId: new PublicKey("TokenzQdBNbLqP5VEh89ASGF8P25BN8cGxqZ"),
    }).catch(() => ({ value: [] }));

    for (const account of [...tokenAccounts.value, ...token2022Accounts.value]) {
      try {
        const accountInfo = await connection.getAccountInfo(account.pubkey);
        if (!accountInfo) continue;

        const data = JSON.parse(accountInfo.data.toString());
        const parsed = data?.parsed?.info;

        if (parsed) {
          accounts.push({
            pubkey: account.pubkey.toBase58(),
            mint: parsed.mint,
            owner: parsed.owner,
            amount: Number(parsed.tokenAmount.amount),
            decimals: parsed.tokenAmount.decimals,
            tokenAmount: parsed.tokenAmount.uiAmountString,
          });
        }
      } catch {}
    }

    return accounts;
  } catch (error) {
    console.error("Error fetching token accounts:", error);
    return [];
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
      model: "qwen/qwen3.8-27b",
      temperature: 0.1,
      max_tokens: 2048,
      response_format: { type: "json_object" },
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
): Promise<{ pubkey: string; owner: string; data: string; lamports: number }[]> {
  try {
    const connection = getSvmConnection(rpcUrl);
    const publicKey = new PublicKey(programId);

    const accounts = await connection.getProgramAccounts(publicKey, {
      encoding: "base64",
    });

    return accounts.map((acc) => ({
      pubkey: acc.pubkey.toBase58(),
      owner: acc.account.owner.toBase58(),
      data: typeof acc.account.data === "string" ? acc.account.data : acc.account.data.toString("hex"),
      lamports: acc.account.lamports,
    }));
  } catch (error) {
    console.error("Error fetching program accounts:", error);
    return [];
  }
}

export async function getEpochInfo(rpcUrl: string = DEFAULT_LOCAL_RPC): Promise<EpochInfo | null> {
  try {
    const connection = getSvmConnection(rpcUrl);
    const epochInfo = await connection.getEpochInfo();

    return {
      slotIndex: epochInfo.slotIndex,
      slotInEpoch: epochInfo.slotsInEpoch || 0,
      epoch: epochInfo.epoch,
      transactionCount: epochInfo.transactionCount || 0,
      blockHeight: epochInfo.blockHeight || 0,
    };
  } catch (error) {
    console.error("Error fetching epoch info:", error);
    return null;
  }
}

function getAccountType(pubkey: PublicKey, accountInfo: AccountInfo<Buffer<ArrayBufferLike>>): string {
  const owner = accountInfo.owner.toBase58();

  const knownPrograms: Record<string, string> = {
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": "SPL Token Account",
    "TokenzQdBNbLqP5VEh89ASGF8P25BN8cGxqZ": "Token-2022 Account",
    "BPFLoader1111111111111111111111111111111111": "BPF Loader",
    "BPFLoader2111111111111111111111111111111111": "BPF Loader v2",
    "BPFLoaderUpgradeab1e11111111111111111111111": "BPF Upgradeable Loader",
    "Stake11111111111111111111111111111111111": "Stake Account",
    "Vote111111111111111111111111111111111111111": "Vote Account",
    "SysvarRepDateSysvar1111111111111111111111111111111": "Sysvar: Recent Blockhashes",
    "SysvarClock11111111111111111111111111111111": "Sysvar: Clock",
    "SysvarEpochRewards1111111111111111111111111": "Sysvar: Epoch Rewards",
    "SysvarRent111111111111111111111111111111111": "Sysvar: Rent",
    "SysvarSlotHistory1111111111111111111111111": "Sysvar: Slot History",
    "SysvarStakeHistory1111111111111111111111111": "Sysvar: Stake History",
    "NativeLoader1111111111111111111111111111111": "Native Loader",
    "StakeConfig11111111111111111111111111111111": "Stake Config",
  };

  if (accountInfo.executable) {
    return knownPrograms[owner] || "Executable Program";
  }

  if (pubkey.toBase58() === "11111111111111111111111111111111") {
    return "System Program";
  }

  if (owner === "11111111111111111111111111111111") {
    return "System Account";
  }

  for (const [programId, name] of Object.entries(knownPrograms)) {
    if (owner === programId) {
      return name;
    }
  }

  return "Unknown Account";
}
