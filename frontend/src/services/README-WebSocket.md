# WebSocket Real-Time Price Updates

This implementation provides real-time price updates from the Alpha Arena WebSocket API (`wss://api.alphaarena.in/api/v1/ws/price-stream`).

## Features

- **Automatic Connection Management**: Connects on page load and maintains persistent connection
- **Auto-Reconnection**: Attempts to reconnect every 5 seconds if connection is lost
- **Context-Based State Management**: Integrates with React context for global state
- **Fallback to Mock Data**: Shows mock data when WebSocket is disconnected
- **Connection Status Indicator**: Visual indicator showing connection health
- **Page Visibility Handling**: Reconnects when page becomes visible
- **Network Status Monitoring**: Handles online/offline events

## Architecture

### Core Components

1. **`websocketService.js`** - Singleton service managing WebSocket connection
2. **`WebSocketContext.jsx`** - React context providing WebSocket state
3. **`usePriceData.js`** - Custom hooks for easy data access
4. **`MetricsBar.jsx`** - Updated to show real-time prices
5. **`WebSocketDebugPanel.jsx`** - Development debug panel

### Data Flow

```
WebSocket API → WebSocketService → WebSocketContext → Components
```

## Usage

### Basic Usage in Components

```jsx
import { useWebSocket } from '../context/WebSocketContext';

const MyComponent = () => {
  const { priceData, connectionStatus } = useWebSocket();
  
  return (
    <div>
      <div>Status: {connectionStatus}</div>
      {Object.entries(priceData).map(([symbol, data]) => (
        <div key={symbol}>
          {symbol}: ₹{data.price} ({data.change_percent}%)
        </div>
      ))}
    </div>
  );
};
```

### Using Custom Hooks

```jsx
import { usePriceData, useSymbolPrice } from '../hooks/usePriceData';

// Get all formatted prices
const { getAllFormattedPrices } = usePriceData();
const prices = getAllFormattedPrices();

// Track specific symbol
const niftyPrice = useSymbolPrice('NIFTYBEES');
if (niftyPrice.isAvailable) {
  console.log(niftyPrice.formattedData.formattedPrice);
}
```

### Subscribing to Price Updates

```jsx
import { usePriceData } from '../hooks/usePriceData';

const { subscribeToPriceUpdates } = usePriceData();

useEffect(() => {
  const unsubscribe = subscribeToPriceUpdates('NIFTYBEES', (priceData) => {
    console.log('NIFTYBEES updated:', priceData);
  });
  
  return unsubscribe;
}, []);
```

## API Data Format

The WebSocket sends data in this format:

```json
{
  "type": "price_update",
  "timestamp": "2025-10-23T02:18:14.258300",
  "data": {
    "NIFTYBEES": {
      "symbol": "NIFTYBEES",
      "price": 253.76,
      "change_percent": 4.93,
      "change_direction": "up"
    }
  }
}
```

## Available Hooks

### `useWebSocket()`
Direct access to WebSocket context state and methods.

### `usePriceData()`
Provides formatted price data and utility methods:
- `getAllFormattedPrices()` - Get all symbols with formatting
- `getFormattedPrice(symbol)` - Get specific symbol with formatting
- `subscribeToPriceUpdates(symbol, callback)` - Subscribe to specific symbol updates
- `isDataFresh()` - Check if data is recent (< 30 seconds)

### `useSymbolPrice(symbol)`
Track a specific symbol:
- `rawData` - Raw WebSocket data
- `formattedData` - Formatted display data
- `exists` - Whether symbol exists in data
- `isAvailable` - Whether data is available
- `isFresh` - Whether data is fresh

### `useConnectionStatus()`
Monitor connection health:
- `isConnected` - WebSocket connection status
- `isHealthy` - Connection + fresh data
- `reconnect()` - Manual reconnection

## Development Tools

### Debug Panel
In development mode, a debug panel is available showing:
- Connection status
- Raw WebSocket data
- Formatted price data
- Manual reconnect button

Access it via the "WebSocket Debug" button in the bottom-right corner.

## Connection Management

### Automatic Reconnection
The service automatically attempts to reconnect:
- Every 5 seconds if connection drops
- When page becomes visible (tab switching)
- When browser comes back online

### Manual Reconnection
```jsx
const { reconnect } = useConnectionStatus();
// Call reconnect() to manually reconnect
```

## Integration Points

### MetricsBar Component
Updated to show real-time prices with:
- Live connection indicator
- Real-time price updates
- Fallback to mock data when disconnected

### App.js
WebSocketProvider wraps the entire application:
```jsx
<WebSocketProvider>
  <ModelsProvider>
    {/* Your app */}
  </ModelsProvider>
</WebSocketProvider>
```

## Error Handling

- Connection failures are logged to console
- Automatic reconnection attempts
- Graceful fallback to mock data
- Visual connection status indicators

## Performance Considerations

- Single WebSocket connection shared across components
- Efficient state updates using React context
- Subscription-based updates to minimize re-renders
- Cleanup of subscriptions on component unmount

## Future Enhancements

Potential improvements:
- WebSocket authentication if needed
- Rate limiting for rapid updates
- Historical data caching
- Custom reconnection strategies
- Multiple WebSocket endpoints support