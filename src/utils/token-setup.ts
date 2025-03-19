import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
  clusterApiUrl
} from '@solana/web3.js';
import { 
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction
} from '@solana/spl-token';

// The LAKKHI token mint address - Replace with your deployed token
export const LAKKHI_MINT = new PublicKey('6pABjANnUTSyymBeXHKQBgAsu6BkDoCLh9rbj9WFNTAS');

// Token decimals - typically 9 for Solana tokens
export const LAKKHI_DECIMALS = 9;

/**
 * Deploy a new LAKKHI token on Solana
 * Note: This should be run once by an admin/deployer
 */
export async function deployLakkhiToken(
  connection: Connection, 
  payer: Keypair,
  initialSupply: number = 1_000_000_000 // 1 billion LAKKHI tokens
): Promise<PublicKey> {
  try {
    // Generate a new keypair for the token mint
    const mintKeypair = Keypair.generate();
    console.log(`Generated mint address: ${mintKeypair.publicKey.toString()}`);
    
    // Get the minimum lamports required for rent exemption
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    
    // Create transaction to create token mint
    const transaction = new Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        LAKKHI_DECIMALS,
        payer.publicKey,
        payer.publicKey,
        TOKEN_PROGRAM_ID
      )
    );
    
    // Send and confirm transaction to create the mint
    await sendAndConfirmTransaction(connection, transaction, [payer, mintKeypair]);
    console.log(`LAKKHI token created with mint address: ${mintKeypair.publicKey.toString()}`);
    
    // Create the token account for the payer
    const tokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      payer.publicKey
    );
    
    // Create associated token account for the payer
    const createTokenAccountTx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        tokenAccount,
        payer.publicKey,
        mintKeypair.publicKey
      )
    );
    
    await sendAndConfirmTransaction(connection, createTokenAccountTx, [payer]);
    
    // Mint initial supply to the payer
    const mintToTx = new Transaction().add(
      createMintToInstruction(
        mintKeypair.publicKey,
        tokenAccount,
        payer.publicKey,
        initialSupply * Math.pow(10, LAKKHI_DECIMALS)
      )
    );
    
    await sendAndConfirmTransaction(connection, mintToTx, [payer]);
    console.log(`Minted ${initialSupply} LAKKHI tokens to ${payer.publicKey.toString()}`);
    
    return mintKeypair.publicKey;
  } catch (error) {
    console.error('Error deploying LAKKHI token:', error);
    throw error;
  }
}

/**
 * Convert LAKKHI tokens to USD based on current market price
 */
export function lakkhiToUsd(amount: number, lakkhiPrice: number): number {
  return amount * lakkhiPrice;
}

/**
 * Convert USD to LAKKHI tokens based on current market price
 */
export function usdToLakkhi(amount: number, lakkhiPrice: number): number {
  if (lakkhiPrice <= 0) return 0;
  return amount / lakkhiPrice;
}

/**
 * Get the LAKKHI token price in USD
 * This is a placeholder - in production, you would fetch from an oracle or exchange
 */
export async function getLakkhiPrice(): Promise<number> {
  // Placeholder: In production, fetch from an API or oracle
  // For testing, return a fixed value
  return 0.01; // $0.01 per LAKKHI token
}

/**
 * Check if a user has a LAKKHI token account
 */
export async function hasLakkhiTokenAccount(
  connection: Connection,
  walletAddress: PublicKey
): Promise<boolean> {
  try {
    const tokenAddress = await getAssociatedTokenAddress(
      LAKKHI_MINT,
      walletAddress
    );
    
    const tokenAccount = await connection.getAccountInfo(tokenAddress);
    return tokenAccount !== null;
  } catch (error) {
    console.error('Error checking LAKKHI token account:', error);
    return false;
  }
}

/**
 * Get a user's LAKKHI token balance
 */
export async function getLakkhiBalance(
  connection: Connection,
  walletAddress: PublicKey
): Promise<number> {
  try {
    const tokenAddress = await getAssociatedTokenAddress(
      LAKKHI_MINT,
      walletAddress
    );
    
    try {
      const tokenAccountInfo = await connection.getAccountInfo(tokenAddress);
      
      if (!tokenAccountInfo) {
        return 0;
      }
      
      // Parse the token account data
      const data = Buffer.from(tokenAccountInfo.data);
      
      // Extract the amount (bytes 64-71)
      const amount = data.readBigUInt64LE(64);
      
      return Number(amount) / Math.pow(10, LAKKHI_DECIMALS);
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return 0;
    }
  } catch (error) {
    console.error('Error getting LAKKHI balance:', error);
    return 0;
  }
} 