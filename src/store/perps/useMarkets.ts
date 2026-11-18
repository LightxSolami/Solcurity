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
  coingeckoId?: string;
  binanceSymbol?: string;
}

interface MarketState {
  markets: Market[];
  selectedMarket: string | null;
  isLoading: boolean;
  lastUpdated: number | null;
  selectMarket: (symbol: string) => void;
  updateMarket: (symbol: string, data: Partial<Market>) => void;
  updateAllMarkets: (data: Partial<Market>[]) => void;
  refreshPrices: () => Promise<void>;
}

const marketConfigs: Market[] = [
  {
    symbol: 'SOL-USD',
    baseAsset: 'SOL',
    quoteAsset: 'USD',
    price: '0',
    change24h: '0%',
    volume24h: '$0',
    openInterest: '$0',
    fundingRate: '0.012%',
    maxLeverage: 20,
    tickSize: '0.01',
    lotSize: '0.001',
    minOrderSize: '10',
    isPerp: true,
    coingeckoId: 'solana',
    binanceSymbol: 'SOLUSDT',
  },
  {
    symbol: 'BTC-USD',
    baseAsset: 'BTC',
    quoteAsset: 'USD',
    price: '0',
    change24h: '0%',
    volume24h: '$0',
    openInterest: '$0',
    fundingRate: '0.008%',
    maxLeverage: 25,
    tickSize: '0.1',
    lotSize: '0.0001',
    minOrderSize: '0.001',
    isPerp: true,
    coingeckoId: 'bitcoin',
    binanceSymbol: 'BTCUSDT',
  },
  {
    symbol: 'ETH-USD',
    baseAsset: 'ETH',
    quoteAsset: 'USD',
    price: '0',
    change24h: '0%',
    volume24h: '$0',
    openInterest: '$0',
    fundingRate: '0.015%',
    maxLeverage: 20,
    tickSize: '0.01',
    lotSize: '0.001',
    minOrderSize: '0.01',
    isPerp: true,
    coingeckoId: 'ethereum',
    binanceSymbol: 'ETHUSDT',
  },
  {
    symbol: 'SOL-250-C-20241227',
    baseAsset: 'SOL',
    quoteAsset: 'USD',
    price: '0',
    change24h: '0%',
    volume24h: '$0',
    openInterest: '$0',
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
    price: '0',
    change24h: '0%',
    volume24h: '$0',
    openInterest: '$0',
    fundingRate: '0%',
    maxLeverage: 1,
    tickSize: '0.1',
    lotSize: '1',
    minOrderSize: '1',
    isPerp: false,
    expiry: 1735257600000,
  },
];

interface CoinGeckoPrice {
  usd: number;
  usd_24h_change: number;
  usd_24h_vol: number;
}

interface BinanceTicker {
  price: number;
  priceChangePercent: number;
  volume: number;
}

async function fetchCoinGeckoPrices(ids: string[]): Promise<Record<string, CoinGeckoPrice>> {
  const idList = ids.join(',');
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${idList}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`,
    { next: { revalidate: 30 } }
  );
  if (!res.ok) throw new Error('CoinGecko fetch failed');
  return res.json();
}

async function fetchBinanceTickers(symbols: string[]): Promise<Record<string, BinanceTicker>> {
  const symbolList = symbols.join('","');
  const res = await fetch(
    `https://api.binance.com/api/v3/ticker/24hr?symbols=["${symbolList}"]`,
    { next: { revalidate: 30 } }
  );
  if (!res.ok) throw new Error('Binance fetch failed');
  const data = await res.json();
  const result: Record<string, { price: number; priceChangePercent: number; volume: number }> = {};
  for (const item of data) {
    result[item.symbol] = {
      price: parseFloat(item.lastPrice),
      priceChangePercent: parseFloat(item.priceChangePercent),
      volume: parseFloat(item.quoteVolume),
    };
  }
  return result;
}

function formatPrice(price: number, symbol: string): string {
  if (symbol.startsWith('BTC')) return price.toFixed(1);
  if (symbol.startsWith('SOL') || symbol.startsWith('ETH')) return price.toFixed(2);
  return price.toFixed(2);
}

function formatVolume(vol: number): string {
  if (vol >= 1e9) return `$${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `$${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `$${(vol / 1e3).toFixed(1)}K`;
  return `$${vol.toFixed(0)}`;
}

function formatOI(vol: number): string {
  return formatVolume(vol);
}

export const usePerpsMarkets = create<MarketState>()(
  persist(
    (set, get) => ({
      markets: marketConfigs,
      selectedMarket: 'SOL-USD',
      isLoading: true,
      lastUpdated: null,
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
      refreshPrices: async () => {
        const state = get();
        const markets = state.markets;
        
        const cgIds = markets.filter(m => m.coingeckoId).map(m => m.coingeckoId!);
        const binanceSymbols = markets.filter(m => m.binanceSymbol).map(m => m.binanceSymbol!);
        
        try {
          const [cgData, binanceData] = await Promise.all([
            cgIds.length > 0 ? fetchCoinGeckoPrices(cgIds) : Promise.resolve<Record<string, CoinGeckoPrice>>({}),
            binanceSymbols.length > 0 ? fetchBinanceTickers(binanceSymbols) : Promise.resolve<Record<string, BinanceTicker>>({}),
          ]);

          const updatedMarkets = markets.map(m => {
            let price = 0;
            let change24h = 0;
            let volume24h = 0;

            if (m.coingeckoId && cgData[m.coingeckoId]) {
              const data = cgData[m.coingeckoId];
              price = data.usd;
              change24h = data.usd_24h_change || 0;
              volume24h = data.usd_24h_vol || 0;
            } else if (m.binanceSymbol && binanceData[m.binanceSymbol]) {
              const data = binanceData[m.binanceSymbol];
              price = data.price;
              change24h = data.priceChangePercent;
              volume24h = data.volume;
            }

            if (price === 0) return m;

            return {
              ...m,
              price: formatPrice(price, m.symbol),
              change24h: `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`,
              volume24h: formatVolume(volume24h),
              openInterest: formatOI(volume24h * 0.3), // rough estimate
            };
          });

          set({ markets: updatedMarkets, isLoading: false, lastUpdated: Date.now() });
        } catch (error) {
          console.error('Price fetch failed:', error);
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'perps-markets-storage',
      partialize: (state) => ({ selectedMarket: state.selectedMarket }),
    }
  )
);

// Auto-refresh prices every 30 seconds
if (typeof window !== 'undefined') {
  const store = usePerpsMarkets.getState();
  store.refreshPrices();
  
  setInterval(() => {
    const store = usePerpsMarkets.getState();
    if (!store.isLoading) {
      store.refreshPrices();
    }
  }, 30000);
}