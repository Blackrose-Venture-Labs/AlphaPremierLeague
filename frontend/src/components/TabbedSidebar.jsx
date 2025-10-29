// import React, { useState } from 'react';
import React, { useState, useEffect, useMemo } from 'react';
import { useModelColors } from '../hooks/useModelColors';
import { useWebSocket } from '../context/WebSocketContext';

const TabbedSidebar = ({ isFullScreen, setIsFullScreen }) => {
  const [activeTab, setActiveTab] = useState('trades');
  const [localFullScreen, setLocalFullScreen] = useState(false);
  // Positions state - now updated from WebSocket
  const [positionsData, setPositionsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Model chat state - updated from WebSocket
  const [modelChatData, setModelChatData] = useState([]);

  // Completed trades state - updated from WebSocket
  const [completedTradesData, setCompletedTradesData] = useState([]);

  // WebSocket connection for model updates
  const { modelData, getConnectionInfo, getModelData, getLastModelUpdate } = useWebSocket();

  // Handle combined updates from WebSocket
  useEffect(() => {
    if (modelData) {
      // Check if this is a combined_update message
      if (modelData.type === 'combined_update') {
        // Handle position updates
        if (modelData.position_updates && modelData.position_updates.data) {
          setPositionsData(modelData.position_updates.data);
          setError(null); // Clear any previous errors
          
          // Store in localStorage for persistence
          try {
            localStorage.setItem('positions_data', JSON.stringify({
              data: modelData.position_updates.data,
              timestamp: modelData.position_updates.timestamp || new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            }));
          } catch (error) {
            console.warn('Failed to store positions data in localStorage:', error);
          }
        }
        
        // Handle modelchat updates
        if (modelData.modelchat_updates && modelData.modelchat_updates.data) {
          setModelChatData(modelData.modelchat_updates.data);
          
          // Store in localStorage for persistence
          try {
            localStorage.setItem('modelchat_data', JSON.stringify({
              data: modelData.modelchat_updates.data,
              timestamp: modelData.modelchat_updates.timestamp || new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            }));
          } catch (error) {
            console.warn('Failed to store modelchat data in localStorage:', error);
          }
        }
        
        // Handle trade updates
        if (modelData.trade_updates && modelData.trade_updates.data) {
          // Ensure we have valid trade data
          if (Array.isArray(modelData.trade_updates.data) && modelData.trade_updates.data.length > 0) {
            setCompletedTradesData(modelData.trade_updates.data);
            
            // Store in localStorage for persistence
            try {
              localStorage.setItem('completed_trades_data', JSON.stringify({
                data: modelData.trade_updates.data,
                timestamp: modelData.trade_updates.timestamp || new Date().toISOString(),
                lastUpdated: new Date().toISOString()
              }));
            } catch (error) {
              console.error('Failed to store completed trades data in localStorage:', error);
            }
          } else {
            console.warn('Received trade updates but data is empty or invalid:', modelData.trade_updates.data);
          }
        }
      }
      
      // Keep legacy support for individual update types (for backwards compatibility)
      else if (modelData.type === 'position_updates' && modelData.data) {
        setPositionsData(modelData.data);
        setError(null);
        
        try {
          localStorage.setItem('positions_data', JSON.stringify({
            data: modelData.data,
            timestamp: modelData.timestamp || new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          }));
        } catch (error) {
          console.warn('Failed to store positions data in localStorage:', error);
        }
      }
      
      else if (modelData.type === 'modelchat_updates' && modelData.data) {
        setModelChatData(modelData.data);
        
        try {
          localStorage.setItem('modelchat_data', JSON.stringify({
            data: modelData.data,
            timestamp: modelData.timestamp || new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          }));
        } catch (error) {
          console.warn('Failed to store modelchat data in localStorage:', error);
        }
      }
      
      else if ((modelData.type === 'trade_updates' || modelData.type === 'trades_updates' || modelData.type === 'completed_trades') && modelData.data) {
        if (Array.isArray(modelData.data) && modelData.data.length > 0) {
          setCompletedTradesData(modelData.data);
          
          try {
            localStorage.setItem('completed_trades_data', JSON.stringify({
              data: modelData.data,
              timestamp: modelData.timestamp || new Date().toISOString(),
              lastUpdated: new Date().toISOString()
            }));
          } catch (error) {
            console.error('Failed to store completed trades data in localStorage:', error);
          }
        }
      }
    }
  }, [modelData]);

  // Load positions and model chat data from localStorage on component mount
  useEffect(() => {
    try {
      const storedPositions = localStorage.getItem('positions_data');
      if (storedPositions) {
        const parsedPositions = JSON.parse(storedPositions);
        if (parsedPositions.data && Array.isArray(parsedPositions.data)) {
          setPositionsData(parsedPositions.data);
        }
      }
    } catch (error) {
      console.warn('Failed to load positions from localStorage:', error);
    }

    try {
      const storedModelChat = localStorage.getItem('modelchat_data');
      if (storedModelChat) {
        const parsedModelChat = JSON.parse(storedModelChat);
        if (parsedModelChat.data && Array.isArray(parsedModelChat.data)) {
          setModelChatData(parsedModelChat.data);
        }
      }
    } catch (error) {
      console.warn('Failed to load modelchat from localStorage:', error);
    }

    try {
      const storedTrades = localStorage.getItem('completed_trades_data');
      if (storedTrades) {
        const parsedTrades = JSON.parse(storedTrades);
        if (parsedTrades.data && Array.isArray(parsedTrades.data)) {
          setCompletedTradesData(parsedTrades.data);
        }
      }
    } catch (error) {
      console.warn('Failed to load completed trades from localStorage:', error);
    }
  }, []);

  // Test function to inject position updates (for debugging)
  useEffect(() => {
    window.injectPositionUpdates = (testData) => {
      setPositionsData(testData);
      
      // Also store in localStorage
      try {
        localStorage.setItem('positions_data', JSON.stringify({
          data: testData,
          timestamp: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }));
      } catch (error) {
        console.error('Failed to store test position data:', error);
      }
    };

    window.injectModelChatUpdates = (testData) => {
      setModelChatData(testData);
      
      // Also store in localStorage
      try {
        localStorage.setItem('modelchat_data', JSON.stringify({
          data: testData,
          timestamp: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }));
      } catch (error) {
        console.error('Failed to store test modelchat data:', error);
      }
    };

    window.injectTradeUpdates = (testData) => {
      setCompletedTradesData(testData);
      
      // Also store in localStorage
      try {
        localStorage.setItem('completed_trades_data', JSON.stringify({
          data: testData,
          timestamp: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }));
      } catch (error) {
        console.error('Failed to store test trade data:', error);
      }
    };

    window.injectCombinedUpdate = (combinedData) => {
      // Handle position updates
      if (combinedData.position_updates && combinedData.position_updates.data) {
        setPositionsData(combinedData.position_updates.data);
        try {
          localStorage.setItem('positions_data', JSON.stringify({
            data: combinedData.position_updates.data,
            timestamp: combinedData.position_updates.timestamp || new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          }));
        } catch (error) {
          console.error('Failed to store test position data:', error);
        }
      }
      
      // Handle modelchat updates
      if (combinedData.modelchat_updates && combinedData.modelchat_updates.data) {
        setModelChatData(combinedData.modelchat_updates.data);
        try {
          localStorage.setItem('modelchat_data', JSON.stringify({
            data: combinedData.modelchat_updates.data,
            timestamp: combinedData.modelchat_updates.timestamp || new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          }));
        } catch (error) {
          console.error('Failed to store test modelchat data:', error);
        }
      }
      
      // Handle trade updates
      if (combinedData.trade_updates && combinedData.trade_updates.data) {
        setCompletedTradesData(combinedData.trade_updates.data);
        try {
          localStorage.setItem('completed_trades_data', JSON.stringify({
            data: combinedData.trade_updates.data,
            timestamp: combinedData.trade_updates.timestamp || new Date().toISOString(),
            lastUpdated: new Date().toISOString()
          }));
        } catch (error) {
          console.error('Failed to store test trade data:', error);
        }
      }
    };

    // Debug function to check current state
    window.debugSidebarData = () => {
      // Debug function for checking sidebar state
    };
    
    return () => {
      delete window.injectPositionUpdates;
      delete window.injectModelChatUpdates;
      delete window.injectTradeUpdates;
      delete window.injectCombinedUpdate;
      delete window.debugSidebarData;
    };
  }, [positionsData, modelChatData, completedTradesData, activeTab, modelData]);



  const tabs = [
    { value: 'trades', label: 'TRADES' },
    { value: 'chat', label: 'MODELCHAT' },
    { value: 'positions', label: 'POSITIONS' },
    { value: 'readme', label: 'README.TXT' }
  ];

  // Removed fetchPositions function - no longer needed since positions API and polling are removed

  // Removed isComponentVisible function - no longer needed since polling is removed

  // Listen for custom events to open sidebar with specific tab
  useEffect(() => {
    const handleOpenSidebar = (e) => {
      setActiveTab(e.detail);
      setLocalFullScreen(true);
      
      // Removed fetchPositions call since positions API is no longer available
    };
    
    window.addEventListener('openSidebarTab', handleOpenSidebar);
    
    return () => {
      window.removeEventListener('openSidebarTab', handleOpenSidebar);
    };
  }, []);

  // Removed polling for positions - no longer needed since API call is removed

  const handleTabClick = (tabValue) => {
    setActiveTab(tabValue);
    // On screens below 1400px, open full screen
    if (window.innerWidth < 1400) {
      setLocalFullScreen(true);
    }
  };

  const closeFullScreen = () => {
    setLocalFullScreen(false);
  };

  // Full screen modal for screens below 1400px
  if (localFullScreen && window.innerWidth < 1400) {
    const currentTab = tabs.find(tab => tab.value === activeTab);
    
    return (
      <div className="fixed inset-0 z-50 flex flex-col font-mono" style={{ top: '120px', backgroundColor: '#1a1a1a' }}>
        {/* Tab Header with Name and Close Button */}
        <div className="border-b-2 border-bloomberg-primary px-4 py-3 flex items-center justify-between" style={{ backgroundColor: '#1a1a1a' }}>
          <h2 className="text-base font-bold text-white tracking-wide">
            {currentTab?.label || 'POSITIONS'}
          </h2>
          <button
            onClick={closeFullScreen}
            className="bg-red-600 hover:bg-red-700 text-white w-10 h-10 flex items-center justify-center text-xl font-bold transition-all duration-200 flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Content with dark theme matching sidebar */}
        <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ backgroundColor: '#1a1a1a' }}>
          {activeTab === 'trades' && <CompletedTrades completedTradesData={completedTradesData} />}
          {activeTab === 'chat' && <ModelChat modelChatData={modelChatData} />}
          {activeTab === 'positions' && <Positions positionsData={positionsData} loading={loading} error={error} />}
          {activeTab === 'readme' && <ReadMe />}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black h-full flex flex-col font-mono" style={{ backgroundColor: '#1a1a1a' }}>
      {/* Tabs - Bloomberg style for screens >= 1400px */}
      <div className="hidden 2xl:flex border-b-2 border-bloomberg-primary" style={{ backgroundColor: '#1a1a1a' }}>
        {tabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`flex-1 px-1 py-2 text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === tab.value 
                ? 'bg-bloomberg-primary text-black' 
                : 'text-bloomberg-primary hover:bg-bloomberg-primary hover:text-black'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content - Only show on >= 1400px */}
      <div className="flex-1 overflow-y-auto custom-scrollbar hidden 2xl:block">
        {activeTab === 'trades' && <CompletedTrades completedTradesData={completedTradesData} />}
        {activeTab === 'chat' && <ModelChat modelChatData={modelChatData} />}
        {activeTab === 'positions' && <Positions positionsData={positionsData} loading={loading} error={error} />}
        {activeTab === 'readme' && <ReadMe />}
      </div>
    </div>
  );
};

const CompletedTrades = ({ completedTradesData = [] }) => {
  const [filterModel, setFilterModel] = useState('ALL');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const { getColorByName } = useModelColors();

  // Track when data is loaded
  useEffect(() => {
    if (completedTradesData.length > 0) {
      setIsDataLoaded(true);
    }
  }, [completedTradesData]);

  // Transform the trade_updates data into the format expected by the UI
  const transformedTrades = useMemo(() => {
    if (!Array.isArray(completedTradesData) || completedTradesData.length === 0) {
      return [];
    }

    return completedTradesData
      .map(trade => {
        // Validate required fields
        if (!trade || !trade.id || !trade.display_name || !trade.asset) {
          console.warn('Invalid trade data:', trade);
          return null;
        }

        return {
          id: trade.id,
          model: trade.display_name,
          codeName: trade.code_name,
          modelColor: getColorByName(trade.display_name, '#ff6b35'),
          time: new Date(trade.last_update_time).toLocaleString(),
          rawTime: new Date(trade.last_update_time), // Keep raw date for sorting
          asset: trade.asset,
          type: trade.side?.toLowerCase() || 'unknown', // 'BUY' -> 'buy', 'SELL' -> 'sell'
          price: `₹${(trade.price || 0).toFixed(2)}`,
          quantity: (trade.quantity || 0).toFixed(2),
          notional: `₹${(trade.notional_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
          holdingTime: 'N/A', // Not provided in the data
          // Calculate a simple display for profit/loss (this would need actual calculation)
          profitLoss: Math.random() > 0.5 ? 'profit' : 'loss', // Placeholder - needs actual P&L calculation
          pnl: (Math.random() - 0.5) * (trade.notional_value || 0) * 0.1, // Placeholder - needs actual P&L calculation
        };
      })
      .filter(trade => trade !== null) // Remove invalid trades
      .sort((a, b) => b.rawTime - a.rawTime); // Sort by time descending (latest first)
  }, [completedTradesData, getColorByName]);

  const filteredTrades = filterModel === 'ALL' ? transformedTrades : transformedTrades.filter(t => t.model === filterModel);

  // Helper function to convert hex to rgb
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Compact Filter Bar */}
      <div className="border-b border-bloomberg-primary bg-gray-900 px-2 py-1.5 flex items-center gap-2">
        <span className="text-[10px] text-gray-400 font-bold">FILTER:</span>
        <select
          value={filterModel}
          onChange={(e) => setFilterModel(e.target.value)}
          className="flex-1 bg-black text-bloomberg-primary border border-gray-700 px-1.5 py-0.5 text-[10px] font-bold focus:outline-none focus:border-bloomberg-primary"
        >
          <option value="ALL">ALL MODELS</option>
          {[...new Set(transformedTrades.map(t => t.model))].map(model => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
      </div>

      {/* Trades Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5">
        {!isDataLoaded && filteredTrades.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="text-bloomberg-primary text-xs mb-2">Loading trades...</div>
              <div className="text-gray-500 text-[10px]">Waiting for trade data from WebSocket</div>
            </div>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="text-gray-400 text-xs">No trades found</div>
              <div className="text-gray-500 text-[10px] mt-1">
                {filterModel !== 'ALL' ? `No trades for ${filterModel}` : 'No trade data available'}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredTrades.map(trade => {
            const rgb = hexToRgb(trade.modelColor);
            const subtleBackground = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)` : 'rgb(17, 24, 39)';
            const borderColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)` : '#ff6b35';
            
            return (
              <div 
                key={trade.id} 
                className="border"
                style={{ 
                  backgroundColor: subtleBackground,
                  borderColor: borderColor
                }}
              >
                {/* Compact Header */}
                <div 
                  className="border-b px-2 py-1 flex items-center justify-between"
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    borderColor: borderColor
                  }}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: trade.modelColor }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold text-white truncate">{trade.model}</div>
                      <div className="text-[9px] text-gray-400">{trade.time}</div>
                    </div>
                  </div>
                  <div className={`px-1.5 py-0.5 text-[9px] font-bold flex-shrink-0 ${
                    trade.type === 'sell' ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {trade.type === 'sell' ? 'SELL' : 'BUY'}
                  </div>
                </div>

                {/* Compact Table-style Data */}
                <div className="px-2 py-1 space-y-0.5 text-[10px]">
                  <div className="grid grid-cols-[60px_1fr] gap-2 border-b border-gray-800 pb-0.5">
                    <span className="text-gray-400">ASSET</span>
                    <span className="text-white font-bold">{trade.asset}</span>
                  </div>
                  <div className="grid grid-cols-[60px_1fr] gap-2 border-b border-gray-800 pb-0.5">
                    <span className="text-gray-400">PRICE</span>
                    <span className="text-white">{trade.price}</span>
                  </div>
                  <div className="grid grid-cols-[60px_1fr] gap-2 border-b border-gray-800 pb-0.5">
                    <span className="text-gray-400">QTY</span>
                    <span className="text-white">{trade.quantity}</span>
                  </div>
                  <div className="grid grid-cols-[60px_1fr] gap-2 border-b border-gray-800 pb-0.5">
                    <span className="text-gray-400">NOTIONAL</span>
                    <span className="text-white">{trade.notional}</span>
                  </div>
                  <div className="grid grid-cols-[60px_1fr] gap-2 border-b border-gray-800 pb-0.5">
                    <span className="text-gray-400">SIDE</span>
                    <span className={`font-bold ${trade.type === 'sell' ? 'text-red-400' : 'text-green-400'}`}>
                      {trade.type.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Trade ID Footer */}
                <div 
                  className="border-t px-2 py-1 flex justify-between text-[10px]"
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    borderColor: borderColor
                  }}
                >
                  <span className="text-gray-400 font-bold">TRADE ID</span>
                  <span className="text-white font-bold">#{trade.id}</span>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
};

const ModelChat = ({ modelChatData = [] }) => {
  const [filterModel, setFilterModel] = useState('ALL');
  const [expandedChats, setExpandedChats] = useState({});
  const { getColorByName } = useModelColors();

  // Transform the modelchat_updates data into the format expected by the UI
  const transformedChats = useMemo(() => {
    return modelChatData
      .map(chat => ({
        id: chat.id,
        model: chat.display_name,
        codeName: chat.code_name,
        modelColor: getColorByName(chat.display_name, '#ff6b35'),
        time: new Date(chat.last_update_time).toLocaleString(),
        rawTime: new Date(chat.last_update_time), // Keep raw date for sorting
        message: chat.model_output_prompt,
        inputPrompt: chat.model_input_prompt,
      }))
      .sort((a, b) => b.rawTime - a.rawTime); // Sort by time descending (latest first)
  }, [modelChatData, getColorByName]);

  const toggleExpanded = (chatId) => {
    setExpandedChats(prev => ({
      ...prev,
      [chatId]: !prev[chatId]
    }));
  };

  const filteredChats = filterModel === 'ALL' ? transformedChats : transformedChats.filter(c => c.model === filterModel);

  // Helper function to convert hex to rgb
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Compact Filter Bar */}
      <div className="border-b border-bloomberg-primary bg-gray-900 px-2 py-1.5 flex items-center gap-2">
        <span className="text-[10px] text-gray-400 font-bold">FILTER:</span>
        <select
          value={filterModel}
          onChange={(e) => setFilterModel(e.target.value)}
          className="flex-1 text-bloomberg-primary border border-gray-700 px-1.5 py-0.5 text-[10px] font-bold focus:outline-none focus:border-bloomberg-primary"
          style={{ backgroundColor: '#252525' }}
        >
          <option value="ALL">ALL MODELS</option>
          {[...new Set(transformedChats.map(c => c.model))].map(model => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>
      </div>

      {/* Chats Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5" style={{ backgroundColor: '#1a1a1a' }}>
        {filteredChats.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="text-gray-400 text-xs">No model chats found</div>
              <div className="text-gray-500 text-[10px] mt-1">
                {filterModel !== 'ALL' ? `No chats for ${filterModel}` : 'Waiting for model chat updates...'}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredChats.map(chat => {
            const rgb = hexToRgb(chat.modelColor);
            const subtleBackground = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)` : 'rgb(17, 24, 39)';
            const borderColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)` : '#ff6b35';
            
            return (
              <div 
                key={chat.id} 
                className="border"
                style={{ 
                  backgroundColor: subtleBackground,
                  borderColor: borderColor
                }}
              >
                {/* Compact Header */}
                <div 
                  className="border-b px-2 py-1 flex items-center gap-1.5"
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    borderColor: borderColor
                  }}
                >
                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: chat.modelColor }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold text-white truncate">{chat.model}</div>
                    <div className="text-[9px] text-gray-400">{chat.time}</div>
                  </div>
                </div>

                {/* Output Message */}
                <div className="px-2 py-1.5">
                  {!expandedChats[chat.id] ? (
                    // Summary View
                    <div>
                      {(() => {
                        try {
                          const parsed = JSON.parse(chat.message);
                          const output = parsed.output || parsed;
                          
                          return (
                            <>
                              {/* Justification Text */}
                              {output.justification && (
                                <div className="mb-3 pb-3 border-b border-gray-700">
                                  <div className="text-[9px] text-bloomberg-primary font-bold mb-1.5">JUSTIFICATION:</div>
                                  <p className="text-[9px] text-gray-300 leading-relaxed">
                                    {output.justification}
                                  </p>
                                </div>
                              )}
                              
                              {/* Asset Analysis Cards */}
                              {output.individual_asset_analysis && output.individual_asset_analysis.length > 0 && (
                                <div>
                                  <div className="text-[9px] text-bloomberg-primary font-bold mb-2">ASSET ANALYSIS:</div>
                                  <div className="space-y-2">
                                    {output.individual_asset_analysis.map((asset, idx) => (
                                      <div 
                                        key={idx}
                                        className="bg-gray-900 border border-gray-700 rounded p-2"
                                      >
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[10px] font-bold text-white">{asset.asset}</span>
                                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                            asset.trading_signal === 'BUY' ? 'bg-green-900 text-green-400' :
                                            asset.trading_signal === 'SELL' ? 'bg-red-900 text-red-400' :
                                            'bg-gray-700 text-gray-300'
                                          }`}>
                                            {asset.trading_signal}
                                          </span>
                                        </div>
                                        <div className="text-[8px] text-gray-400 mb-1">
                                          <span className="font-bold">CONVICTION:</span> {asset.conviction_level}
                                          {asset.risk_reward_ratio > 0 && (
                                            <span className="ml-2"><span className="font-bold">R/R:</span> {asset.risk_reward_ratio}</span>
                                          )}
                                        </div>
                                        <p className="text-[9px] text-gray-300 leading-relaxed">
                                          {asset.technical_rationale}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Click to view more */}
                              <button
                                onClick={() => toggleExpanded(chat.id)}
                                className="w-full mt-3 pt-2 border-t border-gray-700 text-[8px] text-bloomberg-primary hover:text-white transition-colors text-center"
                              >
                                ▼ CLICK TO VIEW FULL JSON
                              </button>
                            </>
                          );
                        } catch (e) {
                          return (
                            <>
                              <p className="text-[9px] text-gray-300 leading-relaxed whitespace-pre-wrap">
                                {chat.message}
                              </p>
                              <button
                                onClick={() => toggleExpanded(chat.id)}
                                className="w-full mt-3 pt-2 border-t border-gray-700 text-[8px] text-bloomberg-primary hover:text-white transition-colors text-center"
                              >
                                ▼ CLICK TO VIEW MORE
                              </button>
                            </>
                          );
                        }
                      })()}
                    </div>
                  ) : (
                    // Expanded JSON View
                    <div>
                      <button
                        onClick={() => toggleExpanded(chat.id)}
                        className="w-full mb-2 pb-2 border-b border-gray-700 text-[8px] text-bloomberg-primary hover:text-white transition-colors text-center"
                      >
                        ▲ CLICK TO HIDE FULL JSON
                      </button>
                      <pre className="text-[9px] text-gray-300 leading-relaxed break-words whitespace-pre-wrap font-mono overflow-x-auto">
                        {(() => {
                          try {
                            const parsed = JSON.parse(chat.message);
                            return JSON.stringify(parsed, null, 2);
                          } catch (e) {
                            return chat.message;
                          }
                        })()}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
};

