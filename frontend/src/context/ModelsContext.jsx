import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { modelsService } from '../services/apiService';
import { modelColorService } from '../services/modelColorService';

// Action types
const ACTION_TYPES = {
  FETCH_MODELS_START: 'FETCH_MODELS_START',
  FETCH_MODELS_SUCCESS: 'FETCH_MODELS_SUCCESS',
  FETCH_MODELS_ERROR: 'FETCH_MODELS_ERROR',
  SET_SELECTED_MODEL: 'SET_SELECTED_MODEL',
  SET_SELECTED_MODEL_FOR_CHART: 'SET_SELECTED_MODEL_FOR_CHART',
};

// Initial state
const initialState = {
  models: [],
  selectedModel: null,
  selectedModelForChart: null, // For chart filtering
  loading: false,
  error: null,
};

// Reducer function
const modelsReducer = (state, action) => {
  switch (action.type) {
    case ACTION_TYPES.FETCH_MODELS_START:
      return {
        ...state,
        loading: true,
        error: null,
      };
    case ACTION_TYPES.FETCH_MODELS_SUCCESS:
      return {
        ...state,
        loading: false,
        models: action.payload,
        selectedModel: state.selectedModel || (action.payload.length > 0 ? action.payload[0] : null),
        error: null,
      };
    case ACTION_TYPES.FETCH_MODELS_ERROR:
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case ACTION_TYPES.SET_SELECTED_MODEL:
      return {
        ...state,
        selectedModel: action.payload,
      };
    case ACTION_TYPES.SET_SELECTED_MODEL_FOR_CHART:
      return {
        ...state,
        selectedModelForChart: action.payload,
      };
    default:
      return state;
  }
};

// Create context
const ModelsContext = createContext();

// Context provider component
export const ModelsProvider = ({ children }) => {
  const [state, dispatch] = useReducer(modelsReducer, initialState);

  // Fetch models function
  const fetchModels = async () => {
    try {
      dispatch({ type: ACTION_TYPES.FETCH_MODELS_START });
      const models = await modelsService.getAllModels();
      
      // Initialize color service with API data
      modelColorService.initializeFromAPI(models);
      
      dispatch({ type: ACTION_TYPES.FETCH_MODELS_SUCCESS, payload: models });
    } catch (error) {
      dispatch({ 
        type: ACTION_TYPES.FETCH_MODELS_ERROR, 
        payload: error.message || 'Failed to fetch AI models' 
      });
    }
  };

  // Set selected model function
  const setSelectedModel = (model) => {
    dispatch({ type: ACTION_TYPES.SET_SELECTED_MODEL, payload: model });
  };

  // Set selected model for chart filtering
  const setSelectedModelForChart = (model) => {
    dispatch({ type: ACTION_TYPES.SET_SELECTED_MODEL_FOR_CHART, payload: model });
  };

  // Get model by code name
  const getModelByCodeName = (codeName) => {
    return state.models.find(model => model.code_name === codeName);
  };

  // Get model by ID
  const getModelById = (id) => {
    return state.models.find(model => model.id === parseInt(id));
  };

  // Get models with trading data
  const getModelsWithTradingData = () => {
    return state.models.filter(model => model.account_value !== null && model.account_value !== undefined);
  };

  // Get top performing models
  const getTopPerformingModels = (limit = 6) => {
    return getModelsWithTradingData()
      .sort((a, b) => (b.account_value || 0) - (a.account_value || 0))
      .slice(0, limit);
  };

  // Fetch models on component mount
  useEffect(() => {
    fetchModels();
  }, []);

  const value = {
    ...state,
    fetchModels,
    setSelectedModel,
    setSelectedModelForChart,
    getModelByCodeName,
    getModelById,
    getModelsWithTradingData,
    getTopPerformingModels,
    modelColorService, // Expose color service
  };

  return (
    <ModelsContext.Provider value={value}>
      {children}
    </ModelsContext.Provider>
  );
};

// Custom hook to use the models context
export const useModels = () => {
  const context = useContext(ModelsContext);
  if (!context) {
    throw new Error('useModels must be used within a ModelsProvider');
  }
  return context;
};

export default ModelsContext;