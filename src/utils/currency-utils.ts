// Conversion rate: 2 LAKKHI = 1 USD
export const LAKKHI_TO_USD_RATE = 0.5;
export const USD_TO_LAKKHI_RATE = 2;

// Convert LAKKHI to USD
export const lakkhiToUsd = (lakkhi: number): number => {
  return lakkhi * LAKKHI_TO_USD_RATE;
};

// Convert USD to LAKKHI
export const usdToLakkhi = (usd: number): number => {
  return usd * USD_TO_LAKKHI_RATE;
};

// Format USD amount with $ symbol and 2 decimal places
export const formatUsd = (usd: number): string => {
  return `$${usd.toFixed(2)}`;
};

// Format LAKKHI amount with 2 decimal places
export const formatLakkhi = (lakkhi: number): string => {
  return `${lakkhi.toFixed(2)} LAKKHI`;
};

// Convert lamports (smallest unit) to USD
export const lamportsToUsd = (lamports: number): number => {
  // 1 LAKKHI = 10^9 lamports
  const lakkhi = lamports / 1_000_000_000;
  return lakkhiToUsd(lakkhi);
};

// Convert USD to lamports
export const usdToLamports = (usd: number): number => {
  const lakkhi = usdToLakkhi(usd);
  return lakkhi * 1_000_000_000;
}; 