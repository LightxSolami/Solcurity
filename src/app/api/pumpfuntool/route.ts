import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { createSolanaConnection } from "@/lib/solana-rpc";
import { validatePublicRpcUrl } from "@/lib/public-rpc-url";
import { z } from "zod";

const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

interface PumpFunToken {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  bondingCurve: string;
  associatedBondingCurve: string;
  creator: string;
  createdTimestamp: number;
  virtualSolReserves: number;
  virtualTokenReserves: number;
  realSolReserves: number;
  realTokenReserves: number;
  totalSupply: number;
  complete: boolean;
  usdMarketCap: number | null;
}

interface HolderInfo {
  address: string;
  balance: number;
  percentage: number;
}

interface PumpFunAnalytics {
  token: PumpFunToken;
  price: {
    sol: number;
    usd: number | null;
    marketCap: number;
    marketCapUsd: number | null;
  };
  bondingCurve: {
    progress: number;
    solNeeded: number;
    tokensRemaining: number;
  };
  holders: {
    topAccountCount: number;
    top10Percentage: number;
    top20Percentage: number;
    holders: HolderInfo[];
  };
  liquidity: {
    sol: number;
    tokens: number;
  };
  creator: {
    address: string;
    tokensCreated: number;
    totalVolume: number;
  };
  recentTrades: Array<{
    signature: string;
    type: "buy" | "sell";
    solAmount: number;
    tokenAmount: number;
    price: number;
    timestamp: number;
    trader: string;
  }>;
}

class UpstreamError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function getString(data: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    if (typeof data[key] === "string") return data[key] as string;
  }
  return "";
}

function getNumber(data: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = Number(data[key]);
    if (data[key] !== undefined && data[key] !== null && Number.isFinite(value)) {
      return value;
    }
  }
  return 0;
}

function normalizePumpFunToken(data: Record<string, unknown>, requestedMint: string): PumpFunToken {
  const usdMarketCap = getNumber(data, "usd_market_cap", "usdMarketCap");
  return {
    mint: getString(data, "mint") || requestedMint,
    name: getString(data, "name") || "Unknown token",
    symbol: getString(data, "symbol") || "UNKNOWN",
    uri: getString(data, "uri", "metadata_uri"),
    bondingCurve: getString(data, "bondingCurve", "bonding_curve"),
    associatedBondingCurve: getString(data, "associatedBondingCurve", "associated_bonding_curve"),
    creator: getString(data, "creator"),
    createdTimestamp: getNumber(data, "createdTimestamp", "created_timestamp"),
    virtualSolReserves: getNumber(data, "virtualSolReserves", "virtual_sol_reserves"),
    virtualTokenReserves: getNumber(data, "virtualTokenReserves", "virtual_token_reserves"),
    realSolReserves: getNumber(data, "realSolReserves", "real_sol_reserves"),
    realTokenReserves: getNumber(data, "realTokenReserves", "real_token_reserves"),
    totalSupply: getNumber(data, "totalSupply", "total_supply"),
    complete: data.complete === true || data.complete === "true",
    usdMarketCap: usdMarketCap > 0 ? usdMarketCap : null,
  };
}

async function fetchPumpFunTokenData(mint: string): Promise<PumpFunToken> {
  // Try PumpPortal API first (more permissive)
  try {
    return await fetchPumpFunTokenDataFromPumpPortal(mint);
  } catch (error) {
    // If PumpPortal fails, try original Pump.fun API as fallback
    console.warn("PumpPortal failed, trying Pump.fun:", error);
  }

  // Fallback to original Pump.fun API
  let response: Response;
  try {
    response = await fetch(`https://frontend-api.pump.fun/coins/${mint}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new UpstreamError(
      error instanceof Error && error.name === "TimeoutError"
        ? "Pump.fun API request timed out"
        : "Unable to reach the Pump.fun API",
      502
    );
  }

  if (response.status === 404) {
    throw new UpstreamError("Token not found on Pump.fun", 404);
  }
  if (response.status === 403) {
    throw new UpstreamError("Pump.fun data is temporarily unavailable. Please try again later.", 503);
  }
  if (!response.ok) {
    throw new UpstreamError(`Pump.fun API returned HTTP ${response.status}`, 502);
  }

  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new UpstreamError("Pump.fun API returned invalid token data", 502);
  }

  return normalizePumpFunToken(data as Record<string, unknown>, mint);
}

async function fetchPumpFunTokenDataFromPumpPortal(mint: string): Promise<PumpFunToken> {
  let response: Response;
  try {
    response = await fetch(`https://pumpportal.fun/api/coin/${mint}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new UpstreamError(
      error instanceof Error && error.name === "TimeoutError"
        ? "PumpPortal API request timed out"
        : "Unable to reach PumpPortal API",
      502
    );
  }

  if (response.status === 404) {
    throw new UpstreamError("Token not found on PumpPortal", 404);
  }
  if (response.status === 403) {
    throw new UpstreamError("PumpPortal API access denied (403)", 403);
  }
  if (!response.ok) {
    throw new UpstreamError(`PumpPortal API returned HTTP ${response.status}`, 502);
  }

  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new UpstreamError("PumpPortal API returned invalid token data", 502);
  }

  return normalizePumpPortalToken(data as Record<string, unknown>, mint);
}

