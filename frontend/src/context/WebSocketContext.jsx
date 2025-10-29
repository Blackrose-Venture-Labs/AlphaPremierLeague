import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import websocketService from '../services/websocketService';

// Action types
const ACTION_TYPES = {
  SET_CONNECTION_STATUS: 'SET_CONNECTION_STATUS',
  UPDATE_PRICE_DATA: 'UPDATE_PRICE_DATA',
  UPDATE_MODEL_DATA: 'UPDATE_MODEL_DATA',
  UPDATE_MODEL_DATA_STREAM: 'UPDATE_MODEL_DATA_STREAM',
  SET_LAST_UPDATE: 'SET_LAST_UPDATE',
};

// Initial state
const initialState = {
  connectionStatus: 'disconnected', // 'connecting', 'connected', 'disconnected', 'error', 'partial'
  priceData: {},
  modelData: null,
  modelDataStream: null,
  lastUpdate: null,
  lastModelUpdate: null,
  lastModelDataStreamUpdate: null,
  timestamp: null,
  modelTimestamp: null,
  modelDataStreamTimestamp: null,
};

// Reducer function
const websocketReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.SET_CONNECTION_STATUS:
      return {
        ...state,
        connectionStatus: action.payload,
      };
    case ACTION_TYPES.UPDATE_PRICE_DATA:
      return {
        ...state,
        priceData: action.payload.data || {},
        timestamp: action.payload.timestamp,
        lastUpdate: new Date(),
      };
    case ACTION_TYPES.UPDATE_MODEL_DATA:
      return {
        ...state,
        modelData: action.payload,
        modelTimestamp: action.payload.timestamp || new Date().toISOString(),
        lastModelUpdate: new Date(),
      };
    case ACTION_TYPES.UPDATE_MODEL_DATA_STREAM:
      return {
        ...state,
        modelDataStream: action.payload,
        modelDataStreamTimestamp: action.payload.timestamp || new Date().toISOString(),
        lastModelDataStreamUpdate: new Date(),
      };
    case ACTION_TYPES.SET_LAST_UPDATE:
      return {
        ...state,
        lastUpdate: action.payload,
      };
    default:
      return state;
  }
};

// Create context
const WebSocketContext = createContext();

// Context provider component
export const WebSocketProvider = ({ children }) => {
  const [state, dispatch] = useReducer(websocketReducer, initialState);
  const unsubscribeRefs = useRef([]);

  // Set connection status
  const setConnectionStatus = (status) => {
    dispatch({ type: ACTION_TYPES.SET_CONNECTION_STATUS, payload: status });
  };

  // Update price data
  const updatePriceData = (data) => {
    dispatch({ type: ACTION_TYPES.UPDATE_PRICE_DATA, payload: data });
  };

  // Update model data
  const updateModelData = (data) => {
    dispatch({ type: ACTION_TYPES.UPDATE_MODEL_DATA, payload: data });
  };

  // Update model data stream
  const updateModelDataStream = (data) => {
    dispatch({ type: ACTION_TYPES.UPDATE_MODEL_DATA_STREAM, payload: data });
  };
  const getPriceForSymbol = (symbol) => {
    return state.priceData[symbol] || null;
  };

  // Get all available symbols
  const getAvailableSymbols = () => {
    return Object.keys(state.priceData);
  };

  // Check if a symbol exists in the price data
  const hasSymbol = (symbol) => {
    return symbol in state.priceData;
  };

  // Get connection status with more details
  const getConnectionInfo = () => {
    return {
      status: state.connectionStatus,
      isConnected: state.connectionStatus === 'connected',
      isPartiallyConnected: state.connectionStatus === 'partial',
      lastUpdate: state.lastUpdate,
      lastModelUpdate: state.lastModelUpdate,
      lastModelDataStreamUpdate: state.lastModelDataStreamUpdate,
      timestamp: state.timestamp,
      modelTimestamp: state.modelTimestamp,
      modelDataStreamTimestamp: state.modelDataStreamTimestamp,
      symbolCount: Object.keys(state.priceData).length,
      priceConnected: websocketService.isPriceConnected(),
      modelConnected: websocketService.isModelConnected(),
      modelDataConnected: websocketService.isModelDataConnected(),
    };
  };

  // Manually reconnect
  const reconnect = () => {
    websocketService.disconnect();
    setTimeout(() => {
      websocketService.connect();
    }, 100);
  };

  // Setup WebSocket subscriptions
  useEffect(() => {
    // Subscribe to price updates
    const unsubscribePrice = websocketService.subscribe((data) => {
      updatePriceData(data);
    });

    // Subscribe to model updates
    const unsubscribeModel = websocketService.subscribeToModelUpdates((data) => {
      updateModelData(data);
    });

    // Subscribe to model data stream updates
    const unsubscribeModelDataStream = websocketService.subscribeToModelDataStream((data) => {
      updateModelDataStream(data);
    });

    // Subscribe to connection status updates
    const unsubscribeConnection = websocketService.subscribeToConnection((status) => {
      setConnectionStatus(status);
    });

    // Store unsubscribe functions
    unsubscribeRefs.current = [unsubscribePrice, unsubscribeModel, unsubscribeModelDataStream, unsubscribeConnection];

    // Connect to WebSockets
    websocketService.connect();

    // Cleanup function
    return () => {
      // Unsubscribe from all listeners
      unsubscribeRefs.current.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      unsubscribeRefs.current = [];
      
      // Disconnect WebSockets
      websocketService.disconnect();
    };
  }, []);

  // Handle page visibility changes (reconnect when page becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible, ensure connections are active
        if (!websocketService.isPriceConnected()) {
          websocketService.connectPrice();
        }
        if (!websocketService.isModelConnected()) {
          websocketService.connectModel();
        }
        if (!websocketService.isModelDataConnected()) {
          websocketService.connectModelData();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      websocketService.connect();
    };

    const handleOffline = () => {
      // Browser went offline
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const value = {
    ...state,
    getPriceForSymbol,
    getAvailableSymbols,
    hasSymbol,
    getConnectionInfo,
    reconnect,
    websocketService, // Expose service for advanced usage
    // Model data access
    getModelData: () => state.modelData,
    getLastModelUpdate: () => state.lastModelUpdate,
    // Model data stream access
    getModelDataStream: () => state.modelDataStream,
    getLastModelDataStreamUpdate: () => state.lastModelDataStreamUpdate,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook to use the WebSocket context
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;