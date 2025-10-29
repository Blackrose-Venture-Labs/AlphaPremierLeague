import React, { useEffect, useState } from 'react';
import { useModels } from '../context/ModelsContext';
import { modelsService } from '../services/apiService';

const TestAPIComponent = () => {
  const { models, loading, error, fetchModels } = useModels();
  const [positionsData, setPositionsData] = useState(null);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positionsError, setPositionsError] = useState(null);

  const handleRefresh = () => {
    fetchModels();
  };

  const testPositionsAPI = async () => {
    try {
      setPositionsLoading(true);
      setPositionsError(null);
      // API call removed - setting empty data
      setPositionsData([]);
      setPositionsError('Positions API has been removed from the application');
    } catch (err) {
      setPositionsError(err.message);
    } finally {
      setPositionsLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-bloomberg-primary">Loading AI models...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-500 mb-2">Error: {error}</div>
        <button 
          onClick={handleRefresh}
          className="px-4 py-2 bg-bloomberg-primary text-black font-bold hover:opacity-80"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Models Section */}
      <div>
        <h3 className="text-bloomberg-primary font-bold mb-4">AI Models ({models.length})</h3>
        <div className="space-y-2">
          {models.map(model => (
            <div 
              key={model.id} 
              className="border border-gray-600 p-3 rounded"
              style={{ borderColor: model.color }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-6 h-6 rounded flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundColor: model.color }}
                >
                  {model.code_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-white">{model.display_name}</div>
                  <div className="text-xs text-gray-400">
                    {model.code_name} | {model.provider}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button 
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 border-2 border-bloomberg-primary text-bloomberg-primary hover:bg-bloomberg-primary hover:text-black font-bold"
        >
          Refresh Models
        </button>
      </div>

      {/* Positions Section */}
      <div>
        <h3 className="text-bloomberg-primary font-bold mb-4">Positions API Test</h3>
        <button 
          onClick={testPositionsAPI}
          className="mb-4 px-4 py-2 bg-bloomberg-primary text-black font-bold hover:opacity-80"
          disabled={positionsLoading}
        >
          {positionsLoading ? 'Testing Positions API...' : 'Test Positions API'}
        </button>
        
        {positionsLoading && <div className="text-bloomberg-primary">Loading positions...</div>}
        {positionsError && <div className="text-red-500">Positions Error: {positionsError}</div>}
        {positionsData && (
          <div>
            <h4 className="font-bold mb-2 text-white">Positions Response ({positionsData.length} items):</h4>
            <pre className="bg-black p-2 text-xs overflow-auto max-h-96 text-green-400 border border-gray-600">
              {JSON.stringify(positionsData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestAPIComponent;