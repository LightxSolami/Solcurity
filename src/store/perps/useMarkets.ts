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
    price: '142.35',
    change24h: '+5.23%',
    volume24h: '$1.2B',
    openInterest: '$450M',
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
    price: '67420.50',
    change24h: '+2.15%',
    volume24h: '$2.8B',
    openInterest: '$1.2B',
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
    price: '3245.80',
    change24h: '+3.42%',
    volume24h: '$1.5B',
    openInterest: '$680M',
    fundingRate: '0.015%',
    maxLeverage: 20,
    tickSize: '0.01',
    lotSize: '0.001',
    minOrderSize: '0.01',
    isPerp: true,
  },
  {
    symbol: 'SOL-145-C-20241227',
    baseAsset: 'SOL',
    quoteAsset: 'USD',
    price: '8.45',
    change24h: '+12.5%',
    volume24h: '$45M',
    openInterest: '$12M',
    fundingRate: '0%',
    maxLeverage: 1,
    tickSize: '0.01',
    lotSize: '1',
    minOrderSize: '1',
    isPerp: false,
    expiry: 1735257600000,
  },
  {
    symbol: 'BTC-68000-P-20241227',
    baseAsset: 'BTC',
    quoteAsset: 'USD',
    price: '1250.00',
    change24h: '-8.2%',
    volume24h: '$89M',
    openInterest: '$25M',
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