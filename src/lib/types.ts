export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Confidence = "LOW" | "MEDIUM" | "HIGH";

export interface SolanaWalletInfo {
  address: string;
  exists: boolean;
  solBalance: number;
  lamports: number;
  tokenAccounts: number;
  nftAccounts: number;
  transactionCount: number;
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
  blockTime: number;
  slot: number;
  fee: number;
  type: string;
  direction: "incoming" | "outgoing" | "internal";
  solAmount: number;
  tokenTransfers: {
    mint: string;
    symbol?: string;
    amount: number;
    direction: "incoming" | "outgoing";
  }[];
  programInteractions: string[];
  counterparties: string[];
  riskStatus: "clean" | "suspicious" | "flagged";
}

export interface ProgramInteraction {
  programId: string;
  programName?: string;
  interactionCount: number;
  lastInteraction: string;
  classification: "known" | "unknown" | "suspicious" | "malicious";
  source?: string;
}

export interface ThreatIntelEntry {
  address: string;
  type: "malicious" | "scam" | "phishing" | "drainer" | "program";
  classification: string;
  confidence: Confidence;
  source: string;
  sourceUrl?: string;
  reason?: string;
  firstSeen?: string;
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
  recommendation: string;
  affectedAddresses?: string[];
  affectedTransactions?: string[];
  timestamp: string;
}

export interface ScanResult {
  address: string;
  network: "solana-mainnet";
  score: number;
  riskLevel: RiskLevel;
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
  wallet: SolanaWalletInfo;
  transactions: TransactionInfo[];
  tokens: TokenInfo[];
  programs: ProgramInteraction[];
  findings: SecurityFinding[];
  sources: {
    name: string;
    url: string;
    lastUpdated: string;
  }[];
  scannedAt: string;
}
