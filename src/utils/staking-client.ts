import { useState, useEffect } from 'react';
import { Program, BN, web3 } from '@project-serum/anchor';
import { 
  Connection, 
  PublicKey, 
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount
} from '@solana/spl-token';
import { useConnection } from '@solana/wallet-adapter-react';
import toast from 'react-hot-toast';
import { useAnchorClient } from './anchor-client';
import { WalletContextState } from '@solana/wallet-adapter-react';

// Constants
const SECONDS_PER_DAY = 86400;

// In a real implementation, these would be actual contract addresses and methods
const STAKING_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');
const REWARD_TOKEN_MINT = new PublicKey('11111111111111111111111111111111');

export interface StakingPool {
  pubkey: PublicKey;
  campaign: PublicKey;
  creator: PublicKey;
  stakedTokens: BN;
  rewardRate: BN;
  lockupPeriod: BN; // in days
  startTime: BN;
  endTime: BN;
  poolBalance: BN;
  stakersCount: BN;
  active: boolean;
}

export interface StakerInfo {
  pubkey: PublicKey;
  stakingPool: PublicKey;
  staker: PublicKey;
  stakedAmount: BN;
  rewardsEarned: BN;
  lastClaimTime: BN;
  stakingStartTime: BN;
  unstakeAvailableTime: BN;
}

export interface StakingStats {
  userStaked: BN;
  userRewards: BN;
  totalStaked: BN;
  apr: number;
  campaignComplete: boolean;
}

export interface CampaignDonorStats {
  totalDonors: number;
  totalLakkhiContributed: BN;
  totalUsdContributed: number;
}

// Mock implementation for development
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Create a staking pool for a campaign
 */
export const createStakingPool = async (
  campaignPubkey: PublicKey,
  rewardRate: number, // tokens per day per staked token (in basis points)
  lockupPeriod: number, // in days
  startTime: Date,
  endTime: Date,
  initialPoolBalance: number, // initial tokens for rewards
  wallet: any
): Promise<string> => {
  // In development mode, use a mock implementation
  if (isDevelopment) {
    console.log('Using mock createStakingPool implementation in development mode');
    
    // Simulate delay for transaction
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return 'mock-staking-pool-' + Math.random().toString(36).substring(2, 15);
  }
  
  // For production mode, implement the actual staking pool creation
  const { program } = useAnchorClient();
  
  if (!program || !wallet || !wallet.publicKey) {
    throw new Error('Program not initialized or wallet not connected');
  }
  
  try {
    // Generate a new staking pool account keypair
    const stakingPoolKeypair = web3.Keypair.generate();
    
    // Convert days to seconds for on-chain storage
    const lockupPeriodSeconds = new BN(lockupPeriod * SECONDS_PER_DAY);
    
    // Convert dates to unix timestamps
    const startTimestamp = new BN(Math.floor(startTime.getTime() / 1000));
    const endTimestamp = new BN(Math.floor(endTime.getTime() / 1000));
    
    // Convert initial pool balance to lamports
    const initialPoolBalanceLamports = new BN(initialPoolBalance * Math.pow(10, 9));
    
    // Convert reward rate to basis points (1/10000)
    const rewardRateBps = new BN(rewardRate);
    
    // Find the token account for the creator
    const creatorTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(process.env.NEXT_PUBLIC_LAKKHI_TOKEN_MINT!),
      wallet.publicKey
    );
    
    // Find or create the token account for the staking pool
    const [stakingPoolTokenAccount] = await PublicKey.findProgramAddress(
      [
        Buffer.from('staking-pool-token'),
        stakingPoolKeypair.publicKey.toBuffer()
      ],
      program.programId
    );
    
    // Call the create_staking_pool instruction
    await program.methods
      .createStakingPool(
        rewardRateBps,
        lockupPeriodSeconds,
        startTimestamp,
        endTimestamp,
        initialPoolBalanceLamports
      )
      .accounts({
        stakingPool: stakingPoolKeypair.publicKey,
        campaign: campaignPubkey,
        creator: wallet.publicKey,
        creatorTokenAccount: creatorTokenAccount,
        stakingPoolTokenAccount: stakingPoolTokenAccount,
        tokenMint: new PublicKey(process.env.NEXT_PUBLIC_LAKKHI_TOKEN_MINT!),
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        clock: SYSVAR_CLOCK_PUBKEY,
      })
      .signers([stakingPoolKeypair])
      .rpc();
    
    console.log('Staking pool created successfully');
    return stakingPoolKeypair.publicKey.toString();
  } catch (error) {
    console.error('Error creating staking pool:', error);
    throw error;
  }
};

