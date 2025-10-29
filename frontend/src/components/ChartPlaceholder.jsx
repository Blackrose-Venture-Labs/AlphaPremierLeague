import React, { useState, useEffect } from 'react';
import { useModels } from '../context/ModelsContext';
import { useWebSocket } from '../context/WebSocketContext';
import { getModelIconPath, getModelIconFallback } from '../lib/utils';
import { transformModelDataStreamToChart, updateChartDataWithStream } from '../lib/dataTransformers';
import modelColorService from '../services/modelColorService';

const ChartPlaceholder = () => {
  const { models, loading, error, selectedModelForChart, setSelectedModelForChart } = useModels();
  const { modelDataStream, getConnectionInfo } = useWebSocket();
  const [pingActive, setPingActive] = useState({});
  const [chartData, setChartData] = useState([]);
  const [modelNames, setModelNames] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [hoveredLine, setHoveredLine] = useState(null);
  const [chartDimensions, setChartDimensions] = useState(() => {
    const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 768;
    const isMediumScreen = typeof window !== 'undefined' && window.innerWidth < 1024;
    
    return {
      chartWidth: isSmallScreen ? 400 : isMediumScreen ? 600 : 1000,
      chartHeight: isSmallScreen ? 300 : isMediumScreen ? 350 : 450,
      padding: {
        top: isSmallScreen ? 20 : 30,
        right: isSmallScreen ? 60 : isMediumScreen ? 80 : 100,
        bottom: isSmallScreen ? 40 : 60,
        left: isSmallScreen ? 40 : 60
      }
    };
  });
  const bloombergGreen = '#0fff08';

  // Responsive chart dimensions and padding
  const getChartDimensions = () => {
    const isSmallScreen = window.innerWidth < 768;
    const isMediumScreen = window.innerWidth < 1024;
    
    return {
      chartWidth: isSmallScreen ? 400 : isMediumScreen ? 600 : 1000,
      chartHeight: isSmallScreen ? 300 : isMediumScreen ? 350 : 450,
      padding: {
        top: isSmallScreen ? 20 : 30,
        right: isSmallScreen ? 60 : isMediumScreen ? 80 : 100,
        bottom: isSmallScreen ? 40 : 60,
        left: isSmallScreen ? 40 : 60
      }
    };
  };

  const { chartWidth, chartHeight, padding } = chartDimensions;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Handle window resize for responsive chart
  useEffect(() => {
    const handleResize = () => {
      setChartDimensions(getChartDimensions());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize model color service when models are loaded
  useEffect(() => {
    if (models && models.length > 0) {
      modelColorService.initializeFromAPI(models);
    }
  }, [models]);

  // Handle WebSocket model data stream updates
  useEffect(() => {
    if (modelDataStream && modelDataStream.data) {
      // Handle both initial_modeldata and modeldata_update types
      if (modelDataStream.type === 'initial_modeldata' || 
          modelDataStream.type === 'initial_modeldata_update' ||
          modelDataStream.type === 'modeldata_update') {
        const transformedData = transformModelDataStreamToChart(modelDataStream);
        
        // For both initial and updates, replace all data to ensure complete dataset
        setChartData(transformedData.chartData);
        setModelNames(transformedData.modelNames);
        setLastUpdate(transformedData.lastUpdate);
      }
    }
  }, [modelDataStream]);

  // Get model data for display - use models from context with colors from service
  const displayModels = models.map(model => ({
    ...model,
    color: modelColorService.getColorByName(model.display_name) || model.color
  }));

  // Filter models and modelNames based on selectedModelForChart
  const filteredModelNames = selectedModelForChart 
    ? modelNames.filter(name => name === selectedModelForChart.display_name)
    : modelNames;

  const filteredDisplayModels = selectedModelForChart
    ? displayModels.filter(model => model.id === selectedModelForChart.id)
    : displayModels;

  // Trigger ping animation every 5 seconds for each model
  useEffect(() => {
    if (filteredDisplayModels.length > 0) {
      const interval = setInterval(() => {
        const newPingState = {};
        filteredDisplayModels.forEach(model => {
          newPingState[model.id] = true;
        });
        setPingActive(newPingState);
        
        setTimeout(() => {
          setPingActive({});
        }, 1500);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [filteredDisplayModels]);

  // Use real chart data or fallback to empty array
  const currentChartData = chartData.length > 0 ? chartData : [];
  const connectionInfo = getConnectionInfo();

  // Early return if no data
  if (loading || filteredDisplayModels.length === 0 || currentChartData.length === 0) {
    return (
    <div className="flex flex-col h-full font-mono overflow-hidden" style={{ backgroundColor: '#121212' }}>
      <div className="flex items-center justify-center h-full">
        <div className="text-bloomberg-primary text-sm">
          {loading ? 'Loading chart data...' : 
           error ? `Error: ${error}` : 
           !connectionInfo.modelDataConnected ? 'Connecting to data stream...' :
           'No data available'}
        </div>
      </div>
    </div>
  );
  }

  // Get the latest value for each model - ensures it's the account_value from the most recent timestamp
  const getLatestValue = (modelName) => {
    if (currentChartData.length === 0) return undefined;
    
    // Start from the most recent data point and work backwards to find the latest value for this model
    for (let i = currentChartData.length - 1; i >= 0; i--) {
      const dataPoint = currentChartData[i];
      if (dataPoint[modelName] !== undefined) {
        return dataPoint[modelName]; // This is the account_value from the latest timestamp
      }
    }
    return undefined;
  };

  // Calculate min and max values for scaling - use account_value from real data
  const allValues = [];
  currentChartData.forEach(dataPoint => {
    filteredModelNames.forEach(modelName => {
      if (dataPoint[modelName] !== undefined) {
        allValues.push(dataPoint[modelName]);
      }
    });
  });
  
  if (allValues.length === 0) {
    return (
      <div className="flex flex-col h-full font-mono overflow-hidden" style={{ backgroundColor: '#121212' }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-bloomberg-primary text-sm">No chart data available</div>
        </div>
      </div>
    );
  }

  const minValue = Math.min(...allValues) * 0.999;
  const maxValue = Math.max(...allValues) * 1.001;
  const valueRange = maxValue - minValue;

  // Scale functions
  const xScale = (index) => {
    // Always ensure the latest point is on the right side
    if (currentChartData.length <= 1) {
      return padding.left + innerWidth;
    }
    // Map the index to the chart width, with the last point always at the right edge
    return padding.left + (index / (currentChartData.length - 1)) * innerWidth;
  };

  const yScale = (value) => {
    return padding.top + innerHeight - ((value - minValue) / valueRange) * innerHeight;
  };

  // Generate line path from real data
  const generateLinePath = (modelName) => {
    const points = [];
    
    for (let i = 0; i < currentChartData.length; i++) {
      const dataPoint = currentChartData[i];
      if (dataPoint[modelName] !== undefined) {
        const x = xScale(i);
        const y = yScale(dataPoint[modelName]);
        points.push(`${points.length === 0 ? 'M' : 'L'} ${x} ${y}`);
      }
    }
    
    return points.join(' ');
  };

  // Format value in full rupees with commas
  const formatRupees = (value) => {
    if (value === undefined || value === null) return '0';
    return Math.round(value).toLocaleString('en-IN');
  };

  // Handle line hover
  const handleLineHover = (modelName) => {
    setHoveredLine(modelName);
  };

  // Handle line hover end
  const handleLineHoverEnd = () => {
    setHoveredLine(null);
  };

  // Handle line click - select model for chart view
  const handleLineClick = (modelName) => {
    const model = displayModels.find(m => m.display_name === modelName);
    if (model) {
      setSelectedModelForChart(model);
    }
  };
  const getIconPosition = (modelName) => {
    if (currentChartData.length === 0) return { x: 0, y: 0 };
    
    // Find the most recent data point that has this model's account_value
    for (let i = currentChartData.length - 1; i >= 0; i--) {
      const dataPoint = currentChartData[i];
      if (dataPoint[modelName] !== undefined) {
        return {
          x: xScale(i),
          y: yScale(dataPoint[modelName]) // This is the account_value from the latest timestamp
        };
      }
    }
    
    return { x: 0, y: 0 };
  };

  return (
    <div className="flex flex-col w-full h-full font-mono overflow-hidden p-3 sm:p-4" style={{ backgroundColor: '#121212' }}>
      {/* Chart Header - Bloomberg style */}
      <div className="flex items-center justify-between border-b border-gray-800 px-2 sm:px-3 py-1 sm:py-1.5 flex-shrink-0" style={{ backgroundColor: '#121212' }}>
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="bg-bloomberg-primary text-black px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-bold tracking-wider">
            GRAPH
          </div>
          <div className="text-[8px] sm:text-[10px] text-gray-400 font-normal tracking-wide hidden sm:block">
            TOTAL ACCOUNT VALUE
          </div>
          <div className="text-[8px] sm:text-[10px] text-gray-400 font-normal tracking-wide sm:hidden">
            VALUE
          </div>
          {selectedModelForChart && (
            <div className="text-[8px] sm:text-[10px] text-bloomberg-primary font-bold">
              - {selectedModelForChart.display_name}
            </div>
          )}
          {connectionInfo.modelDataConnected && (
            <div className="text-[7px] sm:text-[8px] text-green-400 font-normal">
              ● LIVE
            </div>
          )}
          {lastUpdate && (
            <div className="text-[7px] sm:text-[8px] text-gray-500 font-normal hidden sm:block">
              Updated: {new Date(lastUpdate).toLocaleTimeString()}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {selectedModelForChart ? (
            <button 
              className="px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-bold bg-bloomberg-primary text-black hover:opacity-80 transition-opacity"
              onClick={() => setSelectedModelForChart(null)}
            >
              ← BACK
            </button>
          ) : (
            <button 
              className="px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-bold bg-bloomberg-primary text-black hover:opacity-80 transition-opacity"
            >
              ALL
            </button>
          )}
          <button className="px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-bold border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors">
            TOP
          </button>
        </div>
      </div>

      {/* Chart SVG */}
      <div className="relative flex-1 w-full min-h-0 overflow-hidden">
        <svg 
          className="w-full h-full" 
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          style={{ minHeight: '200px' }}
        >
          {/* Grid lines - Bloomberg style */}
          <g>
            {[0, 1, 2, 3, 4].map(i => {
              const y = padding.top + (i / 4) * innerHeight;
              const value = maxValue - (i / 4) * valueRange;
              return (
                <g key={`grid-${i}`}>
                  <line 
                    x1={padding.left} 
                    y1={y} 
                    x2={chartWidth - padding.right} 
                    y2={y}
                    stroke="#333333"
                    strokeWidth="0.5"
                    opacity="0.6"
                  />
                  <text 
                    x={padding.left - 8} 
                    y={y + 3}
                    fontSize={chartWidth < 500 ? "7" : "9"}
                    fill="#888888"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    ₹{formatRupees(value)}
                  </text>
                </g>
              );
            })}
          </g>

          {/* X-axis labels - use real timestamps */}
          <g>
            {(() => {
              const indices = [];
              const step = Math.max(1, Math.floor(currentChartData.length / 8));
              
              for (let i = 0; i < currentChartData.length; i += step) {
                indices.push(i);
              }
              
              // Always include the last point if not already included
              if (indices[indices.length - 1] !== currentChartData.length - 1) {
                indices.push(currentChartData.length - 1);
              }
              
              return indices.map(actualIndex => {
                const d = currentChartData[actualIndex];
                const x = xScale(actualIndex);
                const date = new Date(d.timestamp);
                
                // Format label with date and time
                const dateLabel = `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
                const timeLabel = date.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                });
                
                return (
                  <g key={`x-label-${actualIndex}`}>
                    {/* Date label */}
                    <text 
                      x={x} 
                      y={chartHeight - padding.bottom + 12}
                      fontSize={chartWidth < 500 ? "6" : "8"}
                      fill="#888888"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {dateLabel}
                    </text>
                    {/* Time label */}
                    <text 
                      x={x} 
                      y={chartHeight - padding.bottom + 22}
                      fontSize={chartWidth < 500 ? "5" : "7"}
                      fill="#666666"
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      {timeLabel}
                    </text>
                  </g>
                );
              });
            })()}
          </g>

          {/* Model lines - use data from WebSocket */}
          {filteredModelNames.map((modelName) => {
            const model = filteredDisplayModels.find(m => m.display_name === modelName);
            const color = modelColorService.getColorByName(modelName) || (model ? model.color : '#FF6B35');
            const isHovered = hoveredLine === modelName;
            const isOtherLineHovered = hoveredLine && hoveredLine !== modelName;
            const opacity = isOtherLineHovered ? 0.3 : 1;
            
            return (
              <g key={`line-group-${modelName}`}>
                {/* Visible line */}
                <path
                  d={generateLinePath(modelName)}
                  fill="none"
                  stroke={color}
                  strokeWidth={isHovered ? "2" : "1.2"}
                  opacity={opacity}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  style={{ transition: 'opacity 0.2s ease, stroke-width 0.2s ease' }}
                />
                
                {/* Invisible hover zone - larger area for easier hovering */}
                <path
                  d={generateLinePath(modelName)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="12"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => handleLineHover(modelName)}
                  onMouseLeave={handleLineHoverEnd}
                  onClick={() => handleLineClick(modelName)}
                />
              </g>
            );
          })}

          {/* Icons at the end of each line */}
          {filteredModelNames.map((modelName) => {
            const model = filteredDisplayModels.find(m => m.display_name === modelName);
            if (!model) return null;
            
            const pos = getIconPosition(modelName);
            const iconPath = getModelIconPath(model.icon);
            const color = modelColorService.getColorByName(modelName) || model.color;
            const latestValue = getLatestValue(modelName);
            const isHovered = hoveredLine === modelName;
            const isOtherLineHovered = hoveredLine && hoveredLine !== modelName;
            const opacity = isOtherLineHovered ? 0.3 : 1;
            
            return (
              <g 
                key={`icon-${modelName}`} 
                transform={`translate(${pos.x}, ${pos.y})`}
                style={{ 
                  opacity: opacity, 
                  transition: 'opacity 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={() => handleLineHover(modelName)}
                onMouseLeave={handleLineHoverEnd}
                onClick={() => handleLineClick(modelName)}
              >
                {/* Animated blip ring */}
                <circle
                  cx={0}
                  cy={0}
                  r={10}
                  fill={color}
                  opacity="0"
                >
                  <animate
                    attributeName="r"
                    from="10"
                    to="35"
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    from="0.7"
                    to="0"
                    dur="2.5s"
                    repeatCount="indefinite"
                  />
                </circle>
                
                {/* Icon circle */}
                <circle
                  cx={0}
                  cy={0}
                  r={isHovered ? 12 : 10}
                  fill={color}
                  stroke="none"
                  style={{ transition: 'r 0.2s ease' }}
                />
                
                {/* Icon representation */}
                {iconPath ? (
                  <foreignObject x={-8} y={-8} width={16} height={16}>
                    <img 
                      src={iconPath} 
                      alt={modelName}
                      style={{ 
                        width: '16px', 
                        height: '16px', 
                        borderRadius: '50%',
                        filter: 'brightness(0) invert(1)'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <text
                      x={8}
                      y={12}
                      textAnchor="middle"
                      alignmentBaseline="central"
                      fontSize="8"
                      fontWeight="bold"
                      fill="white"
                      fontFamily="monospace"
                      style={{ display: 'none' }}
                    >
                      {getModelIconFallback(model.code_name || modelName)}
                    </text>
                  </foreignObject>
                ) : (
                  <text
                    x={0}
                    y={0}
                    textAnchor="middle"
                    alignmentBaseline="central"
                    fontSize="8"
                    fontWeight="bold"
                    fill="white"
                    fontFamily="monospace"
                  >
                    {getModelIconFallback(model.code_name || modelName)}
                  </text>
                )}
                
                {/* Value label box - shows account_value from latest timestamp */}
                <rect
                  x={18}
                  y={-6}
                  width={chartWidth < 500 ? 50 : 60}
                  height={chartWidth < 500 ? 10 : 12}
                  fill={color}
                  stroke="none"
                  rx={1}
                  ry={1}
                />
                <text
                  x={chartWidth < 500 ? 43 : 48}
                  y={0}
                  textAnchor="middle"
                  alignmentBaseline="central"
                  fontSize={chartWidth < 500 ? "6.5" : "7.5"}
                  fontWeight="bold"
                  fill="#000000"
                  fontFamily="monospace"
                >
                  ₹{formatRupees(latestValue)}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend at bottom - use real model data */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-wrap justify-center gap-2 sm:gap-3 px-2 sm:px-4 py-1 sm:py-2 border-t border-gray-800 flex-shrink-0" style={{ backgroundColor: '#121212' }}>
          {filteredDisplayModels.map(model => {
            // Only show models that have data in the chart
            if (!filteredModelNames.includes(model.display_name)) return null;
            
            const iconPath = getModelIconPath(model.icon);
            const color = modelColorService.getColorByName(model.display_name) || model.color;
            const isHovered = hoveredLine === model.display_name;
            const isOtherLineHovered = hoveredLine && hoveredLine !== model.display_name;
            const opacity = isOtherLineHovered ? 0.3 : 1;
            
            return (
              <div 
                key={model.display_name} 
                className="flex items-center space-x-1 sm:space-x-1.5 cursor-pointer transition-opacity duration-200"
                style={{ opacity: opacity }}
                onMouseEnter={() => handleLineHover(model.display_name)}
                onMouseLeave={handleLineHoverEnd}
                onClick={() => handleLineClick(model.display_name)}
              >
                {iconPath ? (
                  <img 
                    src={iconPath} 
                    alt={model.display_name}
                    className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full object-cover"
                    style={{ filter: 'brightness(0.8)' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'inline-block';
                    }}
                  />
                ) : null}
                <div 
                  className={`${iconPath ? 'hidden' : 'inline-block'} w-4 h-1.5 sm:w-6 sm:h-2`}
                  style={{ backgroundColor: color }}
                />
                <span className="text-[8px] sm:text-[10px] font-mono" style={{ color: color }}>
                  {!iconPath && model.icon ? model.icon + ' ' : ''}{model.display_name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChartPlaceholder;