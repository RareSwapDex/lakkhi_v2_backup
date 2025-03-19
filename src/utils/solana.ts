/**
 * Solana-related utility functions
 */

/**
 * Get the Solana Explorer URL for a transaction, account, or token
 * @param id The transaction signature, account address, or token mint address
 * @param cluster The Solana cluster to use (mainnet-beta, testnet, devnet)
 * @returns The Solana Explorer URL
 */
export const getSolanaExplorerUrl = (
  id: string,
  cluster: 'mainnet-beta' | 'testnet' | 'devnet' = 'devnet'
): string => {
  // Determine if this is a transaction or account
  const isSignature = !id.includes('1111') && id.length < 88;
  
  const baseUrl = 'https://explorer.solana.com';
  const clusterParam = cluster !== 'mainnet-beta' ? `?cluster=${cluster}` : '';
  
  if (isSignature) {
    return `${baseUrl}/tx/${id}${clusterParam}`;
  } else {
    return `${baseUrl}/address/${id}${clusterParam}`;
  }
};

/**
 * Format a Solana address to a shorter version
 * @param address The full Solana address
 * @param prefixLength Number of characters to show at the beginning
 * @param suffixLength Number of characters to show at the end
 * @returns Formatted address (e.g., "7J4c...3Qe1")
 */
export const formatAddress = (
  address: string, 
  prefixLength = 4, 
  suffixLength = 4
): string => {
  if (!address) return '';
  if (address.length <= prefixLength + suffixLength + 3) return address;
  
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
};

/**
 * Format a lamport amount to SOL
 * @param lamports Amount in lamports
 * @returns Formatted SOL amount as a string
 */
export const lamportsToSol = (lamports: number): string => {
  return (lamports / 1_000_000_000).toFixed(9);
};

/**
 * Format a SOL amount to lamports
 * @param sol Amount in SOL
 * @returns Lamports as a number
 */
export const solToLamports = (sol: number): number => {
  return sol * 1_000_000_000;
};

/**
 * Check if a string is a valid Solana address
 * @param address The address to check
 * @returns True if the address is valid
 */
export const isValidSolanaAddress = (address: string): boolean => {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
};

/**
 * Get the Solana cluster RPC URL
 * @param cluster The Solana cluster
 * @returns The RPC URL for the specified cluster
 */
export const getClusterUrl = (
  cluster: 'mainnet-beta' | 'testnet' | 'devnet' | 'localhost' = 'devnet'
): string => {
  switch (cluster) {
    case 'mainnet-beta':
      return 'https://api.mainnet-beta.solana.com';
    case 'testnet':
      return 'https://api.testnet.solana.com';
    case 'devnet':
      return 'https://api.devnet.solana.com';
    case 'localhost':
      return 'http://localhost:8899';
    default:
      return 'https://api.devnet.solana.com';
  }
}; 