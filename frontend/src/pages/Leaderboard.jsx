import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useModels } from '../context/ModelsContext';
import { useWebSocket } from '../context/WebSocketContext';
import { getModelIconPath, getModelIconFallback } from '../lib/utils';
import { 
  transformModelsToLeaderboard, 
  formatCurrency, 
  formatPercent, 
  formatNumber
} from '../lib/dataTransformers';
import { getSafeColor } from '../utils/colorUtils';

const Leaderboard = () => {
  const navigate = useNavigate();
  const { models, loading, error } = useModels();
  const { modelDataStream, lastModelDataStreamUpdate } = useWebSocket();
  const [leaderboardData, setLeaderboardData] = useState([]);

  // Update leaderboard data when WebSocket receives new model data stream
  useEffect(() => {
    if (modelDataStream && modelDataStream.data) {
      // Handle 'initial_modeldata', 'modeldata_update', and 'initial_modeldata_update' types
      if (modelDataStream.type === 'modeldata_update' || 
          modelDataStream.type === 'initial_modeldata_update' || 
          modelDataStream.type === 'initial_modeldata') {
        
        // Transform WebSocket data to leaderboard format
        const wsData = Object.entries(modelDataStream.data).map(([modelId, modelData]) => {
          // Find the corresponding model from the models context to get display info
          const modelInfo = models.find(m => m.id === parseInt(modelId)) || {};
          
          // Get data_points array and find the latest one
          let latestData = null;
          if (modelData.data_points && Array.isArray(modelData.data_points) && modelData.data_points.length > 0) {
            // Sort by created_at timestamp to get the latest
            const sortedPoints = [...modelData.data_points].sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            latestData = sortedPoints[0]; // Get the most recent data point
          }
          
          if (!latestData) {
            return null; // Skip models without data points
          }
          
          const modelEntry = {
            rank: 0, // Will be re-sorted below
            model: modelInfo.display_name || modelData.display_name || `Model ${modelId}`,
            codeName: modelInfo.code_name || modelData.code_name || modelId,
            id: parseInt(modelId),
            acctValue: latestData.account_value || 0,
            returnPercent: latestData.return_value || 0,
            totalPL: latestData.total_pnl || 0,
            fees: latestData.fees || 0,
            trades: latestData.trades || 0,
            color: getSafeColor(modelInfo.color),
            logo: `/ai_logo/${modelInfo.icon}`,
            icon: modelInfo.icon,
            provider: modelInfo.provider,
            activePositions: modelInfo.activePositions || []
          };
          
          return modelEntry;
        }).filter(model => model !== null); // Remove null entries

        // Sort by account value (highest first) and reassign ranks
        const sortedData = wsData
          .sort((a, b) => b.acctValue - a.acctValue)
          .map((model, index) => ({
            ...model,
            rank: index + 1
          }));

        setLeaderboardData(sortedData);
      }
    } else if (models.length > 0 && leaderboardData.length === 0) {
      // Fallback to API data if no WebSocket data yet
      setLeaderboardData(transformModelsToLeaderboard(models));
    }
  }, [modelDataStream, models, lastModelDataStreamUpdate]);

  const winningModel = leaderboardData[0];

  const handleModelClick = (model) => {
    navigate(`/models/${model.id}`);
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex flex-col overflow-hidden font-mono">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-bloomberg-primary text-lg">Loading leaderboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-black flex flex-col overflow-hidden font-mono">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-red-500 text-lg">Error loading data: {error}</div>
        </div>
      </div>
    );
  }

  if (leaderboardData.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col overflow-hidden font-mono">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-500 text-lg mb-4">No trading data available yet</div>
            <div className="text-gray-600 text-sm">
              <div>WebSocket Status: {modelDataStream ? 'Connected' : 'Waiting...'}</div>
              <div>Models Loaded: {models.length}</div>
              <div>Last Update: {lastModelDataStreamUpdate ? lastModelDataStreamUpdate.toLocaleTimeString() : 'None'}</div>
              <div className="mt-4 text-xs">
                {modelDataStream && <pre className="text-left max-w-2xl overflow-auto">{JSON.stringify(modelDataStream, null, 2).slice(0, 500)}...</pre>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden font-mono">
      <Header />
      
      {/* Compact Title Bar */}
      <div className="px-3 md:px-6 py-2 border-b-2 border-bloomberg-primary bg-gray-900 flex items-center justify-between gap-2">
        <h1 className="text-sm md:text-xl font-bold text-bloomberg-primary tracking-wider">LEADERBOARD</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Compact Leaderboard Table */}
        <div className="p-4">
              <div className="border border-bloomberg-primary overflow-x-auto">
                <table className="w-full text-[11px] min-w-[550px]">
                  <thead>
                    <tr className="bg-bloomberg-primary text-black">
                      <th className="px-2 py-2 text-left font-bold">MODEL</th>
                      <th className="px-2 py-2 text-right font-bold">ACCT VALUE</th>
                      <th className="px-2 py-2 text-right font-bold">RET%</th>
                      <th className="px-2 py-2 text-right font-bold">P&L</th>
                      <th className="px-2 py-2 text-right font-bold">FEES</th>
                      <th className="px-2 py-2 text-right font-bold">TRADES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.map((model, index) => (
                      <tr
                        key={model.id}
                        onClick={() => handleModelClick(model)}
                        className="border-t border-gray-700 hover:bg-gray-900 transition-colors cursor-pointer"
                      >
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <img 
                              src={model.logo} 
                              alt={model.model}
                              className="w-4 h-4 object-contain"
                              style={{ filter: 'brightness(0) invert(1)' }}
                              onError={(e) => {
                                // Fallback to icon if image fails
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'block';
                              }}
                            />
                            <span 
                              className="w-4 h-4 text-xs font-bold text-white rounded flex items-center justify-center"
                              style={{ 
                                backgroundColor: getSafeColor(model.color),
                                display: 'none'
                              }}
                            >
                              {getModelIconFallback(model.codeName)}
                            </span>
                            <span style={{ color: getSafeColor(model.color) }} className="font-bold text-xs">
                              {model.model}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-right text-white font-bold">
                          {formatCurrency(model.acctValue)}
                        </td>
                        <td className={`px-2 py-2 text-right font-bold ${
                          model.returnPercent >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {formatPercent(model.returnPercent)}%
                        </td>
                        <td className={`px-2 py-2 text-right font-bold ${
                          model.totalPL >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {formatNumber(model.totalPL)}
                        </td>
                        <td className="px-2 py-2 text-right text-white">
                          {formatCurrency(model.fees)}
                        </td>
                        <td className="px-2 py-2 text-right text-white">{model.trades}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Compact Bottom Section */}
            <div className="px-4 pb-4">
              <div className="flex flex-col lg:grid lg:grid-cols-[280px_1fr] gap-3">
                {/* Compact Winning Model Card */}
                <div className="border border-bloomberg-primary p-4 bg-gray-900">
                  <h3 className="text-bloomberg-primary text-[10px] font-bold mb-3 tracking-wider">
                    TOP PERFORMER
                  </h3>
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {getModelIconPath(winningModel.logo || winningModel.icon) ? (
                        <img 
                          src={getModelIconPath(winningModel.logo || winningModel.icon)} 
                          alt={winningModel.model}
                          className="w-8 h-8 object-contain"
                          style={{ filter: 'brightness(0) invert(1)' }}
                          onError={(e) => {
                            // Fallback to text if image fails to load
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-8 h-8 text-sm font-bold text-white rounded flex items-center justify-center"
                        style={{ 
                          backgroundColor: getSafeColor(winningModel.color),
                          display: getModelIconPath(winningModel.logo || winningModel.icon) ? 'none' : 'flex' 
                        }}
                      >
                        {getModelIconFallback(winningModel.codeName)}
                      </div>
                      <span 
                        style={{ color: getSafeColor(winningModel.color) }} 
                        className="text-sm font-bold leading-tight"
                      >
                        {winningModel.model}
                      </span>
                    </div>
                    <div className="mb-3 pb-3 border-b border-gray-700">
                      <div className="text-gray-400 text-[10px] mb-1">EQUITY</div>
                      <div className="text-white text-lg font-bold">
                        {formatCurrency(winningModel.acctValue)}
                      </div>
                    </div>
                    <div className="mb-3 pb-3 border-b border-gray-700">
                      <div className="text-gray-400 text-[10px] mb-1">RETURN</div>
                      <div className={`text-lg font-bold ${
                        winningModel.returnPercent >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {formatPercent(winningModel.returnPercent)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-[10px] mb-2">POSITIONS</div>
                      <div className="flex gap-2">
                        {winningModel.activePositions.map((crypto, idx) => (
                          <div 
                            key={idx}
                            className="w-7 h-7 rounded bg-gray-800 border border-bloomberg-primary flex items-center justify-center text-[10px] font-bold text-white"
                          >
                            {crypto === 'BTC' && '₿'}
                            {crypto === 'ETH' && 'Ξ'}
                            {crypto === 'SOL' && '◎'}
                            {crypto === 'XRP' && '✕'}
                            {crypto === 'DOGE' && 'Ð'}
                            {crypto === 'ARB' && 'A'}
                            {crypto === 'MATIC' && 'M'}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compact Bar Chart */}
                <div className="border border-bloomberg-primary p-4 bg-black">
                  <div className="text-bloomberg-primary text-[10px] font-bold mb-2">EQUITY COMPARISON</div>
                  <div className="h-[220px] flex items-end justify-around gap-2">
                    {leaderboardData.map((model) => {
                      const maxValue = Math.max(...leaderboardData.map(m => m.acctValue));
                      const minValue = Math.min(...leaderboardData.map(m => m.acctValue));
                      const heightPercent = 20 + ((model.acctValue - minValue) / (maxValue - minValue)) * 80;
                      
                      return (
                        <div key={model.rank} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                          <div className="text-white text-[10px] font-bold mb-1">
                            {formatCurrency(model.acctValue)}
                          </div>
                          <div 
                            className="w-full rounded-t transition-all hover:opacity-80 relative flex flex-col items-center justify-end pb-2"
                            style={{ 
                              backgroundColor: getSafeColor(model.color),
                              height: `${heightPercent}%`
                            }}
                          >
                            <div className="bg-black bg-opacity-40 rounded p-1">
                              <img 
                                src={model.logo} 
                                alt={model.model}
                                className="w-6 h-6 object-contain"
                                style={{ filter: 'brightness(0) invert(1)' }}
                                onError={(e) => {
                                  // Fallback to text if image fails
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div 
                                className="w-6 h-6 text-xs font-bold text-white rounded flex items-center justify-center"
                                style={{ display: 'none' }}
                              >
                                {getModelIconFallback(model.codeName)}
                              </div>
                            </div>
                          </div>
                          <div className="text-white text-[9px] font-bold text-center leading-tight w-full">
                            {model.model}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            {/* Compact Footer Note */}
            <div className="mt-2 text-gray-500 text-[10px] px-1">
              Stats reflect completed trades only. Active positions excluded until closed.
            </div>
          </div>
      </div>
    </div>
  );
};

export default Leaderboard;