function normalizePumpPortalToken(data: Record<string, unknown>, requestedMint: string): PumpFunToken {
  return {
    mint: data.mint as string || data.mint as string || requestedMint,
    name: data.name as string || "Unknown token",
    symbol: data.symbol as string || "UNKNOWN",
    uri: data.metadata_uri as string || data.uri as string || "",
    bondingCurve: data.bonding_curve as string || data.bondingCurve as string || "",
    associatedBondingCurve: data.associated_bonding_curve as string || data.associatedBondingCurve as string || "",
    creator: data.creator as string || "",
    createdTimestamp: Number(data.created_timestamp || data.createdTimestamp || Date.now()),
    virtualSolReserves: Number(data.virtual_sol_reserves || data.virtualSolReserves || 0),
    virtualTokenReserves: Number(data.virtual_token_reserves || data.virtualTokenReserves || 0),
    realSolReserves: Number(data.real_sol_reserves || data.realSolReserves || 0),
    realTokenReserves: Number(data.real_token_reserves || data.realTokenReserves || 0),
    totalSupply: Number(data.total_supply || data.totalSupply || 0),
    complete: data.complete === true || data.complete === "true",
    usdMarketCap: null,
  };
}

async function fetchTokenHolders(mint: string, rpcUrl?: string): Promise<HolderInfo[]> {
  const connection = createSolanaConnection(rpcUrl);
  const mintPubkey = new PublicKey(mint);
  const [largestAccounts, supply] = await Promise.all([
    connection.getTokenLargestAccounts(mintPubkey),
    connection.getTokenSupply(mintPubkey),
  ]);
  const tokenProgram = await connection.getAccountInfo(mintPubkey);
  if (!tokenProgram || ![TOKEN_PROGRAM_ID.toBase58(), TOKEN_2022_PROGRAM_ID.toBase58()].includes(tokenProgram.owner.toBase58())) {
    throw new Error("The mint is not owned by a supported Solana token program");
  }

  const parsedAccounts = await Promise.all(
    largestAccounts.value.map((account) => connection.getParsedAccountInfo(account.address))
  );
  const totalSupply = Number(supply.value.uiAmountString ?? 0);

  const balancesByOwner = new Map<string, number>();
  largestAccounts.value.forEach((account, index) => {
    const accountInfo = parsedAccounts[index].value?.data;
    if (!accountInfo || !("parsed" in accountInfo)) return;

    const parsed = accountInfo.parsed.info;
    const balance = account.uiAmount ?? 0;
    if (typeof parsed.owner !== "string" || balance <= 0) return;
    balancesByOwner.set(parsed.owner, (balancesByOwner.get(parsed.owner) ?? 0) + balance);
  });

  return Array.from(balancesByOwner, ([address, balance]) => ({
    address,
    balance,
    percentage: totalSupply > 0 ? (balance / totalSupply) * 100 : 0,
  })).sort((a, b) => b.balance - a.balance);
}

