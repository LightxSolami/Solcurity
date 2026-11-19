import { Connection, PublicKey } from "@solana/web3.js";
import {
  getBalance,
  getSignaturesForAddress,
  RpcExecutor,
} from "@/lib/solana-rpc";
import { SolanaWalletInfo } from "@/lib/types";

export interface WalletAnalysisResult {
  wallet: SolanaWalletInfo;
  signatures: Awaited<ReturnType<Connection["getSignaturesForAddress"]>>;
  failedChecks: string[];
}

/**
 * Analyze the wallet account itself: balance, token accounts, transaction
 * count, first/last activity, approximate age.
 */
export async function analyzeWallet(
  connection: Connection,
  address: string,
  executeRpc: RpcExecutor = (operation) => operation(connection)
): Promise<WalletAnalysisResult> {
  const failedChecks: string[] = [];
  const pubkey = new PublicKey(address);

  const wallet: SolanaWalletInfo = {
    address,
    exists: null,
    solBalance: null,
    lamports: null,
    tokenAccounts: null,
    nftAccounts: null,
    transactionCount: null,
  };

  let signatures: Awaited<ReturnType<Connection["getSignaturesForAddress"]>> = [];

  // 1. Account state
  try {
    const accountInfo = await executeRpc((rpcConnection) =>
      rpcConnection.getAccountInfo(pubkey, "confirmed")
    );
    wallet.exists = accountInfo !== null;
  } catch (err) {
    failedChecks.push("account_state");
  }

  // 2. Balance
  try {
    const balance = await executeRpc((rpcConnection) => getBalance(rpcConnection, pubkey));
    wallet.solBalance = balance;
    wallet.lamports = Math.floor(balance * 1e9);
  } catch (err) {
    failedChecks.push("sol_balance");
  }

  // 3. Signatures (history) — used for observed count and activity bounds
  try {
    signatures = await executeRpc((rpcConnection) =>
      getSignaturesForAddress(rpcConnection, pubkey, 1000)
    );
    wallet.transactionCount = signatures.length;

    if (signatures.length > 0) {
      const mostRecent = signatures[0];
      const oldest = signatures[signatures.length - 1];
      if (typeof mostRecent.blockTime === "number") {
        wallet.lastActivity = new Date(mostRecent.blockTime * 1000).toISOString();
      }
      if (typeof oldest.blockTime === "number") {
        wallet.firstActivity = new Date(oldest.blockTime * 1000).toISOString();
        wallet.approximateAgeDays = Math.floor(
          (Date.now() - oldest.blockTime * 1000) / (1000 * 60 * 60 * 24)
        );
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch signatures for ${address}:`, err);
    failedChecks.push("transaction_history");
  }

  // 4. Token accounts (SPL + Token-2022)
  try {
    const [spl, t2022] = await Promise.all([
      executeRpc((rpcConnection) => rpcConnection.getParsedTokenAccountsByOwner(pubkey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      })),
      executeRpc((rpcConnection) => rpcConnection.getParsedTokenAccountsByOwner(pubkey, {
        programId: new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
      })),
    ]);
    wallet.tokenAccounts = spl.value.length + t2022.value.length;
    wallet.nftAccounts = null;
  } catch (err) {
    failedChecks.push("token_accounts");
  }

  return { wallet, signatures, failedChecks };
}
