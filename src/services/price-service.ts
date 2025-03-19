import { BN } from '@project-serum/anchor';
import axios from 'axios';

// Cache for price data
let solPriceCache: {
  usdPrice: number;
  lastUpdated: number;
} = {
  usdPrice: 100, // Default price if API fails: $100 per SOL
  lastUpdated: 0
};

// Cache refresh interval (15 minutes)
const CACHE_REFRESH_INTERVAL = 15 * 60 * 1000;

/**
 * Get current SOL price in USD
 * Uses CoinGecko API with fallback to cached value
 */
export const getSolanaPrice = async (): Promise<number> => {
  const now = Date.now();
  
  // Return cached value if it's still fresh
  if (solPriceCache.lastUpdated > 0 && 
      now - solPriceCache.lastUpdated < CACHE_REFRESH_INTERVAL) {
    return solPriceCache.usdPrice;
  }
  
  try {
    // Fetch current price from CoinGecko API
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
    );
    
    if (response.data && response.data.solana && response.data.solana.usd) {
      // Update cache
      solPriceCache = {
        usdPrice: response.data.solana.usd,
        lastUpdated: now
      };
      
      return solPriceCache.usdPrice;
    }
    
    // Return cached value if API response is invalid
    return solPriceCache.usdPrice;
  } catch (error) {
    console.error('Error fetching Solana price:', error);
    
    // Return cached value in case of error
    return solPriceCache.usdPrice;
  }
};

/**
 * Convert SOL to USD
 * @param solAmount Amount in SOL
 * @returns Equivalent amount in USD
 */
export const solToUSD = async (solAmount: number | BN): Promise<number> => {
  let amount: number;
  
  if (BN.isBN(solAmount)) {
    // Convert from lamports to SOL
    amount = solAmount.toNumber() / 1e9;
  } else {
    amount = solAmount;
  }
  
  const solPrice = await getSolanaPrice();
  return amount * solPrice;
};

/**
 * Convert SOL to USD synchronously (uses cached price)
 * @param solAmount Amount in SOL
 * @returns Equivalent amount in USD
 */
export const solToUSDSync = (solAmount: number | BN): number => {
  let amount: number;
  
  if (BN.isBN(solAmount)) {
    // Convert from lamports to SOL
    amount = solAmount.toNumber() / 1e9;
  } else {
    amount = solAmount;
  }
  
  return amount * solPriceCache.usdPrice;
};

/**
 * Convert USD to SOL
 * @param usdAmount Amount in USD
 * @returns Equivalent amount in SOL (as BN in lamports)
 */
export const usdToSOL = async (usdAmount: number): Promise<BN> => {
  const solPrice = await getSolanaPrice();
  
  if (solPrice <= 0) {
    throw new Error('Invalid SOL price');
  }
  
  // Convert to SOL
  const solAmount = usdAmount / solPrice;
  
  // Convert to lamports (smallest unit) and return as BN
  return new BN(Math.round(solAmount * 1e9));
};

/**
 * Convert USD to SOL synchronously (uses cached price)
 * @param usdAmount Amount in USD
 * @returns Equivalent amount in SOL (as BN in lamports)
 */
export const usdToSOLSync = (usdAmount: number): BN => {
  if (solPriceCache.usdPrice <= 0) {
    // Use default price if cached price is invalid
    solPriceCache.usdPrice = 100;
  }
  
  // Convert to SOL
  const solAmount = usdAmount / solPriceCache.usdPrice;
  
  // Convert to lamports (smallest unit) and return as BN
  return new BN(Math.round(solAmount * 1e9));
};

/**
 * Format a SOL amount as USD with currency symbol
 * @param solAmount Amount in SOL
 * @returns Formatted USD string
 */
export const formatSolAsUSD = async (solAmount: number): Promise<string> => {
  const usdAmount = await solToUSD(solAmount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(usdAmount);
};

/**
 * Format USD amount with currency symbol
 * @param usdAmount Amount in USD
 * @returns Formatted USD string
 */
export const formatUSD = (usdAmount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(usdAmount);
};

/**
 * Get the current LAKKHI token price in USD
 * This is a simplified implementation - in a real app, you'd fetch from
 * an actual price oracle or exchange
 * @returns The current LAKKHI price in USD
 */
export const getLakkhiPrice = async (): Promise<number> => {
  try {
    // In a real implementation, you would fetch from your token's price API
    // For this demo, we'll calculate based on SOL price with a ratio
    const solPrice = await getSolanaPrice();
    
    // Using a fixed ratio for demo: 1 LAKKHI = 0.01 SOL
    return solPrice * 0.01;
  } catch (error) {
    console.error('Error fetching LAKKHI price:', error);
    return 0.05; // Default fallback price
  }
};

/**
 * Get the total supply of LAKKHI tokens
 * In a real implementation, you would fetch this from the blockchain
 * @returns The total supply of LAKKHI tokens
 */
export const getLakkhiSupply = async (): Promise<number> => {
  try {
    // In a real implementation, you would fetch this from the blockchain
    return 100_000_000; // Mock supply: 100 million LAKKHI
  } catch (error) {
    console.error('Error fetching LAKKHI supply:', error);
    return 100_000_000; // Fallback supply
  }
};

/**
 * Convert LAKKHI amount to USD
 * @param lakkhi Amount in LAKKHI
 * @returns The equivalent amount in USD
 */
export const lakkhiToUSD = async (lakkhi: number): Promise<number> => {
  const lakkhiPrice = await getLakkhiPrice();
  return lakkhi * lakkhiPrice;
};

/**
 * Convert USD amount to LAKKHI
 * @param usd Amount in USD
 * @returns The equivalent amount in LAKKHI
 */
export const usdToLAKKHI = async (usd: number): Promise<number> => {
  const lakkhiPrice = await getLakkhiPrice();
  return usd / lakkhiPrice;
}; 