import React, { useState } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { usePriceData, useConnectionStatus } from '../hooks/usePriceData';

const WebSocketDebugPanel = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { priceData, timestamp } = useWebSocket();
  const { getAllFormattedPrices } = usePriceData();
  const connectionStatus = useConnectionStatus();

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm z-50"
      >
        WebSocket Debug
      </button>
    );
  }

  const formattedPrices = getAllFormattedPrices();

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 border border-gray-600 text-white p-4 rounded-lg shadow-lg max-w-md w-full max-h-96 overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-lg">WebSocket Debug</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Connection Status */}
      <div className="mb-4 p-2 bg-gray-800 rounded">
        <h4 className="font-semibold mb-2">Connection Status</h4>
        <div className="text-sm space-y-1">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus.isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span>Status: {connectionStatus.status}</span>
          </div>
          <div>Symbols: {connectionStatus.symbolCount}</div>
          <div>Healthy: {connectionStatus.isHealthy ? 'Yes' : 'No'}</div>
          <div>Data Fresh: {connectionStatus.isDataFresh ? 'Yes' : 'No'}</div>
          {connectionStatus.lastUpdate && (
            <div>Last Update: {new Date(connectionStatus.lastUpdate).toLocaleTimeString()}</div>
          )}
          {timestamp && (
            <div>Server Time: {new Date(timestamp).toLocaleTimeString()}</div>
          )}
        </div>
        <button
          onClick={connectionStatus.reconnect}
          className="mt-2 bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
        >
          Reconnect
        </button>
      </div>

      {/* Raw Data */}
      <div className="mb-4 p-2 bg-gray-800 rounded">
        <h4 className="font-semibold mb-2">Raw Price Data</h4>
        <div className="text-xs bg-black p-2 rounded overflow-x-auto">
          <pre>{JSON.stringify(priceData, null, 2)}</pre>
        </div>
      </div>

      {/* Formatted Data */}
      <div className="p-2 bg-gray-800 rounded">
        <h4 className="font-semibold mb-2">Formatted Prices</h4>
        <div className="space-y-2 text-sm">
          {formattedPrices.length > 0 ? (
            formattedPrices.map((item) => (
              <div key={item.symbol} className="flex justify-between items-center">
                <span className="font-mono">{item.symbol}</span>
                <div className="text-right">
                  <div>{item.formattedPrice}</div>
                  <div className={`text-xs ${item.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {item.formattedChange}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-gray-400">No price data available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebSocketDebugPanel;