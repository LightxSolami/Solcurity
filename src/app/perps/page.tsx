'use client';

import { useEffect } from 'react';
import { MarketSelector } from '@/components/perps/MarketSelector';
import { OrderBook } from '@/components/perps/OrderBook';
import { TradingInterface } from '@/components/perps/TradingInterface';
import { PositionPanel } from '@/components/perps/PositionPanel';
import { RecentTrades } from '@/components/perps/RecentTrades';
import { usePerpsMarkets } from '@/store/perps/useMarkets';
import { usePerpsOrderBook, subscribe, getOrderBook } from '@/store/perps/useOrderBook';

function PerpsAppShell() {
  const { markets, selectedMarket, selectMarket } = usePerpsMarkets();
  const orderBook = selectedMarket ? getOrderBook(selectedMarket) : undefined;

  useEffect(() => {
    if (selectedMarket) {
      const cleanup = subscribe(selectedMarket);
      return cleanup;
    }
  }, [selectedMarket]);

  return (
    <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      <aside className="w-full lg:w-72 bg-solana-dark/50 border-r border-white/10 flex flex-col">
        <MarketSelector 
          markets={markets} 
          selectedMarket={selectedMarket} 
          onSelect={selectMarket} 
        />
        
        <div className="flex-1 overflow-hidden">
          <OrderBook 
            market={selectedMarket} 
            bids={orderBook?.bids || []} 
            asks={orderBook?.asks || []} 
          />
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedMarket && (
          <TradingInterface market={selectedMarket} />
        )}
        
        <div className="flex-1 flex lg:flex-row overflow-hidden">
          <div className="w-full lg:w-1/2 border-r border-white/10 p-4 overflow-y-auto">
            <RecentTrades market={selectedMarket || ''} />
          </div>
          
          <div className="w-full lg:w-1/2 p-4 overflow-y-auto">
            <PositionPanel />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function PerpsPage() {
  return <PerpsAppShell />;
}