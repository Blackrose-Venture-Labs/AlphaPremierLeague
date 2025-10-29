import React, { useMemo } from 'react';
import { useModels } from '../context/ModelsContext';
import { useWebSocket } from '../context/WebSocketContext';
import { getModelIconPath, getModelIconFallback } from '../lib/utils';
import { getSafeColor } from '../utils/colorUtils';

const SummaryCards = () => {
  const { models, setSelectedModelForChart, modelColorService } = useModels();
  const { modelDataStream } = useWebSocket();

  // Build models array from WebSocket data stream
  // Handles both 'initial_modeldata_update'/'initial_modeldata' and 'modeldata_update' types
  const dynamicModels = useMemo(() => {
    if (!modelDataStream || !modelDataStream.data) {
      return [];
    }

    // Check if this is initial data or regular update
    const isInitialData = modelDataStream.type === 'initial_modeldata';
    
    const modelsArray = [];
    
    // Iterate through each model in the WebSocket stream
    Object.keys(modelDataStream.data).forEach(modelId => {
      const modelStreamData = modelDataStream.data[modelId];
      
      // Get the latest data point for this model
      if (modelStreamData.data_points && modelStreamData.data_points.length > 0) {
        const sortedDataPoints = [...modelStreamData.data_points].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        const latestPoint = sortedDataPoints[sortedDataPoints.length - 1];
        
        // Find matching model from context to get color and icon info
        const modelInfo = models.find(m => m.id === parseInt(modelId));
        
        // Build model object from WebSocket data
        modelsArray.push({
          id: parseInt(modelId),
          display_name: modelStreamData.display_name || modelInfo?.display_name || `Model ${modelId}`,
          code_name: modelInfo?.code_name || modelStreamData.code_name,
          color: modelInfo?.color || modelColorService.getColorForModel(modelStreamData.display_name),
          icon: modelInfo?.icon || 'default.png',
          provider: modelInfo?.provider || 'Unknown',
          account_value: latestPoint.account_value,
          total_pnl: latestPoint.total_pnl,
          return_value: latestPoint.return_value,
          trades: latestPoint.trades,
          fees: latestPoint.fees,
          timestamp: latestPoint.created_at,
          isInitialLoad: isInitialData
        });
      }
    });
    
    // Sort by account_value (highest first)
    return modelsArray.sort((a, b) => (b.account_value || 0) - (a.account_value || 0));
  }, [modelDataStream, models, modelColorService]);

  // Format number as comma-separated integer
  const formatWholeNumber = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    return Math.round(value).toLocaleString('en-US');
  };

  // Convert hex to rgb for background with opacity
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Show loading state if no WebSocket data yet
  if (!modelDataStream || !modelDataStream.data) {
    return (
      <div className="font-mono p-4" style={{ backgroundColor: '#121212' }}>
        <div className="text-center text-bloomberg-primary text-sm">Waiting for model data...</div>
      </div>
    );
  }

  // Show message if no models in WebSocket stream
  if (dynamicModels.length === 0) {
    return (
      <div className="font-mono p-4" style={{ backgroundColor: '#121212' }}>
        <div className="text-center text-gray-500 text-sm">No model data available</div>
      </div>
    );
  }
  
  return (
    <div className="font-mono" style={{ backgroundColor: '#121212' }}>
      {/* Mobile Layout - 3 columns on mobile */}
      <div className="grid grid-cols-3 2xl:grid-cols-6 gap-2 2xl:p-2">
        {dynamicModels.map(model => {
          const safeColor = getSafeColor(model.color);
          const rgb = hexToRgb(safeColor);
          const subtleBackground = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)` : 'rgb(0, 0, 0)';
          const borderColor = safeColor;
          const hoverBackground = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)` : 'rgba(255, 107, 53, 0.2)';
          
          // Use values directly from WebSocket stream
          const accountValue = model.account_value ?? 0;
          const pnlValue = model.total_pnl ?? 0;
          
          const iconPath = getModelIconPath(model.icon);
          
          const handleCardClick = () => {
            setSelectedModelForChart(model);
          };
          
          return (
            <div 
              key={model.id} 
              className="border p-2 2xl:p-2 transition-all cursor-pointer"
              style={{ 
                backgroundColor: subtleBackground,
                borderColor: borderColor
              }}
              onClick={handleCardClick}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBackground}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = subtleBackground}
            >
              <div 
                className="flex flex-col 2xl:flex-row items-center 2xl:items-center space-y-1 2xl:space-y-0 2xl:space-x-2 mb-1 pb-1 border-b"
                style={{ borderColor: borderColor }}
              >
                <div 
                  className="w-6 h-6 2xl:w-4 2xl:h-4 rounded-sm flex items-center justify-center overflow-hidden p-0.5"
                  style={{ backgroundColor: safeColor }}
                >
                  {iconPath ? (
                    <img 
                      src={iconPath} 
                      alt={model.display_name} 
                      className="w-full h-full object-contain"
                      style={{ filter: 'brightness(0) invert(1)' }}
                      onError={(e) => {
                        // Fallback to text if image fails to load
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <span 
                    className="text-xs font-bold text-white"
                    style={{ display: iconPath ? 'none' : 'block' }}
                  >
                    {getModelIconFallback(model.code_name || model.display_name)}
                  </span>
                </div>
                <h4 
                  className="text-[10px] 2xl:text-xs font-bold truncate text-center 2xl:text-left"
                  style={{ color: safeColor }}
                >
                  {model.display_name}
                </h4>
              </div>
              <div className="text-sm 2xl:text-base font-bold text-white text-center 2xl:text-left">
                {formatWholeNumber(accountValue)}
              </div>
              <div className={`text-xs 2xl:text-sm font-bold text-center 2xl:text-left ${
                pnlValue >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {formatWholeNumber(pnlValue)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SummaryCards;