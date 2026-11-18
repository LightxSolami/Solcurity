import { Connection, PublicKey, LAMPORTS_PER_SOL, type AccountInfo } from "@solana/web3.js";
import { groq } from "@/lib/groq";
import {
  DEFAULT_SVM_RPC_URL,
  DEFAULT_LOCAL_RPC_URL,
  getSvmNetworkLabel,
  getSvmRpcCandidates,
  isSupportedSvmRpcUrl,
  SVM_GENESIS_HASHES,
} from "@/lib/svm-network";

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
  detailsAvailable: boolean;
  meta: {
    fee: number | null;
    success: boolean | null;
    logMessages: string[] | null;
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

const connections = new Map<string, Connection>();
const svmEndpointHealth = new Map<string, {
  lastChecked: string;
  lastSuccess: string | null;
  consecutiveFailures: number;
  available: boolean;
  cooldownUntil: number;
}>();
const verifiedSvmEndpoints = new Map<string, number>();

export function getSvmConnection(rpcUrl: string = DEFAULT_LOCAL_RPC_URL): Connection {
  let connection = connections.get(rpcUrl);
  if (!connection) {
    connection = new Connection(rpcUrl, {
      commitment: "confirmed",
      confirmTransactionInitialTimeout: 30000,
      fetchMiddleware: async (url, options, fetch) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        try {
          return await fetch(url, { ...options, signal: controller.signal });
        } finally {
          clearTimeout(timeoutId);
        }
      },
    });
    connections.set(rpcUrl, connection);
  }
  return connection;
}

export async function withSvmRpc<T>(
  rpcUrl: string,
  operation: (connection: Connection) => Promise<T>
): Promise<{ value: T; endpoint: string }> {
  let lastError: unknown;
  const candidates = getSvmRpcCandidates(rpcUrl);
  const now = Date.now();
  const availableEndpoints = candidates.filter(
    (endpoint) => (svmEndpointHealth.get(endpoint)?.cooldownUntil || 0) <= now
  );
  const endpoints = availableEndpoints.length > 0
    ? availableEndpoints
    : candidates
      .slice()
      .sort((a, b) =>
        (svmEndpointHealth.get(a)?.cooldownUntil || 0) -
        (svmEndpointHealth.get(b)?.cooldownUntil || 0)
      )
      .slice(0, 1);
  for (let index = 0; index < endpoints.length; index++) {
    const endpoint = endpoints[index];
    try {
      const connection = getSvmConnection(endpoint);
      const network = getSvmNetworkLabel(rpcUrl);
      const expectedGenesis = network === "Custom RPC (network unverified)" || network === "Local Validator"
        ? null
        : SVM_GENESIS_HASHES[network];
      if (expectedGenesis && (verifiedSvmEndpoints.get(endpoint) || 0) < Date.now()) {
        const genesisHash = await connection.getGenesisHash();
        if (genesisHash !== expectedGenesis) {
          throw new Error(`RPC network mismatch: expected ${network}.`);
        }
        verifiedSvmEndpoints.set(endpoint, Date.now() + 5 * 60 * 1000);
      }
      const value = await operation(connection);
      const now = new Date().toISOString();
      svmEndpointHealth.set(endpoint, {
        lastChecked: now,
        lastSuccess: now,
        consecutiveFailures: 0,
        available: true,
        cooldownUntil: 0,
      });
      return { value, endpoint };
    } catch (error) {
      lastError = error;
      const previous = svmEndpointHealth.get(endpoint);
      svmEndpointHealth.set(endpoint, {
        lastChecked: new Date().toISOString(),
        lastSuccess: previous?.lastSuccess || null,
        consecutiveFailures: (previous?.consecutiveFailures || 0) + 1,
        available: false,
        cooldownUntil: Date.now() + 30_000,
      });
      if (index + 1 < endpoints.length) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(250 * 2 ** index, 2000)));
      }
    }
  }

  console.error(`All ${getSvmNetworkLabel(rpcUrl)} RPC endpoints failed:`, lastError);
  throw new Error(`All configured ${getSvmNetworkLabel(rpcUrl)} RPC endpoints failed.`);
}

