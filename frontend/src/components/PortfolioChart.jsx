import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { chartData } from '../mock/mockData';
import { useModels } from '../context/ModelsContext';
import { getModelIconPath, getModelIconFallback } from '../lib/utils';

const PortfolioChart = () => {
  const [pingActive, setPingActive] = useState({});
  const customGreen = '#0FFF08';
  const { models, loading, error } = useModels();

  // Trigger ping animation every 5 seconds for each model
  useEffect(() => {
    if (models.length === 0) return;
    
    const interval = setInterval(() => {
      const newPingState = {};
      models.forEach(model => {
        newPingState[model.id] = true;
      });
      setPingActive(newPingState);
      
      // Reset after animation completes
      setTimeout(() => {
        setPingActive({});
      }, 1500);
    }, 5000);

    return () => clearInterval(interval);
  }, [models]);

  const formatYAxis = (value) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value}`;
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  // Get the latest value for each model to position icons
  const getLatestValue = (modelName) => {
    const latestData = chartData[chartData.length - 1];
    return latestData[modelName] || Math.random() * 5000 + 8000; // Fallback with mock value
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-gray-800 p-6 flex items-center justify-center" style={{ height: '100%' }}>
        <div className="text-center text-gray-400">Loading models...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-zinc-900 border border-gray-800 p-6 flex items-center justify-center" style={{ height: '100%' }}>
        <div className="text-center text-red-500">Error loading models: {error}</div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-gray-800 p-6 flex flex-col" style={{ height: '100%' }}>
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center space-x-4">
          <button className="p-2 hover:bg-gray-800 rounded transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-400">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </button>
        </div>
        
        <h2 className="text-sm font-bold tracking-wide" style={{ color: customGreen }}>TOTAL ACCOUNT VALUE</h2>
        
        <div className="flex items-center space-x-2">
          <button 
            className="px-3 py-1 text-xs font-bold text-black rounded transition-colors"
            style={{ backgroundColor: customGreen }}
            onMouseEnter={(e) => e.target.style.opacity = '0.8'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            ALL
          </button>
          <button className="px-3 py-1 text-xs font-bold bg-transparent border border-gray-700 text-gray-400 rounded hover:bg-gray-800 transition-colors">
            TOP
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative flex-1" style={{ minHeight: '500px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart 
            data={chartData} 
            margin={{ top: 10, right: 100, left: 10, bottom: 30 }}
          >
            {/* Bloomberg-style grid - thin, subtle lines */}
            <CartesianGrid 
              strokeDasharray="1 1" 
              stroke="rgba(255, 107, 53, 0.1)" 
              vertical={true}
              horizontal={true}
            />
            
            {/* X-Axis - Bloomberg style */}
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              tick={{ fontSize: 9, fill: '#666', fontFamily: 'monospace' }}
              stroke="rgba(255, 107, 53, 0.3)"
              tickLine={{ stroke: 'rgba(255, 107, 53, 0.3)' }}
              interval="preserveStartEnd"
              minTickGap={50}
              height={30}
            />
            
            {/* Y-Axis - Bloomberg style */}
            <YAxis 
              tickFormatter={formatYAxis}
              tick={{ fontSize: 9, fill: '#666', fontFamily: 'monospace' }}
              stroke="rgba(255, 107, 53, 0.3)"
              tickLine={{ stroke: 'rgba(255, 107, 53, 0.3)' }}
              domain={['auto', 'auto']}
              width={60}
            />
            
            {/* Bloomberg-style tooltip */}
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.95)', 
                border: '2px solid #ff6b35',
                borderRadius: '0px',
                fontSize: '10px',
                padding: '8px',
                color: '#fff',
                fontFamily: 'monospace'
              }}
              itemStyle={{
                color: '#fff',
                fontSize: '10px',
                fontFamily: 'monospace'
              }}
              formatter={(value, name) => [`₹${value.toLocaleString('en-IN')}`, name]}
              labelFormatter={formatDate}
              labelStyle={{ 
                color: customGreen, 
                fontWeight: 'bold',
                fontSize: '10px',
                fontFamily: 'monospace',
                borderBottom: '1px solid #ff6b35',
                paddingBottom: '4px',
                marginBottom: '4px'
              }}
            />
            
            {/* Compact legend */}
            <Legend 
              wrapperStyle={{ 
                fontSize: '9px', 
                paddingTop: '5px', 
                color: '#fff',
                fontFamily: 'monospace'
              }}
              iconType="plainline"
              iconSize={12}
            />
            
            {/* Total line (dashed) - Bloomberg gray */}
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#666" 
              strokeWidth={1.5}
              strokeDasharray="3 3"
              dot={false}
              name="TOTAL"
              animationDuration={800}
            />
            
            {/* Individual model lines with brand colors */}
            {models.map(model => (
              <Line
                key={model.id}
                type="monotone"
                dataKey={model.display_name || model.name}
                stroke={model.color}
                strokeWidth={2}
                dot={false}
                name={(model.display_name || model.name).toUpperCase()}
                animationDuration={800}
                activeDot={{ 
                  r: 4, 
                  fill: model.color,
                  stroke: '#000',
                  strokeWidth: 1
                }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Animated Model Icons */}
        <div className="absolute top-0 right-0 h-full flex flex-col justify-around pr-2">
          {models.map((model, index) => {
            const yPosition = 10 + (index * 15);
            const iconPath = getModelIconPath(model.icon);
            return (
              <div
                key={model.id}
                className="relative"
                style={{ 
                  marginTop: `${yPosition}%`,
                }}
              >
                {/* Radar Ping Animation */}
                {pingActive[model.id] && (
                  <>
                    <div 
                      className="absolute inset-0 rounded-full animate-ping"
                      style={{
                        backgroundColor: model.color,
                        opacity: 0.75,
                        width: '40px',
                        height: '40px',
                        left: '-8px',
                        top: '-8px',
                      }}
                    />
                    <div 
                      className="absolute inset-0 rounded-full animate-ping"
                      style={{
                        backgroundColor: model.color,
                        opacity: 0.5,
                        width: '40px',
                        height: '40px',
                        left: '-8px',
                        top: '-8px',
                        animationDelay: '0.2s'
                      }}
                    />
                  </>
                )}
                
                {/* Model Icon Badge */}
                <div 
                  className="relative flex items-center space-x-2 transition-all duration-300 hover:scale-110"
                  style={{
                    transform: pingActive[model.id] ? 'scale(1.15)' : 'scale(1)',
                  }}
                >
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shadow-lg p-1"
                    style={{ 
                      backgroundColor: model.color,
                      boxShadow: `0 0 20px ${model.color}80`,
                    }}
                  >
                    {iconPath ? (
                      <img 
                        src={iconPath} 
                        alt={model.display_name || model.name} 
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
                      className="text-white font-bold text-xs"
                      style={{ display: iconPath ? 'none' : 'block' }}
                    >
                      {getModelIconFallback(model.code_name)}
                    </span>
                  </div>
                  <div 
                    className="bg-zinc-900 border px-2 py-1 rounded shadow-md text-xs font-bold text-white"
                    style={{ borderColor: model.color }}
                  >
                    ${(getLatestValue(model.display_name || model.name) / 1000).toFixed(1)}k
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PortfolioChart;