import React, { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { chartData } from '../mock/mockData';
import { useModels } from '../context/ModelsContext';
import { getModelIconPath, getModelIconFallback } from '../lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PortfolioChart = () => {
  const [pingActive, setPingActive] = useState({});
  const customGreen = '#0FFF08';
  const { models, loading, error } = useModels();
  const chartRef = useRef(null);

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

  // Prepare chart data
  const labels = chartData.map(d => {
    const date = new Date(d.date);
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  });

  // Create datasets for each model
  const datasets = [
    // Total line (dashed)
    {
      label: 'Total',
      data: chartData.map(d => d.total),
      borderColor: '#888',
      backgroundColor: 'rgba(136, 136, 136, 0.1)',
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 0,
      tension: 0.4
    },
    // Individual model lines
    ...models.map(model => ({
      label: model.display_name || model.name,
      data: chartData.map(d => d[model.display_name || model.name] || 0),
      borderColor: model.color,
      backgroundColor: `${model.color}20`,
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.4
    }))
  ];

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#fff',
          font: {
            size: 10
          },
          usePointStyle: true,
          padding: 15
        }
      },
      tooltip: {
        backgroundColor: '#18181b',
        titleColor: customGreen,
        bodyColor: '#fff',
        borderColor: '#333',
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += '$' + context.parsed.y.toLocaleString();
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: '#333',
          drawBorder: false
        },
        ticks: {
          color: '#888',
          font: {
            size: 11
          },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8
        }
      },
      y: {
        grid: {
          color: '#333',
          drawBorder: false
        },
        ticks: {
          color: '#888',
          font: {
            size: 11
          },
          callback: function(value) {
            if (value >= 1000) {
              return '$' + (value / 1000).toFixed(0) + 'k';
            }
            return '$' + value;
          }
        }
      }
    }
  };

  const data = {
    labels,
    datasets
  };

  // Get the latest value for each model
  const getLatestValue = (modelName) => {
    const latestData = chartData[chartData.length - 1];
    return latestData[modelName];
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
        <div style={{ height: '100%', position: 'relative' }}>
          <Line ref={chartRef} options={options} data={data} />
        </div>

        {/* Animated Model Icons - Fixed positioning */}
        <div className="absolute top-0 right-0 h-full flex flex-col justify-around pr-2 pointer-events-none">
          {models.map((model, index) => {
            const yPosition = 10 + (index * 15);
            const iconPath = getModelIconPath(model.icon);
            return (
              <div
                key={model.id}
                className="relative pointer-events-auto"
                style={{ 
                  marginTop: `${yPosition}%`,
                }}
              >
                {/* Radar Ping Animation - Only background pulses */}
                {pingActive[model.id] && (
                  <>
                    <div 
                      className="absolute rounded-full"
                      style={{
                        backgroundColor: model.color,
                        opacity: 0.75,
                        width: '40px',
                        height: '40px',
                        left: '-8px',
                        top: '-8px',
                        animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) 1'
                      }}
                    />
                    <div 
                      className="absolute rounded-full"
                      style={{
                        backgroundColor: model.color,
                        opacity: 0.5,
                        width: '40px',
                        height: '40px',
                        left: '-8px',
                        top: '-8px',
                        animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) 1',
                        animationDelay: '0.2s'
                      }}
                    />
                  </>
                )}
                
                {/* Model Icon Badge - No scaling */}
                <div className="relative flex items-center space-x-2 transition-opacity duration-300 hover:opacity-80">
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
                      {getModelIconFallback(model.code_name || model.display_name)}
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

export default PortfolioChartNew;