/**
 * Stake tokens in a staking pool
 */
export const stakeTokens = async (
  stakingPoolPubkey: PublicKey,
  amount: number,
  wallet: any
): Promise<string> => {
  // In development mode, use a mock implementation
  if (isDevelopment) {
    console.log('Using mock stakeTokens implementation in development mode');
    
    // Simulate delay for transaction
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return 'mock-stake-transaction-' + Math.random().toString(36).substring(2, 15);
  }
  
  // For production mode, implement the actual staking functionality
  const { program } = useAnchorClient();
  
  if (!program || !wallet || !wallet.publicKey) {
    throw new Error('Program not initialized or wallet not connected');
  }
  
  try {
    // Convert amount to lamports
    const amountLamports = new BN(amount * Math.pow(10, 9));
    
    // Find the token account for the user
    const userTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(process.env.NEXT_PUBLIC_LAKKHI_TOKEN_MINT!),
      wallet.publicKey
    );
    
    // Find the token account for the staking pool
    const [stakingPoolTokenAccount] = await PublicKey.findProgramAddress(
      [
        Buffer.from('staking-pool-token'),
        stakingPoolPubkey.toBuffer()
      ],
      program.programId
    );
    
    // Find or create the staker info account
    const [stakerInfoPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from('staker-info'),
        stakingPoolPubkey.toBuffer(),
        wallet.publicKey.toBuffer()
      ],
      program.programId
    );
    
    // Call the stake_tokens instruction
    await program.methods
      .stakeTokens(amountLamports)
      .accounts({
        stakingPool: stakingPoolPubkey,
        stakerInfo: stakerInfoPda,
        staker: wallet.publicKey,
        userTokenAccount: userTokenAccount,
        stakingPoolTokenAccount: stakingPoolTokenAccount,
        tokenMint: new PublicKey(process.env.NEXT_PUBLIC_LAKKHI_TOKEN_MINT!),
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        clock: SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();
    
    console.log('Tokens staked successfully');
    return 'stake-transaction-success';
  } catch (error) {
    console.error('Error staking tokens:', error);
    throw error;
  }
};

/**
 * Unstake tokens from a staking pool
 */
export const unstakeTokens = async (
  stakingPoolPubkey: PublicKey,
  wallet: any
): Promise<string> => {
  // In development mode, use a mock implementation
  if (isDevelopment) {
    console.log('Using mock unstakeTokens implementation in development mode');
    
    // Simulate delay for transaction
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return 'mock-unstake-transaction-' + Math.random().toString(36).substring(2, 15);
  }
  
  // For production mode, implement the actual unstaking functionality
  const { program } = useAnchorClient();
  
  if (!program || !wallet || !wallet.publicKey) {
    throw new Error('Program not initialized or wallet not connected');
  }
  
  try {
    // Find the token account for the user
    const userTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(process.env.NEXT_PUBLIC_LAKKHI_TOKEN_MINT!),
      wallet.publicKey
    );
    
    // Find the token account for the staking pool
    const [stakingPoolTokenAccount] = await PublicKey.findProgramAddress(
      [
        Buffer.from('staking-pool-token'),
        stakingPoolPubkey.toBuffer()
      ],
      program.programId
    );
    
    // Find the staker info account
    const [stakerInfoPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from('staker-info'),
        stakingPoolPubkey.toBuffer(),
        wallet.publicKey.toBuffer()
      ],
      program.programId
    );
    
    // Call the unstake_tokens instruction
    await program.methods
      .unstakeTokens()
      .accounts({
        stakingPool: stakingPoolPubkey,
        stakerInfo: stakerInfoPda,
        staker: wallet.publicKey,
        userTokenAccount: userTokenAccount,
        stakingPoolTokenAccount: stakingPoolTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();
    
    console.log('Tokens unstaked successfully');
    return 'unstake-transaction-success';
  } catch (error) {
    console.error('Error unstaking tokens:', error);
    throw error;
  }
};

/**
 * Claim rewards from a staking pool
 */
