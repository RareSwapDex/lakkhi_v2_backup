import { clusterApiUrl, Connection, PublicKey, Keypair, SystemProgram, Transaction, LAMPORTS_PER_SOL, Commitment, TransactionInstruction } from '@solana/web3.js';
import { Program, AnchorProvider, BN, web3 } from '@project-serum/anchor';
import { IDL } from './idl-v2';
import { toast } from 'react-hot-toast';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { getOrCreateAssociatedTokenAccount, getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction } from '@solana/spl-token';

// Define platform interface
interface PlatformData {
  programId: string;
  platformAccount?: string;
  platform?: string;
  platformKeypair: null;
  tokenMint: string;
  tokenAccount: string;
  admin?: string;
}

// Program IDs
// Update with correct program and platform IDs from working-read-accounts-v2.js
const PROGRAM_ID = "HWvEhiWpSbHqksN7XCjniwCMNa9YNFAHoijDc5EsviXE";
export const SOLANA_NETWORK = 'https://api.devnet.solana.com';

// Initialize platform data with the correct values from working-read-accounts-v2.js
let platform: PlatformData = {
  programId: PROGRAM_ID,
  platformAccount: 'BzYnAB5CJJ1JTzsZrWLHnGff5GkmXHvAKy1BAev5SQWR',
  platformKeypair: null,
  tokenMint: '6pABjANnUTSyymBeXHKQBgAsu6BkDoCLh9rbj9WFNTAS',
  tokenAccount: '',
  admin: 'HWvEhiWpSbHqksN7XCjniwCMNa9YNFAHoijDc5EsviXE'
};

// Get connection to Solana network
export const getConnection = () => {
  return new Connection(clusterApiUrl('devnet'), 'confirmed');
};

// Get program instance
export const getProgram = (wallet: any) => {
  const connection = getConnection();
  
  // Create a custom provider
  const provider = new AnchorProvider(
    connection,
    wallet,
    { commitment: 'confirmed' as Commitment }
  );
  
  // Create program instance
  return new Program(IDL as any, PROGRAM_ID, provider);
};

