class WebSocketService {
  constructor() {
    // Price stream WebSocket
    this.priceWs = null;
    this.priceUrl = 'wss://api.alphaarena.in/api/v1/ws/price-stream';
    this.priceReconnectTimer = null;
    this.priceIsConnecting = false;
    this.priceListeners = new Set();
    this.lastPriceData = null;
    
    // Model updates WebSocket
    this.modelWs = null;
    this.modelUrl = 'wss://api.alphaarena.in/api/v1/ws/model-updates';
    this.modelReconnectTimer = null;
    this.modelIsConnecting = false;
    this.modelListeners = new Set();
    this.lastModelData = null;

    // Model data stream WebSocket
    this.modelDataWs = null;
    this.modelDataUrl = 'wss://api.alphaarena.in/api/v1/ws/modeldata-stream';
    this.modelDataReconnectTimer = null;
    this.modelDataIsConnecting = false;
    this.modelDataListeners = new Set();
    this.lastModelDataStreamData = null;
    
    // Shared connection listeners
    this.connectionListeners = new Set();
    this.reconnectInterval = 5000; // 5 seconds
    
    // Bind methods to preserve 'this' context
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.connectPrice = this.connectPrice.bind(this);
    this.connectModel = this.connectModel.bind(this);
    this.connectModelData = this.connectModelData.bind(this);
    this.disconnectPrice = this.disconnectPrice.bind(this);
    this.disconnectModel = this.disconnectModel.bind(this);
    this.disconnectModelData = this.disconnectModelData.bind(this);
  }

  /**
   * Establish all WebSocket connections
   */
  connect() {
    this.connectPrice();
    this.connectModel();
    this.connectModelData();
  }

