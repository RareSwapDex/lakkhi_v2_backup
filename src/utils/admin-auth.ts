import { PublicKey } from '@solana/web3.js';

// List of authorized admin wallet addresses
// In a real application, this would be stored in a secure database
const ADMIN_WALLETS = [
  // Replace these with actual admin wallet addresses
  'AYJCoYd7jm5TGz1t9EK5sNi7moLNBhV9xnF8DE2qjJKg',
  'HXtBm8XZbxaTt41uqaKhwUAa6Z1aPyvJdsZVENiWsetg',
  // Add the current connected wallet
  '45NCmh2v7BoWerL4Ak7SuEKECsRun8kbLdNibLnBQZ4E',
  // New admin wallet
  'Dw3vTiw26CLrkUEwfq8RXK6d2ZTPhqt8BsRs2TgqHFmD',
];

/**
 * Check if a wallet is authorized as an admin
 * @param walletPublicKey Wallet public key to check
 * @returns True if the wallet is authorized, false otherwise
 */
export function isAdmin(walletPublicKey: PublicKey | null): boolean {
  if (!walletPublicKey) {
    return false;
  }

  return ADMIN_WALLETS.includes(walletPublicKey.toString());
}

/**
 * Check if the user is authenticated (has a wallet connected)
 * @param walletPublicKey User's wallet public key
 * @returns True if authenticated, false otherwise
 */
export function isAuthenticated(walletPublicKey: PublicKey | null): boolean {
  return !!walletPublicKey;
}

/**
 * Get a list of admins
 * @returns List of admin public keys
 */
export function getAdminList(): string[] {
  return ADMIN_WALLETS;
}

/**
 * Add a new admin (only for development/testing)
 * In a real application, this would be done through a secure admin panel
 * @param walletAddress Admin wallet address to add
 */
export function addAdmin(walletAddress: string): void {
  if (!ADMIN_WALLETS.includes(walletAddress)) {
    ADMIN_WALLETS.push(walletAddress);
  }
} 