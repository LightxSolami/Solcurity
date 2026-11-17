import { NextRequest, NextResponse } from "next/server";
import { getAssociatedTokenAddressSync, unpackAccount, unpackMint } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { createSolanaConnection, withRpcRetry } from "@/lib/solana-rpc";
import { validatePublicRpcUrl } from "@/lib/public-rpc-url";
import { z } from "zod";

const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const PUMP_FUN_PROGRAM_ID = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");

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
  curveAvailable?: boolean;
  dataSource?: "pumpfun" | "dexscreener" | "geckoterminal" | "onchain";
  marketLiquiditySol?: number;
  marketLiquidityTokens?: number;
  marketPriceSol?: number | null;
  marketPriceUsd?: number | null;
  marketCapSol?: number | null;
  dexId?: string;
  marketPairAddress?: string;
  marketUrl?: string;
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
    progress: number | null;
    solNeeded: number | null;
    tokensRemaining: number | null;
    available: boolean;
  };
  holders: {
    topAccountCount: number;
    top10Percentage: number;
    top20Percentage: number;
    available: boolean;
    holders: HolderInfo[];
    error?: string;
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

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function withTrackerRpc<T>(
  operation: (connection: Connection) => Promise<T>,
  rpcUrl?: string,
  maxRetries = 3
): Promise<T> {
  return rpcUrl
    ? operation(createSolanaConnection(rpcUrl))
    : withRpcRetry(operation, maxRetries);
}

function getBondingCurveAddress(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mint.toBuffer()],
    PUMP_FUN_PROGRAM_ID
  )[0];
}

interface BondingCurveData {
  bondingCurve: string;
  virtualSolReserves: number;
  virtualTokenReserves: number;
  realSolReserves: number;
  realTokenReserves: number;
  totalSupply: number;
  complete: boolean;
  creator: string;
  curveAvailable: boolean;
}

function parseBondingCurveAccount(
  mint: PublicKey,
  account: Awaited<ReturnType<Connection["getAccountInfo"]>>
): BondingCurveData | null {
  if (!account || !account.owner.equals(PUMP_FUN_PROGRAM_ID)) return null;
  const data = account.data;
  if (!data.subarray(0, 8).equals(Buffer.from("17b7f83760d8ac60", "hex"))) {
    return null;
  }
  if (data.length < 8 + 5 * 8 + 1 + 32) {
    throw new Error("Pump.fun bonding curve account has an invalid layout");
  }

  let offset = 8;
  const virtualTokenReserves = Number(data.readBigUInt64LE(offset));
  offset += 8;
  const virtualSolReserves = Number(data.readBigUInt64LE(offset));
  offset += 8;
  const realTokenReserves = Number(data.readBigUInt64LE(offset));
  offset += 8;
  const realSolReserves = Number(data.readBigUInt64LE(offset));
  offset += 8;
  const totalSupply = Number(data.readBigUInt64LE(offset));
  offset += 8;
  const complete = data[offset] === 1;
  offset += 1;
  const creator = new PublicKey(data.subarray(offset, offset + 32)).toBase58();

  return {
    bondingCurve: getBondingCurveAddress(mint).toBase58(),
    virtualSolReserves,
    virtualTokenReserves,
    realSolReserves,
    realTokenReserves,
    totalSupply,
    complete,
    creator,
    curveAvailable: virtualSolReserves > 0 && virtualTokenReserves > 0,
  };
}

async function fetchOnChainBondingCurve(
  mint: string,
  rpcUrl?: string
): Promise<BondingCurveData | null> {
  const mintPubkey = new PublicKey(mint);
  const curveAddress = getBondingCurveAddress(mintPubkey);
  const account = await withTrackerRpc(
    (connection) => connection.getAccountInfo(curveAddress, "confirmed"),
    rpcUrl
  );
  return parseBondingCurveAccount(mintPubkey, account);
}

