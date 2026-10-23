import { createSolanaConnection, withRpcRetry } from "@/lib/solana-rpc";
import { analyzeWallet } from "@/lib/analyzers/wallet-analyzer";
import { analyzeTransactions } from "@/lib/analyzers/transaction-analyzer";
import { analyzeTokens } from "@/lib/analyzers/token-analyzer";
import { analyzePrograms } from "@/lib/analyzers/program-analyzer";
import { lookupThreatIntel } from "@/lib/threat-intel/threat-intelligence";
import {
  calculateScore,
  scoreToRiskLevel,
  generateSummary,
  buildFinding,
} from "@/lib/scoring/risk-engine";
import { ScanResult, SolanaWalletInfo, TokenInfo, TransactionInfo, ProgramInteraction, SecurityFinding } from "@/lib/types";

export async function runScan(address: string, rpcUrl?: string): Promise<ScanResult> {
  const allFailedChecks: string[] = [];

  // Create a connection for the main operations
  const connection = createSolanaConnection(rpcUrl);

  // 1. Wallet analysis - with retry
  let wallet: SolanaWalletInfo;
  let signatures: Awaited<ReturnType<typeof import("@solana/web3.js").Connection.prototype.getSignaturesForAddress>>;
  try {
    const result = await withRpcRetry(async (conn) => {
      return await analyzeWallet(conn, address);
    });
    wallet = result.wallet;
    signatures = result.signatures;
    allFailedChecks.push(...result.failedChecks);
  } catch (err) {
    // Create minimal wallet info on failure
    wallet = {
      address,
      exists: false,
      solBalance: 0,
      lamports: 0,
      tokenAccounts: 0,
      nftAccounts: 0,
      transactionCount: 0,
    };
    signatures = [];
    allFailedChecks.push("wallet_analysis_failed");
  }

  // 2. Transaction analysis - with retry
  let transactions: TransactionInfo[] = [];
  try {
    const result = await withRpcRetry(async (conn) => {
      return await analyzeTransactions(conn, address, signatures);
    });
    transactions = result.transactions;
    allFailedChecks.push(...result.failedChecks);
  } catch (err) {
    allFailedChecks.push("transaction_analysis_failed");
  }

  // 3. Token analysis - with retry
  let tokens: TokenInfo[] = [];
  try {
    const result = await withRpcRetry(async (conn) => {
      return await analyzeTokens(conn, address);
    });
    tokens = result.tokens;
    allFailedChecks.push(...result.failedChecks);
  } catch (err) {
    allFailedChecks.push("token_analysis_failed");
  }

  // 4. Program analysis
  let programs: ProgramInteraction[] = [];
  try {
    const allProgramIds = new Set<string>();
    for (const tx of transactions) {
      for (const pid of tx.programInteractions) {
        allProgramIds.add(pid);
      }
    }
    programs = await analyzePrograms(createSolanaConnection(rpcUrl), address, Array.from(allProgramIds));
  } catch (err) {
    allFailedChecks.push("program_analysis_failed");
  }

  // 5. Threat intelligence lookups
  const findings: SecurityFinding[] = [];

  // Check wallet address itself
  const walletIntel = lookupThreatIntel(address);
  for (const intel of walletIntel) {
    findings.push(buildFinding(
      "HIGH",
      "threat_intel",
      "Wallet address flagged in threat intelligence",
      `This address appears in threat intelligence: ${intel.classification}`,
      `Source: ${intel.source}${intel.sourceUrl ? ` (${intel.sourceUrl})` : ""}`,
      intel.confidence,
      "Review the source report and verify if this is your address."
    ));
  }

  // Check token mints
  for (const token of tokens) {
    const mintIntel = lookupThreatIntel(token.mintAddress);
    for (const intel of mintIntel) {
      findings.push(buildFinding(
        "HIGH",
        "threat_intel",
        `Token ${token.symbol} flagged in threat intelligence`,
        `Token mint ${token.mintAddress} appears in threat intelligence: ${intel.classification}`,
        `Source: ${intel.source}${intel.sourceUrl ? ` (${intel.sourceUrl})` : ""}`,
        intel.confidence,
        "Avoid interacting with this token until verified."
      ));
    }
  }

  // Check counterparties in transactions
  for (const tx of transactions) {
    for (const counterparty of tx.counterparties) {
      const counterpartyIntel = lookupThreatIntel(counterparty);
      for (const intel of counterpartyIntel) {
        findings.push(buildFinding(
          "HIGH",
          "threat_intel",
          "Transaction interacted with flagged address",
          `Transaction ${tx.signature.slice(0, 8)}... interacted with a flagged address`,
          `Address: ${counterparty}\nTransaction: ${tx.signature}\nSource: ${intel.source}`,
          intel.confidence,
          "Review this transaction and avoid further interaction with the flagged address."
        ));
      }
    }
  }

  // Active mint authority warning
  for (const token of tokens) {
    if (token.mintAuthorityActive) {
      findings.push(buildFinding(
        "MEDIUM",
        "token",
        "Token has active mint authority",
        `Token ${token.symbol} (${token.mintAddress}) has an active mint authority`,
        `Mint authority is active for ${token.symbol}`,
        "MEDIUM",
        "Be aware that new supply can be minted. This is not necessarily malicious but should be understood."
      ));
    }
    if (token.freezeAuthorityActive) {
      findings.push(buildFinding(
        "MEDIUM",
        "token",
        "Token has active freeze authority",
        `Token ${token.symbol} (${token.mintAddress}) has an active freeze authority`,
        `Freeze authority is active for ${token.symbol}`,
        "MEDIUM",
        "Be aware that tokens can be frozen by the authority. This is not necessarily malicious but should be understood."
      ));
    }
  }

  // Check for drainer indicators
  if (wallet.solBalance < 0.01 && wallet.tokenAccounts === 0 && wallet.transactionCount > 0) {
    findings.push(buildFinding(
      "MEDIUM",
      "drainer",
      "Possible wallet drain indicators",
      "Wallet has very low SOL balance, no tokens, but transaction history exists",
      `SOL balance: ${wallet.solBalance}\nToken accounts: ${wallet.tokenAccounts}\nTransactions: ${wallet.transactionCount}`,
      "LOW",
      "Review transaction history for unexpected outgoing transfers."
    ));
  }

  // 6. Calculate score
  const score = calculateScore(findings);
  const riskLevel = scoreToRiskLevel(score);
  const partialScan = allFailedChecks.length > 0;
  const summary = generateSummary(findings, partialScan, allFailedChecks);

  return {
    address,
    network: "solana-mainnet",
    score,
    riskLevel,
    summary,
    wallet,
    transactions,
    tokens,
    programs,
    findings,
    sources: [
      {
        name: "Solana RPC",
        url: "https://solana.com",
        lastUpdated: new Date().toISOString(),
      },
    ],
    scannedAt: new Date().toISOString(),
  };
}