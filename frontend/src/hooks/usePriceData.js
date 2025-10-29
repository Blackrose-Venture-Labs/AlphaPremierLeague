import { useWebSocket } from '../context/WebSocketContext';

/**
 * Custom hook for accessing real-time price data
 * Provides convenient methods to work with WebSocket price updates
 */
export const usePriceData = () => {
  const {
    priceData,
    connectionStatus,
    lastUpdate,
    timestamp,
    getPriceForSymbol,
    getAvailableSymbols,
    hasSymbol,
    getConnectionInfo,
    reconnect,
  } = useWebSocket();

  /**
   * Get formatted price data for display
   * @param {string} symbol - The ticker symbol
   * @returns {Object|null} Formatted price object or null
   */
  const getFormattedPrice = (symbol) => {
    const data = getPriceForSymbol(symbol);
    if (!data) return null;

    return {
      symbol: data.symbol,
      price: data.price,
      changePercent: data.change_percent,
      direction: data.change_direction,
      formattedPrice: `₹${data.price.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })}`,
      formattedChange: `${data.change_direction === 'up' ? '▲' : '▼'}${Math.abs(data.change_percent).toFixed(2)}%`,
      isPositive: data.change_direction === 'up',
      timestamp: timestamp,
    };
  };

  /**
   * Get all formatted price data
   * @returns {Array} Array of formatted price objects
   */
  const getAllFormattedPrices = () => {
    return getAvailableSymbols().map(symbol => ({
      ...getFormattedPrice(symbol),
      symbol,
    })).filter(Boolean);
  };

  /**
   * Check if price data is fresh (updated within last 30 seconds)
   * @returns {boolean} True if data is fresh
   */
  const isDataFresh = () => {
    if (!lastUpdate) return false;
    return (Date.now() - new Date(lastUpdate).getTime()) < 30000; // 30 seconds
  };

  /**
   * Get connection status with additional information
   * @returns {Object} Connection status object
   */
  const getConnectionStatus = () => {
    return {
      ...getConnectionInfo(),
      isDataFresh: isDataFresh(),
    };
  };

  /**
   * Subscribe to price updates for a specific symbol
   * @param {string} symbol - The ticker symbol to watch
   * @param {Function} callback - Callback function to receive updates
   * @returns {Function} Unsubscribe function
   */
  const subscribeToPriceUpdates = (symbol, callback) => {
    let lastPrice = null;

    const checkForUpdates = () => {
      const currentPrice = getPriceForSymbol(symbol);
      if (currentPrice && JSON.stringify(currentPrice) !== JSON.stringify(lastPrice)) {
        lastPrice = currentPrice;
        callback(getFormattedPrice(symbol));
      }
    };

    // Initial call
    checkForUpdates();

    // Set up interval to check for updates
    const interval = setInterval(checkForUpdates, 1000);

    return () => clearInterval(interval);
  };

  return {
    // Raw data
    priceData,
    connectionStatus,
    lastUpdate,
    timestamp,
    
    // Helper methods
    getPriceForSymbol,
    getFormattedPrice,
    getAllFormattedPrices,
    getAvailableSymbols,
    hasSymbol,
    getConnectionStatus,
    isDataFresh,
    subscribeToPriceUpdates,
    reconnect,
  };
};

/**
 * Custom hook for tracking a specific symbol's price
 * @param {string} symbol - The ticker symbol to track
 * @returns {Object} Price data and status for the symbol
 */
export const useSymbolPrice = (symbol) => {
  const { getPriceForSymbol, getFormattedPrice, hasSymbol, isDataFresh } = usePriceData();

  const rawData = getPriceForSymbol(symbol);
  const formattedData = getFormattedPrice(symbol);

  return {
    rawData,
    formattedData,
    exists: hasSymbol(symbol),
    isAvailable: !!rawData,
    isFresh: isDataFresh(),
  };
};

/**
 * Custom hook for connection monitoring
 * @returns {Object} Connection status and controls
 */
export const useConnectionStatus = () => {
  const { getConnectionStatus, reconnect } = usePriceData();
  const status = getConnectionStatus();

  return {
    ...status,
    reconnect,
    isHealthy: status.isConnected && status.isDataFresh,
  };
};