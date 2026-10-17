import { Connection, PublicKey } from "@solana/web3.js";
import { TokenInfo } from "@/lib/types";

const SPL_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEh89ASGF8P25BN8cGxqZ";

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
  address: string
): Promise<TokenAnalysisResult> {
  const failedChecks: string[] = [];
  const tokens: TokenInfo[] = [];
  const pubkey = new PublicKey(address);

  try {
    const [splAccounts, t2022Accounts] = await Promise.all([
      connection.getParsedTokenAccountsByOwner(pubkey, {
        programId: new PublicKey(SPL_TOKEN_PROGRAM),
      }),
      connection.getParsedTokenAccountsByOwner(pubkey, {
        programId: new PublicKey(TOKEN_2022_PROGRAM),
      }),
    ]);

    const allAccounts = [
      ...splAccounts.value.map((a) => ({ account: a, is2022: false })),
      ...t2022Accounts.value.map((a) => ({ account: a, is2022: true })),
    ];

    for (const { account, is2022 } of allAccounts) {
      const parsed = account.account.data.parsed?.info;
      if (!parsed) continue;

      const mintAddress = parsed.mint;
      const uiAmount = parsed.tokenAmount?.uiAmount ?? 0;

      // Skip zero-balance accounts
      if (uiAmount === 0) continue;

      let mintAuthorityActive: boolean | undefined;
      let freezeAuthorityActive: boolean | undefined;
      const riskIndicators: string[] = [];

      try {
        const mintInfo = await connection.getParsedAccountInfo(new PublicKey(mintAddress));
        if (mintInfo.value?.data && "parsed" in mintInfo.value.data) {
          const mintData = mintInfo.value.data.parsed?.info;
          if (mintData) {
            mintAuthorityActive = !!mintData.mintAuthority;
            freezeAuthorityActive = !!mintData.freezeAuthority;
          }
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
        balance: parsed.tokenAmount?.amount?.toString() || "0",
        decimals: parsed.tokenAmount?.decimals || 0,
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
