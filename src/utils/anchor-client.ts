import { Program, AnchorProvider, web3, BN, Idl } from '@project-serum/anchor';
import { clusterApiUrl, Connection, PublicKey, Keypair, SystemProgram, Transaction, LAMPORTS_PER_SOL, Commitment } from '@solana/web3.js';
import { solToUSD } from '@/services/price-service';
import idl from '../idl/lakkhi_program.json';
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import * as anchor from '@coral-xyz/anchor';
import { useConnection } from '@solana/wallet-adapter-react';
import { getLiveMode, FEATURES, PROGRAM_IDS, SOLANA_RPC, TOKEN_CONFIG } from './constants';
import { debugLog } from './debug-utils';
import campaignsData from '../campaigns.json';
import platformData from '../platform-data.json';

// Program ID for the app - update with your actual program ID
const programId = new PublicKey('8VFoxs1nUvjXWmdnAFevhWMQYXXXGPtVRXK1LyqKghBo');

// Check if we're in development mode
const isDevelopment = false; // Force production mode

// Network configuration
const getConnection = () => {
  // Use a more reliable connection configuration with retry logic
  return new Connection(
    SOLANA_RPC, 
    {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
      disableRetryOnRateLimit: false,
      httpHeaders: {
        'Content-Type': 'application/json',
      }
    }
  );
};

// Get a properly configured provider with the given wallet
const getProvider = (wallet: any) => {
  const opts = {
    preflightCommitment: 'confirmed' as Commitment,
  };
  
  const connection = getConnection();
  
  const provider = new AnchorProvider(
    connection,
    wallet,
    opts
  );
  
  return provider;
};

// Get program instance
const getProgram = (wallet: any) => {
  const provider = getProvider(wallet);
  const program = new Program(idl as Idl, programId, provider);
  return program;
};

export interface Campaign {
  pubkey: PublicKey;
  creator: PublicKey;
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  targetAmount: BN;
  currentAmount: BN;
  endDate: Date;
  isActive: boolean;
  donorsCount: BN;
  updatesCount: BN;
  fundsReleased?: boolean;
  campaignId?: BN;
  incentives?: IncentiveTier[];
}

export interface CampaignUpdate {
  pubkey: PublicKey;
  campaign: PublicKey;
  title: string;
  content: string;
  timestamp: Date;
  updateId: BN;
}

export interface Donation {
  pubkey: string;
  campaignPubkey: string;
  donor: string;
  amount: BN;
  timestamp: Date;
}

export interface IncentiveTier {
  id: string;
  name: string;
  description: string;
  minAmount: string;
  maxSlots: string;
  claimedSlots: number;
}

// Helper function to find a token account
async function findTokenAccount(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey
): Promise<PublicKey | null> {
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    owner,
    { mint }
  );
  
  if (tokenAccounts.value.length > 0) {
    return tokenAccounts.value[0].pubkey;
  }
  
  return null;
}

// Create a custom hook to get the Anchor program instance
export function useAnchorClient() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [program, setProgram] = useState<Program | null>(null);
  const [platformState, setPlatformState] = useState<PublicKey | null>(null);
  const [lakkhiMint, setLakkhiMint] = useState<PublicKey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wallet) {
      try {
        setLoading(true);
        // Create the provider
    const provider = new AnchorProvider(
      connection,
          wallet,
          { preflightCommitment: 'processed' } as any
        );
        
        // Convert IDL for compatibility
        const idlCopy = JSON.parse(JSON.stringify(idl));
        
        // Create the program with programId (not PROGRAM_ID)
        const program = new Program(
          idlCopy as any,
          programId,
          provider
        );
        
        setProgram(program as any);

        // Find platform state PDA
        const findPlatformState = async () => {
          try {
            const [pda] = await PublicKey.findProgramAddress(
              [Buffer.from('platform-state')],
              programId
            );
            setPlatformState(pda);

            try {
              // Get the platform state to find the LAKKHI mint
              // Try-catch in case the account doesn't exist yet
              if (program.account && typeof program.account.platformState?.fetch === 'function') {
                try {
                  const platformStateAccount = await program.account.platformState.fetch(pda);
                  if (platformStateAccount && (platformStateAccount as any).lakkhiMint) {
                    setLakkhiMint((platformStateAccount as any).lakkhiMint);
                  }
                } catch (fetchErr: any) {
                  console.log('Platform state account not found or not initialized yet:', fetchErr.message || String(fetchErr));
                }
              } else {
                console.log('platformState account type not defined in program interface');
              }
  } catch (error) {
              console.error('Error accessing platform state:', error);
            }
            setLoading(false);
          } catch (err) {
            console.error('Error finding program address:', err);
            setLoading(false);
          }
        };

        findPlatformState();
      } catch (err) {
        console.error('Error initializing Anchor client:', err);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [connection, wallet]);

  return { program, platformState, lakkhiMint, loading };
}

