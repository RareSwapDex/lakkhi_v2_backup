import { Keypair, PublicKey, Connection } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import Cookies from 'js-cookie';
import { encrypt, decrypt } from '@/utils/encryption';

// Interface for wallet details
export interface SolanaWallet {
  publicKey: string;
  encryptedPrivateKey: string; // Encrypted for security
}

// Interface for the wallet database
interface WalletDatabase {
  [email: string]: SolanaWallet;
}

// In-memory storage for wallet mapping in development
// In production, this would be a secure database
let walletDatabase: WalletDatabase = {};

// Cookie name for storing the current user's wallet
const WALLET_COOKIE_NAME = 'solana_wallet';

/**
 * Create a new Solana wallet for a user
 * @param email User's email address
 * @returns Wallet public key as string
 */
export const createSolanaWallet = async (email: string): Promise<string> => {
  try {
    // Check if wallet already exists for this email
    if (walletDatabase[email]) {
      console.log('Wallet already exists for email:', email);
      return walletDatabase[email].publicKey;
    }

    // Generate a new mnemonic
    const mnemonic = bip39.generateMnemonic();
    
    // Derive the seed from the mnemonic
    const seed = await bip39.mnemonicToSeed(mnemonic);
    
    // Derive the Solana path (m/44'/501'/0'/0')
    const derivedSeed = derivePath("m/44'/501'/0'/0'", Buffer.from(seed.slice(0, 32)).toString('hex')).key;
    
    // Create Solana keypair
    const keypair = Keypair.fromSeed(derivedSeed);
    
    // Get public key as string
    const publicKey = keypair.publicKey.toBase58();
    
    // Encrypt private key for storage (server-side encryption key would be used in production)
    const privateKeyBytes = keypair.secretKey;
    const encryptedPrivateKey = encrypt(
      Buffer.from(privateKeyBytes).toString('hex'),
      process.env.ENCRYPTION_KEY || 'development-encryption-key'
    );
    
    // Store wallet in database
    walletDatabase[email] = {
      publicKey,
      encryptedPrivateKey
    };

    console.log('Created new Solana wallet for email:', email);
    console.log('Wallet public key:', publicKey);

    // Store in cookie for current session (encrypted)
    const walletData = {
      email,
      publicKey,
      timestamp: Date.now()
    };
    Cookies.set(WALLET_COOKIE_NAME, encrypt(JSON.stringify(walletData), 'client-side-key'), {
      expires: 1, // 1 day
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    return publicKey;
  } catch (error) {
    console.error('Error creating Solana wallet:', error);
    throw new Error('Failed to create Solana wallet');
  }
};

/**
 * Get or create a Solana wallet for a user
 * @param email User's email address
 * @returns Wallet public key
 */
export const getOrCreateSolanaWallet = async (email: string): Promise<string> => {
  if (!email) {
    throw new Error('Email is required');
  }
  
  try {
    // Check if wallet exists for this email
    if (walletDatabase[email]) {
      return walletDatabase[email].publicKey;
    }
    
    // If not, create a new wallet
    return await createSolanaWallet(email);
  } catch (error) {
    console.error('Error in getOrCreateSolanaWallet:', error);
    throw error;
  }
};

/**
 * Get a wallet by email
 * @param email User's email
 * @returns Wallet if found, null otherwise
 */
export const getWalletByEmail = (email: string): SolanaWallet | null => {
  return walletDatabase[email] || null;
};

/**
 * Verify if a wallet belongs to an email
 * @param email User's email
 * @param publicKey Wallet public key
 * @returns true if the wallet belongs to the email
 */
export const verifyWalletOwnership = (email: string, publicKey: string): boolean => {
  const wallet = walletDatabase[email];
  return wallet ? wallet.publicKey === publicKey : false;
};

/**
 * Get private key for a wallet (should only be used server-side)
 * @param email User's email
 * @returns Decrypted private key as Uint8Array
 */
export const getPrivateKey = (email: string): Uint8Array | null => {
  try {
    const wallet = walletDatabase[email];
    if (!wallet) return null;
    
    const decryptedHex = decrypt(
      wallet.encryptedPrivateKey,
      process.env.ENCRYPTION_KEY || 'development-encryption-key'
    );
    
    const privateKeyBytes = new Uint8Array(
      Buffer.from(decryptedHex, 'hex')
    );
    
    return privateKeyBytes;
  } catch (error) {
    console.error('Error getting private key:', error);
    return null;
  }
};

/**
 * Check if a Solana account exists on the network
 * @param publicKey Wallet public key
 * @param connection Solana connection
 * @returns true if account exists
 */
export const checkSolanaAccountExists = async (
  publicKey: string,
  connection: Connection
): Promise<boolean> => {
  try {
    const accountInfo = await connection.getAccountInfo(
      new PublicKey(publicKey)
    );
    return accountInfo !== null;
  } catch (error) {
    console.error('Error checking Solana account:', error);
    return false;
  }
};

/**
 * Get the current wallet from cookie
 * @returns Current wallet data or null
 */
export const getCurrentWallet = (): { email: string; publicKey: string } | null => {
  try {
    const encryptedWallet = Cookies.get(WALLET_COOKIE_NAME);
    if (!encryptedWallet) return null;
    
    const walletData = JSON.parse(
      decrypt(encryptedWallet, 'client-side-key')
    );
    
    return {
      email: walletData.email,
      publicKey: walletData.publicKey
    };
  } catch (error) {
    console.error('Error getting current wallet:', error);
    return null;
  }
};

/**
 * Clear the current wallet from cookie
 */
export const clearCurrentWallet = (): void => {
  Cookies.remove(WALLET_COOKIE_NAME);
}; 