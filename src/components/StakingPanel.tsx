import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { BN } from '@project-serum/anchor';
import dynamic from 'next/dynamic';
import { PublicKey } from '@solana/web3.js';
import { 
  useStakingPool, 
  useStakerInfo, 
  stakeTokens, 
  unstakeTokens, 
  claimRewards,
  createStakingPool,
  StakingStats
} from '../utils/staking-client';
import { formatLamports } from '../utils/format';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

// Import WalletMultiButton dynamically with ssr: false to prevent hydration errors
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);

interface StakingPanelProps {
  campaignId: string;
  isCreator: boolean;
  stakingStats: StakingStats;
  isSubmitting: boolean;
  onWithdraw: () => Promise<void>;
}

const StakingPanel: React.FC<StakingPanelProps> = ({ 
  campaignId, 
  isCreator,
  stakingStats,
  isSubmitting,
  onWithdraw
}) => {
  const wallet = useWallet();
  const { stakingPool, loading: stakingPoolLoading, error: stakingPoolError } = useStakingPool(campaignId);
  const { 
    stakerInfo, 
    estimatedRewards, 
    loading: stakerInfoLoading, 
    error: stakerInfoError 
  } = useStakerInfo(stakingPool?.pubkey.toString(), wallet);
  
  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isCreatingPool, setIsCreatingPool] = useState(false);
  
  // Pool creation form state
  const [poolRewardRate, setPoolRewardRate] = useState("500"); // Default 5%
  const [poolLockupPeriod, setPoolLockupPeriod] = useState("30"); // Default 30 days
  const [poolStartDate, setPoolStartDate] = useState<string>("");
  const [poolEndDate, setPoolEndDate] = useState<string>("");
  const [poolInitialBalance, setPoolInitialBalance] = useState("10000"); // Default 10,000 tokens
  
  // Set default dates on first render
  useEffect(() => {
    const today = new Date();
    
    // Start date - today
    const startDate = today.toISOString().split('T')[0];
    setPoolStartDate(startDate);
    
    // End date - 90 days from now
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 90);
    setPoolEndDate(endDate.toISOString().split('T')[0]);
  }, []);
  
  const handleStake = async () => {
    if (!wallet.connected || !wallet.publicKey || !stakingPool) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    try {
      setIsStaking(true);
      const amount = parseFloat(stakeAmount);
      
      if (isNaN(amount) || amount <= 0) {
        toast.error("Please enter a valid amount to stake");
        return;
      }
      
      await stakeTokens(
        stakingPool.pubkey,
        amount,
        wallet
      );
      
      toast.success("Successfully staked tokens!");
      setStakeAmount("");
      
      // Refresh staker info after staking
      // This would happen automatically in a production environment with account subscription
    } catch (error) {
      console.error("Error staking tokens:", error);
      toast.error("Failed to stake tokens. Please try again.");
    } finally {
      setIsStaking(false);
    }
  };
  
  const handleUnstake = async () => {
    if (!wallet.connected || !wallet.publicKey || !stakingPool) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    try {
      setIsUnstaking(true);
      
      // Check if unstaking is available based on lockup period
      if (stakerInfo && stakerInfo.unstakeAvailableTime.toNumber() > Math.floor(Date.now() / 1000)) {
        const lockupEnds = new Date(stakerInfo.unstakeAvailableTime.toNumber() * 1000);
        toast.error(`Tokens are still locked until ${lockupEnds.toLocaleDateString()}`);
        return;
      }
      
      await unstakeTokens(
        stakingPool.pubkey,
        wallet
      );
      
      toast.success("Successfully unstaked tokens!");
      
      // Refresh staker info after unstaking
      // This would happen automatically in a production environment with account subscription
    } catch (error) {
      console.error("Error unstaking tokens:", error);
      toast.error("Failed to unstake tokens. Please try again.");
    } finally {
      setIsUnstaking(false);
    }
  };
  
  const handleClaimRewards = async () => {
    if (!wallet.connected || !wallet.publicKey || !stakingPool) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    try {
      setIsClaiming(true);
      
      await claimRewards(
        stakingPool.pubkey,
        wallet
      );
      
      toast.success("Successfully claimed rewards!");
      
      // Refresh staker info after claiming
      // This would happen automatically in a production environment with account subscription
    } catch (error) {
      console.error("Error claiming rewards:", error);
      toast.error("Failed to claim rewards. Please try again.");
    } finally {
      setIsClaiming(false);
    }
  };
  
  const handleCreateStakingPool = async () => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    try {
      setIsCreatingPool(true);
      
      // Validate inputs
      const rewardRate = parseInt(poolRewardRate);
      const lockupPeriod = parseInt(poolLockupPeriod);
      const initialBalance = parseFloat(poolInitialBalance);
      
      if (isNaN(rewardRate) || rewardRate <= 0 || rewardRate > 10000) {
        toast.error("Please enter a valid reward rate (0-10000 basis points)");
        return;
      }
      
      if (isNaN(lockupPeriod) || lockupPeriod < 0) {
        toast.error("Please enter a valid lockup period in days");
        return;
      }
      
      if (isNaN(initialBalance) || initialBalance <= 0) {
        toast.error("Please enter a valid initial pool balance");
        return;
      }
      
      const startDate = new Date(poolStartDate);
      const endDate = new Date(poolEndDate);
      
      if (startDate >= endDate) {
        toast.error("End date must be after start date");
        return;
      }
      
      await createStakingPool(
        new PublicKey(campaignId),
        rewardRate,
        lockupPeriod,
        startDate,
        endDate,
        initialBalance,
        wallet
      );
      
      toast.success("Successfully created staking pool!");
      
      // Refresh staking pool info after creation
      // This would happen automatically in a production environment with account subscription
    } catch (error) {
      console.error("Error creating staking pool:", error);
      toast.error("Failed to create staking pool. Please try again.");
    } finally {
      setIsCreatingPool(false);
    }
  };
  
  // Calculate timeframe for unstaking
  const canUnstakeNow = stakerInfo && 
    stakerInfo.unstakeAvailableTime.toNumber() <= Math.floor(Date.now() / 1000);
  
  const formattedUnstakeDate = stakerInfo && stakerInfo.unstakeAvailableTime.toNumber() > 0 
    ? new Date(stakerInfo.unstakeAvailableTime.toNumber() * 1000).toLocaleDateString() 
    : 'N/A';
  
  // Loading state
  if (stakingPoolLoading) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-md w-full max-w-2xl mx-auto mt-8">
        <h2 className="text-2xl font-bold mb-4">Staking</h2>
        <p className="text-gray-600">Loading staking information...</p>
      </div>
    );
  }
  
  // Error state
  if (stakingPoolError && !isCreator) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-md w-full max-w-2xl mx-auto mt-8">
        <h2 className="text-2xl font-bold mb-4">Staking</h2>
        <p className="text-red-500">Error loading staking information. Please try again later.</p>
      </div>
    );
  }
  
  // No staking pool exists yet, but user is the creator - show create pool form
  if (!stakingPool && isCreator) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-md w-full max-w-2xl mx-auto mt-8">
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4">
            <p className="font-bold">Development Mode</p>
            <p>You are running in development mode. Staking transactions are mocked and won't require wallet signing.</p>
          </div>
        )}
        <h2 className="text-2xl font-bold mb-4">Create Staking Pool</h2>
        {!wallet.connected ? (
          <div className="mb-4">
            <p className="text-gray-600 mb-2">Connect your wallet to create a staking pool</p>
            <WalletMultiButton />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="font-medium mb-1">Reward Rate (basis points, 100 = 1%)</label>
              <input
                type="number"
                className="border rounded px-3 py-2"
                value={poolRewardRate}
                onChange={(e) => setPoolRewardRate(e.target.value)}
                placeholder="500 = 5%"
              />
              <p className="text-sm text-gray-500 mt-1">
                {parseInt(poolRewardRate) / 100}% daily rewards per token staked
              </p>
            </div>
            
            <div className="flex flex-col">
              <label className="font-medium mb-1">Lockup Period (days)</label>
              <input
                type="number"
                className="border rounded px-3 py-2"
                value={poolLockupPeriod}
                onChange={(e) => setPoolLockupPeriod(e.target.value)}
                placeholder="30"
              />
            </div>
            
            <div className="flex flex-col">
              <label className="font-medium mb-1">Start Date</label>
              <input
                type="date"
                className="border rounded px-3 py-2"
                value={poolStartDate}
                onChange={(e) => setPoolStartDate(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col">
              <label className="font-medium mb-1">End Date</label>
              <input
                type="date"
                className="border rounded px-3 py-2"
                value={poolEndDate}
                onChange={(e) => setPoolEndDate(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col">
              <label className="font-medium mb-1">Initial Pool Balance (tokens for rewards)</label>
              <input
                type="number"
                className="border rounded px-3 py-2"
                value={poolInitialBalance}
                onChange={(e) => setPoolInitialBalance(e.target.value)}
                placeholder="10000"
              />
            </div>
            
            <button
              className="bg-blue-600 text-white font-medium py-2 px-4 rounded hover:bg-blue-700 w-full"
              onClick={handleCreateStakingPool}
              disabled={isCreatingPool}
            >
              {isCreatingPool ? "Creating Pool..." : "Create Staking Pool"}
            </button>
          </div>
        )}
      </div>
    );
  }
  
  // No staking pool exists and user is not creator
  if (!stakingPool && !isCreator) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-md w-full max-w-2xl mx-auto mt-8">
        <h2 className="text-2xl font-bold mb-4">Staking</h2>
        <p className="text-gray-600">No staking pool has been created for this campaign yet.</p>
      </div>
    );
  }
  
  // Staking pool exists, show staking interface
  return (
    <div className="p-6 bg-white rounded-xl shadow-md w-full max-w-2xl mx-auto mt-8">
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4">
          <p className="font-bold">Development Mode</p>
          <p>You are running in development mode. Staking transactions are mocked and won't require wallet signing.</p>
        </div>
      )}
      <h2 className="text-2xl font-bold mb-4">Stake & Earn Rewards</h2>
      
      {/* Pool Stats */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h3 className="font-bold text-lg mb-2">Staking Pool Stats</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-gray-600 text-sm">Total Staked</p>
            <p className="font-medium">{formatLamports(stakingPool?.stakedTokens)} LAKKHI</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Reward Rate</p>
            <p className="font-medium">{stakingPool?.rewardRate ? (stakingPool.rewardRate.toNumber() / 100) : 0}% daily</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Lockup Period</p>
            <p className="font-medium">{stakingPool?.lockupPeriod ? (stakingPool.lockupPeriod.toNumber() / 86400) : 0} days</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Total Stakers</p>
            <p className="font-medium">{stakingPool?.stakersCount?.toString() || "0"}</p>
          </div>
        </div>
      </div>
      
      {!wallet.connected ? (
        <div className="mb-6">
          <p className="text-gray-600 mb-2">Connect your wallet to start staking</p>
          <WalletMultiButton />
        </div>
      ) : (
        <>
          {/* User's Staking Stats */}
          {stakerInfo && (
            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <h3 className="font-bold text-lg mb-2">Your Staking</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-gray-600 text-sm">Your Staked Amount</p>
                  <p className="font-medium">{formatLamports(stakerInfo.stakedAmount)} LAKKHI</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Estimated Rewards</p>
                  <p className="font-medium">{formatLamports(estimatedRewards)} LAKKHI</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Staking Since</p>
                  <p className="font-medium">
                    {new Date(stakerInfo.stakingStartTime.toNumber() * 1000).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Unlock Date</p>
                  <p className="font-medium">{formattedUnstakeDate}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  className="bg-orange-500 text-white font-medium py-2 px-4 rounded hover:bg-orange-600 disabled:opacity-50"
                  onClick={handleClaimRewards}
                  disabled={isClaiming || estimatedRewards.isZero()}
                >
                  {isClaiming ? "Claiming..." : "Claim Rewards"}
                </button>
                
                <button
                  className="bg-red-500 text-white font-medium py-2 px-4 rounded hover:bg-red-600 disabled:opacity-50"
                  onClick={handleUnstake}
                  disabled={isUnstaking || !canUnstakeNow}
                  title={!canUnstakeNow ? `Unstaking available on ${formattedUnstakeDate}` : ""}
                >
                  {isUnstaking ? "Unstaking..." : "Unstake Tokens"}
                </button>
              </div>
            </div>
          )}
          
          {/* Staking Form */}
          <div className="mt-6">
            <h3 className="font-bold text-lg mb-3">Stake Tokens</h3>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                className="border rounded flex-1 px-3 py-2"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="Amount to stake"
                disabled={isStaking}
              />
              <button
                className="bg-blue-600 text-white font-medium py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
                onClick={handleStake}
                disabled={isStaking || stakeAmount === "" || parseFloat(stakeAmount) <= 0}
              >
                {isStaking ? "Staking..." : "Stake"}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Note: Staked tokens will be locked for {stakingPool?.lockupPeriod ? (stakingPool.lockupPeriod.toNumber() / 86400) : 0} days.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default StakingPanel; 