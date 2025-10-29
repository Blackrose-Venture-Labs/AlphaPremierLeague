import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import { useModels } from '../context/ModelsContext';
import { useWebSocket } from '../context/WebSocketContext';

const ModelDetails = () => {
  const { modelId } = useParams();
  const { models, loading, error, getModelById } = useModels();
  const { modelDataStream, modelData } = useWebSocket();
  
  const model = getModelById(modelId);
  
  // Extract model data from WebSocket streams
  const details = useMemo(() => {
    if (!model) {
      return null;
    }

    // Get account statistics from modelDataStream
    let accountValue = 100000;
    let totalPL = 0;
    let returnValue = 0;
    let totalFees = 0;
    let totalTrades = 0;
    let biggestWin = 0;
    let biggestLoss = 0;
    let winRate = 0;

    if (modelDataStream && modelDataStream.data && modelDataStream.data[modelId]) {
      const modelStreamData = modelDataStream.data[modelId];
      if (modelStreamData.data_points && modelStreamData.data_points.length > 0) {
        const sortedDataPoints = [...modelStreamData.data_points].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const latestPoint = sortedDataPoints[sortedDataPoints.length - 1];
        
        accountValue = latestPoint.account_value || 100000;
        totalPL = latestPoint.total_pnl || 0;
        returnValue = latestPoint.return_value || 0;
        totalFees = latestPoint.fees || 0;
        totalTrades = latestPoint.trades || 0;

        // Calculate biggest win/loss from data points
        for (let i = 1; i < sortedDataPoints.length; i++) {
          const prevPL = sortedDataPoints[i - 1].total_pnl || 0;
          const currPL = sortedDataPoints[i].total_pnl || 0;
          const change = currPL - prevPL;
          if (change > biggestWin) biggestWin = change;
          if (change < biggestLoss) biggestLoss = change;
        }

        // Calculate win rate
        let wins = 0;
        for (let i = 1; i < sortedDataPoints.length; i++) {
          const prevPL = sortedDataPoints[i - 1].total_pnl || 0;
          const currPL = sortedDataPoints[i].total_pnl || 0;
          if (currPL > prevPL) wins++;
        }
        winRate = sortedDataPoints.length > 1 ? (wins / (sortedDataPoints.length - 1)) * 100 : 0;
      }
    }

    // Get individual trades from modelData (trade_updates)
    let recentTrades = [];
    let currentPositions = [];
    
    if (modelData) {
      // Check for combined_update format
      if (modelData.type === 'combined_update' && modelData.trade_updates && modelData.trade_updates.data) {
        // Filter trades for this specific model using ai_model_id
        const filteredTrades = modelData.trade_updates.data.filter(trade => {
          return trade.ai_model_id === parseInt(modelId);
        });
        
        recentTrades = filteredTrades
          .map(trade => ({
            id: trade.id,
            timestamp: trade.last_update_time,
            asset: trade.asset,
            side: trade.side,
            price: trade.price || 0,
            quantity: trade.quantity || 0,
            notionalValue: trade.notional_value || 0,
            model: trade.display_name,
          }))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 50);
      }
      // Check for legacy trade_updates format
      else if ((modelData.type === 'trade_updates' || modelData.type === 'trades_updates') && modelData.data) {
        const filteredTrades = modelData.data.filter(trade => trade.ai_model_id === parseInt(modelId));
        
        recentTrades = filteredTrades
          .map(trade => ({
            id: trade.id,
            timestamp: trade.last_update_time,
            asset: trade.asset,
            side: trade.side,
            price: trade.price || 0,
            quantity: trade.quantity || 0,
            notionalValue: trade.notional_value || 0,
            model: trade.display_name,
          }))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 50);
      }

      // Get position data for this model
      if (modelData.type === 'combined_update' && modelData.position_updates && modelData.position_updates.data) {
        const filteredPositions = modelData.position_updates.data.filter(pos => pos.ai_model_id === parseInt(modelId));
        currentPositions = filteredPositions
          .map(pos => ({
            asset: pos.asset,
            percentage: pos.percentage || 0,
            value: pos.value || 0,
            quantity: pos.quantity || 0,
            pnl: pos.pnl || 0,
          }))
          .sort((a, b) => b.percentage - a.percentage);
      }
    }

    // Return data even if no trades yet (but we have account data from modelDataStream)
    return {
      totalAccountValue: accountValue,
      availableCash: accountValue * 0.3, // Estimate 30% cash
      totalPL: totalPL,
      netRealized: totalPL,
      totalUnrealizedPL: 0,
      totalFees: totalFees,
      returnValue: returnValue,
      avgLeverage: 1,
      avgConfidence: 0,
      biggestWin: biggestWin,
      biggestLoss: biggestLoss,
      totalTrades: totalTrades,
      winRate: winRate,
      recentTrades: recentTrades,
      currentPositions: currentPositions,
      activePositions: [],
      holdTimes: { long: 40, short: 35, flat: 25 }
    };
  }, [model, modelDataStream, modelData, modelId]);

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center font-mono">
        <div className="text-bloomberg-primary text-xl">Loading model details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-black flex items-center justify-center font-mono">
        <div className="text-red-500 text-xl">Error: {error}</div>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="h-screen bg-black flex items-center justify-center font-mono">
        <div className="text-white text-xl">Model not found</div>
      </div>
    );
  }

  if (!modelDataStream || !modelDataStream.data) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center font-mono">
        <div className="text-bloomberg-primary text-xl mb-2">Waiting for live data...</div>
        <div className="text-gray-500 text-sm">Connecting to WebSocket stream</div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center font-mono">
        <div className="text-white text-xl mb-2">No data available for {model.display_name}</div>
        <div className="text-gray-500 text-sm">This model may not have started trading yet</div>
        <Link to="/" className="mt-4 px-4 py-2 bg-bloomberg-primary text-black hover:bg-opacity-80 transition-colors text-sm font-bold">
          ← BACK TO LIVE
        </Link>
      </div>
    );
  }

  const formatCurrency = (value) => {
    return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatNumber = (value) => {
    if (value >= 0) {
      return `+${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPercentage = (value) => {
    if (value >= 0) {
      return `+${value.toFixed(2)}%`;
    }
    return `${value.toFixed(2)}%`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Convert model color to subtle background
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };
  
  const rgb = hexToRgb(model.color);
  const subtleBackground = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)` : 'rgb(0, 0, 0)';
  const borderColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)` : '#ff6b35';
  const headerBackground = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.15)` : 'rgb(31, 41, 55)';

  return (
    <div className="min-h-screen flex flex-col font-mono" style={{ backgroundColor: subtleBackground }}>
      <Header />
      
      {/* Compact Page Header */}
      <div 
        className="px-3 md:px-6 py-2 border-b-2"
        style={{ 
          borderColor: borderColor,
          backgroundColor: headerBackground
        }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 md:gap-4 w-full md:w-auto">
            <Link to="/" className="px-2 md:px-3 py-1 bg-black border border-bloomberg-primary text-bloomberg-primary hover:bg-bloomberg-primary hover:text-black transition-colors text-xs font-bold">
              ← LIVE
            </Link>
            <Link to="/leaderboard" className="px-2 md:px-3 py-1 bg-black border border-bloomberg-primary text-bloomberg-primary hover:bg-bloomberg-primary hover:text-black transition-colors text-xs font-bold">
              BOARD
            </Link>
            <div className="flex items-center gap-2 border-l-2 border-bloomberg-primary pl-2 md:pl-4">
              <div 
                className="w-6 h-6 md:w-8 md:h-8 rounded-sm flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundColor: model.color }}
              >
                {model.code_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-base md:text-xl font-bold leading-tight" style={{ color: model.color }}>{model.display_name}</h1>
                <div className="text-[10px] text-gray-400">PERFORMANCE MONITOR</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
            <div className="text-right border-r border-gray-700 pr-2 md:pr-4 flex-1 md:flex-initial">
              <div className="text-gray-400 text-[10px]">ACCT VALUE</div>
              <div className="text-white text-xs md:text-sm font-bold">{formatCurrency(details.totalAccountValue)}</div>
            </div>
            <div className="text-right border-r border-gray-700 pr-2 md:pr-4 flex-1 md:flex-initial">
              <div className="text-gray-400 text-[10px]">CASH</div>
              <div className="text-white text-xs md:text-sm font-bold">{formatCurrency(details.availableCash)}</div>
            </div>
            <button className="px-2 md:px-3 py-1 bg-black border border-bloomberg-primary text-bloomberg-primary hover:bg-bloomberg-primary hover:text-black transition-colors text-xs font-bold">
              WALLET
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Bloomberg Style */}
      <div className="flex-1 overflow-auto">
        {/* Top Performance Bar */}
        <div 
          className="border-b-2 px-3 md:px-6 py-3"
          style={{ 
            borderColor: borderColor,
            backgroundColor: 'rgba(0, 0, 0, 0.6)'
          }}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-6">
            <div>
              <div className="text-gray-400 text-[10px] mb-1">TOTAL P&L</div>
              <div className={`text-base md:text-xl font-bold ${details.totalPL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatNumber(details.totalPL)}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-[10px] mb-1">RETURN %</div>
              <div className={`text-base md:text-xl font-bold ${details.returnValue >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatPercentage(details.returnValue)}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-[10px] mb-1">TOTAL FEES</div>
              <div className="text-white text-base md:text-xl font-bold">{formatCurrency(details.totalFees)}</div>
            </div>
            <div>
              <div className="text-gray-400 text-[10px] mb-1">TOTAL TRADES</div>
              <div className="text-white text-base md:text-xl font-bold">{details.totalTrades}</div>
            </div>
            <div>
              <div className="text-gray-400 text-[10px] mb-1">WIN RATE</div>
              <div className={`text-base md:text-xl font-bold ${details.winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                {details.winRate.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-[10px] mb-1">UTILIZATION</div>
              <div className="text-white text-base md:text-xl font-bold">
                {((1 - details.availableCash / details.totalAccountValue) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] lg:h-[calc(100vh-180px)]">
          {/* Left Column - Positions & Trades */}
          <div 
            className="lg:border-r-2 overflow-auto"
            style={{ borderColor: borderColor }}
          >
            {/* Statistics Panel */}
            <div 
              className="border-b-2 p-3 md:p-4"
              style={{ 
                borderColor: borderColor,
                backgroundColor: 'rgba(0, 0, 0, 0.4)'
              }}
            >
              <div className="text-xs font-bold mb-3" style={{ color: model.color }}>PERFORMANCE STATISTICS</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                <div 
                  className="border p-3"
                  style={{ 
                    borderColor: borderColor,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <div className="text-gray-400 text-[10px] mb-1">BIGGEST WIN</div>
                  <div className="text-green-500 text-base md:text-lg font-bold">{formatNumber(details.biggestWin)}</div>
                </div>
                <div 
                  className="border p-3"
                  style={{ 
                    borderColor: borderColor,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <div className="text-gray-400 text-[10px] mb-1">BIGGEST LOSS</div>
                  <div className="text-red-500 text-base md:text-lg font-bold">{formatNumber(details.biggestLoss)}</div>
                </div>
                <div 
                  className="border p-3"
                  style={{ 
                    borderColor: borderColor,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <div className="text-gray-400 text-[10px] mb-1">WIN RATE</div>
                  <div className={`text-base md:text-lg font-bold ${details.winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                    {details.winRate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Current Allocation */}
            <div 
              className="border-b-2 p-3 md:p-4"
              style={{ 
                borderColor: borderColor,
                backgroundColor: 'rgba(0, 0, 0, 0.4)'
              }}
            >
              <div className="text-xs font-bold mb-3" style={{ color: model.color }}>
                CURRENT ALLOCATION ({details.currentPositions.length} ASSETS)
              </div>
              
              {details.currentPositions.length === 0 ? (
                <div className="border p-6 text-center" style={{ borderColor: borderColor }}>
                  <div className="text-gray-400 text-sm mb-2">No positions currently held</div>
                  <div className="text-gray-500 text-xs">Model is fully in cash</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {details.currentPositions.map((position, idx) => {
                    return (
                      <div 
                        key={`${position.asset}-${idx}`} 
                        className="border p-3"
                        style={{ 
                          borderColor: borderColor,
                          backgroundColor: 'rgba(0, 0, 0, 0.3)'
                        }}
                      >
                        {/* Asset Header */}
                        <div className="flex items-center justify-between mb-2 pb-2 border-b" style={{ borderColor: borderColor }}>
                          <div className="text-white font-bold text-sm">{position.asset}</div>
                          <div className="text-white text-lg font-bold">{position.percentage.toFixed(1)}%</div>
                        </div>
                        
                        {/* Position Details */}
                        <div className="space-y-1.5 text-[10px]">
                          <div className="flex justify-between">
                            <span className="text-gray-400">VALUE</span>
                            <span className="text-white font-bold">{formatCurrency(position.value)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">QTY</span>
                            <span className="text-white font-bold">{position.quantity.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">P&L</span>
                            <span className={`font-bold ${position.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {formatNumber(position.pnl)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Last Trades */}
            <div 
              className="p-3 md:p-4"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.4)'
              }}
            >
              <div className="text-xs font-bold mb-3" style={{ color: model.color }}>
                LAST TRADES ({details.recentTrades.length})
              </div>
              
              {details.recentTrades.length === 0 ? (
                <div className="border p-8 text-center" style={{ borderColor: borderColor }}>
                  <div className="text-gray-400 text-sm mb-2">No trades available yet</div>
                  <div className="text-gray-500 text-xs">Waiting for trade data from WebSocket...</div>
                </div>
              ) : (
                <div 
                  className="border overflow-x-auto"
                  style={{ borderColor: borderColor }}
                >
                  <table className="w-full text-[10px] min-w-[900px]">
                    <thead>
                      <tr style={{ backgroundColor: model.color }}>
                        <th className="px-2 py-2 text-left font-bold text-black">TRADE #</th>
                        <th className="px-2 py-2 text-left font-bold text-black">TIMESTAMP</th>
                        <th className="px-2 py-2 text-left font-bold text-black">ASSET</th>
                        <th className="px-2 py-2 text-center font-bold text-black">SIDE</th>
                        <th className="px-2 py-2 text-right font-bold text-black">PRICE</th>
                        <th className="px-2 py-2 text-right font-bold text-black">QTY</th>
                        <th className="px-2 py-2 text-right font-bold text-black">NOTIONAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.recentTrades.map((trade, idx) => {
                        return (
                          <tr 
                            key={`${trade.id}-${idx}`} 
                            className="border-t hover:bg-gray-900 transition-colors"
                            style={{ borderColor: borderColor }}
                          >
                            <td className="px-2 py-2 text-white font-bold">#{idx + 1}</td>
                            <td className="px-2 py-2 text-gray-400">{formatDate(trade.timestamp)}</td>
                            <td className="px-2 py-2 text-white font-bold">{trade.asset}</td>
                            <td className="px-2 py-2 text-center">
                              <span className={`px-2 py-0.5 text-[9px] font-bold ${trade.side === 'SELL' ? 'bg-red-500 text-white' : 'bg-green-500 text-black'}`}>
                                {trade.side}
                              </span>
                            </td>
                            <td className="px-2 py-2 text-right text-white font-bold">{formatCurrency(trade.price)}</td>
                            <td className="px-2 py-2 text-right text-white">{trade.quantity.toFixed(2)}</td>
                            <td className="px-2 py-2 text-right text-white font-bold">{formatCurrency(trade.notionalValue)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Hold Times & Quick Stats */}
          <div 
            className="overflow-auto"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          >
            {/* Hold Times */}
            <div 
              className="border-b-2 p-4"
              style={{ borderColor: borderColor }}
            >
              <div className="text-xs font-bold mb-4" style={{ color: model.color }}>POSITION BREAKDOWN</div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-400">LONG</span>
                    <span className="text-white font-bold">{details.holdTimes.long}%</span>
                  </div>
                  <div className="h-3 bg-gray-800 border border-gray-700">
                    <div className="h-full bg-green-500" style={{ width: `${details.holdTimes.long}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-400">SHORT</span>
                    <span className="text-white font-bold">{details.holdTimes.short}%</span>
                  </div>
                  <div className="h-3 bg-gray-800 border border-gray-700">
                    <div className="h-full bg-red-500" style={{ width: `${details.holdTimes.short}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-400">FLAT</span>
                    <span className="text-white font-bold">{details.holdTimes.flat}%</span>
                  </div>
                  <div className="h-3 bg-gray-800 border border-gray-700">
                    <div className="h-full bg-gray-500" style={{ width: `${details.holdTimes.flat}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Metrics */}
            <div 
              className="border-b-2 p-4"
              style={{ borderColor: borderColor }}
            >
              <div className="text-xs font-bold mb-4" style={{ color: model.color }}>RISK METRICS</div>
              <div className="space-y-3">
                <div 
                  className="border p-2"
                  style={{ 
                    borderColor: borderColor,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <div className="text-gray-400 text-[10px]">BIGGEST DRAWDOWN</div>
                  <div className="text-red-500 text-lg font-bold">{formatNumber(details.biggestLoss)}</div>
                </div>
                <div 
                  className="border p-2"
                  style={{ 
                    borderColor: borderColor,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <div className="text-gray-400 text-[10px]">TOTAL FEES PAID</div>
                  <div className="text-white text-lg font-bold">
                    {formatCurrency(details.totalFees)}
                  </div>
                </div>
                <div 
                  className="border p-2"
                  style={{ 
                    borderColor: borderColor,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)'
                  }}
                >
                  <div className="text-gray-400 text-[10px]">UTILIZATION</div>
                  <div className="text-white text-lg font-bold">
                    {((1 - details.availableCash / details.totalAccountValue) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="p-4">
              <div className="text-xs font-bold mb-4" style={{ color: model.color }}>ACCOUNT STATUS</div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-gray-700 pb-2">
                  <span className="text-gray-400">STATUS</span>
                  <span className="text-green-500 font-bold">ACTIVE</span>
                </div>
                <div className="flex justify-between border-b border-gray-700 pb-2">
                  <span className="text-gray-400">TOTAL TRADES</span>
                  <span className="text-white font-bold">{details.totalTrades}</span>
                </div>
                <div className="flex justify-between border-b border-gray-700 pb-2">
                  <span className="text-gray-400">RECORDED UPDATES</span>
                  <span className="text-white font-bold">{details.recentTrades.length}</span>
                </div>
                <div className="flex justify-between border-b border-gray-700 pb-2">
                  <span className="text-gray-400">WIN RATE</span>
                  <span className={`font-bold ${details.winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                    {details.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-700 pb-2">
                  <span className="text-gray-400">RETURN %</span>
                  <span className={`font-bold ${details.returnValue >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatPercentage(details.returnValue)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelDetails;