async function addOnChainCurveData(
  token: PumpFunToken,
  mint: string,
  rpcUrl?: string
): Promise<PumpFunToken> {
  if (token.curveAvailable) return token;

  try {
    const curve = await fetchOnChainBondingCurve(mint, rpcUrl);
    return curve
      ? { ...token, ...curve, dataSource: token.dataSource ?? "onchain" }
      : token;
  } catch (error) {
    console.warn("PumpFun bonding curve lookup failed:", error);
    return token;
  }
}

function normalizePumpFunToken(data: Record<string, unknown>, requestedMint: string): PumpFunToken {
  const usdMarketCap = getNumber(data, "usd_market_cap", "usdMarketCap");
  const virtualSolReserves = getNumber(data, "virtualSolReserves", "virtual_sol_reserves");
  const virtualTokenReserves = getNumber(data, "virtualTokenReserves", "virtual_token_reserves");
  const realSolReserves = getNumber(data, "realSolReserves", "real_sol_reserves");
  const realTokenReserves = getNumber(data, "realTokenReserves", "real_token_reserves");
  return {
    mint: getString(data, "mint") || requestedMint,
    name: getString(data, "name") || "Unknown token",
    symbol: getString(data, "symbol") || "UNKNOWN",
    uri: getString(data, "uri", "metadata_uri"),
    bondingCurve: getString(data, "bondingCurve", "bonding_curve"),
    associatedBondingCurve: getString(data, "associatedBondingCurve", "associated_bonding_curve"),
    creator: getString(data, "creator"),
    createdTimestamp: getNumber(data, "createdTimestamp", "created_timestamp"),
    virtualSolReserves,
    virtualTokenReserves,
    realSolReserves,
    realTokenReserves,
    totalSupply: getNumber(data, "totalSupply", "total_supply"),
    complete: data.complete === true || data.complete === "true",
    usdMarketCap: usdMarketCap > 0 ? usdMarketCap : null,
    curveAvailable: virtualSolReserves > 0 && virtualTokenReserves > 0,
    dataSource: "pumpfun",
  };
}

async function fetchPumpFunTokenData(mint: string, rpcUrl?: string): Promise<PumpFunToken> {
  const token = await fetchTokenDataFromProviders(mint, rpcUrl);
  return enrichWithGeckoTerminalData(token, mint);
}

async function fetchTokenDataFromProviders(mint: string, rpcUrl?: string): Promise<PumpFunToken> {
  try {
    return await fetchPumpFunTokenDataFromPumpPortal(mint);
  } catch (pumpPortalError) {
    try {
      return await fetchPumpFunTokenDataFromDexScreener(mint);
    } catch (dexScreenerError) {
      try {
        return await fetchPumpFunTokenDataFromPumpFun(mint);
      } catch (pumpFunError) {
        // If all APIs fail, try to get basic on-chain data as fallback
        try {
          return await fetchBasicOnChainData(mint, rpcUrl);
        } catch {
          // If all else fails, throw the most informative error
          if (pumpPortalError instanceof UpstreamError && pumpPortalError.status === 404) {
            throw pumpPortalError;
          }
          if (pumpFunError instanceof UpstreamError && pumpFunError.status === 404) {
            throw pumpFunError;
          }
          if (
            dexScreenerError instanceof UpstreamError &&
            dexScreenerError.message === "This mint does not appear to be a Pump.fun token"
          ) {
            throw dexScreenerError;
          }

          console.error("Pump.fun, DEX Screener, and PumpPortal token lookup failed:", {
            pumpPortalError,
            dexScreenerError,
            pumpFunError,
          });
          throw new UpstreamError(
            "Token market data is temporarily unavailable from Pump.fun, PumpPortal, and DEX Screener. The token may not exist or all APIs are currently unavailable.",
            503
          );
        }
      }
    }
  }
}