const Positions = ({ positionsData = [], loading = false, error = null }) => {
  const [filterModel, setFilterModel] = useState('ALL');
  const { getColorByName } = useModelColors();

  // Group positions by display_name and calculate totals
  const groupedPositions = useMemo(() => {
    if (!Array.isArray(positionsData) || positionsData.length === 0) return [];

    const groups = {};
    
    positionsData.forEach(position => {
      const modelName = position.display_name;
      if (!groups[modelName]) {
        groups[modelName] = {
          id: position.ai_model_id,
          model: modelName,
          codeName: position.code_name,
          assets: [],
          totalValue: 0,
          totalPnl: 0,
          modelColor: getColorByName(modelName, '#ff6b35'),
        };
      }
      
      groups[modelName].assets.push({
        asset: position.asset,
        percentage: position.percentage,
        value: position.value,
        pnl: position.pnl,
        quantity: position.quantity || 0,
      });
      
      groups[modelName].totalValue += position.value;
      groups[modelName].totalPnl += position.pnl;
    });

    // Sort assets alphabetically by asset name for each model
    Object.values(groups).forEach(group => {
      group.assets.sort((a, b) => a.asset.localeCompare(b.asset));
    });

    // Sort groups alphabetically by model display name
    return Object.values(groups).sort((a, b) => a.model.localeCompare(b.model));
  }, [positionsData, getColorByName]);

  // Filter positions based on selected model
  const filteredPositions = filterModel === 'ALL' 
    ? groupedPositions 
    : groupedPositions.filter(m => m.model === filterModel);

  // Get unique model names for filter dropdown
  const uniqueModels = groupedPositions.map(m => m.model);

  // Helper function to convert hex to rgb
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-bloomberg-primary bg-gray-900 px-2 py-1.5">
          <span className="text-[10px] text-bloomberg-primary font-bold">LOADING POSITIONS...</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-bloomberg-primary text-xs">Fetching positions data...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-bloomberg-primary bg-gray-900 px-2 py-1.5">
          <span className="text-[10px] text-red-500 font-bold">ERROR LOADING POSITIONS</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-red-500 text-xs mb-2">Failed to load positions</div>
            <div className="text-gray-400 text-[10px]">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Compact Filter Bar */}
      <div className="border-b border-bloomberg-primary bg-gray-900 px-2 py-1.5 flex items-center gap-2">
        <span className="text-[10px] text-gray-400 font-bold">FILTER:</span>
        <select
          value={filterModel}
          onChange={(e) => setFilterModel(e.target.value)}
          className="flex-1 bg-black text-bloomberg-primary border border-gray-700 px-1.5 py-0.5 text-[10px] font-bold focus:outline-none focus:border-bloomberg-primary"
        >
          <option value="ALL">ALL MODELS</option>
          {uniqueModels.map(model => (
            <option key={model} value={model}>{model}</option>
          ))}
        </select>

      </div>

      {/* Positions Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5">
        {filteredPositions.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="text-gray-400 text-xs">No positions found</div>
              <div className="text-gray-500 text-[10px] mt-1">
                {filterModel !== 'ALL' ? `No positions for ${filterModel}` : 'No position data available'}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredPositions.map(modelData => {
              const rgb = hexToRgb(modelData.modelColor);
              const subtleBackground = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)` : 'rgb(17, 24, 39)';
              const borderColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)` : '#ff6b35';
              
              return (
                <div 
                  key={modelData.id} 
                  className="border"
                  style={{ 
                    backgroundColor: subtleBackground,
                    borderColor: borderColor
                  }}
                >
                  {/* Compact Model Header */}
                  <div 
                    className="border-b px-2 py-1 flex items-center justify-between"
                    style={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      borderColor: borderColor
                    }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-white truncate">{modelData.model}</span>
                    </div>
                  </div>

                  {/* Compact Table Header */}
                  <div 
                    className="grid grid-cols-[1fr_70px_80px_70px] gap-2 px-2 py-1 text-[9px] font-bold text-gray-400 border-b"
                    style={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.4)',
                      borderColor: 'rgba(75, 85, 99, 0.5)'
                    }}
                  >
                    <div>ASSET</div>
                    <div className="text-right">%</div>
                    <div className="text-right">VALUE</div>
                    <div className="text-right">QTY</div>
                  </div>

                  {/* Asset Rows */}
                  {modelData.assets.map((asset, idx) => (
                    <div 
                      key={idx} 
                      className="grid grid-cols-[1fr_70px_80px_70px] gap-2 px-2 py-1.5 text-[10px] border-b last:border-b-0 hover:bg-black hover:bg-opacity-30 transition-colors"
                      style={{ borderColor: 'rgba(75, 85, 99, 0.3)' }}
                    >
                      {/* ASSET */}
                      <div className="font-bold text-white">{asset.asset}</div>
                      
                      {/* PERCENTAGE */}
                      <div className="text-right text-white">{asset.percentage.toFixed(1)}%</div>
                      
                      {/* VALUE */}
                      <div className="text-right text-white">₹{asset.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                      
                      {/* QUANTITY */}
                      <div className={`text-right font-bold ${asset.quantity >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {asset.quantity.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  ))}

                  {/* Total Value Footer */}
                  <div 
                    className="border-t px-2 py-1 flex justify-between text-[10px]"
                    style={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      borderColor: borderColor
                    }}
                  >
                    <span className="text-gray-400">TOTAL VALUE:</span>
                    <span className="text-white font-bold">₹{modelData.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const ReadMe = () => {
  const { getConnectionInfo, modelData } = useWebSocket();
  const connectionInfo = getConnectionInfo();

  return (
    <div className="p-2">
      <div className="bg-black border border-bloomberg-primary p-3">
        <div className="bg-bloomberg-primary text-black px-2 py-1 mb-3">
          <h3 className="text-xs font-bold">README.TXT</h3>
        </div>
        <div className="text-xs text-gray-300 space-y-2 leading-relaxed break-words">
          <p className="text-bloomberg-primary font-bold">&gt; ALPHA ARENA - AI TRADING TERMINAL</p>
          
          <p className="border-l-2 border-bloomberg-primary pl-2">
            Multiple AI models trading Indian markets with autonomous strategies.
          </p>

          {/* WebSocket Status */}
          <div className="border-t border-bloomberg-primary pt-2">
            <p className="text-bloomberg-primary font-bold">WEBSOCKET STATUS:</p>
            <div className="ml-2 space-y-1 mt-1">
              <div className="flex">
                <span className="text-bloomberg-primary mr-2">▪</span>
                <span><span className="font-bold text-bloomberg-primary">PRICE STREAM:</span> {connectionInfo.priceConnected ? 
                  <span className="text-green-500">CONNECTED</span> : 
                  <span className="text-red-500">DISCONNECTED</span>}
                </span>
              </div>
              <div className="flex">
                <span className="text-bloomberg-primary mr-2">▪</span>
                <span><span className="font-bold text-bloomberg-primary">MODEL UPDATES:</span> {connectionInfo.modelConnected ? 
                  <span className="text-green-500">CONNECTED</span> : 
                  <span className="text-red-500">DISCONNECTED</span>}
                </span>
              </div>
              <div className="flex">
                <span className="text-bloomberg-primary mr-2">▪</span>
                <span><span className="font-bold text-bloomberg-primary">OVERALL STATUS:</span> 
                  <span className={`ml-1 ${
                    connectionInfo.status === 'connected' ? 'text-green-500' :
                    connectionInfo.status === 'partial' ? 'text-yellow-500' :
                    connectionInfo.status === 'connecting' ? 'text-blue-500' :
                    'text-red-500'
                  }`}>
                    {connectionInfo.status.toUpperCase()}
                  </span>
                </span>
              </div>
              {connectionInfo.lastModelUpdate && (
                <div className="flex">
                  <span className="text-bloomberg-primary mr-2">▪</span>
                  <span><span className="font-bold text-bloomberg-primary">LAST MODEL UPDATE:</span> {connectionInfo.lastModelUpdate.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>

          
          <div className="border-t border-bloomberg-primary pt-2">
            <p className="text-bloomberg-primary font-bold">SYSTEM TABS:</p>
            <div className="ml-2 space-y-1 mt-1">
              <div className="flex">
                <span className="text-bloomberg-primary mr-2">▪</span>
                <span><span className="font-bold text-bloomberg-primary">TRADES:</span> Historical execution log</span>
              </div>
              <div className="flex">
                <span className="text-bloomberg-primary mr-2">▪</span>
                <span><span className="font-bold text-bloomberg-primary">MODELCHAT:</span> Real-time AI reasoning feed</span>
              </div>
              <div className="flex">
                <span className="text-bloomberg-primary mr-2">▪</span>
                <span><span className="font-bold text-bloomberg-primary">POSITIONS:</span> Open positions & P&L monitor</span>
              </div>
              <div className="flex">
                <span className="text-bloomberg-primary mr-2">▪</span>
                <span><span className="font-bold text-bloomberg-primary">README.TXT:</span> System documentation</span>
              </div>
            </div>
          </div>

          <div className="border-t border-bloomberg-primary pt-2">
            <p className="text-bloomberg-primary font-bold">FEATURES:</p>
            <div className="ml-2 space-y-1 mt-1">
              <div className="flex">
                <span className="text-bloomberg-primary mr-2">▪</span>
                <span>Real-time portfolio tracking (INR)</span>
              </div>
              <div className="flex">
                <span className="text-bloomberg-primary mr-2">▪</span>
                <span>Values in Lakhs (L) format</span>
              </div>
              <div className="flex">
                <span className="text-bloomberg-primary mr-2">▪</span>
                <span>Multi-AI strategy execution</span>
              </div>
              <div className="flex">
                <span className="text-bloomberg-primary mr-2">▪</span>
                <span>Live ETF price feeds</span>
              </div>
              <div className="flex">
                <span className="text-bloomberg-primary mr-2">▪</span>
                <span>Automated radar refresh (5s)</span>
              </div>
            </div>
          </div>

          <p className="text-gray-600 mt-3 border-t border-gray-700 pt-2">
            [LIVE MODE].
          </p>
        </div>
      </div>
    </div>
  );
};

export default TabbedSidebar;
