'use client';

import { OrderBookLevel } from '@/store/perps/useOrderBook';
import { useMemo } from 'react';

interface OrderBookProps {
  market: string | null;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export function OrderBook({ market, bids, asks }: OrderBookProps) {
  const maxBidSize = useMemo(() => Math.max(...bids.map(b => parseFloat(b.size)), 1), [bids]);
  const maxAskSize = useMemo(() => Math.max(...asks.map(a => parseFloat(a.size)), 1), [asks]);
  const maxSize = Math.max(maxBidSize, maxAskSize);

  const renderLevel = (level: OrderBookLevel, isBid: boolean, maxSize: number) => {
    const size = parseFloat(level.size);
    const width = Math.max((size / maxSize) * 100, 0);
    const intensity = Math.min(width / 100, 1);
    
    return (
      <div key={level.price} className="flex items-center gap-2 px-2 py-1.5 text-xs font-mono">
        <div 
          className={`h-5 rounded-l transition-all duration-300 ${
            isBid 
              ? 'bg-green-400' 
              : 'bg-red-400'
          }`} 
          style={{ 
            width: `${width}%`, 
            opacity: 0.15 + intensity * 0.3 
          }}
        />
        <span className={`w-20 text-right ${isBid ? 'text-green-400' : 'text-red-400'} font-medium`}>
          {parseFloat(level.price).toFixed(market?.startsWith('BTC') ? 1 : 2)}
        </span>
        <span className="w-16 text-right text-white/40">
          {parseFloat(level.size).toFixed(3)}
        </span>
        <span className="w-10 text-right text-white/30">
          {level.orders}
        </span>
      </div>
    );
  };

  if (!market) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        <p className="text-sm">Select a market to view order book</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-solana-dark/50 border-r border-white/10">
      <div className="px-3 py-2 border-b border-white/10">
        <h3 className="font-medium text-sm text-white flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-gradient-to-r from-green-400 to-red-400" />
          Order Book
        </h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-white/40 font-mono">
          <span className="w-20 text-right">Price</span>
          <span className="w-16 text-right">Size</span>
          <span className="w-10 text-right">Cnt</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-0.5">
          {asks.slice().reverse().map((level) => renderLevel(level, false, maxSize))}
        </div>
        
        <div className="h-2 bg-gradient-to-t from-solana-dark to-transparent my-1" />
        
        <div className="space-y-0.5">
          {bids.map((level) => renderLevel(level, true, maxSize))}
        </div>
      </div>

      <div className="px-3 py-2 border-t border-white/10 bg-solana-dark/30">
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>Spread: {asks[0] && bids[0] ? (parseFloat(asks[0].price) - parseFloat(bids[0].price)).toFixed(2) : '—'}</span>
          <span>Mid: {asks[0] && bids[0] ? ((parseFloat(asks[0].price) + parseFloat(bids[0].price)) / 2).toFixed(2) : '—'}</span>
        </div>
      </div>
    </div>
  );
}