// Function to create a campaign
export const createCampaign = async (
  name: string,
  description: string,
  targetAmount: string | number,
  endDateTimestamp: number,
  imageUrl: string,
  category: string,
  wallet: any,
  incentives: any[] = []
) => {
  if (!wallet || !wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  try {
    console.log(`Creating campaign with name: ${name}, targetAmount: ${targetAmount}, endDateTimestamp: ${endDateTimestamp}`);
    
    // Create campaign keypair
    const campaignKeypair = Keypair.generate();
    console.log(`Campaign keypair: ${campaignKeypair.publicKey.toString()}`);
    
    // Calculate campaign account space
    // Add extra space for incentives
    const baseSpace = 8 + // discriminator
      32 + // platform
      32 + // creator
      4 + name.length + // name (String)
      4 + description.length + // description (String)
      8 + // targetAmount
      8 + // currentAmount
      4 + // donorsCount
      8 + // endDate
      8 + // createdAt
      4 + imageUrl.length + // imageUrl (String)
      4 + category.length; // category (String)
    
    // Add space for incentives array
    let incentivesSpace = 4; // Space for array length (u32)
    
    // Add space for each incentive
    if (incentives && incentives.length > 0) {
      for (const incentive of incentives) {
        incentivesSpace += 
          4 + (incentive.title?.length || 0) + // title (String)
          4 + (incentive.description?.length || 0) + // description (String)
          4 + // quantity (u32)
          8 + // amountRequired (u64)
          4; // remaining (u32)
      }
    }
    
    const campaignAccountSize = baseSpace + incentivesSpace;
    
    // Get connection
    const connection = getConnection();
    
    // Get platform data
    let platformAddress: string | null;
    
    try {
      platformAddress = localStorage.getItem('platformAddressV2');
      if (!platformAddress) {
        throw new Error('Platform account not found in localStorage');
      }
      console.log(`Platform address from localStorage: ${platformAddress}`);
    } catch (err) {
      console.error('Error accessing localStorage. Using fallback for server-side rendering.', err);
      
      // Try to load from platform-data-v2.json in public directory
      try {
        const platform = await (await fetch('/platform-data-v2.json')).json();
        platformAddress = platform.platformAccount;
        if (!platformAddress) {
          throw new Error('Platform account not found in platform-data-v2.json');
        }
        console.log(`Platform address from public file: ${platformAddress}`);
      } catch (fetchErr) {
        console.error('Failed to fetch platform data from public directory:', fetchErr);
        throw new Error('Platform not initialized. Please run the initialization script first.');
      }
    }
    
    // Calculate lamports needed for rent exemption
    const lamports = await connection.getMinimumBalanceForRentExemption(campaignAccountSize);
    console.log(`Creating campaign account (${campaignAccountSize} bytes), requiring ${lamports} lamports for rent exemption...`);
    
    try {
      // IMPORTANT: Create a token account for the campaign for the LAKKHI token
      const tokenMint = new PublicKey('6pABjANnUTSyymBeXHKQBgAsu6BkDoCLh9rbj9WFNTAS');
      const campaignTokenAddress = await getAssociatedTokenAddress(
        tokenMint,
        campaignKeypair.publicKey,
        true // Allow owner off curve
      );
      
      // Check if token account already exists (unlikely for a new campaign)
      let campaignTokenAccountExists = false;
      try {
        const tokenAccountInfo = await connection.getAccountInfo(campaignTokenAddress);
        campaignTokenAccountExists = tokenAccountInfo !== null;
      } catch (error) {
        console.error('Error checking campaign token account:', error);
      }
      
      // Create transaction to create the campaign account
      const transaction = new Transaction();
      
      // Add instruction to create the campaign account
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: wallet.publicKey,
          newAccountPubkey: campaignKeypair.publicKey,
          lamports,
          space: campaignAccountSize,
          programId: wallet.publicKey // Use wallet as program ID for testing (this works)
        })
      );
      
      // Add instruction to create the campaign token account if it doesn't exist
      if (!campaignTokenAccountExists) {
        console.log('Adding instruction to create campaign token account');
        transaction.add(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,  // payer
            campaignTokenAddress, // associated token account
            campaignKeypair.publicKey,  // owner
            tokenMint // mint
          )
        );
      }
      
      // Build campaign data
      const targetAmountBN = new BN(parseFloat(targetAmount.toString()) * 1_000_000_000); // Convert to smallest unit (lamports)
      const endDateBN = new BN(endDateTimestamp); // Already a Unix timestamp
      const createdAtBN = new BN(Math.floor(Date.now() / 1000)); // Current time as Unix timestamp
      
      // Prepare incentives data for blockchain storage
      const incentivesData = incentives.map((inc: any) => ({
        title: inc.title || '',
        description: inc.description || '',
        quantity: new BN(inc.quantity || 1),
        amountRequired: new BN((inc.amountRequired || 1) * 1_000_000_000), // Convert to smallest unit
        remaining: new BN(inc.quantity || 1) // Initially all incentives are available
      }));
      
      // Replace the instruction creation with a simple transfer (like in simple-campaign-create-v2.js)
      // This allows us to test without a real program
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: campaignKeypair.publicKey,
          lamports: 0 // No transfer needed, just to add data
        })
      );
      
      // Need blockhash for transaction
      const recentBlockhash = await connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = recentBlockhash.blockhash;
      transaction.feePayer = wallet.publicKey;
      
      // Sign with campaign keypair
      transaction.partialSign(campaignKeypair);
      
      // Have wallet sign and send transaction
      const signedTransaction = await wallet.signTransaction(transaction);
      const rawTransaction = signedTransaction.serialize();
      
      // Send the transaction
      console.log('Sending campaign creation transaction to the blockchain...');
      const signature = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      console.log(`Transaction sent with signature: ${signature}`);
      console.log(`View transaction: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      
      // Wait for confirmation
      await connection.confirmTransaction({
        signature, 
        blockhash: recentBlockhash.blockhash,
        lastValidBlockHeight: recentBlockhash.lastValidBlockHeight
      }, 'confirmed');
      
      console.log('Campaign creation transaction confirmed!');
      
      // Read the campaign account
      console.log('Reading campaign account...');
      try {
        const accountInfo = await connection.getAccountInfo(campaignKeypair.publicKey);
        console.log(`Campaign account info:`, {
          dataLength: accountInfo?.data.length,
          owner: accountInfo?.owner.toString(),
          executable: accountInfo?.executable,
          lamports: accountInfo?.lamports
        });
      } catch (error) {
        console.error('Error reading campaign account:', error);
      }
      
      // Verify that the token account was created
      try {
        const tokenAccountInfo = await connection.getAccountInfo(campaignTokenAddress);
        if (tokenAccountInfo) {
          console.log(`Campaign token account created: ${campaignTokenAddress.toString()}`);
        } else {
          console.warn(`Campaign token account not created: ${campaignTokenAddress.toString()}`);
        }
      } catch (error) {
        console.error('Error verifying campaign token account:', error);
      }
      
      // Save campaign to localStorage for easy testing
      saveCampaign({
        publicKey: campaignKeypair.publicKey.toString(),
        secretKey: Array.from(campaignKeypair.secretKey),
        name,
        description,
        targetAmount: targetAmount.toString(),
        currentAmount: '0',
        donorsCount: '0',
        creator: wallet.publicKey.toString(),
        endDate: endDateBN.toString(),
        createdAt: createdAtBN.toString(),
        imageUrl,
        category,
        verified: true,
        tokenMint: tokenMint.toString(), // Save the token mint used
        tokenAccount: campaignTokenAddress.toString(), // Save the token account created
        incentives: incentives.map((inc: any) => ({
          ...inc,
          remaining: inc.quantity
        }))
      });
      
      // Return the campaign ID
      return campaignKeypair.publicKey.toString();
    } catch (error) {
      console.error('Error in blockchain transaction:', error);
      throw new Error(`Blockchain transaction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  } catch (error) {
    console.error('Error in createCampaign:', error);
    throw error;
  }
};

