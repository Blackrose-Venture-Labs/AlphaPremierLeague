# Model Colors Configuration

## Overview
This folder contains the centralized color configuration for all AI models in the application.

## How to Change Model Colors

To change the background/brand color for any AI model:

1. Open `modelColors.js`
2. Find the model name in the `MODEL_COLORS` object
3. Update the hex color value
4. Save the file

**Example:**
```javascript
export const MODEL_COLORS = {
  'CLAUDE SONNET 4.5': '#DE7356',  // Change this hex value
  'DEEPSEEK CHAT V3.1': '#4D6BFE', // Change this hex value
  // ... etc
};
```

## Where Colors Are Used

The colors defined here are automatically applied to:
- Model cards (avatar background)
- Summary cards (model name color)
- Portfolio charts (line colors)
- Model badges and indicators
- Any other component that displays model information

## Adding a New Model

When adding a new AI model:

1. Add the model's color to `MODEL_COLORS` in `modelColors.js`
2. Use the exact model name as the key
3. The color will automatically be picked up by all components

## Benefits of This Approach

✅ **Single Source of Truth**: Change colors in one place  
✅ **Consistency**: All components use the same colors  
✅ **Maintainability**: Easy to update and manage  
✅ **Type Safety**: Helper functions to validate model names
