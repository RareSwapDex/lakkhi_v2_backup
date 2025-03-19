/**
 * Global application constants
 */

import { PublicKey } from '@solana/web3.js';

// Controls global platform mode
export const FORCE_LIVE_MODE = true;

// Production API endpoints
// Using devnet for testing
export const SOLANA_RPC = 'https://api.devnet.solana.com';
export const BACKEND_API = 'https://api.lakkhi.com';
export const METADATA_API = 'https://metadata.lakkhi.com';

// Helper function to determine if we're in live mode
export function getLiveMode() {
  return process.env.NODE_ENV === 'production';
}

// Feature flags to control what's available in the app
export const FEATURES = {
  DONATIONS_ENABLED: false, // Disable until on-chain program is fixed
  STAKING_ENABLED: false,
  INCENTIVES_ENABLED: false,
  UPDATES_ENABLED: true,  // Updates can be client-side only
  LIVE_MODE: getLiveMode(),  // Use function to determine mode
};

// Mercuryo production credentials
export const MERCURYO_CONFIG = {
  WIDGET_ID: 'f5038e22-366c-4df6-847c-50f6d6cf6add',
  SIGNATURE_KEY: '9d4ead8bce5b71fe6f0fe1b910b968b1',
  REDIRECT_URL: 'https://app.lakkhi.com/campaigns'
};

// Token details
export const TOKEN_CONFIG = {
  LAKKHI_TOKEN_MINT: new PublicKey('6pABjANnUTSyymBeXHKQBgAsu6BkDoCLh9rbj9WFNTAS'),
  TOKEN_SYMBOL: 'LAKKHI',
  TOKEN_DECIMALS: 9
};

// Program IDs
export const PROGRAM_IDS = {
  // Use the program ID from our keypair
  MAIN_PROGRAM: new PublicKey('7sd5RL9UBLt8CaE4cXGa6ipSBZXTJdVrXbJYWK1Fi9AY'),
  MARKETPLACE_PROGRAM: new PublicKey('3rGMgLCkUNMUaHJC9Vay8RuERPNf3gBzY2iSmyvL9JG3')
}; 