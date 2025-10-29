import React from 'react';
import { getModelIconPath, getModelIconFallback } from '../lib/utils';

const ModelCard = ({ model }) => {
  const customGreen = '#0FFF08';
  const iconPath = getModelIconPath(model.icon);
  
  return (
    <div className="bg-zinc-900 border border-gray-800 p-4 mb-3 hover:shadow-lg hover:border-gray-700 transition-all">
      {/* Model Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden p-1"
            style={{ backgroundColor: model.color }}
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
              className="text-white font-bold text-sm"
              style={{ display: iconPath ? 'none' : 'block' }}
            >
              {getModelIconFallback(model.code_name)}
            </span>
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-wide" style={{ color: customGreen }}>
              {model.display_name || model.name}
            </h3>
            <p className="text-xs text-gray-500">{model.provider}</p>
          </div>
        </div>
      </div>
      
      {/* Model Description */}
      <p className="text-xs text-gray-300 leading-relaxed">
        {model.description || `Advanced AI trading model by ${model.provider}. Real-time trading decisions and portfolio optimization.`}
      </p>
      
      {/* Read More Link */}
      <button 
        className="text-xs mt-2 font-medium transition-colors"
        style={{ color: customGreen }}
        onMouseEnter={(e) => e.target.style.opacity = '0.8'}
        onMouseLeave={(e) => e.target.style.opacity = '1'}
      >
        read in tweets
      </button>
    </div>
  );
};

export default ModelCard;