// Create a custom hook to get all campaigns
export const useCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { program } = useAnchorClient();

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Initialize with an empty array
        let allCampaigns: Campaign[] = [];
        
        // Fetch real campaigns from the program
        if (program) {
          try {
            const programCampaigns = await program.account.campaign.all();
            console.log('Found program campaigns:', programCampaigns.length);
            
            const realCampaigns = programCampaigns.map(({ publicKey, account }: any) => ({
              pubkey: publicKey,
              name: account.name,
              description: account.description,
              imageUrl: account.imageUrl,
              category: account.category || 'Other',
              creator: account.creator,
              currentAmount: account.currentAmount,
              targetAmount: account.targetAmount,
              donorsCount: account.donorsCount,
              endDate: new Date(account.endDate.toNumber() * 1000),
              isActive: new Date(account.endDate.toNumber() * 1000) > new Date(),
              updatesCount: account.updatesCount || new BN(0),
              fundsReleased: account.fundsReleased || false
            }));
            
            allCampaigns = realCampaigns;
          } catch (err) {
            console.error('Error fetching program campaigns:', err);
            setError(err instanceof Error ? err : new Error(String(err)));
          }
        }
        
        setCampaigns(allCampaigns);
      } catch (err) {
        console.error('Error in useCampaigns:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, [program]);

  return { campaigns, loading, error, setCampaigns };
};

// Hook to fetch a single campaign
export const useCampaign = (id?: string) => {
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { campaigns } = useCampaigns();

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // If we have campaigns from useCampaigns, try to find the one with matching ID
        if (campaigns && campaigns.length > 0) {
          const found = campaigns.find(c => c.pubkey.toString() === id);
          if (found) {
            setCampaign(found);
            setLoading(false);
            return;
          }
        }
        
        // Use our fetchCampaignById function
        if (id) {
          const result = await fetchCampaignById(id);
          if (result) {
            setCampaign(result);
          }
        }
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching campaign:', err);
        setError(err);
    setLoading(false);
      }
    };

    fetchData();
  }, [id, campaigns]);

  return { campaign, loading, error };
};

/**
 * Helper function to retry a failed RPC call
 * @param fn The function to retry
 * @param args Arguments to pass to the function
 * @param retries Number of retries
 * @param interval Interval between retries in milliseconds
 * @returns The result of the function call
 */
export const retryCall = async <T>(
  fn: (...args: any[]) => Promise<T>,
  args: any[] = [],
  retries = 3,
  interval = 1000
): Promise<T> => {
  try {
    return await fn(...args);
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    console.warn(`RPC call failed, retrying in ${interval}ms:`, error);
    await new Promise(resolve => setTimeout(resolve, interval));
    return retryCall(fn, args, retries - 1, interval);
  }
};

/**
 * Get a recent blockhash, retrying if it fails
 */
export const getLatestBlockhashWithRetry = async (connection: Connection) => {
  return await retryCall(
    () => connection.getLatestBlockhash('confirmed'),
    [],
    5
  );
};

