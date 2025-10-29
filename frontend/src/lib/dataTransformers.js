// Data transformation utilities for API responses
import { getSafeColor } from '../utils/colorUtils';

/**
 * Transform API model data to leaderboard format
 * @param {Array} apiModels - Models from API with new structure
 * @returns {Array} - Transformed models for leaderboard display
 */
export const transformModelsToLeaderboard = (apiModels) => {
  if (!apiModels || !Array.isArray(apiModels)) {
    return [];
  }

  // Filter out models with null account_value (they don't have trading data yet)
  const modelsWithData = apiModels.filter(model => model.account_value !== null);

  // Sort by account_value (highest first) and assign ranks
  const sortedModels = modelsWithData
    .sort((a, b) => (b.account_value || 0) - (a.account_value || 0))
    .map((model, index) => ({
      rank: model.rank || (index + 1),
      model: model.display_name,
      codeName: model.code_name,
      id: model.id,
      acctValue: model.account_value || 0,
      returnPercent: model.return_pct || 0,
      totalPL: model.pnl || 0,
      fees: model.trading_cost || 0,
      trades: model.trades || 0,
      color: getSafeColor(model.color),
      logo: `/ai_logo/${model.icon}`,
      icon: model.icon,
      provider: model.provider,
      activePositions: generateMockPositions(model.id) // TODO: Replace with real position data
    }));

  return sortedModels;
};

/**
 * Generate mock active positions (placeholder)
 * TODO: Replace with real position data from API
 */
const generateMockPositions = (modelId) => {
  const allPositions = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'ARB', 'MATIC'];
  const numPositions = Math.floor(Math.random() * 5) + 1; // 1-5 positions
  return allPositions.slice(0, numPositions);
};

/**
 * Format currency values in Indian Rupees
 * @param {number} value - Value to format
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '₹0';
  return `₹${value.toLocaleString('en-IN')}`;
};

/**
 * Format currency in Lakhs for summary cards
 * @param {number} value - Value to format
 * @returns {string} - Formatted value in lakhs
 */
export const formatInLakhs = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0.00';
  const lakhs = value / 100000;
  return lakhs.toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

/**
 * Format percentage values
 * @param {number} value - Percentage value
 * @returns {string} - Formatted percentage string
 */
export const formatPercent = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0.00';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
};

/**
 * Format number with proper sign and decimals
 * @param {number} value - Number to format
 * @returns {string} - Formatted number string
 */
