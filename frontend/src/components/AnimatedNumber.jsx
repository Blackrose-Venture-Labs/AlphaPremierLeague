import React from 'react';
import NumberFlow, { continuous } from '@number-flow/react';

// Indian number formatting function
const formatIndianNumber = (num, decimals = 2) => {
  const [integerPart, decimalPart] = num.toFixed(decimals).split('.');
  
  // Indian numbering system: first 3 digits from right, then groups of 2
  let lastThree = integerPart.substring(integerPart.length - 3);
  let otherNumbers = integerPart.substring(0, integerPart.length - 3);
  
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  
  return decimals > 0 ? `${formatted}.${decimalPart}` : formatted;
};

const AnimatedNumber = ({ value, prefix = '', suffix = '', decimals = 2, className = '', useIndianFormat = false }) => {
  const numericValue = parseFloat(value);
  
  if (useIndianFormat) {
    const formattedValue = formatIndianNumber(numericValue, decimals);
    return (
      <span className={className} style={{ minWidth: '8ch', textAlign: 'right', display: 'inline-block' }}>
        {prefix}{formattedValue}{suffix}
      </span>
    );
  }
  
  const formattedValue = numericValue.toFixed(decimals);
  
  return (
    <span className={className} style={{ minWidth: '8ch', textAlign: 'right', display: 'inline-block' }}>
      {prefix}
      <NumberFlow
        plugins={[continuous]}
        value={parseFloat(formattedValue)}
        format={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals }}
      />
      {suffix}
    </span>
  );
};

export default AnimatedNumber;