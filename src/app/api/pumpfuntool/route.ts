import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { createSolanaConnection } from "@/lib/solana-rpc";

const PUMPFUN_PROGRAM_ID = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const PUMPFUN_FEE_RECIPIENT = new PublicKey("CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM");

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
    usd: number;
    marketCap: number;
    marketCapUsd: number;
  };
  bondingCurve: {
    progress: number;
    solNeeded: number;
    tokensRemaining: number;
  };
  holders: {
    total: number;
    top10Percentage: number;
    top50Percentage: number;
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

async function fetchPumpFunTokenData(mint: string): Promise<PumpFunToken | null> {
  try {
    const response = await fetch(`https://frontend-api.pump.fun/coins/${mint}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchTokenHolders(mint: string, rpcUrl: string): Promise<HolderInfo[]> {
  try {
    const connection = createSolanaConnection(rpcUrl);
    const mintPubkey = new PublicKey(mint);
    
    const accounts = await connection.getParsedTokenAccountsByOwner(
      mintPubkey,
      { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
    );

    const holders: HolderInfo[] = [];
    let totalSupply = 0;

    for (const account of accounts.value) {
      const parsed = account.account.data.parsed?.info;
      if (!parsed) continue;

      const amount = parsed.tokenAmount?.uiAmount || 0;
      if (amount > 0) {
        holders.push({
          address: parsed.owner,
          balance: parsed.tokenAmount?.uiAmount || 0,
          percentage: 0
        });
        totalSupply += parsed.tokenAmount?.uiAmount || 0;
      }
    }

    holders.sort((a, b) => b.balance - a.balance);
    
    return holders.map(h => ({
      ...h,
      percentage: totalSupply > 0 ? (h.balance / totalSupply) * 100 : 0
    }));
  } catch {
    return [];
  }
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
    const response = await fetch(`https://frontend-api.pump.fun/trades/${mint}?limit=${limit}`);
    if (!response.ok) return [];
    const trades = await response.json();
    return trades.map((t: any) => ({
      signature: t.signature,
      type: t.sol_amount > 0 ? "buy" : "sell",
      solAmount: Math.abs(t.sol_amount) / 1e9,
      tokenAmount: Math.abs(t.token_amount),
      price: t.price,
      timestamp: t.timestamp,
      trader: t.trader
    }));
  } catch {
    return [];
  }
}

function calculatePrice(token: PumpFunToken): { sol: number; usd: number; marketCap: number; marketCapUsd: number } {
  const solPriceUsd = 180; // Approximate SOL price
  if (token.virtualSolReserves === 0 || token.virtualTokenReserves === 0) {
    return { sol: 0, usd: 0, marketCap: 0, marketCapUsd: 0 };
  }
  
  const pricePerToken = token.virtualSolReserves / token.virtualTokenReserves;
  const marketCap = pricePerToken * token.totalSupply;
  
  return {
    sol: pricePerToken,
    usd: pricePerToken * solPriceUsd,
    marketCap,
    marketCapUsd: marketCap * solPriceUsd
  };
}

function calculateBondingCurveProgress(token: PumpFunToken): { progress: number; solNeeded: number; tokensRemaining: number } {
  const targetSol = 85; // ~85 SOL to complete bonding curve
  const currentSol = token.realSolReserves / 1e9;
  const progress = Math.min((currentSol / targetSol) * 100, 100);
  
  return {
    progress,
    solNeeded: Math.max(0, targetSol - currentSol),
    tokensRemaining: token.virtualTokenReserves - token.realTokenReserves
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, mint, rpcUrl } = body;

    if (!mint) {
      return NextResponse.json({ error: "mint required" }, { status: 400 });
    }

    const connection = createSolanaConnection(rpcUrl);

    switch (action) {
      case "analyze": {
        const token = await fetchPumpFunTokenData(mint);
        if (!token) {
          return NextResponse.json({ error: "Token not found on PumpFun" }, { status: 404 });
        }

        const [holders, trades] = await Promise.all([
          fetchTokenHolders(mint, rpcUrl),
          fetchRecentTrades(mint, 50)
        ]);

        const price = calculatePrice(token);
        const bondingCurve = calculateBondingCurveProgress(token);
        
        const top10Percentage = holders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
        const top50Percentage = holders.slice(0, 50).reduce((sum, h) => sum + h.percentage, 0);

        const analytics: PumpFunAnalytics = {
          token,
          price,
          bondingCurve,
          holders: {
            total: holders.length,
            top10Percentage,
            top50Percentage,
            holders: holders.slice(0, 100)
          },
          liquidity: {
            sol: token.realSolReserves / 1e9,
            tokens: token.realTokenReserves
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
        if (!token) {
          return NextResponse.json({ error: "Token not found" }, { status: 404 });
        }
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
        if (!token) {
          return NextResponse.json({ error: "Token not found" }, { status: 404 });
        }
        return NextResponse.json({ bondingCurve: calculateBondingCurveProgress(token) });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("PumpFun API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}