export const formatNumber = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0.00';
  
  if (value >= 0) {
    return `+${value.toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }
  return value.toLocaleString('en-IN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};



/**
 * Check if model has trading data
 * @param {Object} model - Model object from API
 * @returns {boolean} - True if model has trading data
 */
export const hasTradingData = (model) => {
  return model && 
         model.account_value !== null && 
         model.account_value !== undefined;
};

/**
 * Transform model data stream to chart format
 * @param {Object} modelDataStream - Model data stream from WebSocket
 * @returns {Object} - Transformed data for chart consumption
 */
export const transformModelDataStreamToChart = (modelDataStream) => {
  if (!modelDataStream || !modelDataStream.data) {
    return { chartData: [], modelNames: [] };
  }

  const chartData = [];
  const modelIds = Object.keys(modelDataStream.data);
  
  // Map model IDs to display names for chart keys
  const modelIdToDisplayName = {};
  const displayNames = [];
  
  modelIds.forEach(modelId => {
    const model = modelDataStream.data[modelId];
    const displayName = model.display_name || modelId;
    modelIdToDisplayName[modelId] = displayName;
    displayNames.push(displayName);
  });

  // Get all unique timestamps across all models
  const allTimestamps = new Set();
  modelIds.forEach(modelId => {
    const model = modelDataStream.data[modelId];
    if (model.data_points) {
      // Sort individual model's data points by timestamp first
      model.data_points.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      model.data_points.forEach(point => {
        allTimestamps.add(point.created_at);
      });
    }
  });

  // Sort timestamps
  const sortedTimestamps = Array.from(allTimestamps).sort();

  // Create chart data points for each timestamp
  sortedTimestamps.forEach(timestamp => {
    const dataPoint = { 
      timestamp,
      time: new Date(timestamp).getTime() // For chart x-axis
    };

    modelIds.forEach(modelId => {
      const model = modelDataStream.data[modelId];
      const displayName = modelIdToDisplayName[modelId];
      const point = model.data_points?.find(p => p.created_at === timestamp);
      
      if (point) {
        // Use display_name as the key for chart data
        dataPoint[displayName] = point.account_value;
        dataPoint[`${displayName}_return`] = point.return_value;
        dataPoint[`${displayName}_pnl`] = point.total_pnl;
        dataPoint[`${displayName}_trades`] = point.trades;
        dataPoint[`${displayName}_fees`] = point.fees;
      }
    });

    chartData.push(dataPoint);
  });

  return {
    chartData,
    modelNames: displayNames, // Return display names instead of IDs
    totalPoints: chartData.length,
    lastUpdate: modelDataStream.timestamp
  };
};

/**
 * Get latest values for each model from the stream data
 * @param {Object} modelDataStream - Model data stream from WebSocket
 * @returns {Object} - Latest values for each model
 */
export const getLatestModelValues = (modelDataStream) => {
  if (!modelDataStream || !modelDataStream.data) {
    return {};
  }

  const latestValues = {};

  Object.keys(modelDataStream.data).forEach(modelName => {
    const model = modelDataStream.data[modelName];
    if (model.data_points && model.data_points.length > 0) {
      // Sort data points by timestamp to ensure we get the actual latest point
      const sortedDataPoints = [...model.data_points].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      // Get the latest data point (last in sorted array)
      const latestPoint = sortedDataPoints[sortedDataPoints.length - 1];
      latestValues[modelName] = {
        account_value: latestPoint.account_value,
        return_value: latestPoint.return_value,
        total_pnl: latestPoint.total_pnl,
        fees: latestPoint.fees,
        trades: latestPoint.trades,
        timestamp: latestPoint.created_at,
        display_name: model.display_name
      };
    }
  });

  return latestValues;
};

/**
 * Update existing chart data with new model data stream
 * @param {Array} existingChartData - Current chart data
 * @param {Object} newStreamData - New data from model data stream
 * @returns {Array} - Updated chart data
 */
export const updateChartDataWithStream = (existingChartData, newStreamData) => {
  if (!newStreamData || !newStreamData.data) {
    return existingChartData;
  }

  const { chartData: newChartData } = transformModelDataStreamToChart(newStreamData);
  
  // For regular updates, we want to show all data points from the stream
  // to ensure the complete 500-point dataset is always visible
  if (newStreamData.type === 'modeldata_update') {
    // Return the complete new dataset to maintain full visibility
    return newChartData;
  }
  
  // If no existing data, return new data
  if (!existingChartData || existingChartData.length === 0) {
    return newChartData;
  }

  // For other update types, merge existing and new data, avoiding duplicates
  const existingTimestamps = new Set(existingChartData.map(point => point.timestamp));
  const newPoints = newChartData.filter(point => !existingTimestamps.has(point.timestamp));
  
  // Combine and sort by timestamp
  const combinedData = [...existingChartData, ...newPoints].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Keep only last 1000 points to prevent memory issues
  return combinedData.slice(-1000);
};

/**
 * Get top performing models for summary display
 * @param {Array} models - All models from API
 * @param {number} limit - Number of top models to return
 * @returns {Array} - Top performing models
 */
export const getTopPerformingModels = (models, limit = 6) => {
  if (!models || !Array.isArray(models)) return [];

  return models
    .filter(hasTradingData)
    .sort((a, b) => (b.account_value || 0) - (a.account_value || 0))
    .slice(0, limit);
};