export async function getSvmHealth(rpcUrl: string) {
  const startedAt = Date.now();
  const result = await withSvmRpc(rpcUrl, (connection) => connection.getEpochInfo());
  return {
    running: true,
    endpoint: result.endpoint,
    network: getSvmNetworkLabel(rpcUrl),
    latencyMs: Date.now() - startedAt,
    endpoints: getSvmRpcCandidates(rpcUrl).map((endpoint) => ({
      endpoint,
      ...(svmEndpointHealth.get(endpoint) || {
        lastChecked: null,
        lastSuccess: null,
        consecutiveFailures: 0,
        available: false,
        cooldownUntil: 0,
      }),
    })),
    epoch: {
      slotIndex: result.value.slotIndex,
      slotInEpoch: result.value.slotsInEpoch,
      epoch: result.value.epoch,
      transactionCount: result.value.transactionCount || 0,
      blockHeight: result.value.blockHeight || 0,
    },
  };
}

export async function isSvmRunning(rpcUrl: string = DEFAULT_LOCAL_RPC_URL): Promise<boolean> {
  try {
    await getSvmHealth(rpcUrl);
    return true;
  } catch {
    return false;
  }
}

export async function testRpcEndpoint(rpcUrl: string): Promise<{ ok: boolean; latency: number; error?: string }> {
  if (!isSupportedSvmRpcUrl(rpcUrl)) {
    return { ok: false, latency: 0, error: "Unsupported RPC endpoint." };
  }
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
  const result = await withSvmRpc(DEFAULT_SVM_RPC_URL, async (connection) => {
    await connection.getEpochInfo();
  });
  return result.endpoint;
}

export async function getAccountInfo(
  pubkey: string,
  rpcUrl: string = DEFAULT_LOCAL_RPC_URL
): Promise<SvmAccountInfo | null> {
  const publicKey = new PublicKey(pubkey);
  const { value } = await withSvmRpc(rpcUrl, async (connection) => {
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
  });
  return value;
}

export async function getTokenAccounts(
  pubkey: string,
  rpcUrl: string = DEFAULT_LOCAL_RPC_URL
): Promise<TokenAccountInfo[]> {
  const publicKey = new PublicKey(pubkey);
  const { value } = await withSvmRpc(rpcUrl, async (connection) => {
    const programs = [
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
    ];
    const responses = await Promise.all(programs.map((programId) =>
      connection.getParsedTokenAccountsByOwner(publicKey, { programId: new PublicKey(programId) })
    ));

    return responses.flatMap((response) =>
      response.value.map((account) => {
        const parsed = account.account.data.parsed?.info;
        if (!parsed) {
          throw new Error(`RPC did not return parsed token data for ${account.pubkey.toBase58()}.`);
        }
        return {
          pubkey: account.pubkey.toBase58(),
          mint: parsed.mint,
          owner: parsed.owner,
          amount: Number(parsed.tokenAmount.amount),
          decimals: parsed.tokenAmount.decimals,
          tokenAmount: parsed.tokenAmount.uiAmountString,
        };
      })
    );
  });
  return value;
}

export async function getRecentTransactions(
  pubkey: string,
  limit: number = 20,
  rpcUrl: string = DEFAULT_SVM_RPC_URL
): Promise<SvmTransactionInfo[]> {
  const publicKey = new PublicKey(pubkey);
  const { value } = await withSvmRpc(rpcUrl, async (connection) => {
    const signatures = await connection.getSignaturesForAddress(publicKey, {
      limit: Math.min(Math.max(1, limit), 100),
    });
    if (signatures.length === 0) return [];
    
    let transactions: any[] = [];
    try {
      transactions = await connection.getParsedTransactions(
        signatures.map((signature) => signature.signature),
        { commitment: "confirmed", maxSupportedTransactionVersion: 0 }
      );
    } catch (parseError) {
      // Fallback: return signatures without parsed details if decoding fails
      console.warn("Failed to parse transactions, returning signatures only:", parseError);
      transactions = signatures.map(() => null);
    }

    return signatures.flatMap((signature, index) => {
      const tx = transactions[index];
      return [{
          signature: signature.signature,
          slot: signature.slot,
          blockTime: signature.blockTime ?? null,
          detailsAvailable: Boolean(tx?.meta),
          meta: tx?.meta ? {
            fee: tx.meta.fee ?? null,
            success: tx.meta.err === null,
            logMessages: tx.meta.logMessages ?? null,
          } : {
            fee: null,
            success: null,
            logMessages: null,
          },
        }];
    });
  });
  return value;
}

