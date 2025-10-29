// Hook for accessing model colors consistently across components
import { useModels } from '../context/ModelsContext';
import { getModelColor, getModelColorById, getSafeColor } from '../utils/colorUtils';

/**
 * Custom hook for accessing model colors
 * @returns {Object} - Object with color utility functions
 */
export const useModelColors = () => {
  const { modelColorService } = useModels();

  return {
    /**
     * Get color by model display name
     * @param {string} displayName - Model display name
     * @param {string} fallback - Fallback color
     * @returns {string} - Hex color
     */
    getColorByName: (displayName, fallback) => getModelColor(displayName, fallback),
    
    /**
     * Get color by model ID
     * @param {number|string} id - Model ID
     * @param {string} fallback - Fallback color
     * @returns {string} - Hex color
     */
    getColorById: (id, fallback) => getModelColorById(id, fallback),
    
    /**
     * Get safe color with validation
     * @param {string} color - Color to validate
     * @param {string} fallback - Fallback color
     * @returns {string} - Valid hex color
     */
    getSafeColor: (color, fallback) => getSafeColor(color, fallback),
    
    /**
     * Check if color service is ready
     * @returns {boolean}
     */
    isReady: () => modelColorService?.isInitialized() || false,
    
    /**
     * Get all model colors
     * @returns {Object}
     */
    getAllColors: () => modelColorService?.getAllColorMappings() || {},
  };
};

export default useModelColors;