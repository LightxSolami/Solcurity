"use client";

import { useMemo, useState } from "react";

interface TokenTrade {
  signature: string;
  type: "buy" | "sell";
  solAmount: number;
  tokenAmount: number;
  price: number;
  timestamp: number;
  trader: string;
}

interface TraderGroup {
  address: string;
  trades: TokenTrade[];
  buys: number;
  sells: number;
  solVolume: number;
}

type TradeFilter = "all" | "buy" | "sell";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-5)}`;
}

function aggregateTraders(trades: TokenTrade[]): TraderGroup[] {
  const grouped = new Map<string, TraderGroup>();
  for (const trade of trades) {
    if (!trade.trader) continue;
    const trader = grouped.get(trade.trader) ?? {
      address: trade.trader,
      trades: [],
      buys: 0,
      sells: 0,
      solVolume: 0,
    };
    trader.trades.push(trade);
    trader.buys += trade.type === "buy" ? 1 : 0;
    trader.sells += trade.type === "sell" ? 1 : 0;
    trader.solVolume += trade.solAmount;
    grouped.set(trade.trader, trader);
  }
  return Array.from(grouped.values())
    .sort((left, right) => right.solVolume - left.solVolume || right.trades.length - left.trades.length)
    .slice(0, 12);
}

export function PumpFunTradeFlowMap({
  mint,
  name,
  symbol,
  trades,
}: {
  mint: string;
  name: string;
  symbol: string;
  trades: TokenTrade[];
}) {
  const [filter, setFilter] = useState<TradeFilter>("all");
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const filteredTrades = useMemo(
    () => trades.filter((trade) => filter === "all" || trade.type === filter),
    [filter, trades]
  );
  const traders = useMemo(() => aggregateTraders(filteredTrades), [filteredTrades]);
  const selectedTrader =
    traders.find((trader) => trader.address === selectedAddress) ?? traders[0] ?? null;
  const points = traders.map((trader, index) => {
    const angle = -Math.PI / 2 + (index / Math.max(1, traders.length)) * Math.PI * 2;
    return {
      trader,
      x: 500 + Math.cos(angle) * 340,
      y: 220 + Math.sin(angle) * 145,
    };
  });

  if (trades.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed border-[#14f195]/20 bg-[#080e0c] px-6 text-center">
        <p className="text-sm font-medium text-white/75">No market trades to map</p>
        <p className="mt-1 max-w-lg text-xs leading-5 text-white/40">
          The market data provider returned no recent trades for this token. The map will populate when real trades are available; no sample wallets or connections are generated.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white">Recent trade flow</h3>
          <p className="mt-1 text-[11px] text-white/40">
            {filteredTrades.length} observed trades · {traders.length} traders shown
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-white/10 bg-black/20 p-1" role="group" aria-label="Filter Pump.fun trades">
          {(["all", "buy", "sell"] as TradeFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              aria-pressed={filter === option}
              className={`rounded-md px-3 py-1.5 text-[10px] capitalize transition ${
                filter === option ? "bg-[#14f195]/10 text-[#14f195]" : "text-white/40 hover:text-white/70"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {filteredTrades.length === 0 ? (
        <p className="flex min-h-60 items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-white/45" role="status">
          No {filter} trades were returned in the loaded market data.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#070915]">
            <svg
              viewBox="0 0 1000 440"
              className="block h-[340px] min-w-[760px] w-full sm:h-[420px]"
              role="img"
              aria-label={`Observed ${symbol} trader flow map`}
            >
              <defs>
                <pattern id="pump-trade-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                  <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="1" />
                </pattern>
                <radialGradient id="pump-token-glow">
                  <stop offset="0%" stopColor="#14f195" stopOpacity=".25" />
                  <stop offset="100%" stopColor="#14f195" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="1000" height="440" fill="url(#pump-trade-grid)" />
              <ellipse cx="500" cy="220" rx="340" ry="145" fill="none" stroke="rgba(20,241,149,0.1)" strokeDasharray="3 8" />

              {points.map(({ trader, x, y }) => {
                const hasBuys = trader.buys > 0;
                const hasSells = trader.sells > 0;
                const color = hasBuys && hasSells ? "#93a4c6" : hasBuys ? "#14f195" : "#ff6482";
                return (
                  <line
                    key={`edge-${trader.address}`}
                    x1="500"
                    y1="220"
                    x2={x}
                    y2={y}
                    stroke={color}
                    strokeOpacity={selectedTrader?.address === trader.address ? ".62" : ".24"}
                    strokeWidth={selectedTrader?.address === trader.address ? "2" : "1"}
                  />
                );
              })}

              {points.map(({ trader, x, y }) => {
                const selected = selectedTrader?.address === trader.address;
                const radius = Math.max(12, Math.min(24, 10 + Math.sqrt(trader.trades.length) * 3));
                const color = trader.buys > 0 && trader.sells > 0
                  ? "#93a4c6"
                  : trader.buys > 0
                    ? "#14f195"
                    : "#ff6482";
                return (
                  <g
                    key={trader.address}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    aria-label={`${shortAddress(trader.address)}, ${trader.trades.length} trades, ${trader.buys} buys, ${trader.sells} sells, ${trader.solVolume.toFixed(3)} SOL volume`}
                    onClick={() => setSelectedAddress(trader.address)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedAddress(trader.address);
                      }
                    }}
                    className="cursor-pointer outline-none"
                  >
                    {selected && <circle cx={x} cy={y} r={radius + 12} fill={color} fillOpacity=".1" />}
                    <circle cx={x} cy={y} r={radius} fill="#111725" stroke={color} strokeWidth={selected ? 3 : 2} />
                    <circle cx={x} cy={y} r={4} fill={color} />
                    <text x={x} y={y + radius + 16} textAnchor="middle" className="fill-white/65 font-mono text-[10px]">
                      {shortAddress(trader.address)}
                    </text>
                    <text x={x} y={y + radius + 29} textAnchor="middle" className="fill-white/35 text-[9px]">
                      {trader.trades.length} trade{trader.trades.length === 1 ? "" : "s"}
                    </text>
                  </g>
                );
              })}

              <circle cx="500" cy="220" r="58" fill="url(#pump-token-glow)" />
              <circle cx="500" cy="220" r="36" fill="#071610" stroke="#14f195" strokeOpacity=".8" strokeWidth="2" />
              <text x="500" y="218" textAnchor="middle" className="fill-[#14f195] font-semibold text-[11px]">
                {symbol.slice(0, 10)}
              </text>
              <text x="500" y="235" textAnchor="middle" className="fill-white/45 text-[8px] uppercase tracking-[1.5px]">
                Token
              </text>
            </svg>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-white/45" aria-label="Trade map legend">
              <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#14f195]" />Buy activity</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#ff6482]" />Sell activity</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#93a4c6]" />Buys and sells</span>
              <p className="basis-full text-white/30">Links represent trades recorded for this token, not inferred relationships or insider status.</p>
            </div>

            {selectedTrader ? (
              <article className="rounded-xl border border-white/[0.08] bg-black/15 p-4" aria-label="Selected trader details">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35">Observed trader</p>
                    <a
                      href={`/scan?address=${encodeURIComponent(selectedTrader.address)}`}
                      className="mt-1 block break-all font-mono text-[11px] text-solana-blue hover:underline"
                    >
                      {selectedTrader.address}
                    </a>
                  </div>
                  <a
                    href={`https://solscan.io/token/${encodeURIComponent(mint)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-[10px] text-white/45 hover:text-white"
                  >
                    Explorer ↗
                  </a>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                  <Stat label="Trades" value={String(selectedTrader.trades.length)} />
                  <Stat label="SOL volume" value={`${selectedTrader.solVolume.toFixed(4)} SOL`} />
                  <Stat label="Buys" value={String(selectedTrader.buys)} />
                  <Stat label="Sells" value={String(selectedTrader.sells)} />
                </div>
                <ul className="mt-3 max-h-36 space-y-2 overflow-y-auto">
                  {selectedTrader.trades.slice(0, 6).map((trade, index) => (
                    <li key={trade.signature || `${trade.timestamp}-${index}`} className="flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2 text-[10px]">
                      <div className="min-w-0">
                        <a
                          href={`https://solscan.io/tx/${encodeURIComponent(trade.signature)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-solana-blue hover:underline"
                        >
                          {shortAddress(trade.signature)}
                        </a>
                        <p className="mt-0.5 text-white/35">
                          {trade.timestamp ? new Date(trade.timestamp * 1000).toLocaleString() : "Time unavailable"}
                        </p>
                      </div>
                      <span className={`shrink-0 font-mono ${trade.type === "buy" ? "text-[#14f195]" : "text-[#ff6482]"}`}>
                        {trade.type.toUpperCase()} · {trade.solAmount.toFixed(3)} SOL
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ) : null}
          </div>

          <p className="text-[10px] leading-5 text-white/30">
            {name} ({symbol}) · Flow is derived only from the loaded market trade records. A shared chart position does not imply coordination.
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
      <p className="text-[8px] uppercase tracking-[0.12em] text-white/35">{label}</p>
      <p className="mt-1 text-white/70">{value}</p>
    </div>
  );
}