export async function airdropSol(
  pubkey: string,
  amount: number,
  rpcUrl: string = DEFAULT_LOCAL_RPC_URL
): Promise<{ signature: string | null; error?: string }> {
  try {
    if (!Number.isFinite(amount) || amount <= 0 || amount > 5) {
      return { signature: null, error: "Airdrop amount must be greater than 0 and no more than 5 SOL." };
    }
    const publicKey = new PublicKey(pubkey);
    const network = getSvmNetworkLabel(rpcUrl);
    if (!["Devnet", "Testnet", "Local Validator"].includes(network)) {
      return { signature: null, error: "Airdrops are only available on a verified test network or local validator." };
    }
    const health = await getSvmHealth(rpcUrl);
    const connection = getSvmConnection(health.endpoint);
    const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

    const signature = await connection.requestAirdrop(publicKey, lamports);

    await connection.confirmTransaction(signature, "confirmed");

    return { signature };
  } catch (error: any) {
    console.error("Error requesting airdrop:", error);
    const errorMsg = error.message || String(error);
    
    if (errorMsg.includes("429") || errorMsg.includes("rate limit") || errorMsg.includes("Too Many Requests")) {
      return { signature: null, error: "Faucet rate limit reached. Try again later or use a local validator." };
    }
    if (errorMsg.includes("410") || errorMsg.includes("Gone") || errorMsg.includes("faucet is closed")) {
      // Check if this is devnet/testnet - if so, the faucet might be temporarily unavailable
      const isDevnetOrTestnet = rpcUrl.includes("devnet") || rpcUrl.includes("testnet");
      if (isDevnetOrTestnet) {
        return { 
          signature: null, 
          error: "Devnet/Testnet faucet is temporarily unavailable. Try again later, or get SOL from https://faucet.solana.com" 
        };
      }
      return { 
        signature: null, 
        error: "Local validator faucet is closed. Use devnet/testnet with https://faucet.solana.com for test SOL, or run your own local validator with airdrop enabled." 
      };
    }
    if (errorMsg.includes("404") || errorMsg.includes("not found") || errorMsg.includes("ECONNREFUSED")) {
      return { signature: null, error: "The selected RPC endpoint is unavailable. Check its status and retry." };
    }
    if (errorMsg.includes("blockhash")) {
      return { signature: null, error: "RPC endpoint doesn't support airdrop. Use local validator or devnet." };
    }
    
    return { signature: null, error: "Airdrop failed. Check RPC availability and try again later." };
  }
}

export async function analyzeProgramLogs(
  programId: string,
  logMessages: string[]
): Promise<ProgramAnalysisResult> {
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

  const response = chatCompletion.choices[0]?.message?.content;
  if (!response) throw new Error("AI analysis returned an empty response.");
  const parsed = JSON.parse(response);

  return {
    programId,
    analysis: parsed.analysis || "No analysis available",
    riskLevel: parsed.riskLevel,
    recommendations: parsed.recommendations || [],
    potentialIssues: parsed.potentialIssues || [],
  };
}

export async function getProgramAccounts(
  programId: string,
  rpcUrl: string = DEFAULT_LOCAL_RPC_URL
): Promise<{ pubkey: string; owner: string; data: string; lamports: number }[]> {
  const publicKey = new PublicKey(programId);
  const { value } = await withSvmRpc(rpcUrl, async (connection) => {

    const accounts = await connection.getProgramAccounts(publicKey, {
      encoding: "base64",
    });

    return accounts.map((acc) => ({
      pubkey: acc.pubkey.toBase58(),
      owner: acc.account.owner.toBase58(),
      data: typeof acc.account.data === "string" ? acc.account.data : acc.account.data.toString("hex"),
      lamports: acc.account.lamports,
    }));
  });
  return value;
}

export async function getEpochInfo(rpcUrl: string = DEFAULT_LOCAL_RPC_URL): Promise<EpochInfo> {
  const { value: epochInfo } = await withSvmRpc(rpcUrl, (connection) => connection.getEpochInfo());
    return {
      slotIndex: epochInfo.slotIndex,
      slotInEpoch: epochInfo.slotsInEpoch || 0,
      epoch: epochInfo.epoch,
      transactionCount: epochInfo.transactionCount || 0,
      blockHeight: epochInfo.blockHeight || 0,
    };
}

function getAccountType(pubkey: PublicKey, accountInfo: AccountInfo<Buffer<ArrayBufferLike>>): string {
  const owner = accountInfo.owner.toBase58();

  const knownPrograms: Record<string, string> = {
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA": "SPL Token Account",
    "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb": "Token-2022 Account",
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
