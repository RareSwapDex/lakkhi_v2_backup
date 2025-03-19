import { 
  Connection, 
  Keypair, 
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import {
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getMint,
  MINT_SIZE
} from '@solana/spl-token';

// LAKKHI token information
export const LAKKHI_DECIMALS = 9;
export const LAKKHI_MINT = new PublicKey("6pABjANnUTSyymBeXHKQBgAsu6BkDoCLh9rbj9WFNTAS");

/**
 * Create a new SPL token (for admin use only)
 */
export async function createLakkhiToken(connection: Connection, payer: Keypair): Promise<PublicKey> {
  // Generate a new keypair for the token mint
  const mintKeypair = Keypair.generate();
  
  // Get minimum lamports for rent exemption
  const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
  
  // Create transaction
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
  
  // Send transaction
  await sendAndConfirmTransaction(connection, transaction, [payer, mintKeypair]);
  
  console.log(`LAKKHI token created with mint address: ${mintKeypair.publicKey.toString()}`);
  return mintKeypair.publicKey;
}

/**
 * Get or create an associated token account for the given wallet
 */
export async function getOrCreateAssociatedTokenAccount(
  connection: Connection,
  payer: Keypair | { publicKey: PublicKey },
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  const associatedTokenAddress = await getAssociatedTokenAddress(
    mint,
    owner,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  
  // Check if account exists
  try {
    await getAccount(connection, associatedTokenAddress);
    return associatedTokenAddress;
  } catch (error) {
    // Account doesn't exist, create it
    if ('publicKey' in payer && !('secretKey' in payer)) {
      // We have a wallet adapter, not a keypair - just return the address
      return associatedTokenAddress;
    }

    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        (payer as Keypair).publicKey,
        associatedTokenAddress,
        owner,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    
    await sendAndConfirmTransaction(connection, transaction, [payer as Keypair]);
    return associatedTokenAddress;
  }
}

/**
 * Get LAKKHI token balance for a wallet
 */
export async function getLakkhiBalance(connection: Connection, walletAddress: PublicKey): Promise<number> {
  try {
    const tokenAccountAddress = await getAssociatedTokenAddress(
      LAKKHI_MINT,
      walletAddress
    );
    
    try {
      const tokenAccount = await getAccount(connection, tokenAccountAddress);
      const mintInfo = await getMint(connection, LAKKHI_MINT);
      
      return Number(tokenAccount.amount) / Math.pow(10, mintInfo.decimals);
    } catch (error) {
      // Token account doesn't exist, so balance is 0
      return 0;
    }
  } catch (error) {
    console.error('Error getting LAKKHI balance:', error);
    return 0;
  }
}

/**
 * Get USD value of LAKKHI tokens
 */
export async function getLakkhiPriceInUSD(): Promise<number> {
  try {
    // In a real implementation, this would fetch from an API
    // For now, we'll use a fixed value (e.g. $0.10 per LAKKHI)
    return 0.10;
  } catch (error) {
    console.error('Error getting LAKKHI price:', error);
    return 0.10; // Fallback value
  }
}

/**
 * Convert USD to LAKKHI tokens
 */
export async function usdToLakkhi(usdAmount: number): Promise<number> {
  const price = await getLakkhiPriceInUSD();
  return usdAmount / price;
}

/**
 * Convert LAKKHI to USD
 */
export async function lakkhiToUsd(lakkhiAmount: number): Promise<number> {
  const price = await getLakkhiPriceInUSD();
  return lakkhiAmount * price;
} 