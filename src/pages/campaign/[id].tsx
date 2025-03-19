import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { format } from 'date-fns';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import toast from 'react-hot-toast';
import { fetchCampaignById, donateToCampaign, releaseFunds } from '@/utils/anchor-client';
import { solToUSD, usdToSOL } from '@/services/price-service';
import { createStakingClient } from '@/utils/staking-client';
import { useConnection } from '@solana/wallet-adapter-react';
import CardPaymentModal from '@/components/CardPaymentModal';
import IncentivesList from '@/components/IncentivesList';
import ClaimedIncentives from '@/components/ClaimedIncentives';
import { BN } from '@project-serum/anchor';
import { getCurrentWallet } from '@/services/solana-wallet-service';

export default function CampaignDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const wallet = useWallet();
  const { connection } = useConnection();
  
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [donationAmount, setDonationAmount] = useState('');
  const [isDonating, setIsDonating] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [solPrice, setSolPrice] = useState(0);
  const [currentUsd, setCurrentUsd] = useState(0);
  const [targetUsd, setTargetUsd] = useState(0);
  const [contributorCount, setContributorCount] = useState(0);
  const [userWallet, setUserWallet] = useState<{ email: string; publicKey: string } | null>(null);
  
  // Load user wallet from cookie on component mount
  useEffect(() => {
    const currentWallet = getCurrentWallet();
    if (currentWallet) {
      setUserWallet(currentWallet);
    }
  }, []);

  // Format USD values with commas and 2 decimal places
  const formatUSD = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  useEffect(() => {
    if (!id) return;

    const loadCampaign = async () => {
      try {
        setLoading(true);
        const campaignData = await fetchCampaignById(id as string);
        if (!campaignData) {
          toast.error('Campaign not found');
          router.push('/campaigns');
          return;
        }
        setCampaign(campaignData);
        
        // Create staking client to get donor stats
        if (wallet) {
          const stakingClient = createStakingClient(connection, wallet);
          const donorStats = await stakingClient.getCampaignDonorStats(id as string);
          setContributorCount(donorStats.totalDonors);
        }
        
        // Convert SOL amounts to USD
        const currentPrice = await solToUSD(1); // Get price of 1 SOL in USD
        setSolPrice(currentPrice);
        
        // Calculate USD amounts from SOL values
        const currentAmount = campaignData.currentAmount ? parseFloat(campaignData.currentAmount.toString()) / Math.pow(10, 9) : 0;
        const targetAmountSol = campaignData.targetAmount ? parseFloat(campaignData.targetAmount.toString()) / Math.pow(10, 9) : 0;
        
        const currentUsdValue = currentAmount * currentPrice;
        const targetUsdValue = targetAmountSol * currentPrice;
        
        setCurrentUsd(currentUsdValue);
        setTargetUsd(targetUsdValue);
      } catch (error) {
        console.error('Error loading campaign:', error);
        toast.error('Failed to load campaign details.');
      } finally {
        setLoading(false);
      }
    };

    loadCampaign();
  }, [id, router, connection, wallet]);
  
  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet.connected) {
      toast.error('Please connect your wallet to donate');
      return;
    }

    const usdAmount = parseFloat(donationAmount);
    if (isNaN(usdAmount) || usdAmount <= 0) {
      toast.error('Please enter a valid donation amount');
      return;
    }

    try {
      setIsDonating(true);
      toast.loading('Processing donation...', { id: 'donate' });
      
      // Convert USD to SOL for the actual blockchain transaction
      const solAmount = await usdToSOL(usdAmount);
      
      // Check if the donation qualifies for any incentives
      let claimedIncentive = null;
      if (campaign.incentives && campaign.incentives.length > 0) {
        // Find the highest tier incentive that the donation qualifies for
        const qualifyingIncentives = campaign.incentives
          .filter((inc: any) => parseFloat(inc.minAmount) <= usdAmount)
          .sort((a: any, b: any) => parseFloat(b.minAmount) - parseFloat(a.minAmount));
        
        if (qualifyingIncentives.length > 0) {
          const topIncentive = qualifyingIncentives[0];
          const maxSlots = parseInt(topIncentive.maxSlots);
          
          // Check if slots are available
          if (maxSlots === 0 || topIncentive.claimedSlots < maxSlots) {
            claimedIncentive = topIncentive;
          }
        }
      }
      
      // Pass the claimed incentive to the donation function if applicable
      const txId = await donateToCampaign(campaign.pubkey, Number(solAmount), claimedIncentive?.id);
      
      // Auto-stake the contribution
      if (wallet && connection) {
        const stakingClient = createStakingClient(connection, wallet);
        await stakingClient.autoStakeContribution(
          campaign.pubkey.toString(), 
          new BN(Number(solAmount) * Math.pow(10, 9))
        );
      }
      
      // Show appropriate success message
      if (claimedIncentive) {
        toast.success(`Donation of $${usdAmount} successful! You've claimed the "${claimedIncentive.name}" incentive.`, { id: 'donate' });
      } else {
        toast.success(`Donation of $${usdAmount} successful! Thank you for your support.`, { id: 'donate' });
      }
      
      setDonationAmount('');
      
      // Refresh campaign data and update UI immediately
      const updatedCampaign = await fetchCampaignById(id as string);
      if (updatedCampaign) {
        setCampaign(updatedCampaign);
        
        // Update USD values
        const currentAmount = updatedCampaign.currentAmount 
          ? parseFloat(updatedCampaign.currentAmount.toString()) / Math.pow(10, 9) 
          : 0;
        
        // Update contributor count
        if (wallet) {
          const stakingClient = createStakingClient(connection, wallet);
          const donorStats = await stakingClient.getCampaignDonorStats(id as string);
          setContributorCount(donorStats.totalDonors);
        }
        
        // Update the current USD amount (add the donation amount to make it instant)
        setCurrentUsd(currentAmount * solPrice);
      }
    } catch (error) {
      console.error('Error donating:', error);
      toast.error('Failed to process donation. Please try again.', { id: 'donate' });
    } finally {
      setIsDonating(false);
    }
  };

  const openCardModal = () => {
    setIsCardModalOpen(true);
  };

  const closeCardModal = () => {
    setIsCardModalOpen(false);
  };

  const handleCardPayment = async (paymentDetails: any) => {
    try {
      // Process card payment logic here
      // For now, we'll just simulate a successful payment
      toast.success('Card payment successful!');
      closeCardModal();
      
      // Refresh campaign data
      const updatedCampaign = await fetchCampaignById(id as string);
      if (updatedCampaign) {
        setCampaign(updatedCampaign);
        
        // Update USD values and contributor count
        const currentAmount = updatedCampaign.currentAmount 
          ? parseFloat(updatedCampaign.currentAmount.toString()) / Math.pow(10, 9) 
          : 0;
        setCurrentUsd(currentAmount * solPrice);
        
        if (wallet) {
          const stakingClient = createStakingClient(connection, wallet);
          const donorStats = await stakingClient.getCampaignDonorStats(id as string);
          setContributorCount(donorStats.totalDonors);
        }
      }
    } catch (error) {
      console.error('Error processing card payment:', error);
      toast.error('Failed to process card payment.');
    }
  };

  const handleReleaseFunds = async () => {
    if (!wallet.connected || !campaign) {
      return;
    }

    try {
      setIsReleasing(true);
      toast.loading('Releasing funds...', { id: 'release' });
      
      await releaseFunds(campaign.pubkey);
      
      toast.success('Funds released successfully!', { id: 'release' });
      
      // Refresh campaign data
      const updatedCampaign = await fetchCampaignById(id as string);
      if (updatedCampaign) {
        setCampaign(updatedCampaign);
        
        // Update USD values
        const currentAmount = updatedCampaign.currentAmount 
          ? parseFloat(updatedCampaign.currentAmount.toString()) / Math.pow(10, 9) 
          : 0;
        setCurrentUsd(currentAmount * solPrice);
      }
    } catch (error) {
      console.error('Error releasing funds:', error);
      toast.error('Failed to release funds.', { id: 'release' });
    } finally {
      setIsReleasing(false);
    }
  };

  if (loading || !campaign) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <p className="text-gray-500">Loading campaign details...</p>
      </div>
    );
  }

  const progress = targetUsd > 0 ? (currentUsd / targetUsd) * 100 : 0;
  const isExpired = new Date() > campaign.endDate;
  const fundingComplete = currentUsd >= targetUsd;
  const isCreator = wallet.connected && wallet.publicKey?.toString() === campaign.creator;
  const canReleaseFunds = isCreator && (fundingComplete || isExpired);

  return (
    <>
      <Head>
        <title>{campaign.name} | Lakkhi Fundraising</title>
        <meta name="description" content={campaign.description} />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/campaigns" className="text-indigo-600 hover:text-indigo-800 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Campaigns
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Campaign details */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <img 
                src={campaign.imageUrl} 
                alt={campaign.name} 
                className="w-full h-64 object-cover"
              />
              <div className="p-6">
                <h1 className="text-2xl font-bold mb-2">{campaign.name}</h1>
                <div className="flex items-center text-gray-500 text-sm mb-4">
                  <span>Created by {campaign.creator.slice(0, 4)}...{campaign.creator.slice(-4)}</span>
                  <span className="mx-2">•</span>
                  <span>{campaign.category}</span>
                </div>
                
                <div className="mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-700">
                      ${formatUSD(currentUsd)} raised of ${formatUSD(targetUsd)}
                    </span>
                    <span className="text-gray-700">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-indigo-600 h-2.5 rounded-full" 
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mb-6">
                  <div className="text-sm text-gray-500">
                    <span className="block">
                      {isExpired ? 'Ended on' : 'Ends on'} {format(campaign.endDate, 'MMM dd, yyyy')}
                    </span>
                    <span className="block mt-1">
                      {contributorCount} {contributorCount === 1 ? 'contributor' : 'contributors'}
                    </span>
                  </div>
                  
                  {canReleaseFunds && (
                    <button
                      onClick={handleReleaseFunds}
                      disabled={isReleasing}
                      className="btn btn-outline btn-sm"
                    >
                      {isReleasing ? 'Processing...' : 'Release Funds'}
                    </button>
                  )}
                </div>
                
                <div className="prose max-w-none">
                  <p>{campaign.description}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            {/* Donation form */}
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-4">Support this campaign</h2>
              
              {/* Display claimed incentives if available */}
              {campaign.incentives && campaign.incentives.length > 0 && wallet.connected && (
                <ClaimedIncentives 
                  campaignId={campaign.pubkey.toString()} 
                  incentives={campaign.incentives} 
                />
              )}
              
              {/* Display incentives if available */}
              {campaign.incentives && campaign.incentives.length > 0 && (
                <IncentivesList 
                  incentives={campaign.incentives} 
                  donationAmount={donationAmount}
                  setDonationAmount={setDonationAmount}
                />
              )}
              
              {wallet.connected ? (
                <form onSubmit={handleDonate}>
                  <div className="mb-4">
                    <label htmlFor="amount" className="block text-gray-700 font-medium mb-2">
                      Donation Amount (USD)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <input
                        type="text"
                        id="amount"
                        className="input w-full pl-8"
                        placeholder="Enter amount"
                        value={donationAmount}
                        onChange={(e) => setDonationAmount(e.target.value)}
                        disabled={isDonating}
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum donation: $1.00
                    </p>
                  </div>
                  
                  <div className="flex flex-col space-y-3">
                    <button
                      type="submit"
                      className="btn btn-primary w-full"
                      disabled={isDonating}
                    >
                      {isDonating ? 'Processing...' : 'Donate with LAKKHI'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={openCardModal}
                      className="btn btn-outline w-full"
                      disabled={isDonating}
                    >
                      Donate with Card
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-4">
                  <p className="mb-4">Connect your wallet to donate</p>
                  <WalletMultiButton className="btn btn-primary" />
                </div>
              )}

              {/* Current Solana Price Information */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Current rate: 1 SOL = ${formatUSD(solPrice)} • 1 LAKKHI ≈ ${formatUSD(solPrice / Math.pow(10, 9))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Payment Modal */}
      <CardPaymentModal
        isOpen={isCardModalOpen}
        onClose={closeCardModal}
        onSuccess={() => {
          toast.success('Payment successful!');
          // Refresh campaign data
          fetchCampaignById(id as string).then(updatedCampaign => {
            if (updatedCampaign) setCampaign(updatedCampaign);
          });
        }}
        onFailure={(error) => toast.error(`Payment failed: ${error}`)}
        amount={parseFloat(donationAmount) || 0}
        campaignAddress={campaign.pubkey.toString()}
      />
    </>
  );
} 