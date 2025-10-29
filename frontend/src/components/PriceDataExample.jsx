import React, { useEffect, useState } from 'react';
import { useSymbolPrice, usePriceData } from '../hooks/usePriceData';

/**
 * Example component showing how to use WebSocket price data
 * This demonstrates various ways to access and display real-time data
 */
const PriceDataExample = () => {
  const { getAllFormattedPrices, subscribeToPriceUpdates } = usePriceData();
  
  // Example: Track a specific symbol
  const niftybeesPrice = useSymbolPrice('NIFTYBEES');
  
  // Example: Track price changes with alerts
  const [priceAlerts, setPriceAlerts] = useState([]);

  useEffect(() => {
    // Example: Subscribe to NIFTYBEES price updates
    const unsubscribe = subscribeToPriceUpdates('NIFTYBEES', (priceData) => {
      if (priceData) {
        const alert = {
          id: Date.now(),
          symbol: priceData.symbol,
          price: priceData.formattedPrice,
          change: priceData.formattedChange,
          time: new Date().toLocaleTimeString(),
        };
        
        setPriceAlerts(prev => [alert, ...prev.slice(0, 4)]); // Keep last 5 alerts
      }
    });

    return unsubscribe;
  }, [subscribeToPriceUpdates]);

  const allPrices = getAllFormattedPrices();

  return (
    <div className="p-4 space-y-6">
      {/* Example 1: Display specific symbol */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-white font-bold mb-2">Specific Symbol Example (NIFTYBEES)</h3>
        {niftybeesPrice.isAvailable ? (
          <div className="text-white">
            <div>Price: {niftybeesPrice.formattedData?.formattedPrice}</div>
            <div className={niftybeesPrice.formattedData?.isPositive ? 'text-green-400' : 'text-red-400'}>
              Change: {niftybeesPrice.formattedData?.formattedChange}
            </div>
            <div className="text-sm text-gray-400">
              Fresh: {niftybeesPrice.isFresh ? 'Yes' : 'No'}
            </div>
          </div>
        ) : (
          <div className="text-gray-400">NIFTYBEES data not available</div>
        )}
      </div>

      {/* Example 2: Display all prices in a grid */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-white font-bold mb-2">All Symbols Grid</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {allPrices.map((price) => (
            <div key={price.symbol} className="bg-gray-700 p-2 rounded">
              <div className="text-white font-bold text-sm">{price.symbol}</div>
              <div className="text-white">{price.formattedPrice}</div>
              <div className={`text-sm ${price.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {price.formattedChange}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Example 3: Price alerts/updates */}
      <div className="bg-gray-800 p-4 rounded-lg">
        <h3 className="text-white font-bold mb-2">Recent Price Updates (NIFTYBEES)</h3>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {priceAlerts.map((alert) => (
            <div key={alert.id} className="text-sm text-gray-300 border-l-2 border-blue-500 pl-2">
              <span className="text-white">{alert.symbol}</span> - {alert.price} 
              <span className="ml-2 text-blue-400">{alert.change}</span>
              <span className="ml-2 text-gray-500">{alert.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PriceDataExample;