export const claimRewards = async (
  stakingPoolPubkey: PublicKey,
  wallet: any
): Promise<string> => {
  // In development mode, use a mock implementation
  if (isDevelopment) {
    console.log('Using mock claimRewards implementation in development mode');
    
    // Simulate delay for transaction
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return 'mock-claim-transaction-' + Math.random().toString(36).substring(2, 15);
  }
  
  // For production mode, implement the actual claiming functionality
  const { program } = useAnchorClient();
  
  if (!program || !wallet || !wallet.publicKey) {
    throw new Error('Program not initialized or wallet not connected');
  }
  
  try {
    // Find the token account for the user
    const userTokenAccount = await getAssociatedTokenAddress(
      new PublicKey(process.env.NEXT_PUBLIC_LAKKHI_TOKEN_MINT!),
      wallet.publicKey
    );
    
    // Find the token account for the staking pool
    const [stakingPoolTokenAccount] = await PublicKey.findProgramAddress(
      [
        Buffer.from('staking-pool-token'),
        stakingPoolPubkey.toBuffer()
      ],
      program.programId
    );
    
    // Find the staker info account
    const [stakerInfoPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from('staker-info'),
        stakingPoolPubkey.toBuffer(),
        wallet.publicKey.toBuffer()
      ],
      program.programId
    );
    
    // Call the claim_rewards instruction
    await program.methods
      .claimRewards()
      .accounts({
        stakingPool: stakingPoolPubkey,
        stakerInfo: stakerInfoPda,
        staker: wallet.publicKey,
        userTokenAccount: userTokenAccount,
        stakingPoolTokenAccount: stakingPoolTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();
    
    console.log('Rewards claimed successfully');
    return 'claim-transaction-success';
  } catch (error) {
    console.error('Error claiming rewards:', error);
    throw error;
  }
};

/**
 * Get staking pool info
 */
export const fetchStakingPool = async (
  program: Program,
  stakingPoolPubkey: PublicKey
): Promise<StakingPool> => {
  // In development mode, use mock data
  if (isDevelopment) {
    console.log('Using mock stakingPool data in development mode');
    
    // Create mock staking pool data
    const currentTime = Math.floor(Date.now() / 1000);
    return {
      pubkey: stakingPoolPubkey,
      campaign: web3.Keypair.generate().publicKey, // Random creator
      creator: web3.Keypair.generate().publicKey, // Random creator
      stakedTokens: new BN(1000 * Math.pow(10, 9)), // 1000 tokens
      rewardRate: new BN(500), // 5% in basis points
      lockupPeriod: new BN(30 * SECONDS_PER_DAY), // 30 days
      startTime: new BN(currentTime - 7 * SECONDS_PER_DAY), // 7 days ago
      endTime: new BN(currentTime + 30 * SECONDS_PER_DAY), // 30 days from now
      poolBalance: new BN(10000 * Math.pow(10, 9)), // 10000 tokens
      stakersCount: new BN(5),
      active: true
    };
  }
  
  try {
    // Get the staking pool account data
    const stakingPoolAccount = await program.account.stakingPool.fetch(stakingPoolPubkey);
    
    // Type assertion to ensure proper type safety
    return {
      pubkey: stakingPoolPubkey,
      campaign: stakingPoolAccount.campaign as PublicKey,
      creator: stakingPoolAccount.creator as PublicKey,
      stakedTokens: stakingPoolAccount.stakedTokens as BN,
      rewardRate: stakingPoolAccount.rewardRate as BN,
      lockupPeriod: stakingPoolAccount.lockupPeriod as BN,
      startTime: stakingPoolAccount.startTime as BN,
      endTime: stakingPoolAccount.endTime as BN,
      poolBalance: stakingPoolAccount.poolBalance as BN,
      stakersCount: stakingPoolAccount.stakersCount as BN,
      active: stakingPoolAccount.active as boolean
    };
  } catch (error) {
    console.error('Error fetching staking pool:', error);
    throw error;
  }
};

/**
 * Get staker info
 */
export const fetchStakerInfo = async (
  program: Program,
  stakingPoolPubkey: PublicKey,
  stakerPubkey: PublicKey
): Promise<StakerInfo | null> => {
  // In development mode, use mock data
  if (isDevelopment) {
    console.log('Using mock stakerInfo data in development mode');
    
    // Create mock staker info data
    const currentTime = Math.floor(Date.now() / 1000);
    return {
      pubkey: web3.Keypair.generate().publicKey,
      stakingPool: stakingPoolPubkey,
      staker: stakerPubkey,
      stakedAmount: new BN(100 * Math.pow(10, 9)), // 100 tokens
      rewardsEarned: new BN(5 * Math.pow(10, 9)), // 5 tokens
      lastClaimTime: new BN(currentTime - 2 * SECONDS_PER_DAY), // 2 days ago
      stakingStartTime: new BN(currentTime - 10 * SECONDS_PER_DAY), // 10 days ago
      unstakeAvailableTime: new BN(currentTime + 20 * SECONDS_PER_DAY), // 20 days from now
    };
  }
  
  try {
    // Find the staker info PDA
    const [stakerInfoPda] = await PublicKey.findProgramAddress(
      [
        Buffer.from('staker-info'),
        stakingPoolPubkey.toBuffer(),
        stakerPubkey.toBuffer()
      ],
      program.programId
    );
    
    // Check if the staker info account exists
    try {
      const stakerInfoAccount = await program.account.stakerInfo.fetch(stakerInfoPda);
      
      return {
        pubkey: stakerInfoPda,
        stakingPool: stakingPoolPubkey,
        staker: stakerPubkey,
        stakedAmount: stakerInfoAccount.stakedAmount as BN,
        rewardsEarned: stakerInfoAccount.rewardsEarned as BN,
        lastClaimTime: stakerInfoAccount.lastClaimTime as BN,
        stakingStartTime: stakerInfoAccount.stakingStartTime as BN,
        unstakeAvailableTime: stakerInfoAccount.unstakeAvailableTime as BN
      };
    } catch (error) {
      // Account doesn't exist - user hasn't staked
      return null;
    }
  } catch (error) {
    console.error('Error fetching staker info:', error);
    throw error;
  }
};

/**
 * Calculate estimated rewards for a staker
 */
export const calculateEstimatedRewards = (
  stakingPool: StakingPool,
  stakerInfo: StakerInfo | null,
  currentTime: number = Math.floor(Date.now() / 1000)
): BN => {
  if (!stakerInfo || stakerInfo.stakedAmount.isZero()) {
    return new BN(0);
  }
  
  // If the user has claimed all rewards and hasn't staked for any additional time
  if (stakerInfo.lastClaimTime.toNumber() === currentTime) {
    return new BN(0);
  }
  
  // Calculate time since last claim
  const timeSinceLastClaim = Math.max(
    0,
    currentTime - stakerInfo.lastClaimTime.toNumber()
  );
  
  // Calculate rewards based on staked amount, time, and reward rate
  // rewardRate is in basis points (1/10000), so we divide by 10000
  const rewardsPerSecond = stakerInfo.stakedAmount
    .mul(stakingPool.rewardRate)
    .div(new BN(10000))
    .div(new BN(SECONDS_PER_DAY));
  
  // Calculate total rewards for the period
  const estimatedRewards = rewardsPerSecond.mul(new BN(timeSinceLastClaim));
  
  return estimatedRewards;
};

// Hook to fetch staking pool associated with a campaign
export const useStakingPool = (campaignId: string | undefined) => {
  const { program, loading: clientLoading } = useAnchorClient();
  const [stakingPool, setStakingPool] = useState<StakingPool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const loadStakingPool = async () => {
      if (!program || !campaignId) return;
      
      try {
        setLoading(true);
        
        // First try to find the staking pool via PDA
        const campaignPubkey = new PublicKey(campaignId);
        const [stakingPoolPda] = await PublicKey.findProgramAddress(
          [
            Buffer.from('staking-pool'),
            campaignPubkey.toBuffer()
          ],
          program.programId
        );
        
        // Then fetch the staking pool data
        try {
          const stakingPoolData = await fetchStakingPool(program, stakingPoolPda);
          setStakingPool(stakingPoolData);
          setError(null);
        } catch (err) {
          // If development mode, create mock data
          if (isDevelopment) {
            console.log('Using mock stakingPool data in development mode');
            
            // Create mock staking pool data
            const currentTime = Math.floor(Date.now() / 1000);
            const mockStakingPool: StakingPool = {
              pubkey: stakingPoolPda,
              campaign: new PublicKey(campaignId),
              creator: web3.Keypair.generate().publicKey, // Random creator
              stakedTokens: new BN(1000 * Math.pow(10, 9)), // 1000 tokens
              rewardRate: new BN(500), // 5% in basis points
              lockupPeriod: new BN(30 * SECONDS_PER_DAY), // 30 days
              startTime: new BN(currentTime - 7 * SECONDS_PER_DAY), // 7 days ago
              endTime: new BN(currentTime + 30 * SECONDS_PER_DAY), // 30 days from now
              poolBalance: new BN(10000 * Math.pow(10, 9)), // 10000 tokens
              stakersCount: new BN(5),
              active: true
            };
            setStakingPool(mockStakingPool);
            setError(null);
          } else {
            console.error('Error loading staking pool:', err);
            setError(err instanceof Error ? err : new Error(String(err)));
            setStakingPool(null);
          }
        }
      } catch (err) {
        console.error('Error finding staking pool PDA:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setStakingPool(null);
      } finally {
        setLoading(false);
      }
    };
    
    if (!clientLoading && program && campaignId) {
      loadStakingPool();
    }
  }, [program, campaignId, clientLoading]);
  
  return { stakingPool, loading: loading || clientLoading, error };
};

