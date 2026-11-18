import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Market {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: string;
  change24h: string;
  volume24h: string;
  openInterest: string;
  fundingRate: string;
  maxLeverage: number;
  tickSize: string;
  lotSize: string;
  minOrderSize: string;
  isPerp: boolean;
  expiry?: number;
}

interface MarketState {
  markets: Market[];
  selectedMarket: string | null;
  selectMarket: (symbol: string) => void;
  updateMarket: (symbol: string, data: Partial<Market>) => void;
  updateAllMarkets: (data: Partial<Market>[]) => void;
}

const mockMarkets: Market[] = [
  {
    symbol: 'SOL-USD',
    baseAsset: 'SOL',
    quoteAsset: 'USD',
    price: '234.50',
    change24h: '+8.42%',
    volume24h: '$2.1B',
    openInterest: '$890M',
    fundingRate: '0.012%',
    maxLeverage: 20,
    tickSize: '0.01',
    lotSize: '0.001',
    minOrderSize: '10',
    isPerp: true,
  },
  {
    symbol: 'BTC-USD',
    baseAsset: 'BTC',
    quoteAsset: 'USD',
    price: '96840.30',
    change24h: '+1.23%',
    volume24h: '$18.5B',
    openInterest: '$3.2B',
    fundingRate: '0.008%',
    maxLeverage: 25,
    tickSize: '0.1',
    lotSize: '0.0001',
    minOrderSize: '0.001',
    isPerp: true,
  },
  {
    symbol: 'ETH-USD',
    baseAsset: 'ETH',
    quoteAsset: 'USD',
    price: '3642.15',
    change24h: '+2.67%',
    volume24h: '$8.2B',
    openInterest: '$1.4B',
    fundingRate: '0.015%',
    maxLeverage: 20,
    tickSize: '0.01',
    lotSize: '0.001',
    minOrderSize: '0.01',
    isPerp: true,
  },
  {
    symbol: 'SOL-250-C-20241227',
    baseAsset: 'SOL',
    quoteAsset: 'USD',
    price: '12.30',
    change24h: '+15.2%',
    volume24h: '$67M',
    openInterest: '$18M',
    fundingRate: '0%',
    maxLeverage: 1,
    tickSize: '0.01',
    lotSize: '1',
    minOrderSize: '1',
    isPerp: false,
    expiry: 1735257600000,
  },
  {
    symbol: 'BTC-98000-P-20241227',
    baseAsset: 'BTC',
    quoteAsset: 'USD',
    price: '2100.00',
    change24h: '-5.4%',
    volume24h: '$120M',
    openInterest: '$35M',
    fundingRate: '0%',
    maxLeverage: 1,
    tickSize: '0.1',
    lotSize: '1',
    minOrderSize: '1',
    isPerp: false,
    expiry: 1735257600000,
  },
];

export const usePerpsMarkets = create<MarketState>()(
  persist(
    (set, get) => ({
      markets: mockMarkets,
      selectedMarket: 'SOL-USD',
      selectMarket: (symbol) => set({ selectedMarket: symbol }),
      updateMarket: (symbol, data) =>
        set((state) => ({
          markets: state.markets.map((m) =>
            m.symbol === symbol ? { ...m, ...data } : m
          ),
        })),
      updateAllMarkets: (data) =>
        set((state) => ({
          markets: state.markets.map((m, i) =>
            data[i] ? { ...m, ...data[i] } : m
          ),
        })),
    }),
    {
      name: 'perps-markets-storage',
      partialize: (state) => ({ selectedMarket: state.selectedMarket }),
    }
  )
);

// Price simulation for live feel
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = usePerpsMarkets.getState();
    const updatedMarkets = state.markets.map(m => {
      const variation = (Math.random() - 0.5) * 0.003; // ±0.3%
      const newPrice = parseFloat(m.price) * (1 + variation);
      const change24h = parseFloat(m.change24h.replace('%', '')) + (Math.random() - 0.5) * 0.2;
      return {
        ...m,
        price: newPrice.toFixed(m.symbol.startsWith('BTC') ? 1 : 2),
        change24h: `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`,
      };
    });
    usePerpsMarkets.setState({ markets: updatedMarkets });
  }, 5000);
}