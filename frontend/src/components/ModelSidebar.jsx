import React from 'react';
import ModelCard from './ModelCard';
import { useModels } from '../context/ModelsContext';

const ModelSidebar = () => {
  const customGreen = '#0FFF08';
  const { models, loading, error } = useModels();
  
  return (
    <div className="bg-black border-l border-gray-800 p-4 h-full overflow-y-auto">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex space-x-2">
          <button 
            className="px-3 py-1 text-xs font-bold text-black rounded transition-colors"
            style={{ backgroundColor: customGreen }}
            onMouseEnter={(e) => e.target.style.opacity = '0.8'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            SIMULATED TRADES
          </button>
          <button className="px-3 py-1 text-xs font-bold bg-transparent border border-gray-700 text-gray-400 rounded hover:bg-gray-800 transition-colors">
            MOMENTUM
          </button>
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <button className="px-3 py-1 text-xs font-bold bg-transparent border border-gray-700 text-gray-400 rounded hover:bg-gray-800 transition-colors">
            INVESTING
          </button>
        <button className="px-3 py-1 text-xs font-bold bg-transparent border border-gray-700 text-gray-400 rounded hover:bg-gray-800 transition-colors">
            REMOVE IT
          </button>
      </div>
      
      {/* Filter Section */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-2">
          FILTER: <span className="font-bold" style={{ color: customGreen }}>ALL MODELS</span>
        </div>
      </div>
      
      {/* Model Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center text-gray-400 text-xs">Loading models...</div>
        ) : error ? (
          <div className="text-center text-red-500 text-xs">Error: {error}</div>
        ) : (
          models.map(model => (
            <ModelCard key={model.id} model={model} />
          ))
        )}
      </div>
    </div>
  );
};

export default ModelSidebar;