async function fetchPumpFunTokenDataFromPumpFun(mint: string): Promise<PumpFunToken> {
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

async function fetchPumpFunTokenDataFromDexScreener(mint: string): Promise<PumpFunToken> {
  let response: Response;
  try {
    response = await fetch(
      `https://api.dexscreener.com/token-pairs/v1/solana/${encodeURIComponent(mint)}`,
      {
        headers: { Accept: "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      }
    );
  } catch {
    throw new UpstreamError("Unable to reach DEX Screener", 502);
  }

  if (!response.ok) {
    throw new UpstreamError(`DEX Screener returned HTTP ${response.status}`, 502);
  }

  const data: unknown = await response.json();
  if (!Array.isArray(data)) {
    throw new UpstreamError("DEX Screener returned invalid market data", 502);
  }

  const pairs = data.filter((value): value is Record<string, unknown> => {
    const pair = getRecord(value);
    const baseToken = getRecord(pair?.baseToken);
    return !!pair &&
      !!baseToken &&
      getString(pair, "chainId") === "solana" &&
      getString(baseToken, "address").toLowerCase() === mint.toLowerCase();
  });

  if (pairs.length === 0) {
    throw new UpstreamError("Token not found in DEX Screener markets", 404);
  }

  const isPumpFunMarket = pairs.some((pair) =>
    getString(pair, "dexId").toLowerCase() === "pumpfun"
  ) || mint.toLowerCase().endsWith("pump");
  if (!isPumpFunMarket) {
    throw new UpstreamError("This mint does not appear to be a Pump.fun token", 404);
  }

  const pair = pairs.sort(
    (left, right) =>
      getNumber(
        (right.liquidity as Record<string, unknown> | undefined) ?? {},
        "usd"
      ) -
      getNumber(
        (left.liquidity as Record<string, unknown> | undefined) ?? {},
        "usd"
      )
  )[0];
  const baseToken = getRecord(pair.baseToken) ?? {};
  const quoteToken = getRecord(pair.quoteToken) ?? {};
  const liquidity = getRecord(pair.liquidity) ?? {};
  const priceSol = getNumber(pair, "priceNative");
  const priceUsd = getNumber(pair, "priceUsd");
  const marketCapUsd = getNumber(pair, "marketCap") || getNumber(pair, "fdv");
  const quoteIsSol =
    getString(quoteToken, "symbol").toUpperCase() === "SOL" ||
    getString(quoteToken, "address") === "So11111111111111111111111111111111111111112";
  const marketCapSol =
    marketCapUsd > 0 && priceUsd > 0 && priceSol > 0
      ? marketCapUsd / (priceUsd / priceSol)
      : null;
  const totalSupply =
    marketCapUsd > 0 && priceUsd > 0
      ? (marketCapUsd / priceUsd) * 1e6
      : 0;
  const dexId = getString(pair, "dexId");
  const pairAddress = getString(pair, "pairAddress");

  return {
    mint,
    name: getString(baseToken, "name") || "Unknown token",
    symbol: getString(baseToken, "symbol") || "UNKNOWN",
    uri: "",
    bondingCurve: "",
    associatedBondingCurve: "",
    creator: "",
    createdTimestamp: Math.floor(getNumber(pair, "pairCreatedAt") / 1000),
    virtualSolReserves: 0,
    virtualTokenReserves: 0,
    realSolReserves: 0,
    realTokenReserves: 0,
    totalSupply,
    complete: dexId !== "pumpfun",
    usdMarketCap: marketCapUsd > 0 ? marketCapUsd : null,
    curveAvailable: false,
    dataSource: "dexscreener",
    marketLiquiditySol: quoteIsSol ? getNumber(liquidity, "quote") : 0,
    marketLiquidityTokens: getNumber(liquidity, "base"),
    marketPriceSol: priceSol > 0 ? priceSol : null,
    marketPriceUsd: priceUsd > 0 ? priceUsd : null,
    marketCapSol,
    dexId,
    marketPairAddress: pairAddress,
    marketUrl: pairAddress
      ? `https://dexscreener.com/solana/${encodeURIComponent(pairAddress)}`
      : undefined,
  };
}

async function fetchGeckoTerminalJson(url: string, label: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error(`GeckoTerminal returned HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(`GeckoTerminal ${label} lookup failed:`, error);
    return null;
  }
}

async function enrichWithGeckoTerminalData(
  token: PumpFunToken,
  mint: string
): Promise<PumpFunToken> {
  const needsMetadata = token.name === "Unknown token" || token.symbol === "UNKNOWN";
  const needsPool = !token.marketPairAddress;
  if (!needsMetadata && !needsPool) return token;

  const [tokenResponse, poolsResponse] = await Promise.all([
    needsMetadata
      ? fetchGeckoTerminalJson(
          `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${encodeURIComponent(mint)}`,
          "token metadata"
        )
      : Promise.resolve(null),
    needsPool
      ? fetchGeckoTerminalJson(
          `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${encodeURIComponent(mint)}/pools?page=1`,
          "market pool"
        )
      : Promise.resolve(null),
  ]);

  const geckoToken = getRecord(getRecord(tokenResponse)?.data);
  const tokenAttributes = getRecord(geckoToken?.attributes) ?? {};
  const pools = getRecord(poolsResponse)?.data;
  const matchingPools = Array.isArray(pools)
    ? pools.flatMap((entry) => {
        const pool = getRecord(entry);
        const attributes = getRecord(pool?.attributes);
        const relationships = getRecord(pool?.relationships);
        const baseToken = getRecord(getRecord(relationships?.base_token)?.data);
        const quoteToken = getRecord(getRecord(relationships?.quote_token)?.data);
        if (
          !pool ||
          !attributes ||
          (getString(baseToken ?? {}, "id") !== `solana_${mint}` &&
            getString(quoteToken ?? {}, "id") !== `solana_${mint}`)
        ) {
          return [];
        }
        return [{ attributes, relationships }];
      })
    : [];
  const pool = matchingPools.sort(
    (left, right) =>
      getNumber(right.attributes, "reserve_in_usd") -
      getNumber(left.attributes, "reserve_in_usd")
  )[0];

  const enriched: PumpFunToken = {
    ...token,
    name: needsMetadata ? getString(tokenAttributes, "name") || token.name : token.name,
    symbol: needsMetadata ? getString(tokenAttributes, "symbol") || token.symbol : token.symbol,
  };
  if (!pool) return enriched;

  const relationships = pool.relationships ?? {};
  const baseTokenId = getString(
    getRecord(getRecord(relationships.base_token)?.data) ?? {},
    "id"
  );
  const quoteTokenId = getString(
    getRecord(getRecord(relationships.quote_token)?.data) ?? {},
    "id"
  );
  const targetIsBase = baseTokenId === `solana_${mint}`;
  const solanaTokenId = "solana_So11111111111111111111111111111111111111112";
  const quoteIsSol = targetIsBase ? quoteTokenId === solanaTokenId : baseTokenId === solanaTokenId;
  const attributes = pool.attributes;
  const priceSol = getNumber(
    attributes,
    targetIsBase ? "base_token_price_native_currency" : "quote_token_price_native_currency"
  );
  const priceUsd = getNumber(
    attributes,
    targetIsBase ? "base_token_price_usd" : "quote_token_price_usd"
  ) || getNumber(tokenAttributes, "price_usd");
  const marketCapUsd =
    getNumber(attributes, "market_cap_usd") ||
    getNumber(attributes, "fdv_usd") ||
    getNumber(tokenAttributes, "fdv_usd");
  const reserveUsd = getNumber(attributes, "reserve_in_usd");
  const quotePriceUsd = getNumber(
    attributes,
    targetIsBase ? "quote_token_price_usd" : "base_token_price_usd"
  );
  const pairAddress = getString(attributes, "address");
  const createdTimestamp = Date.parse(getString(attributes, "pool_created_at"));
  const dex = getRecord(getRecord(relationships.dex)?.data);

  return {
    ...enriched,
    createdTimestamp: enriched.createdTimestamp ||
      (Number.isFinite(createdTimestamp) ? Math.floor(createdTimestamp / 1000) : 0),
    usdMarketCap: enriched.usdMarketCap ?? (marketCapUsd > 0 ? marketCapUsd : null),
    marketLiquiditySol: quoteIsSol && quotePriceUsd > 0
      ? reserveUsd / (2 * quotePriceUsd)
      : enriched.marketLiquiditySol ?? 0,
    marketLiquidityTokens: priceUsd > 0
      ? reserveUsd / (2 * priceUsd)
      : enriched.marketLiquidityTokens ?? 0,
    marketPriceSol: priceSol > 0 ? priceSol : enriched.marketPriceSol,
    marketPriceUsd: priceUsd > 0 ? priceUsd : enriched.marketPriceUsd,
    marketCapSol: marketCapUsd > 0 && priceUsd > 0 && priceSol > 0
      ? marketCapUsd * (priceSol / priceUsd)
      : enriched.marketCapSol,
    dexId: getString(dex ?? {}, "id") || enriched.dexId,
    marketPairAddress: pairAddress || enriched.marketPairAddress,
    marketUrl: pairAddress
      ? `https://www.geckoterminal.com/solana/pools/${encodeURIComponent(pairAddress)}`
      : enriched.marketUrl,
    dataSource: "geckoterminal",
  };
}

async function fetchBasicOnChainData(
  mint: string,
  rpcUrl?: string
): Promise<PumpFunToken> {
  const mintPubkey = new PublicKey(mint);
  const { mintAccount, curveAccount } = await withTrackerRpc(async (connection) => {
    const [mintAccount, curveAccount] = await Promise.all([
      connection.getAccountInfo(mintPubkey, "confirmed"),
      connection.getAccountInfo(getBondingCurveAddress(mintPubkey), "confirmed"),
    ]);
    return { mintAccount, curveAccount };
  }, rpcUrl);
  if (!mintAccount) {
    throw new UpstreamError("Token not found on Solana", 404);
  }
  if (
    !mintAccount.owner.equals(TOKEN_PROGRAM_ID) &&
    !mintAccount.owner.equals(TOKEN_2022_PROGRAM_ID)
  ) {
    throw new UpstreamError("The address is not a supported SPL token mint", 400);
  }

  const curve = parseBondingCurveAccount(mintPubkey, curveAccount);
  if (!curve) {
    throw new UpstreamError("No Pump.fun bonding curve exists for this token", 404);
  }

  const mintState = unpackMint(mintPubkey, mintAccount, mintAccount.owner);
  return {
    mint,
    name: "Unknown token",
    symbol: "UNKNOWN",
    uri: "",
    associatedBondingCurve: getAssociatedTokenAddressSync(
      mintPubkey,
      new PublicKey(curve.bondingCurve),
      true,
      mintAccount.owner
    ).toBase58(),
    ...curve,
    createdTimestamp: 0,
    totalSupply: Number(mintState.supply),
    usdMarketCap: null,
    dataSource: "onchain",
  };
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
  const virtualSolReserves = getNumber(data, "virtual_sol_reserves", "virtualSolReserves");
  const virtualTokenReserves = getNumber(data, "virtual_token_reserves", "virtualTokenReserves");
  return {
    mint: getString(data, "mint") || requestedMint,
    name: getString(data, "name") || "Unknown token",
    symbol: getString(data, "symbol") || "UNKNOWN",
    uri: getString(data, "metadata_uri", "uri"),
    bondingCurve: getString(data, "bonding_curve", "bondingCurve"),
    associatedBondingCurve: getString(data, "associated_bonding_curve", "associatedBondingCurve"),
    creator: getString(data, "creator"),
    createdTimestamp: getNumber(data, "created_timestamp", "createdTimestamp"),
    virtualSolReserves,
    virtualTokenReserves,
    realSolReserves: getNumber(data, "real_sol_reserves", "realSolReserves"),
    realTokenReserves: getNumber(data, "real_token_reserves", "realTokenReserves"),
    totalSupply: getNumber(data, "total_supply", "totalSupply"),
    complete: data.complete === true || data.complete === "true",
    usdMarketCap: null,
    curveAvailable: virtualSolReserves > 0 && virtualTokenReserves > 0,
    dataSource: "pumpfun",
  };
}

async function fetchTokenHolders(mint: string, rpcUrl?: string): Promise<HolderInfo[]> {
  const mintPubkey = new PublicKey(mint);
  return withTrackerRpc(async (connection) => {
    const mintAccount = await connection.getAccountInfo(mintPubkey, "confirmed");
    if (!mintAccount) throw new Error("Token mint account was not found on Solana");

    const tokenProgram = mintAccount.owner;
    if (
      !tokenProgram.equals(TOKEN_PROGRAM_ID) &&
      !tokenProgram.equals(TOKEN_2022_PROGRAM_ID)
    ) {
      throw new Error("The address is not owned by a supported Solana token program");
    }

    const mintState = unpackMint(mintPubkey, mintAccount, tokenProgram);
    const decimals = 10 ** mintState.decimals;
    const totalSupply = Number(mintState.supply) / decimals;
    const balancesByOwner = new Map<string, number>();

    try {
      const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey, "confirmed");
      const accountInfos = await connection.getMultipleAccountsInfo(
        largestAccounts.value.map((account) => account.address),
        "confirmed"
      );
      largestAccounts.value.forEach((account, index) => {
        const accountInfo = accountInfos[index];
        if (!accountInfo || !accountInfo.owner.equals(tokenProgram)) return;
        const tokenAccount = unpackAccount(account.address, accountInfo, tokenProgram);
        const balance = Number(tokenAccount.amount) / decimals;
        if (balance <= 0) return;
        const owner = tokenAccount.owner.toBase58();
        balancesByOwner.set(owner, (balancesByOwner.get(owner) ?? 0) + balance);
      });
    } catch (largestAccountsError) {
      console.warn("Largest-account RPC call failed; querying mint-filtered token accounts:", largestAccountsError);
      const filters = [
        { memcmp: { offset: 0, bytes: mintPubkey.toBase58() } },
        ...(tokenProgram.equals(TOKEN_PROGRAM_ID) ? [{ dataSize: 165 }] : []),
      ];
      const tokenAccounts = await connection.getProgramAccounts(tokenProgram, {
        commitment: "confirmed",
        filters,
        dataSlice: { offset: 32, length: 40 },
      });

      for (const { account } of tokenAccounts) {
        if (account.data.length !== 40) continue;
        const owner = new PublicKey(account.data.subarray(0, 32)).toBase58();
        const balance = Number(account.data.readBigUInt64LE(32)) / decimals;
        if (balance > 0) {
          balancesByOwner.set(owner, (balancesByOwner.get(owner) ?? 0) + balance);
        }
      }
    }

    return Array.from(balancesByOwner, ([address, balance]) => ({
      address,
      balance,
      percentage: totalSupply > 0 ? (balance / totalSupply) * 100 : 0,
    })).sort((a, b) => b.balance - a.balance);
  });
}

interface RecentTrade {
  signature: string;
  type: "buy" | "sell";
  solAmount: number;
  tokenAmount: number;
  price: number;
  timestamp: number;
  trader: string;
}

async function fetchRecentTradesFromChain(
  mint: string,
  sourceAddresses: string[],
  limit: number,
  rpcUrl?: string
): Promise<RecentTrade[]> {
  const addresses = Array.from(new Set(sourceAddresses)).flatMap((address) => {
    try {
      return [new PublicKey(address)];
    } catch {
      return [];
    }
  });
  if (addresses.length === 0) return [];

  const signatureGroups = await withTrackerRpc(async (connection) =>
    Promise.all(addresses.map(async (address) => {
      try {
        return await connection.getSignaturesForAddress(address, { limit: 60 }, "confirmed");
      } catch (error) {
        console.warn("PumpFun transaction lookup failed for account:", address.toBase58(), error);
        return [];
      }
    })),
  rpcUrl);
  const signatures = Array.from(
    new Map(
      signatureGroups.flat().map((entry) => [entry.signature, entry])
    ).values()
  )
    .filter((entry) => !entry.err)
    .sort((a, b) => (b.blockTime ?? 0) - (a.blockTime ?? 0))
    .slice(0, 60);
  const trades: RecentTrade[] = [];

  for (let offset = 0; offset < signatures.length && trades.length < limit; offset += 3) {
    const batch = signatures.slice(offset, offset + 3);
    let transactions;
    try {
      transactions = await withTrackerRpc(
        (connection) => connection.getParsedTransactions(
          batch.map((entry) => entry.signature),
          { commitment: "confirmed", maxSupportedTransactionVersion: 1 }
        ),
        rpcUrl,
        1
      );
    } catch (error) {
      console.warn("PumpFun transaction details unavailable:", error);
      break;
    }

    transactions.forEach((transaction, index) => {
      const meta = transaction?.meta;
      if (!meta || meta.err) return;

      const tokenDeltas = new Map<string, number>();
      for (const balance of meta.preTokenBalances ?? []) {
        if (balance.mint === mint && balance.owner) {
          tokenDeltas.set(
            balance.owner,
            (tokenDeltas.get(balance.owner) ?? 0) -
              Number(balance.uiTokenAmount.uiAmountString ?? 0)
          );
        }
      }
      for (const balance of meta.postTokenBalances ?? []) {
        if (balance.mint === mint && balance.owner) {
          tokenDeltas.set(
            balance.owner,
            (tokenDeltas.get(balance.owner) ?? 0) +
              Number(balance.uiTokenAmount.uiAmountString ?? 0)
          );
        }
      }

      const accountKeys = transaction.transaction.message.accountKeys;
      const signers = new Set(
        accountKeys.filter((account) => account.signer).map((account) => account.pubkey.toBase58())
      );
      const candidates = Array.from(tokenDeltas)
        .filter(([, amount]) => amount !== 0)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
      const [trader, tokenChange] =
        candidates.find(([owner]) => signers.has(owner)) ?? candidates[0] ?? [];
      if (!trader || tokenChange === undefined) return;

      const traderIndex = accountKeys.findIndex(
        (account) => account.pubkey.toBase58() === trader
      );
      if (traderIndex < 0) return;

      const lamportChange = meta.postBalances[traderIndex] - meta.preBalances[traderIndex];
      const solAmount = Math.abs(lamportChange + meta.fee) / 1e9;
      const tokenAmount = Math.abs(tokenChange);
      if (solAmount === 0 || tokenAmount === 0) return;

      trades.push({
        signature: batch[index].signature,
        type: tokenChange > 0 ? "buy" : "sell",
        solAmount,
        tokenAmount,
        price: solAmount / tokenAmount,
        timestamp: transaction.blockTime ?? batch[index].blockTime ?? 0,
        trader,
      });
    });
  }

  return trades.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

async function fetchRecentTrades(
  mint: string,
  sourceAddresses: string[],
  limit = 20,
  rpcUrl?: string
): Promise<RecentTrade[]> {
  const pairAddress = sourceAddresses.find((address) => address !== getBondingCurveAddress(new PublicKey(mint)).toBase58());
  if (pairAddress) {
    try {
      const response = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/solana/pools/${encodeURIComponent(pairAddress)}/trades?page=1`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10_000),
        }
      );
      if (!response.ok) {
        throw new Error(`GeckoTerminal returned HTTP ${response.status}`);
      }

      const data: unknown = await response.json();
      const records = getRecord(data);
      if (Array.isArray(records?.data)) {
        const trades = records.data.flatMap((record): RecentTrade[] => {
          const attributes = getRecord(getRecord(record)?.attributes);
          if (!attributes) return [];

          const fromAddress = getString(attributes, "from_token_address");
          const toAddress = getString(attributes, "to_token_address");
          const fromAmount = getNumber(attributes, "from_token_amount");
          const toAmount = getNumber(attributes, "to_token_amount");
          const isBuy = toAddress === mint;
          const isSell = fromAddress === mint;
          if ((!isBuy && !isSell) || fromAmount <= 0 || toAmount <= 0) return [];

          const otherTokenAddress = isBuy ? fromAddress : toAddress;
          if (otherTokenAddress !== "So11111111111111111111111111111111111111112") {
            return [];
          }
          const solAmount = isBuy ? fromAmount : toAmount;
          const tokenAmount = isBuy ? toAmount : fromAmount;
          const timestamp = Date.parse(getString(attributes, "block_timestamp"));
          const signature = getString(attributes, "tx_hash");
          const trader = getString(attributes, "tx_from_address");
          if (!signature || !trader || !Number.isFinite(timestamp)) return [];

          return [{
            signature,
            type: isBuy ? "buy" : "sell",
            solAmount,
            tokenAmount,
            price: solAmount / tokenAmount,
            timestamp: Math.floor(timestamp / 1000),
            trader,
          }];
        });
        if (trades.length > 0) return trades.slice(0, limit);
      }
    } catch (error) {
      console.warn("GeckoTerminal trade lookup failed; trying Solana transaction history:", error);
    }
  }

  return fetchRecentTradesFromChain(mint, sourceAddresses, limit, rpcUrl);
}

function calculatePrice(token: PumpFunToken): {
  sol: number;
  usd: number | null;
  marketCap: number;
  marketCapUsd: number | null;
} {
  if (token.dataSource === "dexscreener" || token.dataSource === "geckoterminal") {
    return {
      sol: token.marketPriceSol ?? 0,
      usd: token.marketPriceUsd ?? null,
      marketCap: token.marketCapSol ?? 0,
      marketCapUsd: token.usdMarketCap,
    };
  }

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

function calculateBondingCurveProgress(token: PumpFunToken): {
  progress: number | null;
  solNeeded: number | null;
  tokensRemaining: number | null;
  available: boolean;
} {
  if (token.dataSource === "geckoterminal" && token.marketPairAddress) {
    return { progress: null, solNeeded: null, tokensRemaining: null, available: false };
  }

  if (
    !token.curveAvailable ||
    token.virtualSolReserves <= 0 ||
    token.virtualTokenReserves <= 0
  ) {
    return { progress: null, solNeeded: null, tokensRemaining: null, available: false };
  }

  const targetSol = 85;
  const currentSol = token.realSolReserves / 1e9;
  const progress = token.complete ? 100 : Math.min((currentSol / targetSol) * 100, 100);
  
  return {
    progress,
    solNeeded: token.complete ? 0 : Math.max(0, targetSol - currentSol),
    tokensRemaining: token.complete ? 0 : token.realTokenReserves / 1e6,
    available: true,
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
        const marketToken = await fetchPumpFunTokenData(mint, rpcUrl);
        const token = await addOnChainCurveData(marketToken, mint, rpcUrl);
        const holderLookup = fetchTokenHolders(mint, rpcUrl).then(
          (holders) => ({ available: true, holders, error: undefined }),
          (error: unknown) => {
            console.warn("PumpFun holder lookup failed:", error);
            return {
              available: false,
              holders: [] as HolderInfo[],
              error: error instanceof Error ? error.message : "Unknown RPC error",
            };
          }
        );
        const curveAddress = getBondingCurveAddress(new PublicKey(mint)).toBase58();

        const [holdersResult, trades] = await Promise.all([
          holderLookup,
          fetchRecentTrades(
            mint,
            [curveAddress, token.marketPairAddress ?? ""],
            50,
            rpcUrl
          ),
        ]);
        const { holders } = holdersResult;

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
            available: holdersResult.available,
            holders: holders.slice(0, 100),
            error: holdersResult.error,
          },
          liquidity: {
            sol: token.dataSource === "geckoterminal"
              ? token.marketLiquiditySol ?? 0
              : token.curveAvailable && !token.complete
              ? token.realSolReserves / 1e9
              : token.marketLiquiditySol ?? 0,
            tokens: token.dataSource === "geckoterminal"
              ? token.marketLiquidityTokens ?? 0
              : token.curveAvailable && !token.complete
              ? token.realTokenReserves / 1e6
              : token.marketLiquidityTokens ?? 0,
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
        const marketToken = await fetchPumpFunTokenData(mint, rpcUrl);
        const token = await addOnChainCurveData(marketToken, mint, rpcUrl);
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
        const marketToken = await fetchPumpFunTokenData(mint, rpcUrl);
        const trades = await fetchRecentTrades(
          mint,
          [
            getBondingCurveAddress(new PublicKey(mint)).toBase58(),
            marketToken.marketPairAddress ?? "",
          ],
          100,
          rpcUrl
        );
        return NextResponse.json({ trades });
      }

      case "bonding-curve": {
        const marketToken = await fetchPumpFunTokenData(mint, rpcUrl);
        const token = await addOnChainCurveData(marketToken, mint, rpcUrl);
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