async function fetchRecentTrades(mint: string, limit = 20): Promise<Array<{
  signature: string;
  type: "buy" | "sell";
  solAmount: number;
  tokenAmount: number;
  price: number;
  timestamp: number;
  trader: string;
}>> {
  try {
    const response = await fetch(`https://frontend-api.pump.fun/trades/${mint}?limit=${limit}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return [];
    const data: unknown = await response.json();
    if (!Array.isArray(data)) return [];

    return data.flatMap((trade): Array<{
      signature: string;
      type: "buy" | "sell";
      solAmount: number;
      tokenAmount: number;
      price: number;
      timestamp: number;
      trader: string;
    }> => {
      if (!trade || typeof trade !== "object") return [];
      const item = trade as Record<string, unknown>;
      const solAmountRaw = getNumber(item, "sol_amount", "solAmount");
      const tokenAmount = getNumber(item, "token_amount", "tokenAmount");
      const trader = getString(item, "trader", "user");
      const timestamp = getNumber(item, "timestamp");
      if (!trader || !timestamp) return [];

      const isBuy = typeof item.is_buy === "boolean"
        ? item.is_buy
        : solAmountRaw >= 0;
      return [{
        signature: getString(item, "signature"),
        type: isBuy ? "buy" : "sell",
        solAmount: Math.abs(solAmountRaw) / 1e9,
        tokenAmount: Math.abs(tokenAmount),
        price: getNumber(item, "price"),
        timestamp,
        trader,
      }];
    });
  } catch {
    return [];
  }
}

function calculatePrice(token: PumpFunToken): {
  sol: number;
  usd: number | null;
  marketCap: number;
  marketCapUsd: number | null;
} {
  if (token.virtualSolReserves === 0 || token.virtualTokenReserves === 0) {
    return { sol: 0, usd: null, marketCap: 0, marketCapUsd: token.usdMarketCap };
  }

  const pricePerToken =
    (token.virtualSolReserves / 1e9) / (token.virtualTokenReserves / 1e6);
  const marketCap = pricePerToken * (token.totalSupply / 1e6);

  return {
    sol: pricePerToken,
    usd: token.usdMarketCap && marketCap > 0
      ? (token.usdMarketCap / marketCap) * pricePerToken
      : null,
    marketCap,
    marketCapUsd: token.usdMarketCap,
  };
}

function calculateBondingCurveProgress(token: PumpFunToken): { progress: number; solNeeded: number; tokensRemaining: number } {
  const targetSol = 85; // ~85 SOL to complete bonding curve
  const currentSol = token.realSolReserves / 1e9;
  const progress = Math.min((currentSol / targetSol) * 100, 100);
  
  return {
    progress,
    solNeeded: Math.max(0, targetSol - currentSol),
    tokensRemaining: Math.max(0, token.virtualTokenReserves - token.realTokenReserves) / 1e6
  };
}

const PumpFunRequestSchema = z.object({
  action: z.enum(["analyze", "price", "holders", "trades", "bonding-curve"]),
  mint: z.string().min(32).max(44).regex(/^[1-9A-HJ-NP-Za-km-z]+$/),
  rpcUrl: z.string().url().optional(),
}).refine(({ mint }) => {
  try {
    new PublicKey(mint);
    return true;
  } catch {
    return false;
  }
}, { path: ["mint"], message: "Invalid Solana mint address" });

export async function POST(request: NextRequest) {
  try {
    const parsedRequest = PumpFunRequestSchema.safeParse(await request.json());
    if (!parsedRequest.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsedRequest.error.flatten() },
        { status: 400 }
      );
    }

    const { action, mint } = parsedRequest.data;
    let rpcUrl = parsedRequest.data.rpcUrl;
    if (rpcUrl) {
      try {
        rpcUrl = (await validatePublicRpcUrl(rpcUrl)).toString();
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Invalid RPC URL" },
          { status: 400 }
        );
      }
    }

    switch (action) {
      case "analyze": {
        const token = await fetchPumpFunTokenData(mint);

        const [holders, trades] = await Promise.all([
          fetchTokenHolders(mint, rpcUrl),
          fetchRecentTrades(mint, 50)
        ]);

        const price = calculatePrice(token);
        const bondingCurve = calculateBondingCurveProgress(token);
        
        const top10Percentage = holders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
        const analytics: PumpFunAnalytics = {
          token,
          price,
          bondingCurve,
          holders: {
            topAccountCount: holders.length,
            top10Percentage,
            top20Percentage: holders.reduce((sum, h) => sum + h.percentage, 0),
            holders: holders.slice(0, 100)
          },
          liquidity: {
            sol: token.realSolReserves / 1e9,
            tokens: token.realTokenReserves / 1e6
          },
          creator: {
            address: token.creator,
            tokensCreated: 0,
            totalVolume: 0
          },
          recentTrades: trades
        };

        return NextResponse.json({ analytics });
      }

      case "price": {
        const token = await fetchPumpFunTokenData(mint);
        return NextResponse.json({ price: calculatePrice(token) });
      }

      case "holders": {
        const holders = await fetchTokenHolders(mint, rpcUrl);
        return NextResponse.json({ 
          holders: holders.slice(0, 100),
          total: holders.length,
          top10Percentage: holders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0)
        });
      }

      case "trades": {
        const trades = await fetchRecentTrades(mint, 100);
        return NextResponse.json({ trades });
      }

      case "bonding-curve": {
        const token = await fetchPumpFunTokenData(mint);
        return NextResponse.json({ bondingCurve: calculateBondingCurveProgress(token) });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("PumpFun API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: error instanceof UpstreamError ? error.status : 500 }
    );
  }
}