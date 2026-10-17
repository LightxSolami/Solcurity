import { Connection, PublicKey, LAMPORTS_PER_SOL, type GetProgramAccountsConfig, type TokenAccountBalancePair } from "@solana/web3.js";

// Multiple free RPC endpoints to try in order
const FREE_RPC_ENDPOINTS = [
  process.env.SOLANARPCURL,
  "https://api.mainnet-beta.solana.com",
  "https://solana-mainnet.g.alchemy.com/v2/demo",
  "https://rpc.ankr.com/solana",
  "https://solana.drpc.org",
].filter(Boolean) as string[];

let currentRpcIndex = 0;

export function createSolanaConnection(rpcUrl?: string): Connection {
  const url = rpcUrl || FREE_RPC_ENDPOINTS[currentRpcIndex];
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
  return FREE_RPC_ENDPOINTS[currentRpcIndex];
}

export function rotateRpcEndpoint(): string {
  currentRpcIndex = (currentRpcIndex + 1) % FREE_RPC_ENDPOINTS.length;
  return FREE_RPC_ENDPOINTS[currentRpcIndex];
}

export async function withRpcRetry<T>(
  operation: (connection: Connection) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const connection = createSolanaConnection();
    try {
      return await operation(connection);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      // Check if it's a rate limit or 403 error
      const isRateLimited = lastError.message.includes("429") || 
                           lastError.message.includes("403") || 
                           lastError.message.includes("rate limit") ||
                           lastError.message.includes("Too Many Requests");
      
      if (isRateLimited && attempt < maxRetries) {
        // Rotate to next RPC endpoint
        rotateRpcEndpoint();
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }
      
      if (attempt === maxRetries) break;
    }
  }

  throw lastError || new Error("RPC operation failed after retries");
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
): Promise<ReturnType<Connection["getTransaction"]>> {
  return connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
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
    programId: new PublicKey("TokenzQdBNbLqP5VEh89ASGF8P25BN8cGxqZ"),
  });
}

export async function getParsedTokenAccounts(
  connection: Connection,
  pubkey: PublicKey
): Promise<ReturnType<Connection["getParsedTokenAccountsByOwner"]>> {
  return connection.getParsedTokenAccountsByOwner(pubkey, {
    programId: new PublicKey("TokenzQdBNbLqP5VEh89ASGF8P25BN8cGxqZ"),
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