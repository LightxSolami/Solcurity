import { Connection, PublicKey, LAMPORTS_PER_SOL, type GetProgramAccountsConfig, type TokenAccountBalancePair } from "@solana/web3.js";
import { buildFreeRpcEndpoints, isConfiguredRpcUrl } from "@/lib/rpc-endpoints";
import { SVM_GENESIS_HASHES } from "@/lib/svm-network";

const FREE_RPC_ENDPOINTS = buildFreeRpcEndpoints();

let currentRpcIndex = 0;
const endpointHealth = new Map<string, {
  lastChecked: string;
  lastSuccess?: string;
  consecutiveFailures: number;
  lastError?: string;
  cooldownUntil?: number;
}>();
const verifiedMainnetEndpoints = new Map<string, number>();

export type RpcExecutor = <T>(operation: (connection: Connection) => Promise<T>) => Promise<T>;

export function createSolanaConnection(rpcUrl?: string): Connection {
  const url = rpcUrl || FREE_RPC_ENDPOINTS[currentRpcIndex] || "https://api.mainnet-beta.solana.com";
  return new Connection(url, {
    commitment: "confirmed",
    wsEndpoint: undefined,
    // Add timeout to fail faster
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
}

export function getRpcUrl(): string {
  return FREE_RPC_ENDPOINTS[currentRpcIndex] || FREE_RPC_ENDPOINTS[0];
}

export function rotateRpcEndpoint(): string {
  if (FREE_RPC_ENDPOINTS.length === 0) {
    throw new Error("No Solana RPC endpoints are configured.");
  }
  currentRpcIndex = (currentRpcIndex + 1) % FREE_RPC_ENDPOINTS.length;
  return FREE_RPC_ENDPOINTS[currentRpcIndex];
}

export function getRpcEndpointHealth() {
  return FREE_RPC_ENDPOINTS.map((endpoint) => ({
    endpoint,
    ...(endpointHealth.get(endpoint) || {
      lastChecked: null,
      lastSuccess: null,
      consecutiveFailures: 0,
    }),
  }));
}

export async function withRpcRetry<T>(
  operation: (connection: Connection) => Promise<T>,
  maxRetries = FREE_RPC_ENDPOINTS.length - 1,
  preferredRpcUrl?: string
): Promise<T> {
  let lastError: Error | null = null;
  if (preferredRpcUrl && !isConfiguredRpcUrl(preferredRpcUrl)) {
    throw new Error("The requested RPC URL is not in the server's configured endpoint list.");
  }

  const candidates = preferredRpcUrl
    ? [preferredRpcUrl, ...FREE_RPC_ENDPOINTS.filter((endpoint) => endpoint !== preferredRpcUrl)]
    : [...FREE_RPC_ENDPOINTS];
  const now = Date.now();
  const availableEndpoints = candidates.filter(
    (endpoint) => (endpointHealth.get(endpoint)?.cooldownUntil || 0) <= now
  );
  const endpoints = availableEndpoints.length > 0
    ? availableEndpoints
    : candidates
      .slice()
      .sort((a, b) =>
        (endpointHealth.get(a)?.cooldownUntil || 0) -
        (endpointHealth.get(b)?.cooldownUntil || 0)
      )
      .slice(0, 1);
  const attempts = Math.min(Math.max(1, maxRetries + 1), endpoints.length);

  for (let attempt = 0; attempt < attempts; attempt++) {
    const endpoint = endpoints[attempt];
    const connection = createSolanaConnection(endpoint);
    try {
      if ((verifiedMainnetEndpoints.get(endpoint) || 0) < Date.now()) {
        const genesisHash = await connection.getGenesisHash();
        if (genesisHash !== SVM_GENESIS_HASHES.Mainnet) {
          throw new Error("RPC endpoint is not connected to Solana Mainnet.");
        }
        verifiedMainnetEndpoints.set(endpoint, Date.now() + 5 * 60 * 1000);
      }
      const result = await operation(connection);
      const now = new Date().toISOString();
      endpointHealth.set(endpoint, {
        lastChecked: now,
        lastSuccess: now,
        consecutiveFailures: 0,
      });
      currentRpcIndex = Math.max(0, FREE_RPC_ENDPOINTS.indexOf(endpoint));
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const priorFailures = endpointHealth.get(endpoint)?.consecutiveFailures || 0;
      endpointHealth.set(endpoint, {
        lastChecked: new Date().toISOString(),
        lastSuccess: endpointHealth.get(endpoint)?.lastSuccess,
        consecutiveFailures: priorFailures + 1,
        lastError: lastError.message,
        cooldownUntil: Date.now() + (
          lastError.message.includes("429") || lastError.message.includes("rate limit")
            ? 60_000
            : 30_000
        ),
      });

      if (attempt + 1 < attempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(250 * 2 ** attempt, 2000))
        );
      }
    }
  }

  throw new Error(
    `Solana RPC request failed on ${attempts} configured endpoint(s): ${
      lastError?.message || "unknown RPC error"
    }`
  );
}