  /**
   * Establish Price Stream WebSocket connection
   */
  connectPrice() {
    if (this.priceIsConnecting || (this.priceWs && this.priceWs.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.priceWs && this.priceWs.readyState === WebSocket.OPEN) {
      return;
    }

    this.priceIsConnecting = true;
    
    try {
      this.priceWs = new WebSocket(this.priceUrl);
      
      this.priceWs.onopen = () => this.handlePriceOpen();
      this.priceWs.onmessage = (event) => this.handlePriceMessage(event);
      this.priceWs.onclose = (event) => this.handlePriceClose(event);
      this.priceWs.onerror = (error) => this.handlePriceError(error);
    } catch (error) {
      console.error('Failed to create Price WebSocket connection:', error);
      this.priceIsConnecting = false;
      this.schedulePriceReconnect();
    }
  }

  /**
   * Establish Model Updates WebSocket connection
   */
  connectModel() {
    if (this.modelIsConnecting || (this.modelWs && this.modelWs.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.modelWs && this.modelWs.readyState === WebSocket.OPEN) {
      return;
    }

    this.modelIsConnecting = true;
    
    try {
      this.modelWs = new WebSocket(this.modelUrl);
      
      this.modelWs.onopen = () => this.handleModelOpen();
      this.modelWs.onmessage = (event) => this.handleModelMessage(event);
      this.modelWs.onclose = (event) => this.handleModelClose(event);
      this.modelWs.onerror = (error) => this.handleModelError(error);
    } catch (error) {
      console.error('Failed to create Model Updates WebSocket connection:', error);
      this.modelIsConnecting = false;
      this.scheduleModelReconnect();
    }
  }

  /**
   * Establish Model Data Stream WebSocket connection
   */
  connectModelData() {
    if (this.modelDataIsConnecting || (this.modelDataWs && this.modelDataWs.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.modelDataWs && this.modelDataWs.readyState === WebSocket.OPEN) {
      return;
    }

    this.modelDataIsConnecting = true;
    
    try {
      this.modelDataWs = new WebSocket(this.modelDataUrl);
      
      this.modelDataWs.onopen = () => this.handleModelDataOpen();
      this.modelDataWs.onmessage = (event) => this.handleModelDataMessage(event);
      this.modelDataWs.onclose = (event) => this.handleModelDataClose(event);
      this.modelDataWs.onerror = (error) => this.handleModelDataError(error);
    } catch (error) {
      console.error('Failed to create Model Data Stream WebSocket connection:', error);
      this.modelDataIsConnecting = false;
      this.scheduleModelDataReconnect();
    }
  }

  /**
   * Disconnect all WebSocket connections
   */
  disconnect() {
    this.disconnectPrice();
    this.disconnectModel();
    this.disconnectModelData();
  }

  /**
   * Disconnect Price WebSocket
   */
  disconnectPrice() {
    if (this.priceReconnectTimer) {
      clearTimeout(this.priceReconnectTimer);
      this.priceReconnectTimer = null;
    }
    
    if (this.priceWs) {
      this.priceWs.onopen = null;
      this.priceWs.onmessage = null;
      this.priceWs.onclose = null;
      this.priceWs.onerror = null;
      
      if (this.priceWs.readyState === WebSocket.OPEN || this.priceWs.readyState === WebSocket.CONNECTING) {
        this.priceWs.close();
      }
      
      this.priceWs = null;
    }
    
    this.priceIsConnecting = false;
    this.notifyConnectionListeners(this.getOverallConnectionStatus());
  }

  /**
   * Disconnect Model Updates WebSocket
   */
  disconnectModel() {
    if (this.modelReconnectTimer) {
      clearTimeout(this.modelReconnectTimer);
      this.modelReconnectTimer = null;
    }
    
    if (this.modelWs) {
      this.modelWs.onopen = null;
      this.modelWs.onmessage = null;
      this.modelWs.onclose = null;
      this.modelWs.onerror = null;
      
      if (this.modelWs.readyState === WebSocket.OPEN || this.modelWs.readyState === WebSocket.CONNECTING) {
        this.modelWs.close();
      }
      
      this.modelWs = null;
    }
    
    this.modelIsConnecting = false;
    this.notifyConnectionListeners(this.getOverallConnectionStatus());
  }

  /**
   * Disconnect Model Data Stream WebSocket
   */
  disconnectModelData() {
    if (this.modelDataReconnectTimer) {
      clearTimeout(this.modelDataReconnectTimer);
      this.modelDataReconnectTimer = null;
    }
    
    if (this.modelDataWs) {
      this.modelDataWs.onopen = null;
      this.modelDataWs.onmessage = null;
      this.modelDataWs.onclose = null;
      this.modelDataWs.onerror = null;
      
      if (this.modelDataWs.readyState === WebSocket.OPEN || this.modelDataWs.readyState === WebSocket.CONNECTING) {
        this.modelDataWs.close();
      }
      
      this.modelDataWs = null;
    }
    
    this.modelDataIsConnecting = false;
    this.notifyConnectionListeners(this.getOverallConnectionStatus());
  }
  /**
   * Handle Price WebSocket open event
   */
  handlePriceOpen() {
    this.priceIsConnecting = false;
    
    // Clear any pending reconnection attempts
    if (this.priceReconnectTimer) {
      clearTimeout(this.priceReconnectTimer);
      this.priceReconnectTimer = null;
    }
    
    this.notifyConnectionListeners(this.getOverallConnectionStatus());
  }

  /**
   * Handle Model Updates WebSocket open event
   */
  handleModelOpen() {
    this.modelIsConnecting = false;
    
    // Clear any pending reconnection attempts
    if (this.modelReconnectTimer) {
      clearTimeout(this.modelReconnectTimer);
      this.modelReconnectTimer = null;
    }
    
    this.notifyConnectionListeners(this.getOverallConnectionStatus());
  }

  /**
   * Handle Model Data Stream WebSocket open event
   */
  handleModelDataOpen() {
    this.modelDataIsConnecting = false;
    
    // Clear any pending reconnection attempts
    if (this.modelDataReconnectTimer) {
      clearTimeout(this.modelDataReconnectTimer);
      this.modelDataReconnectTimer = null;
    }
    
    this.notifyConnectionListeners(this.getOverallConnectionStatus());
  }

  /**
   * Handle incoming Price WebSocket messages
   */
  handlePriceMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'price_update' && data.data) {
        this.lastPriceData = data;
        this.notifyPriceListeners(data);
      }
    } catch (error) {
      console.error('Failed to parse Price WebSocket message:', error);
    }
  }

