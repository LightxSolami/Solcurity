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

const generateMockOrderBook = (market: string, midPrice: number): OrderBookSnapshot => {
  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];
  
  for (let i = 0; i < 50; i++) {
    const bidPrice = midPrice * (1 - (i + 1) * 0.0005);
    const askPrice = midPrice * (1 + (i + 1) * 0.0005);
    const size = Math.random() * 1000 + 100;
    
    bids.push({
      price: bidPrice.toFixed(2),
      size: size.toFixed(3),
      orders: Math.floor(Math.random() * 10) + 1,
    });
    
    asks.push({
      price: askPrice.toFixed(2),
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
};

export const usePerpsOrderBook = create<OrderBookState>((set, get) => ({
  orderBooks: {},
  subscriptions: {},
  
  subscribe: (market) => {
    set((state) => {
      const count = (state.subscriptions[market] || 0) + 1;
      if (count === 1 && !state.orderBooks[market]) {
        const marketData = market.split('-');
        const midPrice = marketData[0] === 'SOL' ? 142.35 : marketData[0] === 'BTC' ? 67420.50 : 3245.80;
        return {
          subscriptions: { ...state.subscriptions, [market]: count },
          orderBooks: { ...state.orderBooks, [market]: generateMockOrderBook(market, midPrice) },
        };
      }
      return { subscriptions: { ...state.subscriptions, [market]: count } };
    });

    const interval = setInterval(() => {
      const state = get();
      if (state.subscriptions[market] > 0) {
        const currentBook = state.orderBooks[market];
        if (currentBook) {
          const midPrice = (parseFloat(currentBook.bids[0]?.price || '0') + parseFloat(currentBook.asks[0]?.price || '0')) / 2;
          const variation = (Math.random() - 0.5) * 0.002;
          const newMidPrice = midPrice * (1 + variation);
          
          const newBook = generateMockOrderBook(market, newMidPrice);
          set((s) => ({
            orderBooks: { ...s.orderBooks, [market]: { ...newBook, sequence: currentBook.sequence + 1 } },
          }));
        }
      }
    }, 1000);

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