// Update the createCampaign function to use versioned transactions for Phantom wallet signing and handle campaign keypair properly
export const createCampaign = async (
  name: string,
  description: string,
  targetAmount: number,
  endDate: Date,
  imageUrl: string,
  category: string,
  wallet: any,
  incentives: IncentiveTier[] = []
) => {
  // Cannot use useConnection hook here because this is not a component
  // Use direct connection instead
  const connection = getConnection();
  
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  try {
    console.log('Creating campaign with the following details:');
    console.log('- Name:', name);
    console.log('- Description:', description.substring(0, 50) + '...');
    console.log('- Target amount:', targetAmount, 'USD');
    console.log('- End date:', endDate.toISOString());
    console.log('- Image URL:', imageUrl);
    console.log('- Category:', category);
    
    // Check if the program exists on the blockchain
    const programId = PROGRAM_IDS.MAIN_PROGRAM;
    const programInfo = await connection.getAccountInfo(programId);
    if (!programInfo) {
      throw new Error('Program not found on devnet. Please deploy the program first.');
    }
    console.log('Program found on devnet:', programId.toString());
    
    // Load platform info from localStorage
    let platformAddress: string | null = localStorage.getItem('platformAddress');
    let tokenMint: string | null = localStorage.getItem('tokenMint');
    let adminAddress: string | null = localStorage.getItem('adminAddress');
    
    if (!platformAddress || !tokenMint || !adminAddress) {
      throw new Error('Platform not initialized. Please run the initialization script first.');
    }
    
    // Generate a keypair for the campaign account
    const campaignKeypair = Keypair.generate();
    console.log('Generated campaign account:', campaignKeypair.publicKey.toString());
    
    try {
      // Create and initialize the campaign account
      // 1. Calculate the space needed for the campaign account
      const CAMPAIGN_ACCOUNT_SIZE = 289; // Size in bytes for campaign data
      
      // 2. Get the minimum lamports required for rent exemption
      const lamports = await connection.getMinimumBalanceForRentExemption(CAMPAIGN_ACCOUNT_SIZE);
      
      // 3. Create instruction to create the account
      const createAccountInstruction = SystemProgram.createAccount({
        fromPubkey: wallet.publicKey,
        newAccountPubkey: campaignKeypair.publicKey,
        lamports,
        space: CAMPAIGN_ACCOUNT_SIZE,
        programId,
      });
      
      // 4. Create instruction to initialize the campaign
      const program = getProgram({ publicKey: wallet.publicKey, signTransaction: wallet.signTransaction });
      const initCampaignInstruction = await program.methods
        .createCampaign(
          name,
          description,
          new BN(targetAmount),
          new BN(Math.floor(endDate.getTime() / 1000)), // Convert to Unix timestamp
          imageUrl,
          category
        )
        .accounts({
          platform: new PublicKey(platformAddress),
          campaign: campaignKeypair.publicKey,
          creator: wallet.publicKey,
          system_program: SystemProgram.programId,
        })
        .instruction();
      
      // 5. Create a new transaction
      const recentBlockhash = await connection.getLatestBlockhash('confirmed');
      const transaction = new Transaction({
        feePayer: wallet.publicKey,
        blockhash: recentBlockhash.blockhash,
        lastValidBlockHeight: recentBlockhash.lastValidBlockHeight
      });
      
      // 6. Add both instructions to the transaction
      transaction.add(createAccountInstruction);
      transaction.add(initCampaignInstruction);
      
      // 7. Partially sign the transaction with the campaign keypair
      transaction.partialSign(campaignKeypair);
      
      // 8. Have the wallet sign the transaction
      const signedTransaction = await wallet.signTransaction(transaction);
      
      // 9. Send the signed transaction
      const serializedTransaction = signedTransaction.serialize();
      const signature = await connection.sendRawTransaction(serializedTransaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      // 10. Confirm the transaction
      await connection.confirmTransaction({
        signature,
        blockhash: recentBlockhash.blockhash,
        lastValidBlockHeight: recentBlockhash.lastValidBlockHeight
      }, 'confirmed');
      
      console.log('Campaign created successfully!');
      console.log('Transaction signature:', signature);
      
      // Return the campaign account public key as the campaign ID
      return campaignKeypair.publicKey.toString();
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw new Error(`Failed to create campaign: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error: any) {
    console.error('Error in createCampaign:', error);
    
    // Provide detailed error information
    const errorMessage = error?.message || String(error);
    console.error('Detailed error message:', errorMessage);
    
    // Proper error handling with specific messages
    if (errorMessage.includes('Not enough SOL')) {
      throw new Error('Not enough SOL to pay for transaction. Please add more SOL to your wallet.');
    }
    
    throw new Error(`Error creating campaign: ${errorMessage}`);
  }
};

// Create a staking contract for a campaign
export const createStakingContract = async (
  campaignPubkey: PublicKey | string,
  wallet: any,
  connection: Connection
) => {
  try {
    console.log('Creating staking contract for campaign:', typeof campaignPubkey === 'string' ? campaignPubkey : campaignPubkey.toString());
    
    // Generate a unique staking contract ID
    const stakingId = `staking-${typeof campaignPubkey === 'string' ? campaignPubkey : campaignPubkey.toString()}-${Date.now()}`;
    console.log('Staking contract created with ID:', stakingId);
    
    return stakingId;
  } catch (error) {
    console.error('Error creating staking contract:', error);
    throw error;
  }
};

// Update the LAKKHI token mint constant to use the devnet test token address
export const LAKKHI_TOKEN_MINT = TOKEN_CONFIG.LAKKHI_TOKEN_MINT;

// Functions from the original file
export const fetchCampaigns = async (): Promise<Campaign[]> => {
  try {
    const program = getProgram(null);
    
    // Use retry for fetching accounts
    const accounts = await retryCall(() => program.account.campaign.all());
    
    if (accounts.length === 0) {
      console.log('No campaigns found on blockchain');
    }
    
    return accounts.map(({ account, publicKey }) => ({
      pubkey: publicKey,
      name: (account as any).name,
      description: (account as any).description,
      imageUrl: (account as any).imageUrl,
      category: (account as any).category || 'Other',
      targetAmount: (account as any).targetAmount,
      currentAmount: (account as any).currentAmount,
      endDate: new Date((account as any).endDate.toNumber() * 1000),
      isActive: (account as any).isActive,
      creator: (account as any).creator,
      donorsCount: (account as any).donorsCount,
      updatesCount: (account as any).updatesCount || new BN(0),
      fundsReleased: (account as any).fundsReleased || false
    }));
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    // Provide a more user-friendly error message
    if (error instanceof Error) {
      if (error.message.includes('403') || error.message.includes('forbidden')) {
        throw new Error('Access to campaign data is forbidden. Please check your network connections and wallet permissions.');
      } else if (error.message.includes('429')) {
        throw new Error('Too many requests to blockchain. Please try again later.');
      }
    }
    throw error;
  }
};

export const fetchCampaign = async (program: Program, campaignPubkey: PublicKey): Promise<Campaign> => {
  try {
    if (!program) throw new Error('Program not initialized');
    
    // Fetch from blockchain
    const account = await program.account.campaign.fetch(campaignPubkey);
    
    return {
      pubkey: campaignPubkey,
      name: (account as any).name,
      description: (account as any).description,
      imageUrl: (account as any).imageUrl,
      category: (account as any).category || 'Other',
      creator: (account as any).creator,
      targetAmount: (account as any).targetAmount,
      currentAmount: (account as any).currentAmount,
      endDate: new Date((account as any).endDate.toNumber() * 1000),
      isActive: (account as any).isActive,
      donorsCount: (account as any).donorsCount,
      updatesCount: (account as any).updatesCount || new BN(0),
      fundsReleased: (account as any).fundsReleased || false
    };
  } catch (error) {
    console.error('Error fetching campaign:', error);
    throw error;
  }
};

export const donateTokens = async (
  program: Program,
  wallet: any,
  campaignPubkey: PublicKey,
  amount: number
): Promise<string> => {
  try {
    if (!program || !wallet.publicKey) throw new Error('Program not initialized');
    
    // Convert amount to lamports-equivalent (for token precision)
    const amountBN = new BN(amount * (10 ** 9)); // Assuming 9 decimals like SOL
    
    // Get the campaign account
    const campaign = await program.account.campaign.fetch(campaignPubkey);
    
    // Get the donor's token account
    const donorTokenAccount = await getAssociatedTokenAddress(
      LAKKHI_TOKEN_MINT,
      wallet.publicKey
    );
    
    // Get the campaign token account
    const campaignTokenAccount = await getAssociatedTokenAddress(
      LAKKHI_TOKEN_MINT,
      campaignPubkey,
      true // allowOwnerOffCurve
    );
    
    // Donate tokens instruction
    const tx = await program.methods
      .donateTokens(amountBN)
      .accounts({
        campaign: campaignPubkey,
        donor: wallet.publicKey,
        tokenMint: LAKKHI_TOKEN_MINT,
        donorTokenAccount: donorTokenAccount,
        campaignTokenAccount: campaignTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();
    
    // Sign and send transaction
    const signature = await wallet.sendTransaction(tx, program.provider.connection);
    
    await program.provider.connection.confirmTransaction(signature, 'confirmed');
    
    return signature;
  } catch (error) {
    console.error('Error donating tokens:', error);
    throw error;
  }
};

// Update releaseFunds function to always use real implementation
export const releaseFunds = async (
  campaignPubkey: string,
): Promise<string> => {
  try {
    // Get wallet and connection
    const wallet = window.solana;
    if (!wallet || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }
    
    // Get the campaign account
    const campaignAddress = new PublicKey(campaignPubkey);
    const program = getProgram(wallet);
    const campaignAccount = await program.account.campaign.fetch(campaignAddress) as any;
    
    // Check if the caller is the creator of the campaign
    if (!campaignAccount.creator.equals(wallet.publicKey)) {
      throw new Error('Only the campaign creator can release funds');
    }
    
    // Release funds
    debugLog('Releasing funds for campaign', { campaignId: campaignPubkey });
    
    // Create the transaction
    const tx = await program.methods
      .releaseFunds()
      .accounts({
        campaign: campaignAddress,
        authority: wallet.publicKey,
      })
      .transaction();
    
    // Get a recent blockhash
    const connection = getConnection();
    const { blockhash } = await getLatestBlockhashWithRetry(connection);
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;
    
    // Sign the transaction
    const signedTx = await wallet.signTransaction(tx);
    
    // Send the transaction
    const txid = await connection.sendRawTransaction(signedTx.serialize());
    
    // Wait for confirmation
    await connection.confirmTransaction(txid);
    
    debugLog('Funds released successfully', { txid });
    return txid;
  } catch (error) {
    console.error('Error releasing funds:', error);
    throw error;
  }
};

// Update fetchCampaignUpdates to always use real implementation
export const fetchCampaignUpdates = async (
  campaignId: string
): Promise<CampaignUpdate[]> => {
  try {
    const program = getProgram(null);
    const campaignPublicKey = new PublicKey(campaignId);
    
    // Get all updates for the campaign
    const updates = await program.account.campaignUpdate.all([
      {
        memcmp: {
          offset: 8, // After discriminator
          bytes: campaignPublicKey.toBase58()
        }
      }
    ]);
    
    // Sort updates by timestamp
    const sortedUpdates = updates.sort((a, b) => {
      const timestampA = new Date((a.account as any).timestamp * 1000).getTime();
      const timestampB = new Date((b.account as any).timestamp * 1000).getTime();
      return timestampB - timestampA; // Latest first
    });
    
    // Format updates
    return sortedUpdates.map((update) => {
      const account = update.account as any;
      return {
        pubkey: update.publicKey,
        campaign: new PublicKey(account.campaignId || campaignId),
        title: account.title,
        content: account.content,
        timestamp: new Date(account.timestamp * 1000),
        updateId: account.updateId || new BN(0)
      } as CampaignUpdate;
    });
  } catch (error) {
    console.error('Error fetching campaign updates:', error);
    return [];
  }
};

// Update addCampaignUpdate to always use real implementation
export const addCampaignUpdate = async (
  campaignId: string,
  title: string,
  content: string
): Promise<string> => {
  try {
    // Get wallet
    const wallet = window.solana;
    if (!wallet || !wallet.publicKey) {
      throw new Error('Wallet not connected');
    }
    
    // Setup
    const campaignPublicKey = new PublicKey(campaignId);
    const program = getProgram(wallet);
    
    // Get the campaign account
    const campaignAccount = await program.account.campaign.fetch(campaignPublicKey) as any;
    
    // Check if the caller is the creator of the campaign
    if (!campaignAccount.creator.equals(wallet.publicKey)) {
      throw new Error('Only the campaign creator can add updates');
    }
    
    // Generate a new update ID
    const updateId = campaignAccount.updatesCount.toNumber() + 1;
    
    // Create an update account
    const updateAccount = Keypair.generate();
    
    // Create the transaction
    const tx = await program.methods
      .addCampaignUpdate(title, content)
      .accounts({
        campaign: campaignPublicKey,
        update: updateAccount.publicKey,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([updateAccount])
      .transaction();
    
    // Get a recent blockhash
    const connection = getConnection();
    const { blockhash } = await getLatestBlockhashWithRetry(connection);
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;
    
    // Sign the transaction
    const signedTx = await wallet.signTransaction(tx);
    
    // Send the transaction
    const txid = await connection.sendRawTransaction(signedTx.serialize());
    
    // Wait for confirmation
    await connection.confirmTransaction(txid);
    
    return txid;
  } catch (error) {
    console.error('Error adding campaign update:', error);
    throw error;
  }
};

// Update donateToCampaign to always use real implementation
export const donateToCampaign = async (
  campaignId: string,
  amount: number,
  incentiveId?: string
): Promise<string> => {
  try {
    const program = getProgram(null);
    if (!program) {
      throw new Error('Program not initialized');
    }
    
    // Always use real blockchain implementation
    const provider = getProvider(null);
    const wallet = provider.wallet;
    const campaignPublicKey = new PublicKey(campaignId);
    
    // Construct transaction
    console.log(`Donating ${amount} lamports to campaign ${campaignId}`);
    
    // Create donation account
    const donationKeypair = Keypair.generate();
    
    // Donation transaction
    const tx = await program.methods
      .donate(new BN(amount))
      .accounts({
        donation: donationKeypair.publicKey,
        campaign: campaignPublicKey,
        donor: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([donationKeypair])
      .rpc();
    
    console.log('Donation successful:', tx);
    
    // If there's an incentive ID, claim it
    if (incentiveId) {
      const incentivePublicKey = new PublicKey(incentiveId);
      await program.methods
        .claimIncentive()
        .accounts({
          incentive: incentivePublicKey,
          campaign: campaignPublicKey,
          donation: donationKeypair.publicKey,
          donor: wallet.publicKey,
        })
        .rpc();
      
      console.log('Incentive claimed successfully');
    }
    
    return tx;
  } catch (error) {
    console.error('Error donating to campaign:', error);
    throw error;
  }
};

// Update fetchCampaignById to use only real blockchain functionality
export const fetchCampaignById = async (id: string): Promise<Campaign | null> => {
  try {
    // Fetch from the blockchain
    const program = getProgram(null);
    try {
    const publicKey = new PublicKey(id);
    const account = await program.account.campaign.fetch(publicKey) as any;
    
      console.log('Found campaign on blockchain:', id);
    return {
      pubkey: publicKey,
      name: account.name as string,
      description: account.description as string,
      imageUrl: account.imageUrl as string,
      category: account.category as string,
      creator: account.creator as PublicKey,
      targetAmount: account.targetAmount as BN,
      currentAmount: account.currentAmount as BN,
        endDate: new Date(account.endDate.toNumber() * 1000),
      isActive: account.isActive as boolean,
      donorsCount: account.donorsCount as BN,
      updatesCount: account.updatesCount as BN,
      fundsReleased: account.fundsReleased as boolean | undefined,
    };
    } catch (blockchainError) {
      console.log('Could not find campaign on blockchain:', id, blockchainError);
      return null;
    }
  } catch (error) {
    console.error('Error in fetchCampaignById:', error);
    return null;
  }
};

// Get all campaigns from both localStorage and JSON file
export const getAllCampaigns = async () => {
  try {
    // Try to get campaigns from localStorage first
    const storedCampaigns = localStorage.getItem('campaigns');
    if (storedCampaigns) {
      return JSON.parse(storedCampaigns);
    }
    
    // If not in localStorage, try to fetch from the JSON file
    try {
      // Use dynamic import to get the campaigns.json file
      const response = await fetch('/campaigns.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
      }
      const campaignsData = await response.json();
      
      // Store in localStorage for future use
      localStorage.setItem('campaigns', JSON.stringify(campaignsData));
      
      return campaignsData;
    } catch (fetchError) {
      console.error('Error fetching campaigns.json:', fetchError);
      
      // If fetch fails, try to import directly (works in Node.js environment)
      try {
        // Import the JSON file directly - this will only work during build
        // or in a Node.js environment, not in the browser
        const { default: campaignsData } = await import('../campaigns.json');
        return campaignsData;
      } catch (importError) {
        console.error('Error importing campaigns.json:', importError);
        return [];
      }
    }
  } catch (error) {
    console.error('Error getting campaigns:', error);
    return [];
  }
};

// Get a single campaign by ID from localStorage
export const getCampaign = async (campaignId: string) => {
  try {
    const storedCampaigns = localStorage.getItem('campaigns') || '[]';
    const campaigns = JSON.parse(storedCampaigns);
    return campaigns.find((campaign: any) => campaign.id === campaignId) || null;
  } catch (error) {
    console.error('Error getting campaign from localStorage:', error);
    return null;
  }
};

// Get campaigns by creator from localStorage
export const getCampaignsByCreator = async (creator: string) => {
  try {
    const storedCampaigns = localStorage.getItem('campaigns') || '[]';
    const campaigns = JSON.parse(storedCampaigns);
    return campaigns.filter((campaign: any) => campaign.creator === creator);
  } catch (error) {
    console.error('Error getting campaigns by creator from localStorage:', error);
    return [];
  }
};

