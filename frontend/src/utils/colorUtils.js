// Color utilities for consistent model colors across the app
import { modelColorService } from '../services/modelColorService';

/**
 * Get model color by display name with fallback
 * @param {string} displayName - Model display name
 * @param {string} fallback - Fallback color if not found
 * @returns {string} - Hex color
 */
export const getModelColor = (displayName, fallback = '#FF6B35') => {
  if (!displayName) return fallback;
  
  const color = modelColorService.getColorByName(displayName);
  return color !== '#FF6B35' ? color : fallback;
};

/**
 * Get model color by ID with fallback
 * @param {number|string} id - Model ID
 * @param {string} fallback - Fallback color if not found
 * @returns {string} - Hex color
 */
export const getModelColorById = (id, fallback = '#FF6B35') => {
  if (!id) return fallback;
  
  const color = modelColorService.getColorById(id);
  return color !== '#FF6B35' ? color : fallback;
};

/**
 * Get safe color with validation
 * @param {string} color - Color to validate
 * @param {string} fallback - Fallback color
 * @returns {string} - Valid hex color
 */
export const getSafeColor = (color, fallback = '#FF6B35') => {
  if (!color) return fallback;
  
  // Handle 8-character hex colors (with alpha) by removing alpha
  if (color.length === 9 && color.startsWith('#')) {
    color = color.substring(0, 7);
  }
  
  // Validate hex color format (3 or 6 characters after #)
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color) ? color : fallback;
};

/**
 * Get all available model colors as an object
 * @returns {Object} - Object with model names as keys and colors as values
 */
export const getAllModelColors = () => {
  return modelColorService.getAllColorMappings();
};

/**
 * Check if model color service is ready
 * @returns {boolean}
 */
export const isColorServiceReady = () => {
  return modelColorService.isInitialized();
};