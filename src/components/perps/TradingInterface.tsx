'use client';

import { useState } from 'react';
import { ChevronDown, Zap, AlertTriangle, Info } from 'lucide-react';
import { Market } from '@/store/perps/useMarkets';
import { usePerpsMarkets } from '@/store/perps/useMarkets';

interface TradingInterfaceProps {
  market: string;
}

export function TradingInterface({ market }: TradingInterfaceProps) {
  const { markets } = usePerpsMarkets();
  const marketData = markets.find(m => m.symbol === market);
  
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'limit' | 'market' | 'stop_limit' | 'stop_market'>('limit');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('');
  const [leverage, setLeverage] = useState(10);
  const [reduceOnly, setReduceOnly] = useState(false);
  const [postOnly, setPostOnly] = useState(false);
  const [triggerPrice, setTriggerPrice] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isBuy = side === 'buy';
  const isLimit = orderType === 'limit' || orderType === 'stop_limit';
  const isStop = orderType === 'stop_limit' || orderType === 'stop_market';
  const markPrice = marketData ? parseFloat(marketData.price) : 0;
  const tickSize = marketData ? parseFloat(marketData.tickSize) : 0.01;
  const lotSize = marketData ? parseFloat(marketData.lotSize) : 0.001;
  const minOrderSize = marketData ? parseFloat(marketData.minOrderSize) : 10;

  const notional = price && size ? parseFloat(price) * parseFloat(size) : 0;
  const marginRequired = notional / leverage;
  const estFee = notional * (isBuy ? 0.0005 : 0.0002);

  const handlePriceClick = (p: number) => {
    setPrice(p.toFixed(marketData?.symbol.startsWith('BTC') ? 1 : 2));
  };

  const handleSizePercent = (percent: number) => {
    const maxSize = 1000;
    setSize((maxSize * percent / 100).toFixed(3));
  };

  const validateForm = () => {
    if (!size || parseFloat(size) < minOrderSize) return false;
    if (isLimit && (!price || parseFloat(price) <= 0)) return false;
    if (isStop && (!triggerPrice || parseFloat(triggerPrice) <= 0)) return false;
    return true;
  };

  return (
    <div className="flex flex-col h-full bg-solana-dark/50">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              {marketData?.baseAsset}/{marketData?.quoteAsset}
              {marketData?.isPerp && <Zap className="w-4 h-4 text-yellow-400" />}
              {!marketData?.isPerp && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  Option
                </span>
              )}
            </h2>
            <p className="text-sm text-white/50 font-mono">
              Mark: ${markPrice.toLocaleString()} • Funding: {marketData?.fundingRate}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              className="px-2 py-1 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-solana-blue/50"
            >
              {[1, 2, 3, 5, 10, 20, 25, 50].map(l => (
                <option key={l} value={l}>{l}x</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-1 bg-white/5 rounded-lg p-1" role="tablist">
          {['buy', 'sell'].map(s => (
            <button
              key={s}
              role="tab"
              aria-selected={side === s}
              onClick={() => setSide(s as 'buy' | 'sell')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                side === s
                  ? s === 'buy' 
                    ? 'bg-green-500 text-white shadow-lg' 
                    : 'bg-red-500 text-white shadow-lg'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {s === 'buy' ? 'Long' : 'Short'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2" role="tablist">
          {['limit', 'market', 'stop_limit', 'stop_market'].map(type => (
            <button
              key={type}
              role="tab"
              aria-selected={orderType === type}
              onClick={() => setOrderType(type as typeof orderType)}
              className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                orderType === type
                  ? 'bg-solana-blue text-white'
                  : 'text-white/60 hover:bg-white/5'
              }`}
            >
              {type.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {isLimit && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                Limit Price <span className="text-solana-blue">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step={tickSize}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={`$${markPrice.toFixed(2)}`}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-solana-blue/50 focus:border-transparent font-mono text-base"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 font-mono">
                  ${tickSize} tick
                </div>
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {[-0.01, -0.005, 0, 0.005, 0.01].map(offset => (
                  <button
                    key={offset}
                    type="button"
                    onClick={() => handlePriceClick(markPrice * (1 + offset))}
                    className="px-2 py-1 text-xs rounded bg-white/5 text-white/60 hover:bg-solana-blue/20 hover:text-solana-blue transition-colors"
                  >
                    {offset >= 0 ? '+' : ''}{offset * 100}%
                  </button>
                ))}
              </div>
            </div>
          )}

          {isStop && (
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                Trigger Price <span className="text-solana-blue">*</span>
              </label>
              <input
                type="number"
                step={tickSize}
                value={triggerPrice}
                onChange={(e) => setTriggerPrice(e.target.value)}
                placeholder={`$${markPrice.toFixed(2)}`}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-solana-blue/50 focus:border-transparent font-mono text-base"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1">
              Size <span className="text-solana-blue">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step={lotSize}
                min={minOrderSize}
                value={size}
                onChange={(e) => setSize(e.target.value)}
                placeholder={`Min ${minOrderSize} ${marketData?.baseAsset}`}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-solana-blue/50 focus:border-transparent font-mono text-base"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 font-mono">
                {lotSize} lot
              </div>
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {[25, 50, 75, 100].map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSizePercent(p)}
                  className="px-3 py-1 text-xs rounded bg-white/5 text-white/60 hover:bg-solana-blue/20 hover:text-solana-blue transition-colors"
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs text-white/40 mb-1">Notional</label>
              <div className="font-mono text-sm text-white">
                ${notional.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Margin Req.</label>
              <div className="font-mono text-sm text-white">
                ${marginRequired.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1">Est. Fee</label>
              <div className="font-mono text-sm text-white">
                ${estFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-center gap-1 text-sm text-white/50 hover:text-white/90"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            Advanced Options
          </button>

          {showAdvanced && (
            <div className="space-y-3 animate-slide-down border-t border-white/10 pt-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={reduceOnly}
                  onChange={(e) => setReduceOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 text-solana-blue focus:ring-solana-blue/50"
                />
                <span className="text-sm text-white/80">Reduce Only</span>
                <Info className="w-3 h-3 text-white/30" />
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={postOnly}
                  onChange={(e) => setPostOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 text-solana-blue focus:ring-solana-blue/50"
                  disabled={orderType === 'market' || orderType === 'stop_market'}
                />
                <span className="text-sm text-white/80">Post Only</span>
                <Info className="w-3 h-3 text-white/30" />
              </label>
            </div>
          )}

          <button
            disabled={!validateForm()}
            className={`w-full py-3 rounded-lg font-medium text-base transition-all ${
              isBuy
                ? 'bg-green-500 text-white hover:bg-green-600 disabled:bg-green-500/30 disabled:cursor-not-allowed'
                : 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-500/30 disabled:cursor-not-allowed'
            }`}
          >
            {isBuy ? 'Open Long' : 'Open Short'}
          </button>

          <div className="flex items-center gap-2 text-xs text-white/40">
            <AlertTriangle className="w-3 h-3" />
            <span>Trading perpetuals and options involves significant risk. You may lose your entire collateral.</span>
          </div>
        </div>
      </div>
    </div>
  );
}