  /**
   * Handle incoming Model Updates WebSocket messages
   */
  handleModelMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      this.lastModelData = data;
      this.notifyModelListeners(data);
    } catch (error) {
      console.error('Failed to parse Model Updates WebSocket message:', error);
    }
  }

  /**
   * Handle incoming Model Data Stream WebSocket messages
   */
  handleModelDataMessage(event) {
    try {
      const data = JSON.parse(event.data);
      
      this.lastModelDataStreamData = data;
      this.notifyModelDataListeners(data);
    } catch (error) {
      console.error('Failed to parse Model Data Stream WebSocket message:', error);
    }
  }
  handlePriceClose(event) {
    this.priceIsConnecting = false;
    this.priceWs = null;
    
    this.notifyConnectionListeners(this.getOverallConnectionStatus());
    
    // Don't reconnect if it was a clean close (code 1000) initiated by us
    if (event.code !== 1000) {
      this.schedulePriceReconnect();
    }
  }

  /**
   * Handle Model Updates WebSocket close event
   */
  handleModelClose(event) {
    this.modelIsConnecting = false;
    this.modelWs = null;
    
    this.notifyConnectionListeners(this.getOverallConnectionStatus());
    
    // Don't reconnect if it was a clean close (code 1000) initiated by us
    if (event.code !== 1000) {
      this.scheduleModelReconnect();
    }
  }

  /**
   * Handle Model Data Stream WebSocket close event
   */
  handleModelDataClose(event) {
    this.modelDataIsConnecting = false;
    this.modelDataWs = null;
    
    this.notifyConnectionListeners(this.getOverallConnectionStatus());
    
    // Don't reconnect if it was a clean close (code 1000) initiated by us
    if (event.code !== 1000) {
      this.scheduleModelDataReconnect();
    }
  }
  handlePriceError(error) {
    console.error('Price WebSocket error:', error);
    this.priceIsConnecting = false;
    this.notifyConnectionListeners(this.getOverallConnectionStatus());
  }

  /**
   * Handle Model Updates WebSocket error event
   */
  handleModelError(error) {
    console.error('Model Updates WebSocket error:', error);
    this.modelIsConnecting = false;
    this.notifyConnectionListeners(this.getOverallConnectionStatus());
  }

  /**
   * Handle Model Data Stream WebSocket error event
   */
  handleModelDataError(error) {
    console.error('Model Data Stream WebSocket error:', error);
    this.modelDataIsConnecting = false;
    this.notifyConnectionListeners(this.getOverallConnectionStatus());
  }
  schedulePriceReconnect() {
    if (this.priceReconnectTimer) {
      clearTimeout(this.priceReconnectTimer);
    }
    
    this.priceReconnectTimer = setTimeout(() => {
      this.connectPrice();
    }, this.reconnectInterval);
  }

  /**
   * Schedule a Model Updates WebSocket reconnection attempt
   */
  scheduleModelReconnect() {
    if (this.modelReconnectTimer) {
      clearTimeout(this.modelReconnectTimer);
    }
    
    this.modelReconnectTimer = setTimeout(() => {
      this.connectModel();
    }, this.reconnectInterval);
  }

  /**
   * Schedule a Model Data Stream WebSocket reconnection attempt
   */
  scheduleModelDataReconnect() {
    if (this.modelDataReconnectTimer) {
      clearTimeout(this.modelDataReconnectTimer);
    }
    
    this.modelDataReconnectTimer = setTimeout(() => {
      this.connectModelData();
    }, this.reconnectInterval);
  }
  subscribe(callback) {
    this.priceListeners.add(callback);
    
    // If we have cached data, send it immediately
    if (this.lastPriceData) {
      callback(this.lastPriceData);
    }
    
    return () => {
      this.priceListeners.delete(callback);
    };
  }

  /**
   * Subscribe to model updates
   */
  subscribeToModelUpdates(callback) {
    this.modelListeners.add(callback);
    
    // If we have cached data, send it immediately
    if (this.lastModelData) {
      callback(this.lastModelData);
    }
    
    return () => {
      this.modelListeners.delete(callback);
    };
  }

  /**
   * Subscribe to model data stream updates
   */
  subscribeToModelDataStream(callback) {
    this.modelDataListeners.add(callback);
    
    // If we have cached data, send it immediately
    if (this.lastModelDataStreamData) {
      callback(this.lastModelDataStreamData);
    }
    
    return () => {
      this.modelDataListeners.delete(callback);
    };
  }
  subscribeToConnection(callback) {
    this.connectionListeners.add(callback);
    
    // Send current connection status immediately
    const status = this.getOverallConnectionStatus();
    callback(status);
    
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  /**
   * Notify all price update listeners
   */
  notifyPriceListeners(data) {
    this.priceListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in price update listener:', error);
      }
    });
  }

  /**
   * Notify all model update listeners
   */
  notifyModelListeners(data) {
    this.modelListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in model update listener:', error);
      }
    });
  }

  /**
   * Notify all model data stream listeners
   */
  notifyModelDataListeners(data) {
    this.modelDataListeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in model data stream listener:', error);
      }
    });
  }
  notifyConnectionListeners(status) {
    this.connectionListeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in connection status listener:', error);
      }
    });
  }

  /**
   * Get overall connection status (considering all WebSockets)
   */
  getOverallConnectionStatus() {
    const priceStatus = this.getPriceConnectionStatus();
    const modelStatus = this.getModelConnectionStatus();
    const modelDataStatus = this.getModelDataConnectionStatus();
    
    // If all are connected, return connected
    if (priceStatus === 'connected' && modelStatus === 'connected' && modelDataStatus === 'connected') {
      return 'connected';
    }
    
    // If any is connecting, return connecting
    if (priceStatus === 'connecting' || modelStatus === 'connecting' || modelDataStatus === 'connecting') {
      return 'connecting';
    }
    
    // If at least one is connected, return partial
    if (priceStatus === 'connected' || modelStatus === 'connected' || modelDataStatus === 'connected') {
      return 'partial';
    }
    
    // Otherwise disconnected
    return 'disconnected';
  }

  /**
   * Get Price WebSocket connection status
   */
  getPriceConnectionStatus() {
    if (!this.priceWs) return 'disconnected';
    
    switch (this.priceWs.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'disconnecting';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'disconnected';
    }
  }

  /**
   * Get Model Updates WebSocket connection status
   */
  getModelConnectionStatus() {
    if (!this.modelWs) return 'disconnected';
    
    switch (this.modelWs.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'disconnecting';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'disconnected';
    }
  }

  /**
   * Get Model Data Stream WebSocket connection status
   */
  getModelDataConnectionStatus() {
    if (!this.modelDataWs) return 'disconnected';
    
    switch (this.modelDataWs.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'disconnecting';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'disconnected';
    }
  }
  /**
   * Check if all WebSockets are connected
   */
  isConnected() {
    return this.isPriceConnected() && this.isModelConnected() && this.isModelDataConnected();
  }

  /**
   * Check if Price WebSocket is connected
   */
  isPriceConnected() {
    return this.priceWs && this.priceWs.readyState === WebSocket.OPEN;
  }

  /**
   * Check if Model Updates WebSocket is connected
   */
  isModelConnected() {
    return this.modelWs && this.modelWs.readyState === WebSocket.OPEN;
  }

  /**
   * Check if Model Data Stream WebSocket is connected
   */
  isModelDataConnected() {
    return this.modelDataWs && this.modelDataWs.readyState === WebSocket.OPEN;
  }

  /**
   * Get the last received price data
   */
  getLastPriceData() {
    return this.lastPriceData;
  }

  /**
   * Get the last received model data
   */
  getLastModelData() {
    return this.lastModelData;
  }

  /**
   * Get the last received model data stream data
   */
  getLastModelDataStreamData() {
    return this.lastModelDataStreamData;
  }
  getPriceForSymbol(symbol) {
    if (!this.lastPriceData || !this.lastPriceData.data) {
      return null;
    }
    
    return this.lastPriceData.data[symbol] || null;
  }

  /**
   * Get all available symbols
   */
  getAvailableSymbols() {
    if (!this.lastPriceData || !this.lastPriceData.data) {
      return [];
    }
    
    return Object.keys(this.lastPriceData.data);
  }
}

// Create a singleton instance
const websocketService = new WebSocketService();

export default websocketService;