// Helper function to save campaign to localStorage
const saveCampaign = (campaign: any) => {
  try {
    // Get existing campaigns
    let campaigns = [];
    const campaignsJson = localStorage.getItem('campaignsV2');
    if (campaignsJson) {
      campaigns = JSON.parse(campaignsJson);
    }
    
    // Add new campaign
    campaigns.push(campaign);
    
    // Save back to localStorage
    localStorage.setItem('campaignsV2', JSON.stringify(campaigns));
    console.log(`Campaign saved to localStorage: ${campaign.publicKey}`);
  } catch (error) {
    console.error('Error saving campaign to localStorage:', error);
  }
};

// Helper function to create initialize campaign instruction
const createInitializeCampaignInstruction = async (
  campaignPubkey: PublicKey,
  platformPubkey: PublicKey,
  creatorPubkey: PublicKey,
  name: string,
  description: string,
  targetAmount: BN,
  endDate: BN,
  imageUrl: string,
  category: string,
  incentives: any[] = []
) => {
  // Build instruction data buffer
  const nameBuffer = Buffer.from(name);
  const descriptionBuffer = Buffer.from(description);
  const imageUrlBuffer = Buffer.from(imageUrl);
  const categoryBuffer = Buffer.from(category);
  
  const buffer = Buffer.alloc(1000 + nameBuffer.length + descriptionBuffer.length + imageUrlBuffer.length + categoryBuffer.length);
  
  // Instruction index for initialize_campaign
  const offset = buffer.writeUInt8(0, 0);
  
  // Write name length and name
  const nameLenOffset = buffer.writeUInt32LE(nameBuffer.length, offset);
  const nameOffset = nameLenOffset + nameBuffer.copy(buffer, nameLenOffset);
  
  // Write description length and description
  const descLenOffset = buffer.writeUInt32LE(descriptionBuffer.length, nameOffset);
  const descOffset = descLenOffset + descriptionBuffer.copy(buffer, descLenOffset);
  
  // Write target amount
  const targetOffset = buffer.writeBigUInt64LE(BigInt(targetAmount.toString()), descOffset);
  
  // Write end date
  const endDateOffset = buffer.writeBigUInt64LE(BigInt(endDate.toString()), targetOffset);
  
  // Write image URL length and URL
  const imageUrlLenOffset = buffer.writeUInt32LE(imageUrlBuffer.length, endDateOffset);
  const imageUrlOffset = imageUrlLenOffset + imageUrlBuffer.copy(buffer, imageUrlLenOffset);
  
  // Write category length and category
  const catLenOffset = buffer.writeUInt32LE(categoryBuffer.length, imageUrlOffset);
  const catOffset = catLenOffset + categoryBuffer.copy(buffer, catLenOffset);
  
  // Write incentives array length
  const incLenOffset = buffer.writeUInt32LE(incentives.length, catOffset);
  let currentOffset = incLenOffset;
  
  // Write each incentive
  for (const inc of incentives) {
    // Write title length and title
    const titleBuffer = Buffer.from(inc.title);
    const titleLenOffset = buffer.writeUInt32LE(titleBuffer.length, currentOffset);
    currentOffset = titleLenOffset + titleBuffer.copy(buffer, titleLenOffset);
    
    // Write description length and description
    const incDescBuffer = Buffer.from(inc.description);
    const incDescLenOffset = buffer.writeUInt32LE(incDescBuffer.length, currentOffset);
    currentOffset = incDescLenOffset + incDescBuffer.copy(buffer, incDescLenOffset);
    
    // Write quantity
    currentOffset = buffer.writeUInt32LE(inc.quantity.toNumber(), currentOffset);
    
    // Write amount required
    currentOffset = buffer.writeBigUInt64LE(BigInt(inc.amountRequired.toString()), currentOffset);
    
    // Write remaining (initially same as quantity)
    currentOffset = buffer.writeUInt32LE(inc.quantity.toNumber(), currentOffset);
  }
  
  // Slice the buffer to the correct size
  const data = buffer.slice(0, currentOffset);
  
  // Create the instruction
  return new TransactionInstruction({
    keys: [
      { pubkey: campaignPubkey, isSigner: true, isWritable: true },
      { pubkey: platformPubkey, isSigner: false, isWritable: false },
      { pubkey: creatorPubkey, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    programId: new PublicKey(PROGRAM_ID),
    data
  });
};

// Get all campaigns from localStorage or file
export const getAllCampaigns = async () => {
  console.log('Getting all campaigns');
  try {
    // Try to get campaigns from localStorage first
    const storedCampaigns = localStorage.getItem('campaignsV2');
    if (storedCampaigns) {
      const campaigns = JSON.parse(storedCampaigns);
      console.log(`Found ${campaigns.length} campaigns in localStorage`);
      return campaigns;
    }
    
    // If not in localStorage, try to fetch from the JSON file
    console.log('No campaigns in localStorage, fetching from file');
    try {
      const response = await fetch('/campaigns-v2.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
      }
      const campaignsData = await response.json();
      console.log(`Fetched ${campaignsData.length} campaigns from file`);
      
      // Store in localStorage for future use
      localStorage.setItem('campaignsV2', JSON.stringify(campaignsData));
      
      return campaignsData;
    } catch (fetchError) {
      console.error('Error fetching campaigns-v2.json:', fetchError);
      return [];
    }
  } catch (error) {
    console.error('Error getting campaigns:', error);
    return [];
  }
};

// Initialize platform data in localStorage
export const initializePlatformData = async () => {
  try {
    // Try to fetch platform data from JSON file
    console.log('Fetching platform data from /platform-data-v2.json');
    const response = await fetch('/platform-data-v2.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch platform data: ${response.statusText}`);
    }
    const platformData = await response.json();
    console.log('Platform data loaded:', platformData);
    
    // Store in localStorage - update keys to match the actual JSON structure
    localStorage.setItem('platformAddressV2', platformData.platform); // Changed from address to platform
    localStorage.setItem('tokenMintV2', platformData.tokenMint);
    localStorage.setItem('adminAddressV2', platformData.admin);
    
    console.log('Platform data initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing platform data:', error);
    return false;
  }
};

// Create a donation
export const createDonation = async (
  campaignAddress: string,
  amount: number,
  wallet: WalletContextState,
  message?: string
): Promise<string> => {
  try {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error('Wallet not connected or does not support signTransaction');
    }

    const connection = new Connection(SOLANA_NETWORK, 'confirmed');
    
    // Only use the hardcoded LAKKHI token mint
    const tokenMint = new PublicKey('6pABjANnUTSyymBeXHKQBgAsu6BkDoCLh9rbj9WFNTAS');

    console.log(`Creating donation of ${amount} lamports to campaign ${campaignAddress}`);
    console.log(`Using token mint: ${tokenMint.toString()}`);
    
    // Check if the wallet's token account exists and has sufficient balance
    const walletTokenAddress = await getAssociatedTokenAddress(
      tokenMint,
      wallet.publicKey
    );
    
    // Verify that the token account exists and has enough balance
    try {
      const tokenAccountInfo = await connection.getAccountInfo(walletTokenAddress);
      if (!tokenAccountInfo) {
        throw new Error(`You don't have a LAKKHI token account. Please obtain LAKKHI tokens before donating.`);
      }
      console.log(`Wallet token account exists: ${walletTokenAddress.toString()}`);
      
      // Check token balance
      const tokenBalance = await connection.getTokenAccountBalance(walletTokenAddress);
      const balanceAmount = parseFloat(tokenBalance.value.amount) / Math.pow(10, tokenBalance.value.decimals);
      const donationAmount = amount / 1_000_000_000; // Convert lamports to LAKKHI
      
      console.log(`Token balance: ${balanceAmount} LAKKHI, Donation amount: ${donationAmount} LAKKHI`);
      
      if (balanceAmount < donationAmount) {
        throw new Error(`Insufficient LAKKHI balance. You have ${balanceAmount} LAKKHI but need ${donationAmount} LAKKHI.`);
      }
    } catch (error) {
      console.error('Error checking wallet token account:', error);
      if (error instanceof Error) {
        throw error; // Re-throw the error to be handled by the UI
      } else {
        throw new Error('Failed to check your LAKKHI token balance. Please try again later.');
      }
    }
    
    // Check if campaign token account exists - we will NOT create it if it doesn't
    const campaignPubkey = new PublicKey(campaignAddress);
    const campaignTokenAddress = await getAssociatedTokenAddress(
      tokenMint,
      campaignPubkey,
      true // Allow owner off curve
    );
    
    let campaignTokenAccountExists = false;
    try {
      const campaignTokenInfo = await connection.getAccountInfo(campaignTokenAddress);
      campaignTokenAccountExists = campaignTokenInfo !== null;
      console.log(`Campaign token account exists: ${campaignTokenAccountExists}`);
      
      // If campaign token account doesn't exist, fail the transaction
      if (!campaignTokenAccountExists) {
        throw new Error(`This campaign is not set up to receive LAKKHI tokens. Please contact the campaign creator.`);
      }
    } catch (error) {
      console.error('Error checking campaign token account:', error);
      if (error instanceof Error) {
        throw error; // Re-throw the error to be handled by the UI
      } else {
        throw new Error('Failed to check campaign token account. Please try again later.');
      }
    }
    
    // Create transaction for donation - only if both accounts exist
    const transaction = new Transaction();
    
    // Add transfer instruction - no account creation
    transaction.add(
      createTransferInstruction(
        walletTokenAddress,
        campaignTokenAddress,
        wallet.publicKey,
        amount
      )
    );
    
    transaction.feePayer = wallet.publicKey;
    
    // Recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    
    // Sign transaction
    const signedTx = await wallet.signTransaction(transaction);
    
    // Send with skipPreflight to avoid validation errors
    console.log('Sending donation transaction...');
    const txid = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true
    });
    
    console.log(`Transaction sent: ${txid}`);
    console.log(`https://explorer.solana.com/tx/${txid}?cluster=devnet`);
    
    // Wait for confirmation
    const confirmationStatus = await connection.confirmTransaction(txid);
    console.log('Transaction confirmed:', confirmationStatus);
    
    // Save donation to localStorage
    const donationData = {
      publicKey: txid,
      campaign: campaignAddress,
      donor: wallet.publicKey.toString(),
      amount: amount,
      timestamp: Math.floor(Date.now() / 1000),
      message: message || ''
    };
    
    saveDonation(donationData);
    console.log('Donation saved to localStorage');
    
    // Update campaign data in localStorage
    try {
      const campaignsJson = localStorage.getItem('campaignsV2');
      if (campaignsJson) {
        const campaigns = JSON.parse(campaignsJson);
        const campaign = campaigns.find((c: any) => c.address === campaignAddress || c.publicKey === campaignAddress);
        if (campaign) {
          // Make sure currentAmount and donorsCount are numbers
          const currentAmount = parseFloat(campaign.currentAmount || '0');
          const donorsCount = parseInt(campaign.donorsCount || '0');
          
          // Update with new values
          campaign.currentAmount = (currentAmount + (amount / 1_000_000_000)).toString();
          campaign.donorsCount = (donorsCount + 1).toString();
          
          // Save updated campaigns
          localStorage.setItem('campaignsV2', JSON.stringify(campaigns));
          console.log(`Updated campaign ${campaignAddress} with new donation. Current amount: ${campaign.currentAmount}, Donors: ${campaign.donorsCount}`);
        }
      }
    } catch (error) {
      console.error('Error updating campaign in localStorage:', error);
    }
    
    return txid;
  } catch (error) {
    console.error('Error creating donation:', error);
    throw error;
  }
};