export async function getBalance(connection: Connection, pubkey: PublicKey): Promise<number> {
  const lamports = await connection.getBalance(pubkey, "confirmed");
  return lamports / LAMPORTS_PER_SOL;
}

export async function getLamports(connection: Connection, pubkey: PublicKey): Promise<number> {
  return connection.getBalance(pubkey, "confirmed");
}

export async function getAccountInfo(
  connection: Connection,
  pubkey: PublicKey
): Promise<ReturnType<Connection["getAccountInfo"]>> {
  return connection.getAccountInfo(pubkey, "confirmed");
}

export async function getTransactionCount(connection: Connection, pubkey: PublicKey): Promise<number> {
  const signatures = await connection.getSignaturesForAddress(pubkey, {
    limit: 10000,
  });
  return signatures.length;
}

export async function getRecentTransactions(
  connection: Connection,
  pubkey: PublicKey,
  limit = 50
): Promise<ReturnType<Connection["getSignaturesForAddress"]>> {
  return connection.getSignaturesForAddress(pubkey, {
    limit: Math.min(limit, 1000),
  });
}

export async function getSignaturesForAddress(
  connection: Connection,
  pubkey: PublicKey,
  limit = 1000
): Promise<ReturnType<Connection["getSignaturesForAddress"]>> {
  return connection.getSignaturesForAddress(pubkey, {
    limit: Math.min(limit, 1000),
  });
}

export async function getTransaction(
  connection: Connection,
  signature: string
): Promise<Awaited<ReturnType<Connection["getParsedTransaction"]>>> {
  return connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
}

export async function getTokenAccounts(
  connection: Connection,
  pubkey: PublicKey
): Promise<ReturnType<Connection["getTokenAccountsByOwner"]>> {
  return connection.getTokenAccountsByOwner(pubkey, {
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  });
}

export async function getToken2022Accounts(
  connection: Connection,
  pubkey: PublicKey
): Promise<ReturnType<Connection["getTokenAccountsByOwner"]>> {
  return connection.getTokenAccountsByOwner(pubkey, {
    programId: new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
  });
}

export async function getParsedTokenAccounts(
  connection: Connection,
  pubkey: PublicKey
): Promise<ReturnType<Connection["getParsedTokenAccountsByOwner"]>> {
  return connection.getParsedTokenAccountsByOwner(pubkey, {
    programId: new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
  });
}

export async function getProgramAccounts(
  connection: Connection,
  programId: PublicKey,
  config?: GetProgramAccountsConfig
): Promise<ReturnType<Connection["getProgramAccounts"]>> {
  return connection.getProgramAccounts(programId, config);
}

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

export function isValidPublicKey(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export function formatSolAmount(amount: number, decimals = 9): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals > 6 ? 6 : decimals,
  });
}