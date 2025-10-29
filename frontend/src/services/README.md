# Services Documentation

## Overview

This directory contains core services for the application including API communication, WebSocket connections, and utility services.

## Services

### 1. Model Color Management System

This system provides centralized model color management using colors from the API response. All model colors are now sourced from the API and maintained consistently across the application.

## How It Works

1. **API Response**: When models are fetched from the API, the system automatically stores:
   - `id`: Model ID
   - `color`: Model color (normalized from 8-char to 6-char hex if needed)
   - `icon`: Model icon filename
   - `display_name`: Model display name

2. **Color Service**: The `modelColorService` maintains an in-memory mapping of model names/IDs to their colors.

3. **Utilities**: Helper functions ensure consistent color usage across components.

## Usage

### In Components

```javascript
import { useModelColors } from '../hooks/useModelColors';

const MyComponent = () => {
  const { getColorByName, getColorById, getSafeColor } = useModelColors();
  
  // Get color by model name
  const grokColor = getColorByName('GROK 4');
  
  // Get color by model ID  
  const modelColor = getColorById(5);
  
  // Validate and normalize a color
  const safeColor = getSafeColor(someColorFromAPI);
  
  return <div style={{ color: grokColor }}>...</div>;
};
```

### Direct Utility Usage

```javascript
import { getModelColor, getSafeColor } from '../utils/colorUtils';

// Get color by name
const color = getModelColor('DEEPSEEK CHAT V3.1');

// Validate color
const safeColor = getSafeColor('#686666ff'); // Returns '#686666'
```

### In Context

```javascript
import { useModels } from '../context/ModelsContext';

const { modelColorService } = useModels();

// Check if service is ready
if (modelColorService.isInitialized()) {
  const color = modelColorService.getColorByName('GPT 5');
}
```

## File Structure

```
src/
├── services/
│   └── modelColorService.js    # Core color mapping service
├── utils/
│   └── colorUtils.js          # Color utility functions
├── hooks/
│   └── useModelColors.js      # React hook for color access
└── context/
    └── ModelsContext.jsx      # Initializes color service with API data
```

## API Response Format

The system expects this structure from the API:

```json
{
  "id": 5,
  "display_name": "GROK 4", 
  "color": "#686666ff",
  "icon": "grok.png"
}
```

## Color Normalization

- 8-character hex colors (with alpha) are automatically converted to 6-character hex
- Invalid colors fall back to `#FF6B35` (orange)
- All colors are validated using regex patterns

### Migration Notes

- Removed `src/config/modelColors.js` (no longer needed)
- All hardcoded `MODEL_COLORS` references replaced with API colors
- Mock data updated to use actual hex colors instead of `MODEL_COLORS` references

---

### 2. WebSocket Service

Real-time price update service that maintains a persistent connection to the Alpha Arena WebSocket API.

**Key Features:**
- Automatic connection and reconnection management
- Real-time price data for all trading symbols
- Connection status monitoring
- Offline/online detection and recovery
- Page visibility handling

**Files:**
- `websocketService.js` - Core WebSocket management
- See `README-WebSocket.md` for detailed documentation

**Usage:**
```javascript
import { useWebSocket } from '../context/WebSocketContext';
import { usePriceData } from '../hooks/usePriceData';

// Basic usage
const { priceData, connectionStatus } = useWebSocket();

// Advanced usage with formatting
const { getAllFormattedPrices, getFormattedPrice } = usePriceData();
```

---

### 3. API Service

HTTP API client for communicating with the Alpha Arena backend.

**Files:**
- `apiService.js` - REST API client

---

## Additional Documentation

- [WebSocket Implementation Details](./README-WebSocket.md)
- [API Service Documentation](./apiService.js)
- [Model Color Service Documentation](./modelColorService.js)