// Load platform data from localStorage or fetch from public directory
export const loadPlatformData = async (): Promise<PlatformData> => {
  try {
    console.log('Loading platform data...');
    
    // First try from localStorage
    const platformDataJson = localStorage.getItem('platform-data-v2');
    if (platformDataJson) {
      try {
        const storedData = JSON.parse(platformDataJson);
        console.log('Platform data from localStorage:', storedData);
        
        // Check if the data has the critical fields
        if (storedData.platformAccount && storedData.tokenMint) {
          platform = {
            ...platform,
            ...storedData
          };
          console.log('Using platform data from localStorage');
          return platform;
        }
      } catch (error) {
        console.error('Error parsing platform data from localStorage:', error);
      }
    }
    
    // If not in localStorage or invalid, use hardcoded values
    console.log('Using hardcoded platform data');
    return platform;
    
  } catch (error) {
    console.error('Error loading platform data:', error);
    return platform;
  }
};

// Function to save donation to local storage
const saveDonation = (donation: {
  publicKey: string;
  campaign: string;
  donor: string;
  amount: number;
  timestamp: number;
  message?: string;
}) => {
  try {
    // Get existing donations from localStorage
    const donationsJson = localStorage.getItem('donationsV2') || '[]';
    const donations = JSON.parse(donationsJson);
    
    // Add new donation
    donations.push(donation);
    
    // Save back to localStorage
    localStorage.setItem('donationsV2', JSON.stringify(donations));
    
    console.log(`Donation saved to localStorage: ${donation.publicKey}`);
  } catch (error) {
    console.error('Error saving donation to localStorage:', error);
  }
};

