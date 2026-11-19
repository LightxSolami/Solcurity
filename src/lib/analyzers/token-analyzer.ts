import { Connection, PublicKey } from "@solana/web3.js";
import { TokenInfo } from "@/lib/types";
import { RpcExecutor } from "@/lib/solana-rpc";

const SPL_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

/** Minimal, widely-used metadata program for symbol/name resolution. */
const METADATA_PROGRAM = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";

export interface TokenAnalysisResult {
  tokens: TokenInfo[];
  failedChecks: string[];
}

/**
 * Analyze SPL Token and Token-2022 holdings, mint authority, freeze authority,
 * and Token-2022 extensions.
 */
export async function analyzeTokens(
  connection: Connection,
  address: string,
  executeRpc: RpcExecutor = (operation) => operation(connection)
): Promise<TokenAnalysisResult> {
  const failedChecks: string[] = [];
  const tokens: TokenInfo[] = [];
  const pubkey = new PublicKey(address);

  try {
    const [splAccounts, t2022Accounts] = await Promise.all([
      executeRpc((rpcConnection) => rpcConnection.getParsedTokenAccountsByOwner(pubkey, {
        programId: new PublicKey(SPL_TOKEN_PROGRAM),
      })),
      executeRpc((rpcConnection) => rpcConnection.getParsedTokenAccountsByOwner(pubkey, {
        programId: new PublicKey(TOKEN_2022_PROGRAM),
      })),
    ]);

    const allAccounts = [
      ...splAccounts.value.map((a) => ({ account: a, is2022: false })),
      ...t2022Accounts.value.map((a) => ({ account: a, is2022: true })),
    ];

    for (const { account, is2022 } of allAccounts) {
      const parsed = account.account.data.parsed?.info;
      if (!parsed) {
        failedChecks.push(`token_account_parse:${account.pubkey.toBase58()}`);
        continue;
      }

      const mintAddress = parsed.mint;
      const rawAmount = parsed.tokenAmount?.amount;
      const decimals = parsed.tokenAmount?.decimals;
      if (typeof rawAmount !== "string" || typeof decimals !== "number") {
        failedChecks.push(`token_balance_parse:${account.pubkey.toBase58()}`);
        continue;
      }
      const uiAmount = parsed.tokenAmount?.uiAmount ?? Number(rawAmount) / 10 ** decimals;

      // Skip zero-balance accounts
      if (uiAmount === 0) continue;

      let mintAuthorityActive: boolean | undefined;
      let freezeAuthorityActive: boolean | undefined;
      const riskIndicators: string[] = [];

      try {
        const mintInfo = await executeRpc((rpcConnection) =>
          rpcConnection.getParsedAccountInfo(new PublicKey(mintAddress))
        );
        if (mintInfo.value?.data && "parsed" in mintInfo.value.data) {
          const mintData = mintInfo.value.data.parsed?.info;
          if (mintData) {
            mintAuthorityActive = !!mintData.mintAuthority;
            freezeAuthorityActive = !!mintData.freezeAuthority;
          } else {
            failedChecks.push(`mint_info:${mintAddress}`);
          }
        } else {
          failedChecks.push(`mint_info:${mintAddress}`);
        }
      } catch {
        failedChecks.push(`mint_info:${mintAddress}`);
      }

      if (mintAuthorityActive) {
        riskIndicators.push("Active mint authority (supply can be changed)");
      }
      if (freezeAuthorityActive) {
        riskIndicators.push("Active freeze authority (tokens can be frozen)");
      }

      tokens.push({
        symbol: "UNKNOWN",
        name: "Unknown Token",
        mintAddress,
        balance: rawAmount,
        decimals,
        uiAmount,
        mintAuthorityActive,
        freezeAuthorityActive,
        isToken2022: is2022,
        suspicious: riskIndicators.length > 0,
        riskIndicators,
      });
    }
  } catch (err) {
    failedChecks.push("token_holdings");
  }

  return { tokens, failedChecks };
}
