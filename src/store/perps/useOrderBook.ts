import { create } from 'zustand';

export interface OrderBookLevel {
  price: string;
  size: string;
  orders: number;
}

export interface OrderBookSnapshot {
  market: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
  sequence: number;
}

interface OrderBookState {
  orderBooks: Record<string, OrderBookSnapshot>;
  subscriptions: Record<string, number>;
  subscribe: (market: string) => () => void;
  unsubscribe: (market: string) => void;
  updateOrderBook: (market: string, data: OrderBookSnapshot) => void;
  getOrderBook: (market: string) => OrderBookSnapshot | undefined;
}

const getBinanceSymbol = (market: string): string | null => {
  const base = market.split('-')[0];
  if (base === 'SOL') return 'SOLUSDT';
  if (base === 'BTC') return 'BTCUSDT';
  if (base === 'ETH') return 'ETHUSDT';
  return null;
};

const getDecimals = (market: string): number => {
  if (market.startsWith('BTC')) return 1;
  return 2;
};

async function fetchBinanceDepth(symbol: string, limit = 50): Promise<{ bids: [string, string][]; asks: [string, string][] } | null> {
  try {
    const res = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=${limit}`, {
      next: { revalidate: 5 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function generateFallbackOrderBook(market: string, midPrice: number): OrderBookSnapshot {
  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];
  const decimals = getDecimals(market);
  
  for (let i = 0; i < 50; i++) {
    const bidPrice = midPrice * (1 - (i + 1) * 0.0005);
    const askPrice = midPrice * (1 + (i + 1) * 0.0005);
    const size = Math.random() * 1000 + 100;
    
    bids.push({
      price: bidPrice.toFixed(decimals),
      size: size.toFixed(3),
      orders: Math.floor(Math.random() * 10) + 1,
    });
    
    asks.push({
      price: askPrice.toFixed(decimals),
      size: size.toFixed(3),
      orders: Math.floor(Math.random() * 10) + 1,
    });
  }

  return {
    market,
    bids: bids.sort((a, b) => parseFloat(b.price) - parseFloat(a.price)),
    asks: asks.sort((a, b) => parseFloat(a.price) - parseFloat(b.price)),
    timestamp: Date.now(),
    sequence: Math.floor(Math.random() * 1000000),
  };
}

export const usePerpsOrderBook = create<OrderBookState>((set, get) => ({
  orderBooks: {},
  subscriptions: {},
  
  subscribe: (market) => {
    const symbol = getBinanceSymbol(market);
    
    const initBook = async () => {
      let book: OrderBookSnapshot;
      
      if (symbol) {
        const depth = await fetchBinanceDepth(symbol);
        if (depth) {
          const decimals = getDecimals(market);
          book = {
            market,
            bids: depth.bids.map(([price, size]) => ({
              price: parseFloat(price).toFixed(decimals),
              size: parseFloat(size).toFixed(3),
              orders: 1,
            })),
            asks: depth.asks.map(([price, size]) => ({
              price: parseFloat(price).toFixed(decimals),
              size: parseFloat(size).toFixed(3),
              orders: 1,
            })),
            timestamp: Date.now(),
            sequence: 1,
          };
        } else {
          const midPrice = symbol === 'SOLUSDT' ? 234 : symbol === 'BTCUSDT' ? 96840 : 3642;
          book = generateFallbackOrderBook(market, midPrice);
        }
      } else {
        const midPrice = market.startsWith('SOL') ? 234 : market.startsWith('BTC') ? 96840 : 3642;
        book = generateFallbackOrderBook(market, midPrice);
      }
      
      set((state) => ({
        orderBooks: { ...state.orderBooks, [market]: book },
        subscriptions: { ...state.subscriptions, [market]: (state.subscriptions[market] || 0) + 1 },
      }));
    };
    
    initBook();

    const interval = setInterval(async () => {
      const state = get();
      if (state.subscriptions[market] > 0) {
        const symbol = getBinanceSymbol(market);
        if (symbol) {
          const depth = await fetchBinanceDepth(symbol);
          if (depth) {
            const decimals = getDecimals(market);
            const currentBook = state.orderBooks[market];
            const newBook: OrderBookSnapshot = {
              market,
              bids: depth.bids.map(([price, size]) => ({
                price: parseFloat(price).toFixed(decimals),
                size: parseFloat(size).toFixed(3),
                orders: 1,
              })),
              asks: depth.asks.map(([price, size]) => ({
                price: parseFloat(price).toFixed(decimals),
                size: parseFloat(size).toFixed(3),
                orders: 1,
              })),
              timestamp: Date.now(),
              sequence: (currentBook?.sequence || 0) + 1,
            };
            set((s) => ({
              orderBooks: { ...s.orderBooks, [market]: newBook },
            }));
          }
        } else {
          // Fallback simulation
          const currentBook = state.orderBooks[market];
          if (currentBook) {
            const midPrice = (parseFloat(currentBook.bids[0]?.price || '0') + parseFloat(currentBook.asks[0]?.price || '0')) / 2;
            const variation = (Math.random() - 0.5) * 0.002;
            const newMidPrice = midPrice * (1 + variation);
            const newBook = generateFallbackOrderBook(market, newMidPrice);
            newBook.sequence = (currentBook.sequence || 0) + 1;
            set((s) => ({
              orderBooks: { ...s.orderBooks, [market]: newBook },
            }));
          }
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  },
  
  unsubscribe: (market) => {
    set((state) => {
      const count = Math.max(0, (state.subscriptions[market] || 1) - 1);
      return {
        subscriptions: { ...state.subscriptions, [market]: count },
      };
    });
  },
  
  updateOrderBook: (market, data) =>
    set((state) => ({
      orderBooks: { ...state.orderBooks, [market]: data },
    })),
  
  getOrderBook: (market) => get().orderBooks[market],
}));

export const subscribe = (market: string) => usePerpsOrderBook.getState().subscribe(market);
export const unsubscribe = (market: string) => usePerpsOrderBook.getState().unsubscribe(market);
export const getOrderBook = (market: string) => usePerpsOrderBook.getState().getOrderBook(market);