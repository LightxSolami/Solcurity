import "server-only";
import {
  ExtensionType,
  getExtensionTypes,
  getMint,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { getTransaction as fetchSolanaTransaction, withRpcRetry } from "@/lib/solana-rpc";
import {
  addTelegramAlert,
  getTelegramAlertsForUser,
  removeTelegramAlert,
  type AlertSubscription,
} from "./alert-repository";
import { APP_URL } from './bot';
export type { AlertSubscription } from "./alert-repository";

const API_BASE = `${APP_URL}/api`;

interface ScanResponse {
  address: string;
  network: string;
  score: number;
  riskLevel: string;
  summary: {
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
    partialScan: boolean;
    failedChecks: string[];
  };
  wallet: {
    exists: boolean;
    solBalance: number;
    lamports: number;
    tokenAccounts: number;
    nftAccounts: number;
    transactionCount: number;
    firstActivity: string;
    lastActivity: string;
    approximateAgeDays: number;
    accountType?: string;
    executable?: boolean;
    rentExempt?: boolean;
    dataSize?: number;
  };
  tokens: Array<{
    mint: string;
    amount: number;
    decimals: number;
    tokenAmount: string;
    owner: string;
    tokenInfo?: {
      name?: string;
      symbol?: string;
      supply?: number;
      decimals?: number;
      freezeAuthority?: string | null;
      mintAuthority?: string | null;
      extensions?: string[];
      holders?: number;
    };
  }>;
  programs: Array<{
    programId: string;
    name?: string;
    category?: string;
    riskLevel?: string;
    interactionCount: number;
    firstInteraction: string;
    lastInteraction: string;
  }>;
  findings: Array<{
    id: string;
    severity: string;
    category: string;
    title: string;
    description: string;
    evidence: string;
    recommendation: string;
    confidence: number;
    metadata?: Record<string, any>;
  }>;
  sources: Array<{
    name: string;
    url: string;
    lastUpdated: string;
  }>;
  scannedAt: string;
  scanId?: string;
}

interface WalletSummaryResponse {
  address: string;
  network: string;
  wallet: {
    exists: boolean;
    solBalance: number;
    lamports: number;
    tokenAccounts: number;
    nftAccounts: number;
    transactionCount: number;
    firstActivity: string;
    lastActivity: string;
    approximateAgeDays: number;
  };
}

interface TokenInfoResponse {
  mint: string;
  token: {
    name: string;
    symbol: string;
    supply: number;
    decimals: number;
    freezeAuthority: string | null;
    mintAuthority: string | null;
    extensions: string[];
    holders: number | null;
  };
}

interface TransactionResponse {
  signature: string;
  slot: number;
  blockTime: number | null;
  meta: {
    fee: number | null;
    err: any;
    logMessages: string[] | null;
    postTokenBalances: any[];
    preTokenBalances: any[];
  };
  transaction: {
    message: {
      instructions: any[];
    };
  };
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 30000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function scanWallet(address: string, network: string = 'solana-mainnet'): Promise<ScanResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, network }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Scan failed' }));
    throw new Error(error.error || `Scan failed: ${res.status}`);
  }

  return res.json();
}

export async function getWalletSummary(address: string, network: string = 'solana-mainnet'): Promise<WalletSummaryResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, network, summaryOnly: true }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Wallet summary failed' }));
    throw new Error(error.error || `Wallet summary failed: ${res.status}`);
  }

  return res.json();
}

export async function getTokenInfo(mint: string): Promise<TokenInfoResponse> {
  const mintAddress = new PublicKey(mint);
  return withRpcRetry(async (connection) => {
    const account = await connection.getAccountInfo(mintAddress, "confirmed");
    if (!account) throw new Error("Token mint account was not found");

    const isToken2022 = account.owner.equals(TOKEN_2022_PROGRAM_ID);
    if (!isToken2022 && !account.owner.equals(TOKEN_PROGRAM_ID)) {
      throw new Error("Address is not an SPL Token mint");
    }

    const programId = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    const mintInfo = await getMint(connection, mintAddress, "confirmed", programId);
    const extensions = isToken2022
      ? getExtensionTypes(mintInfo.tlvData).map((type) => ExtensionType[type] ?? String(type))
      : [];

    return {
      mint,
      token: {
        name: "Unknown Token",
        symbol: "UNKNOWN",
        supply: Number(mintInfo.supply) / 10 ** mintInfo.decimals,
        decimals: mintInfo.decimals,
        freezeAuthority: mintInfo.freezeAuthority?.toBase58() ?? null,
        mintAuthority: mintInfo.mintAuthority?.toBase58() ?? null,
        extensions,
        holders: null,
      },
    };
  });
}

export async function getTransaction(signature: string): Promise<TransactionResponse> {
  const tx = await withRpcRetry((connection) => fetchSolanaTransaction(connection, signature));
  if (!tx) throw new Error("Transaction was not found");

  return {
    signature,
    slot: tx.slot,
    blockTime: tx.blockTime ?? null,
    meta: {
      fee: tx.meta?.fee ?? null,
      err: tx.meta ? tx.meta.err : "unknown",
      logMessages: tx.meta?.logMessages ?? null,
      postTokenBalances: tx.meta?.postTokenBalances ?? [],
      preTokenBalances: tx.meta?.preTokenBalances ?? [],
    },
    transaction: {
      message: {
        instructions: tx.transaction.message.instructions,
      },
    },
  };
}

export async function addAlert(
  userId: number,
  address: string,
  chatId: number = userId,
): Promise<AlertSubscription> {
  return addTelegramAlert(userId, address, chatId);
}

export async function removeAlert(userId: number, address: string): Promise<boolean> {
  return removeTelegramAlert(userId, address);
}

export async function getUserAlerts(userId: number): Promise<AlertSubscription[]> {
  return getTelegramAlertsForUser(userId);
}

export async function getAlert(userId: number, address: string): Promise<AlertSubscription | undefined> {
  const alerts = await getTelegramAlertsForUser(userId);
  return alerts.find(a => a.address === address);
}

export function validateSolanaAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  if (address.length < 32 || address.length > 44) return false;
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(address);
}

export function validateSolanaSignature(signature: string): boolean {
  if (!signature || typeof signature !== 'string') return false;
  if (signature.length !== 88 && signature.length !== 87) return false;
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(signature);
}

export function validateTokenMint(mint: string): boolean {
  return validateSolanaAddress(mint);
}