// Function to get donations for a campaign
export const getDonationsForCampaign = async (campaignAddress: string): Promise<any[]> => {
  try {
    // For testing, get donations from localStorage
    const donationsJson = localStorage.getItem('donationsV2') || '[]';
    const allDonations = JSON.parse(donationsJson);
    
    // Filter donations for this campaign
    const campaignDonations = allDonations.filter((d: any) => d.campaign === campaignAddress);
    
    // Sort by timestamp (newest first)
    campaignDonations.sort((a: any, b: any) => b.timestamp - a.timestamp);
    
    return campaignDonations;
  } catch (error) {
    console.error('Error getting donations:', error);
    return [];
  }
};

// Fix the localStorage issue by only running this code in the browser
if (typeof window !== 'undefined') {
  try {
    // Try to load platform data from localStorage
    const platformDataJson = localStorage.getItem('platform-data-v2');
    if (platformDataJson) {
      const platformData = JSON.parse(platformDataJson);
      platform = {
        ...platform,
        ...platformData
      };
      console.log('Platform data loaded from localStorage:', platform);
    } else {
      // Try to load from public directory
      fetch('/platform-data-v2.json')
        .then(response => response.json())
        .then(data => {
          platform = {
            ...platform,
            ...data
          };
          // For development use - REMOVE THIS FOR PRODUCTION
          // If programId is the same as admin, use a fixed program ID for testing
          if (platform.programId === platform.admin) {
            console.warn('WARNING: programId is set to the admin wallet address. This will not work on the blockchain. Using a temporary program ID for testing.');
            // This is just for localStorage to simulate successful operation
            platform.programId = '9FbdZZgjsGjvFfSF7vgdLbwYHqwXCHpH1ELxciofLgLq';
          }
          localStorage.setItem('platform-data-v2', JSON.stringify(platform));
          console.log('Platform data loaded from public file:', platform);
        })
        .catch(err => console.error('Error loading platform data from public file:', err));
    }
  } catch (error) {
    console.error('Error loading platform data:', error);
  }
}

// Initialize the platform data if we're in the browser
if (typeof window !== 'undefined') {
  // Call loadPlatformData when the module loads
  loadPlatformData().then(data => {
    console.log('Platform data initialized:', data);
  }).catch(error => {
    console.error('Error initializing platform data:', error);
  });
} 