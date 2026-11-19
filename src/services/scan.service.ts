import { createSolanaConnection, isValidPublicKey, RpcExecutor, withRpcRetry } from "@/lib/solana-rpc";
import { analyzeWallet } from "@/lib/analyzers/wallet-analyzer";
import { analyzeTransactions } from "@/lib/analyzers/transaction-analyzer";
import { analyzeTokens } from "@/lib/analyzers/token-analyzer";
import { analyzePrograms } from "@/lib/analyzers/program-analyzer";
import { screenThreatIntel } from "@/lib/threat-intel/threat-intelligence";
import { evaluateThreatIntelScreening } from "@/lib/threat-intel/evaluation";
import {
  calculateScore,
  getScanConfidence,
  scoreToRiskLevel,
  generateSummary,
  buildFinding,
} from "@/lib/scoring/risk-engine";
import {
  ScanCheck,
  ScanResult,
  SolanaWalletInfo,
  TokenInfo,
  TransactionInfo,
  ProgramInteraction,
  SecurityFinding,
  ThreatIntelTarget,
  ThreatIntelScreeningResult,
} from "@/lib/types";

const SCAN_CHECKS = {
  accountState: { id: "account_state", label: "Account state", critical: true },
  solBalance: { id: "sol_balance", label: "SOL balance", critical: true },
  transactionHistory: { id: "transaction_history", label: "Transaction history", critical: true },
  transactionDetails: { id: "transaction_details", label: "Transaction details", critical: true },
  tokenHoldings: { id: "token_holdings", label: "Token holdings", critical: true },
  tokenAuthorities: { id: "token_authorities", label: "Token authority metadata", critical: false },
  programInteractions: { id: "program_interactions", label: "Program interactions", critical: false },
  threatIntel: { id: "threat_intel", label: "Curated threat intelligence", critical: true },
} as const;

