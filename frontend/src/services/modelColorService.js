// Model Color Service - Centralized color management from API
class ModelColorService {
  constructor() {
    this.colorMap = new Map();
    this.modelData = new Map();
  }

  /**
   * Initialize color mapping from API response
   * @param {Array} apiModels - Models array from API
   */
  initializeFromAPI(apiModels) {
    if (!Array.isArray(apiModels)) return;

    apiModels.forEach(model => {
      const key = model.display_name || model.code_name || `model_${model.id}`;
      
      // Store essential model data
      this.modelData.set(key, {
        id: model.id,
        color: this.normalizeColor(model.color),
        icon: model.icon,
        display_name: model.display_name,
        code_name: model.code_name
      });

      // Create color mapping
      this.colorMap.set(key, this.normalizeColor(model.color));
      
      // Also map by ID for quick lookup
      this.colorMap.set(model.id.toString(), this.normalizeColor(model.color));
    });
  }

  /**
   * Normalize color format (handle 8-char hex colors)
   * @param {string} color - Color from API
   * @returns {string} - Normalized 6-char hex color
   */
  normalizeColor(color) {
    if (!color) return '#FF6B35'; // Default fallback
    
    // Handle 8-character hex colors (with alpha) by removing alpha
    if (color.length === 9 && color.startsWith('#')) {
      return color.substring(0, 7);
    }
    
    return color;
  }

  /**
   * Get color by model display name
   * @param {string} displayName - Model display name
   * @returns {string} - Hex color
   */
  getColorByName(displayName) {
    return this.colorMap.get(displayName) || '#FF6B35';
  }

  /**
   * Get color by model ID
   * @param {number|string} id - Model ID
   * @returns {string} - Hex color
   */
  getColorById(id) {
    return this.colorMap.get(id.toString()) || '#FF6B35';
  }

  /**
   * Get full model data by display name
   * @param {string} displayName - Model display name
   * @returns {Object|null} - Model data object
   */
  getModelDataByName(displayName) {
    return this.modelData.get(displayName) || null;
  }

  /**
   * Get all model color mappings
   * @returns {Object} - Object with display_name as keys and colors as values
   */
  getAllColorMappings() {
    const mappings = {};
    this.modelData.forEach((data, key) => {
      mappings[key] = data.color;
    });
    return mappings;
  }

  /**
   * Check if color mapping is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.colorMap.size > 0;
  }

  /**
   * Clear all mappings
   */
  clear() {
    this.colorMap.clear();
    this.modelData.clear();
  }
}

// Export singleton instance
export const modelColorService = new ModelColorService();
export default modelColorService;