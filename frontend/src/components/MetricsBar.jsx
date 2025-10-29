import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import AnimatedNumber from './AnimatedNumber';

const MetricsBar = () => {
  const { priceData } = useWebSocket();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Convert WebSocket data to display format, fallback to empty array
  const displayData = Object.keys(priceData).length > 0 
    ? Object.entries(priceData).map(([symbol, data]) => ({
        symbol: data.symbol || symbol,
        name: symbol === 'BTCUSD' ? 'BTCUSD in INR' : (data.symbol || symbol), // Special case for BTCUSD
        price: data.price || 0,
        change: data.change_percent || 0,
        changePercent: data.change_percent || 0,
        direction: data.change_direction || 'up'
      }))
    : []; // Fallback to empty array when no data

  const TimeDisplay = () => (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white-700">
        {currentTime.toLocaleTimeString()}
      </span>
      <span className="text-xs text-gray-500">
        {currentTime.toLocaleDateString()}
      </span>
    </div>
  );

  return (
    <div className="border-b-2 border-bloomberg-primary font-mono" style={{ backgroundColor: '#121212' }}>
      {/* Desktop version */}
      <div className="hidden 2xl:flex items-center gap-6 px-4 py-1">
        {/* <TimeDisplay /> */}
        {displayData.map((etf, index) => (
          <div key={etf.symbol} className="flex items-center gap-2">
            <div className="flex flex-col">
              <span className="text-xs text-white-700">{etf.name}</span>
              <div className="flex items-center gap-2">
                <AnimatedNumber 
                  value={etf.price}
                  prefix={'₹'}
                  decimals={2}
                  className="text-sm font-bold text-white"
                  useIndianFormat={true}
                />
                <span className={`text-xs font-bold ${
                  etf.direction === 'up' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {etf.direction === 'up' ? '▲' : '▼'}
                  <AnimatedNumber 
                    value={Math.abs(etf.changePercent)}
                    suffix="%"
                    decimals={2}
                    className={etf.direction === 'up' ? 'text-green-500' : 'text-red-500'}
                  />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Mobile version - scrollable horizontal */}
      <div className="2xl:hidden overflow-x-auto scrollbar-hide px-3 py-2">
        <div className="flex items-center gap-4 min-w-max">
          {displayData.map((etf, index) => (
            <div key={etf.symbol} className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-[9px] text-white-700">{etf.name}</span>
                <div className="flex items-center gap-1.5">
                  <AnimatedNumber 
                    value={etf.price}
                    prefix={'₹'}
                    decimals={2}
                    className="text-[11px] font-bold text-white"
                    useIndianFormat={true}
                  />
                  <span className={`text-[9px] font-bold ${
                    etf.direction === 'up' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {etf.direction === 'up' ? '▲' : '▼'}
                    <AnimatedNumber 
                      value={Math.abs(etf.changePercent)}
                      suffix="%"
                      decimals={2}
                      className={etf.direction === 'up' ? 'text-green-500' : 'text-red-500'}
                    />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MetricsBar;