export async function runScan(address: string, rpcUrl?: string): Promise<ScanResult> {
  if (!isValidPublicKey(address)) {
    throw new Error("Invalid Solana public key.");
  }

  const allFailedChecks: string[] = [];
  const findings: SecurityFinding[] = [];
  const connection = createSolanaConnection(rpcUrl);
  const executeRpc: RpcExecutor = (operation) =>
    withRpcRetry(operation, undefined, rpcUrl);

  let wallet: SolanaWalletInfo = {
    address,
    exists: null,
    solBalance: null,
    lamports: null,
    tokenAccounts: null,
    nftAccounts: null,
    transactionCount: null,
  };
  let signatures: Awaited<ReturnType<typeof import("@solana/web3.js").Connection.prototype.getSignaturesForAddress>> = [];
  let walletFailedChecks: string[] = [];

  try {
    const result = await analyzeWallet(connection, address, executeRpc);
    wallet = result.wallet;
    signatures = result.signatures;
    walletFailedChecks = result.failedChecks;
    allFailedChecks.push(...result.failedChecks);
  } catch (error) {
    console.error("Wallet analysis failed:", error);
    allFailedChecks.push("wallet_analysis_failed");
  }

  let transactions: TransactionInfo[] = [];
  let transactionFailedChecks: string[] = [];
  try {
    const result = await analyzeTransactions(connection, address, signatures, 100, executeRpc);
    transactions = result.transactions;
    transactionFailedChecks = result.failedChecks;
    allFailedChecks.push(...result.failedChecks);
  } catch (error) {
    console.error("Transaction analysis failed:", error);
    transactionFailedChecks = ["transaction_analysis_failed"];
    allFailedChecks.push(...transactionFailedChecks);
  }

  let tokens: TokenInfo[] = [];
  let tokenFailedChecks: string[] = [];
  try {
    const result = await analyzeTokens(connection, address, executeRpc);
    tokens = result.tokens;
    tokenFailedChecks = result.failedChecks;
    allFailedChecks.push(...result.failedChecks);
  } catch (error) {
    console.error("Token analysis failed:", error);
    tokenFailedChecks = ["token_analysis_failed"];
    allFailedChecks.push(...tokenFailedChecks);
  }

  let programs: ProgramInteraction[] = [];
  let programAnalysisFailed = false;
  try {
    programs = await analyzePrograms(transactions);
  } catch (error) {
    programAnalysisFailed = true;
    console.error("Program analysis failed:", error);
    allFailedChecks.push("program_analysis_failed");
  }

  const intelTargets = uniqueThreatTargets([
    { network: "solana-mainnet", entityType: "wallet", identifier: address },
    ...tokens.map((token) => ({
      network: "solana-mainnet",
      entityType: "token_mint" as const,
      identifier: token.mintAddress,
    })),
    ...programs.map((program) => ({
      network: "solana-mainnet",
      entityType: "program" as const,
      identifier: program.programId,
    })),
    ...transactions.flatMap((transaction) =>
      transaction.counterparties.map((counterparty) => ({
        network: "solana-mainnet",
        entityType: "wallet" as const,
        identifier: counterparty,
      }))
    ),
  ]);
  let threatIntelScreening: ThreatIntelScreeningResult = {
    status: "unavailable",
    targets: [],
    recordCount: 0,
    updatedAt: null,
    reason: "database_unavailable",
  };
  try {
    threatIntelScreening = await screenThreatIntel(intelTargets);
  } catch (error) {
    console.error("Threat intelligence screening failed:", error);
    allFailedChecks.push("threat_intel_unavailable");
  }
  const threatIntelEvaluation = evaluateThreatIntelScreening(
    threatIntelScreening,
    intelTargets
  );
  const threatIntelFailed = threatIntelScreening.status !== "available";
  if (threatIntelFailed) allFailedChecks.push("threat_intel_unavailable");

  for (const intel of threatIntelEvaluation.activeMatches) {
    const confirmed = intel.status === "confirmed";
    const evidence = [
      `Source: ${intel.source} (${intel.sourceUrl})`,
      `First observed: ${intel.firstObservedAt}`,
      `Last verified: ${intel.lastVerifiedAt}`,
      `Expires: ${intel.expiresAt}`,
      ...intel.evidence.map((item) => `${item.kind}: ${item.value}`),
    ].join("\n");
    const finding = buildFinding(
      confirmed ? "HIGH" : "MEDIUM",
      "threat_intel",
      `${confirmed ? "Confirmed" : "Suspected"} threat intelligence: ${intel.category}`,
      `${intel.explanation} This report is ${intel.status}; it is not a universal assessment of the address.`,
      evidence,
      intel.confidence,
      "Review the cited evidence and source before acting.",
      intel.entityType === "transaction_signature" ? undefined : [intel.identifier],
      intel.entityType === "transaction_signature" ? [intel.identifier] : undefined
    );
    findings.push({
      ...finding,
      threatIntelStatus: intel.status,
      sourceUrl: intel.sourceUrl,
      firstObservedAt: intel.firstObservedAt,
      lastVerifiedAt: intel.lastVerifiedAt,
      expiresAt: intel.expiresAt,
    });
  }

  const flaggedAddresses = new Set(
    threatIntelEvaluation.activeMatches
      .filter((entry) => entry.entityType === "wallet")
      .map((entry) => `${entry.identifier}:${entry.status}`)
  );
  for (const transaction of transactions) {
    if (transaction.counterparties.some((counterparty) =>
      flaggedAddresses.has(`${counterparty}:confirmed`)
    )) {
      transaction.riskStatus = "flagged";
    } else if (transaction.counterparties.some((counterparty) =>
      flaggedAddresses.has(`${counterparty}:suspected`)
    )) {
      transaction.riskStatus = "suspicious";
    }
  }

  const mintInfoUnavailable = tokenFailedChecks.some((check) => check.startsWith("mint_info:"));
  for (const token of tokens) {
    if (token.mintAuthorityActive) {
      findings.push(buildFinding(
        "MEDIUM",
        "token",
        "Token has active mint authority",
        `Token ${token.symbol} (${token.mintAddress}) has an active mint authority.`,
        `Mint authority is active for ${token.mintAddress}.`,
        "MEDIUM",
        "New supply can be minted. This is a risk indicator, not proof of malicious activity.",
        [token.mintAddress]
      ));
    }
    if (token.freezeAuthorityActive) {
      findings.push(buildFinding(
        "MEDIUM",
        "token",
        "Token has active freeze authority",
        `Token ${token.symbol} (${token.mintAddress}) has an active freeze authority.`,
        `Freeze authority is active for ${token.mintAddress}.`,
        "MEDIUM",
        "Tokens may be frozen by the authority. This is a risk indicator, not proof of malicious activity.",
        [token.mintAddress]
      ));
    }
  }

  const accountStateStatus: ScanCheck["status"] =
    walletFailedChecks.includes("account_state") || wallet.exists === null
      ? "UNKNOWN"
      : wallet.exists
        ? "PASS"
        : "UNKNOWN";
  const solBalanceStatus: ScanCheck["status"] =
    walletFailedChecks.includes("sol_balance") || wallet.solBalance === null
      ? "UNKNOWN"
      : "PASS";
  const transactionHistoryStatus: ScanCheck["status"] =
    walletFailedChecks.includes("transaction_history") || wallet.transactionCount === null
      ? "UNKNOWN"
      : "PASS";
  const transactionDetailsStatus: ScanCheck["status"] =
    transactionHistoryStatus === "UNKNOWN"
      ? "UNKNOWN"
      : signatures.length === 0
        ? "NOT_APPLICABLE"
        : transactionFailedChecks.length > 0 ||
            transactions.length !== Math.min(signatures.length, 100) ||
            transactions.some((transaction) =>
              transaction.blockTime === null ||
              transaction.solAmount === null ||
              !transaction.tokenDataAvailable
            )
          ? "UNKNOWN"
          : "PASS";
  const tokenHoldingsUnavailable =
    walletFailedChecks.includes("token_accounts") ||
    tokenFailedChecks.some((check) =>
      check === "token_holdings" || check.startsWith("token_account") || check.startsWith("token_balance")
    ) ||
    wallet.tokenAccounts === null;
  const tokenHoldingsStatus: ScanCheck["status"] = tokenHoldingsUnavailable ? "UNKNOWN" : "PASS";
  const tokenAuthoritiesStatus: ScanCheck["status"] =
    tokenHoldingsStatus === "UNKNOWN"
      ? "UNKNOWN"
      : tokens.length === 0
        ? "NOT_APPLICABLE"
        : mintInfoUnavailable
          ? "UNKNOWN"
          : tokens.some((token) => token.mintAuthorityActive || token.freezeAuthorityActive)
            ? "FAIL"
            : "PASS";
  const programInteractionsStatus: ScanCheck["status"] =
    transactionHistoryStatus === "UNKNOWN" || transactionDetailsStatus === "UNKNOWN" || programAnalysisFailed
      ? "UNKNOWN"
      : transactions.length === 0
        ? "NOT_APPLICABLE"
        : "PASS";
  const threatIntelStatus: ScanCheck["status"] =
    threatIntelFailed ||
    tokenHoldingsStatus === "UNKNOWN" ||
    transactionDetailsStatus === "UNKNOWN"
      ? "UNKNOWN"
      : threatIntelEvaluation.status;

  const checks: ScanCheck[] = [
    { ...SCAN_CHECKS.accountState, status: accountStateStatus, detail: wallet.exists === false ? "No account data exists at this address on the selected cluster." : undefined },
    { ...SCAN_CHECKS.solBalance, status: solBalanceStatus },
    { ...SCAN_CHECKS.transactionHistory, status: transactionHistoryStatus, detail: wallet.transactionCount === 0 ? "RPC returned no signatures." : undefined },
    { ...SCAN_CHECKS.transactionDetails, status: transactionDetailsStatus, detail: signatures.length > 100 ? "Only the 100 most recent signatures are analyzed." : undefined },
    { ...SCAN_CHECKS.tokenHoldings, status: tokenHoldingsStatus },
    { ...SCAN_CHECKS.tokenAuthorities, status: tokenAuthoritiesStatus },
    { ...SCAN_CHECKS.programInteractions, status: programInteractionsStatus, detail: programs.some((program) => program.classification === "unknown") ? "Unknown program IDs are identified as unknown, not malicious." : undefined },
    {
      ...SCAN_CHECKS.threatIntel,
      status: threatIntelStatus,
      detail: getThreatIntelCheckDetail(
        threatIntelScreening,
        threatIntelEvaluation.status,
        threatIntelEvaluation.inactiveMatches.length
      ),
    },
  ];

  const partialScan = checks.some((check) => check.status === "UNKNOWN");
  const criticalUnavailable = checks.some((check) => check.critical && check.status === "UNKNOWN");
  const score = partialScan ? null : calculateScore(findings);
  const riskLevel = criticalUnavailable
    ? "INCOMPLETE SCAN"
    : score === null
      ? "UNKNOWN"
      : scoreToRiskLevel(score);
  const failedChecks = Array.from(new Set([
    ...allFailedChecks,
    ...checks
      .filter((check) => check.status === "UNKNOWN" || check.status === "FAIL")
      .map((check) => check.id),
  ]));
  const summary = generateSummary(findings, partialScan, failedChecks, checks);

  return {
    address,
    network: "solana-mainnet",
    score,
    riskLevel,
    scanConfidence: getScanConfidence(checks),
    checks,
    summary,
    wallet,
    transactions,
    tokens,
    programs,
    findings,
    sources: [
      {
        name: "Solana RPC",
        url: "https://solana.com/docs/rpc",
        lastUpdated: null,
      },
      {
        name: "Solcurity curated threat dataset",
        url: "https://github.com/LightxSolami/Solcurity/blob/main/src/lib/threat-intel/threat-intelligence.ts",
        lastUpdated: null,
      },
    ],
    scannedAt: new Date().toISOString(),
  };
}

function uniqueThreatTargets(targets: ThreatIntelTarget[]): ThreatIntelTarget[] {
  const unique = new Map<string, ThreatIntelTarget>();
  for (const target of targets) {
    unique.set(
      `${target.network}:${target.entityType}:${target.identifier}`,
      target
    );
  }
  return Array.from(unique.values());
}

function getThreatIntelCheckDetail(
  screening: ThreatIntelScreeningResult,
  status: "PASS" | "FAIL" | "UNKNOWN",
  inactiveRecordCount: number
): string {
  if (screening.status !== "available") {
    return "Threat intelligence is unavailable or not configured; no clean result can be produced.";
  }
  if (status === "FAIL") {
    return "One or more current confirmed or suspected reports matched. Review each report's status and evidence.";
  }
  if (status === "PASS") {
    return "A fresh authoritative source returned a negative result within its documented coverage only.";
  }
  if (inactiveRecordCount > 0) {
    return "Matching reports are expired, disputed, revoked, or otherwise not active; no authoritative fresh negative result is available.";
  }
  return "No active report matched, but the available dataset does not provide authoritative negative coverage; this address remains UNKNOWN.";
}
