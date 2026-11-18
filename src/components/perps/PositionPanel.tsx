'use client';

import { useState } from 'react';
import { X, TrendingUp, TrendingDown, Zap } from 'lucide-react';

interface Position {
  id: string;
  market: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  liquidationPrice: number;
  margin: number;
}

const mockPositions: Position[] = [
  {
    id: '1',
    market: 'SOL-USD',
    side: 'long',
    size: 50.5,
    entryPrice: 138.20,
    markPrice: 142.35,
    leverage: 10,
    unrealizedPnl: 209.08,
    unrealizedPnlPct: 3.01,
    liquidationPrice: 124.38,
    margin: 698.50,
  },
  {
    id: '2',
    market: 'BTC-USD',
    side: 'short',
    size: 0.25,
    entryPrice: 68200,
    markPrice: 67420.50,
    leverage: 5,
    unrealizedPnl: 194.88,
    unrealizedPnlPct: 1.14,
    liquidationPrice: 71610,
    margin: 3410,
  },
];

export function PositionPanel() {
  const [positions] = useState<Position[]>(mockPositions);

  const formatPnl = (pnl: number, pct: number) => (
    <span className={`font-mono font-medium ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
      {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({pnl >= 0 ? '+' : ''}{pct.toFixed(2)}%)
    </span>
  );

  const formatPrice = (price: number, symbol: string) => {
    if (symbol.startsWith('BTC')) return price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    if (symbol.startsWith('SOL')) return price.toFixed(2);
    return price.toFixed(2);
  };

  if (positions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-white/40 p-8">
        <Zap className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm">No open positions</p>
        <p className="text-xs mt-1">Open a position to see it here</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-solana-dark/50">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Positions</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-solana-blue/20 text-solana-blue">
            {positions.length} active
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="px-3 py-2 text-left font-medium text-white/50">Market</th>
              <th className="px-3 py-2 text-right font-medium text-white/50">Side</th>
              <th className="px-3 py-2 text-right font-medium text-white/50">Size</th>
              <th className="px-3 py-2 text-right font-medium text-white/50">Entry</th>
              <th className="px-3 py-2 text-right font-medium text-white/50">Mark</th>
              <th className="px-3 py-2 text-right font-medium text-white/50">PnL</th>
              <th className="px-3 py-2 text-right font-medium text-white/50">Liq. Price</th>
              <th className="px-3 py-2 text-right font-medium text-white/50 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {positions.map(pos => (
              <tr key={pos.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-3 py-3 font-mono font-medium text-white">
                  {pos.market}
                </td>
                <td className="px-3 py-3 text-right">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    pos.side === 'long' 
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {pos.side === 'long' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {pos.side.toUpperCase()} {pos.leverage}x
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-mono text-white">
                  {pos.size.toLocaleString()}
                </td>
                <td className="px-3 py-3 text-right font-mono text-white/60">
                  ${formatPrice(pos.entryPrice, pos.market)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-white">
                  ${formatPrice(pos.markPrice, pos.market)}
                </td>
                <td className="px-3 py-3 text-right">
                  {formatPnl(pos.unrealizedPnl, pos.unrealizedPnlPct)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-white/40">
                  ${formatPrice(pos.liquidationPrice, pos.market)}
                </td>
                <td className="px-3 py-3 text-right">
                  <button className="p-1 text-white/40 hover:text-red-400 transition-colors" aria-label="Close position">
                    <X className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-white/10 bg-solana-dark/30">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-white/40">Total Margin</p>
            <p className="font-mono font-medium text-white">
              ${positions.reduce((sum, p) => sum + p.margin, 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/40">Unrealized PnL</p>
            <p className="font-mono font-medium text-green-400">
              +${positions.reduce((sum, p) => sum + p.unrealizedPnl, 0).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/40">ROE</p>
            <p className="font-mono font-medium text-green-400">
              {((positions.reduce((sum, p) => sum + p.unrealizedPnl, 0) / positions.reduce((sum, p) => sum + p.margin, 0)) * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}