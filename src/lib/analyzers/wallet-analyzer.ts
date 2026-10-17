import { Connection, PublicKey } from "@solana/web3.js";
import {
  getBalance,
  getTransactionCount,
  getSignaturesForAddress,
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
  address: string
): Promise<WalletAnalysisResult> {
  const failedChecks: string[] = [];
  const pubkey = new PublicKey(address);

  const wallet: SolanaWalletInfo = {
    address,
    exists: false,
    solBalance: 0,
    lamports: 0,
    tokenAccounts: 0,
    nftAccounts: 0,
    transactionCount: 0,
  };

  let signatures: Awaited<ReturnType<Connection["getSignaturesForAddress"]>> = [];

  // 1. Balance + existence
  try {
    const balance = await getBalance(connection, pubkey);
    wallet.solBalance = balance;
    wallet.lamports = Math.floor(balance * 1e9);
    wallet.exists = true;
  } catch (err) {
    failedChecks.push("sol_balance");
  }

  // 2. Signatures (history) — used for tx count and first/last activity
  try {
    signatures = await getSignaturesForAddress(connection, pubkey, 1000);
    wallet.transactionCount = signatures.length;

    if (signatures.length > 0) {
      const mostRecent = signatures[0];
      const oldest = signatures[signatures.length - 1];
      if (mostRecent.blockTime) {
        wallet.lastActivity = new Date(mostRecent.blockTime * 1000).toISOString();
      }
      if (oldest.blockTime) {
        wallet.firstActivity = new Date(oldest.blockTime * 1000).toISOString();
        wallet.approximateAgeDays = Math.floor(
          (Date.now() - oldest.blockTime * 1000) / (1000 * 60 * 60 * 24)
        );
      }
    }
  } catch (err) {
    failedChecks.push("transaction_history");
  }

  // 3. Token accounts (SPL + Token-2022)
  try {
    const [spl, t2022] = await Promise.all([
      connection.getParsedTokenAccountsByOwner(pubkey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      }),
      connection.getParsedTokenAccountsByOwner(pubkey, {
        programId: new PublicKey("TokenzQdBNbLqP5VEh89ASGF8P25BN8cGxqZ"),
      }),
    ]);
    wallet.tokenAccounts = spl.value.length + t2022.value.length;
  } catch (err) {
    failedChecks.push("token_accounts");
  }

  return { wallet, signatures, failedChecks };
}
