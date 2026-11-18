'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Trade {
  id: string;
  market: string;
  side: 'buy' | 'sell';
  price: number;
  size: number;
  timestamp: number;
}

const generateMockTrades = (market: string): Trade[] => {
  const basePrice = market.startsWith('SOL') ? 142 : market.startsWith('BTC') ? 67420 : 3245;
  return Array.from({ length: 50 }, (_, i) => ({
    id: `trade-${i}`,
    market,
    side: Math.random() > 0.5 ? 'buy' : 'sell',
    price: basePrice * (1 + (Math.random() - 0.5) * 0.002),
    size: Math.random() * 100 + 1,
    timestamp: Date.now() - i * 5000,
  }));
};

interface RecentTradesProps {
  market: string;
}

export function RecentTrades({ market }: RecentTradesProps) {
  const [trades] = useState<Trade[]>(() => market ? generateMockTrades(market) : []);

  const formatPrice = (price: number, symbol: string) => {
    if (symbol.startsWith('BTC')) return price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return price.toFixed(2);
  };

  if (!market || trades.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        <p className="text-sm">Select a market to see recent trades</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-solana-dark/50">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white">Recent Trades</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
            Live
          </span>
        </div>
      </div>

      <div className="overflow-x-auto flex-1 p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 sticky top-0 bg-solana-dark/80 z-10 backdrop-blur">
              <th className="px-3 py-2 text-left font-medium text-white/50">Time</th>
              <th className="px-3 py-2 text-right font-medium text-white/50">Price</th>
              <th className="px-3 py-2 text-right font-medium text-white/50">Size</th>
              <th className="px-3 py-2 text-center font-medium text-white/50 w-8">Side</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, i) => (
              <tr 
                key={trade.id} 
                className={`border-b border-white/5 ${i === 0 ? 'animate-fade-in' : ''}`}
                style={{ backgroundColor: i === 0 ? 'rgba(34, 197, 94, 0.05)' : 'transparent' }}
              >
                <td className="px-3 py-2 text-white/50 font-mono">
                  {formatDistanceToNow(new Date(trade.timestamp), { addSuffix: true })}
                </td>
                <td className="px-3 py-2 text-right font-mono font-medium text-white">
                  ${formatPrice(trade.price, market)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-white/60">
                  {trade.size.toFixed(3)}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-flex items-center justify-center w-16 px-1.5 py-0.5 rounded text-xs font-medium ${
                    trade.side === 'buy'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {trade.side === 'buy' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {trade.side.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}