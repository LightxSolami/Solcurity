'use client';

import { Search, ChevronDown, Zap, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Market } from '@/store/perps/useMarkets';

interface MarketSelectorProps {
  markets: Market[];
  selectedMarket: string | null;
  onSelect: (symbol: string) => void;
}

export function MarketSelector({ markets, selectedMarket, onSelect }: MarketSelectorProps) {
  const [search, setSearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    perps: true,
    options: true,
  });

  const filteredMarkets = markets.filter((m) =>
    m.symbol.toLowerCase().includes(search.toLowerCase()) ||
    m.baseAsset.toLowerCase().includes(search.toLowerCase())
  );

  const perps = filteredMarkets.filter((m) => m.isPerp);
  const options = filteredMarkets.filter((m) => !m.isPerp);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const formatChange = (change: string) => {
    const isPositive = change.startsWith('+');
    return (
      <span className={`font-mono text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {change}
      </span>
    );
  };

  const renderMarketRow = (market: Market, isSelected: boolean) => (
    <button
      key={market.symbol}
      onClick={() => onSelect(market.symbol)}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
        isSelected
          ? 'bg-solana-blue/10 text-solana-blue'
          : 'text-white/60 hover:bg-white/5 hover:text-white/90'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="font-medium font-mono text-sm truncate">{market.baseAsset}</span>
          <span className="text-white/30 text-xs">/</span>
          <span className="font-medium font-mono text-sm truncate">{market.quoteAsset}</span>
        </div>
        {!market.isPerp && market.expiry && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
            {new Date(market.expiry).toLocaleDateString()}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3 ml-2">
        <span className="font-mono text-sm font-medium text-right w-20 text-white">
          ${parseFloat(market.price).toLocaleString()}
        </span>
        {formatChange(market.change24h)}
        {isSelected && <ChevronRight className="w-4 h-4 text-solana-blue" />}
      </div>
    </button>
  );

  const renderCategory = (title: string, icon: React.ReactNode, markets: Market[], categoryKey: string) => {
    if (markets.length === 0) return null;
    
    return (
      <div className="border-t border-white/10 pt-3 first:border-0 first:pt-0">
        <button
          onClick={() => toggleCategory(categoryKey)}
          className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-white/50 hover:text-white/90"
        >
          <div className="flex items-center gap-2">
            {icon}
            <span>{title}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 text-white/40">
              {markets.length}
            </span>
          </div>
          <ChevronDown 
            className={`w-4 h-4 transition-transform ${expandedCategories[categoryKey] ? 'rotate-180' : ''}`}
          />
        </button>
        
        {expandedCategories[categoryKey] && (
          <div className="mt-1 space-y-1 animate-slide-down">
            {markets.map((market) => renderMarketRow(market, market.symbol === selectedMarket))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-solana-dark/50 border-r border-white/10">
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search markets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-solana-blue/50 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {renderCategory(
          'Perpetuals',
          <Zap className="w-4 h-4 text-yellow-400" />,
          perps,
          'perps'
        )}
        {renderCategory(
          'Options',
          <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>,
          options,
          'options'
        )}
      </div>
    </div>
  );
}