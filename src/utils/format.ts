import { BN } from '@project-serum/anchor';

/**
 * Formats a BN value representing lamports to a human-readable token amount
 * @param amount The amount in lamports/smallest units (BN)
 * @param decimals Number of decimal places (default 9 for SOL/LAKKHI)
 * @param abbreviate Whether to abbreviate large numbers
 */
export const formatLamports = (
  amount?: BN | null, 
  decimals = 9,
  abbreviate = false
): string => {
  if (!amount) return '0';
  
  const divisor = new BN(10).pow(new BN(decimals));
  const wholePart = amount.div(divisor);
  const fractionalPart = amount.mod(divisor);
  
  // Convert to strings
  let wholeStr = wholePart.toString();
  let fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  
  // Trim trailing zeros from fractional part
  while (fractionalStr.length > 0 && fractionalStr.endsWith('0')) {
    fractionalStr = fractionalStr.slice(0, -1);
  }
  
  // Check if we should abbreviate
  if (abbreviate && wholeStr.length > 3) {
    if (wholeStr.length > 9) {
      // Billions
      const billions = parseFloat(wholeStr) / 1_000_000_000;
      return `${billions.toFixed(2)}B`;
    } else if (wholeStr.length > 6) {
      // Millions
      const millions = parseFloat(wholeStr) / 1_000_000;
      return `${millions.toFixed(2)}M`;
    } else {
      // Thousands
      const thousands = parseFloat(wholeStr) / 1_000;
      return `${thousands.toFixed(2)}K`;
    }
  }
  
  // Format with commas
  wholeStr = wholeStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  // Combine whole and fractional parts
  return fractionalStr.length > 0 ? `${wholeStr}.${fractionalStr}` : wholeStr;
};

/**
 * Formats a number to a currency string
 * @param amount The amount
 * @param currency The currency symbol
 */
export const formatCurrency = (
  amount?: number | null,
  currency = '$'
): string => {
  if (amount === undefined || amount === null) return `${currency}0.00`;
  
  return `${currency}${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Convert LAKKHI/SOL amount to USD
 * @param solAmount Amount in SOL
 * @returns Equivalent amount in USD
 */
export const solToUSD = (solAmount: number | BN): number => {
  // Fixed conversion rate for demo purposes
  // In a real implementation, you would fetch the current rate from an API
  const solToUSDRate = 100; // 1 SOL = $100 USD
  
  if (BN.isBN(solAmount)) {
    return solAmount.toNumber() * solToUSDRate / 1e9; // Convert from lamports
  }
  
  return solAmount * solToUSDRate;
};

/**
 * Convert USD amount to LAKKHI/SOL
 * @param usdAmount Amount in USD
 * @returns Equivalent amount in SOL
 */
export const usdToSOL = (usdAmount: number): BN => {
  // Fixed conversion rate for demo purposes
  const usdToSOLRate = 0.01; // 1 USD = 0.01 SOL
  
  // Convert to lamports (SOL's smallest unit) and return as BN
  return new BN(Math.round(usdAmount * usdToSOLRate * 1e9));
};

/**
 * Format SOL amount for display
 * @param solAmount Amount in SOL (as BN or number)
 * @returns Formatted string with SOL amount
 */
export const formatSOL = (solAmount: number | BN): string => {
  if (!solAmount) return '0';
  
  let amount: number;
  
  if (BN.isBN(solAmount)) {
    // Convert from lamports to SOL
    amount = solAmount.toNumber() / 1e9;
  } else {
    amount = solAmount;
  }
  
  // Format with 4 decimal places maximum
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  });
};

/**
 * Format USD amount for display
 * @param usdAmount Amount in USD
 * @returns Formatted string with USD amount and $ symbol
 */
export const formatUSD = (usdAmount: number): string => {
  if (!usdAmount) return '$0.00';
  
  return usdAmount.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Calculate progress percentage
 * @param current Current amount
 * @param target Target amount
 * @returns Progress percentage (0-100)
 */
export const calculateProgress = (current: BN | number, target: BN | number): number => {
  if (!current || !target) return 0;
  
  let currentNum: number;
  let targetNum: number;
  
  if (BN.isBN(current)) {
    currentNum = current.toNumber();
  } else {
    currentNum = current;
  }
  
  if (BN.isBN(target)) {
    targetNum = target.toNumber();
  } else {
    targetNum = target;
  }
  
  if (targetNum <= 0) return 0;
  
  const progress = (currentNum / targetNum) * 100;
  return Math.min(100, Math.max(0, progress)); // Clamp between 0-100
}; 