// Hook to fetch staker info for a user and staking pool
export const useStakerInfo = (stakingPoolId: string | undefined, wallet: any) => {
  const { program, loading: clientLoading } = useAnchorClient();
  const [stakerInfo, setStakerInfo] = useState<StakerInfo | null>(null);
  const [estimatedRewards, setEstimatedRewards] = useState<BN>(new BN(0));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [stakingPoolData, setStakingPoolData] = useState<StakingPool | null>(null);
  
  useEffect(() => {
    const loadStakerInfo = async () => {
      if (!program || !stakingPoolId || !wallet || !wallet.publicKey) return;
      
      try {
        setLoading(true);
        
        const stakingPoolPubkey = new PublicKey(stakingPoolId);
        
        // Fetch the staking pool data to calculate rewards
        const poolData = await fetchStakingPool(program, stakingPoolPubkey);
        setStakingPoolData(poolData);
        
        // Fetch the staker info
        const stakerInfoData = await fetchStakerInfo(
          program,
          stakingPoolPubkey,
          wallet.publicKey
        );
        
        setStakerInfo(stakerInfoData);
        
        // Calculate estimated rewards if staker info exists
        if (stakerInfoData) {
          const rewards = calculateEstimatedRewards(
            poolData,
            stakerInfoData
          );
          setEstimatedRewards(rewards);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error loading staker info:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };
    
    if (!clientLoading && program && stakingPoolId && wallet && wallet.publicKey) {
      loadStakerInfo();
    }
  }, [program, stakingPoolId, wallet, clientLoading]);
  
  // Update estimated rewards every minute
  useEffect(() => {
    if (!stakerInfo || !stakingPoolData) return;
    
    const intervalId = setInterval(() => {
      if (stakingPoolData) {
        const rewards = calculateEstimatedRewards(stakingPoolData, stakerInfo);
        setEstimatedRewards(rewards);
      }
    }, 60000); // Update every minute
    
    return () => clearInterval(intervalId);
  }, [stakerInfo, stakingPoolData]);
  
  return { 
    stakerInfo, 
    stakingPool: stakingPoolData,
    estimatedRewards,
    loading: loading || clientLoading, 
    error
  };
};

/**
 * Gets donor statistics for a campaign
 * @param campaignId The campaign ID to get stats for
 * @returns Campaign donor statistics
 */
export const getCampaignDonorStats = async (
  campaignId: string
): Promise<CampaignDonorStats> => {
  // In development mode, use a mock implementation
  if (isDevelopment) {
    console.log('Using mock getCampaignDonorStats implementation in development mode');
    
    // Simulate delay for fetching data
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Return mock data
    return {
      totalDonors: Math.floor(Math.random() * 20) + 5,
      totalLakkhiContributed: new BN(Math.floor(Math.random() * 1000000) + 100000),
      totalUsdContributed: Math.floor(Math.random() * 10000) + 1000
    };
  }
  
  // For production, implement actual fetching from blockchain
  // This would query the program to get all donors for the campaign
  throw new Error('Production implementation not available yet');
};

/**
 * Create a staking client to interact with the staking program
 */
export const createStakingClient = (connection: Connection, wallet: WalletContextState) => {
  // Return an object with all the staking methods
  return {
    // Add getCampaignDonorStats to the returned client object
    getCampaignDonorStats: async (campaignId: string): Promise<CampaignDonorStats> => {
      return getCampaignDonorStats(campaignId);
    },
    
    // Add method to auto-stake contribution
    autoStakeContribution: async (campaignId: string, amountBN: BN): Promise<string> => {
      // In development mode, use a mock implementation
      if (isDevelopment) {
        console.log('Using mock autoStakeContribution implementation in development mode');
        console.log(`Auto-staking ${amountBN.toString()} for campaign ${campaignId}`);
        
        // Simulate delay for transaction
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        return 'mock-tx-' + Math.random().toString(36).substring(2, 15);
      }
      
      // For production, implement actual staking transaction
      throw new Error('Production implementation not available yet');
    },
    
    // ... other methods would be added here
  };
}; 