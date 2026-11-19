export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
export type ScanCheckStatus = "PASS" | "FAIL" | "UNKNOWN" | "NOT_APPLICABLE";

export interface ScanCheck {
  id: string;
  label: string;
  status: ScanCheckStatus;
  critical: boolean;
  detail?: string;
}

export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Confidence = "LOW" | "MEDIUM" | "HIGH";

export interface SolanaWalletInfo {
  address: string;
  exists: boolean | null;
  solBalance: number | null;
  lamports: number | null;
  tokenAccounts: number | null;
  nftAccounts: number | null;
  transactionCount: number | null;
  firstActivity?: string;
  lastActivity?: string;
  approximateAgeDays?: number;
}

export interface TokenInfo {
  symbol: string;
  name: string;
  mintAddress: string;
  balance: string;
  decimals: number;
  uiAmount: number;
  mintAuthorityActive?: boolean;
  freezeAuthorityActive?: boolean;
  isToken2022: boolean;
  suspicious: boolean;
  riskIndicators: string[];
}

export interface TransactionInfo {
  signature: string;
  blockTime: number | null;
  slot: number;
  fee: number;
  type: string;
  direction: "incoming" | "outgoing" | "internal" | "unknown";
  solAmount: number | null;
  tokenTransfers: {
    mint: string;
    symbol?: string;
    amount: number;
    direction: "incoming" | "outgoing";
  }[];
  tokenDataAvailable: boolean;
  programInteractions: string[];
  counterparties: string[];
  riskStatus: "unassessed" | "suspicious" | "flagged";
}

export interface ProgramInteraction {
  programId: string;
  programName?: string;
  interactionCount: number;
  lastInteraction: string | null;
  classification: "known" | "unknown";
  source?: string;
}

export type ThreatIntelStatus = "confirmed" | "suspected" | "disputed" | "revoked";
export type ThreatIntelEntityType =
  | "wallet"
  | "token_mint"
  | "program"
  | "transaction_signature"
  | "funding_relationship";
export type ThreatIntelCategory =
  | "malicious_wallet"
  | "scam_token"
  | "malicious_program"
  | "drainer"
  | "phishing"
  | "suspicious_funding"
  | "sanctions_exposure"
  | "other";

export interface ThreatIntelEvidence {
  kind: "url" | "transaction_signature" | "text";
  value: string;
}

export interface ThreatIntelEntry {
  id: string;
  network: string;
  entityType: ThreatIntelEntityType;
  identifier: string;
  category: ThreatIntelCategory;
  confidence: Confidence;
  status: ThreatIntelStatus;
  firstObservedAt: string;
  lastVerifiedAt: string;
  expiresAt: string;
  explanation: string;
  source: string;
  sourceId: string;
  sourceUrl: string;
  evidence: ThreatIntelEvidence[];
}

export interface ThreatIntelTarget {
  network: string;
  entityType: ThreatIntelEntityType;
  identifier: string;
}

export interface ThreatIntelNegativeScreening {
  authoritative: boolean;
  sourceId: string;
  source: string;
  sourceUrl: string;
  network: string;
  entityTypes: ThreatIntelEntityType[];
  checkedAt: string;
  expiresAt: string;
}

export interface ThreatIntelTargetResult {
  target: ThreatIntelTarget;
  records: ThreatIntelEntry[];
  negativeScreening?: ThreatIntelNegativeScreening;
}

export interface ThreatIntelScreeningResult {
  status: "available" | "unavailable";
  targets: ThreatIntelTargetResult[];
  recordCount: number;
  updatedAt: string | null;
  reason?:
    | "not_configured"
    | "invalid_configuration"
    | "database_unavailable"
    | "invalid_response";
}

export interface SecurityFinding {
  id: string;
  severity: Severity;
  category:
    | "threat_intel"
    | "token"
    | "transaction"
    | "program"
    | "wallet"
    | "drainer"
    | "general";
  title: string;
  description: string;
  evidence: string;
  confidence: Confidence;
  threatIntelStatus?: Extract<ThreatIntelStatus, "confirmed" | "suspected">;
  sourceUrl?: string;
  firstObservedAt?: string;
  lastVerifiedAt?: string;
  expiresAt?: string;
  recommendation: string;
  affectedAddresses?: string[];
  affectedTransactions?: string[];
  timestamp: string;
}

export interface ScanResult {
  address: string;
  network: "solana-mainnet";
  score: number | null;
  riskLevel: RiskLevel | "UNKNOWN" | "INCOMPLETE SCAN";
  scanConfidence: number;
  checks: ScanCheck[];
  summary: {
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
    partialScan: boolean;
    failedChecks: string[];
    checkCounts: {
      completed: number;
      failed: number;
      unavailable: number;
      notApplicable: number;
    };
  };
  wallet: SolanaWalletInfo;
  transactions: TransactionInfo[];
  tokens: TokenInfo[];
  programs: ProgramInteraction[];
  findings: SecurityFinding[];
  sources: {
    name: string;
    url: string;
    lastUpdated: string | null;
  }[];
  scannedAt: string;
}
