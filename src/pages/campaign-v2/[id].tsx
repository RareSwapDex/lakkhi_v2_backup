import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { PublicKey } from '@solana/web3.js';
import { getDonationsForCampaign, createDonation } from '@/utils/anchor-client-v2';
import toast from 'react-hot-toast';

// Import WalletMultiButton dynamically with ssr: false to prevent hydration errors
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);

interface Campaign {
  address: string;
  name: string;
  description: string;
  targetAmount: string;
  currentAmount?: number;
  creator: string;
  endDate: string;
  imageUrl: string;
  category: string;
  donorsCount?: number;
  publicKey?: string;
}

interface Donation {
  publicKey: string;
  campaign: string;
  donor: string;
  amount: number;
  timestamp: number;
  verified?: boolean;
  message?: string;
}

// Add token to USD conversion functions
const lakkiToUsd = (lakkiAmount: number): number => {
  return lakkiAmount / 2; // 2 LAKKHI = $1
};

const usdToLakki = (usdAmount: number): number => {
  return usdAmount * 2; // $1 = 2 LAKKHI
};

const CampaignV2DetailPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const wallet = useWallet();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // Donation form state
  const [amount, setAmount] = useState<string>('10');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [donationTxId, setDonationTxId] = useState<string | null>(null);
  const [showDonationForm, setShowDonationForm] = useState<boolean>(false);

  // Prevent hydration errors by only rendering after component mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load campaign and donations from localStorage or file
  useEffect(() => {
    if (!id || !isMounted) return;
    
    setLoading(true);
    
    // Function to load campaign data
    const loadCampaign = async () => {
      try {
        // Try to load from localStorage first
        const campaignsJson = localStorage.getItem('campaignsV2');
        let foundCampaign: Campaign | null = null;
        
        if (campaignsJson) {
          const campaigns = JSON.parse(campaignsJson);
          foundCampaign = campaigns.find((c: any) => c.address === id || c.publicKey === id) || null;
        }
        
        // If not found in localStorage, try to fetch from public file
        if (!foundCampaign) {
          try {
            const response = await fetch('/campaigns-v2.json');
            if (response.ok) {
              const campaigns = await response.json();
              foundCampaign = campaigns.find((c: any) => c.address === id || c.publicKey === id) || null;
            }
          } catch (err) {
            console.error('Error loading campaigns from public file:', err);
          }
        }
        
        if (foundCampaign) {
          console.log('Campaign found:', foundCampaign);
          setCampaign(foundCampaign);
          
          // Load donations for this campaign
          try {
            const campaignId = id as string;
            const campaignDonations = await getDonationsForCampaign(campaignId);
            console.log('Donations loaded:', campaignDonations);
            setDonations(campaignDonations);
            
            // Calculate total donation amount
            if (campaignDonations.length > 0) {
              const totalDonated = campaignDonations.reduce((total: number, donation: Donation) => {
                return total + donation.amount;
              }, 0);
              
              // Update campaign with the calculated donation amount
              const totalInLakkhi = totalDonated / 1_000_000_000; // Convert from lamports to LAKKHI
              console.log(`Total donations: ${totalInLakkhi} LAKKHI from ${campaignDonations.length} donations`);
              foundCampaign.currentAmount = totalInLakkhi;
              setCampaign({...foundCampaign});
            }
          } catch (err) {
            console.error('Error loading donations:', err);
          }
        } else {
          setError(new Error('Campaign not found'));
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading campaign:', err);
        setError(err instanceof Error ? err : new Error('Failed to load campaign'));
        setLoading(false);
      }
    };
    
    loadCampaign();
  }, [id, isMounted]);

  // Handle donation
  const handleDonate = () => {
    setShowDonationForm(true);
  };
  
  // Function to handle donation submission
  const handleDonateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet.connected || !campaign) {
      toast.error('Please connect your wallet to donate');
      return;
    }
    
    const donationAmountUsd = parseFloat(amount);
    if (isNaN(donationAmountUsd) || donationAmountUsd <= 0) {
      toast.error('Please enter a valid donation amount');
      return;
    }
    
    // Determine campaign ID (address or publicKey)
    const campaignId = campaign.address || campaign.publicKey;
    if (!campaignId) {
      toast.error('Invalid campaign ID');
      return;
    }
    
    setIsSubmitting(true);
    toast.loading('Processing donation on the blockchain...', { id: 'donation' });
    
    try {
      // Convert USD to LAKKHI tokens
      const donationAmountLakkhi = usdToLakki(donationAmountUsd);
      
      // Convert to lamports (smallest unit)
      const lamports = donationAmountLakkhi * 1_000_000_000; // 1 LAKKHI = 10^9 lamports
      
      // Only include message if it's not empty
      const donationMessage = message.trim() !== '' ? message : undefined;
      
      // Create the donation on the blockchain
      const donationId = await createDonation(
        campaignId,
        lamports,
        wallet,
        donationMessage
      );
      
      setDonationTxId(donationId);
      toast.success('Donation successful!', { id: 'donation' });
      
      // Reload donations and update campaign
      const updatedDonations = await getDonationsForCampaign(campaignId);
      setDonations(updatedDonations);
      
      // Calculate new total
      if (updatedDonations.length > 0) {
        const totalDonated = updatedDonations.reduce((total: number, donation: Donation) => {
          return total + donation.amount;
        }, 0);
        
        // Update campaign with the new donation amount
        const updatedCampaign = {...campaign};
        updatedCampaign.currentAmount = totalDonated / 1_000_000_000;
        updatedCampaign.donorsCount = updatedDonations.length;
        setCampaign(updatedCampaign);
      }
      
      // Reset form
      setAmount('10');
      setMessage('');
    } catch (error) {
      console.error('Error creating donation:', error);
      toast.error(`Donation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'donation' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Reset donation form
  const resetDonationForm = () => {
    setDonationTxId(null);
    setShowDonationForm(false);
  };

  // Don't render until component has mounted on the client
  if (!isMounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">Campaign Details</h1>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">Campaign Details</h1>
        <div className="bg-red-50 p-4 rounded-lg text-red-600 text-center mb-6">
          {error ? error.message : 'Campaign not found'}
        </div>
        <Link href="/on-chain-campaigns-v2" passHref>
          <button className="btn btn-primary">Back to Campaigns</button>
        </Link>
      </div>
    );
  }

  // Calculate the correct progress percentage based on donations
  const currentAmount = campaign.currentAmount ? parseFloat(campaign.currentAmount.toString()) : 0;
  const targetAmount = parseFloat(campaign.targetAmount);
  const progress = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
  const endDate = new Date(parseInt(campaign.endDate) * 1000);
  const isEnded = endDate < new Date();
  const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Log values to help debug
  console.log('Raw values:', { currentAmount, targetAmount });

  // Format based on proper conversion (first ensure we're using proper numbers)
  let currentAmountUsd = 0;
  let targetAmountUsd = 0;

  // If the target amount is very large, assume it's already in lamports
  if (targetAmount > 1000000) {
    // Target amount is stored in lamports, convert to LAKKHI first
    const targetAmountLakkhi = targetAmount / 1_000_000_000;
    targetAmountUsd = lakkiToUsd(targetAmountLakkhi);
    console.log('Target amount converted from lamports:', targetAmountLakkhi, 'LAKKHI =', targetAmountUsd, 'USD');
  } else {
    // Target amount is already in LAKKHI
    targetAmountUsd = lakkiToUsd(targetAmount);
    console.log('Target amount in LAKKHI:', targetAmount, 'LAKKHI =', targetAmountUsd, 'USD');
  }

  // Current amount should already be in LAKKHI
  currentAmountUsd = lakkiToUsd(currentAmount);
  console.log('Current amount:', currentAmount, 'LAKKHI =', currentAmountUsd, 'USD');

  const formattedProgress = Math.min(progress, 100).toFixed(1);

  return (
    <>
      <Head>
        <title>{campaign.name} | LAKKHI Crowdfunding V2</title>
        <meta name="description" content={campaign.description} />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Campaign Details (V2)</h1>
          <Link href="/on-chain-campaigns-v2" passHref>
            <button className="btn border border-gray-300 text-gray-700">
              Back to V2 Campaigns
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Campaign Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="h-96 overflow-hidden">
                <img
                  src={campaign.imageUrl || '/placeholder-image.jpg'}
                  alt={campaign.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Use local placeholder instead of external service
                    (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                    // Prevent infinite refresh by removing the error handler after it fires once
                    (e.target as HTMLImageElement).onerror = null;
                  }}
                />
              </div>
              
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">{campaign.name}</h2>
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                    {campaign.category}
                  </span>
                </div>
                
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Progress</span>
                    <span className="font-medium">
                      ${currentAmountUsd.toFixed(2)} / ${targetAmountUsd.toFixed(2)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>{progress.toFixed(1)}% Complete</span>
                    {!isEnded ? (
                      <span>{daysLeft} days left</span>
                    ) : (
                      <span className="text-red-500">Campaign ended</span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Creator</p>
                    <p className="font-medium text-gray-800">
                      {campaign.creator.substring(0, 6)}...{campaign.creator.substring(campaign.creator.length - 6)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="font-medium text-gray-800">{endDate.toLocaleDateString()}</p>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold mb-3">Campaign Description</h3>
                <div className="prose max-w-none">
                  <p>{campaign.description}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Donate and Stats */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-xl font-bold mb-4">Support This Campaign</h3>
              
              {wallet.connected ? (
                <>
                  {donationTxId ? (
                    <div className="text-center">
                      <h2 className="text-xl font-bold mb-4 text-green-600">Donation Successful!</h2>
                      <p className="mb-4">Your donation to <strong>{campaign.name}</strong> has been processed.</p>
                      <div className="bg-gray-100 p-4 rounded-md mb-6 text-left">
                        <p className="text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all">Transaction ID: {donationTxId}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          <a 
                            href={`https://explorer.solana.com/address/${donationTxId}?cluster=devnet`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            View on Solana Explorer
                          </a>
                        </p>
                      </div>
                      <button
                        onClick={resetDonationForm}
                        className="btn bg-indigo-600 hover:bg-indigo-700 text-white w-full"
                      >
                        Make Another Donation
                      </button>
                    </div>
                  ) : (
                    <>
                      {showDonationForm ? (
                        <form onSubmit={handleDonateSubmit}>
                          <div className="mb-4">
                            <label htmlFor="amount" className="block text-gray-700 font-medium mb-2">
                              Donation Amount ($)*
                            </label>
                            <input
                              type="number"
                              id="amount"
                              className="input w-full"
                              placeholder="10"
                              step="0.1"
                              min="0.1"
                              value={amount}
                              onChange={(e) => setAmount(e.target.value)}
                              disabled={isSubmitting}
                              required
                            />
                          </div>
                          
                          <div className="mb-6">
                            <label htmlFor="message" className="block text-gray-700 font-medium mb-2">
                              Message (Optional)
                            </label>
                            <textarea
                              id="message"
                              className="input w-full h-24"
                              placeholder="Leave a message for the campaign creator..."
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              disabled={isSubmitting}
                            />
                          </div>

                          <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
                            <p className="font-medium">⚠️ LAKKHI Token Required</p>
                            <p>
                              Donations can only be made using LAKKHI tokens 
                              (6pABjANnUTSyymBeXHKQBgAsu6BkDoCLh9rbj9WFNTAS). 
                              You must already have these tokens in your wallet.
                            </p>
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              type="submit"
                              className="btn bg-indigo-600 hover:bg-indigo-700 text-white flex-1"
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? 'Processing...' : 'Donate Now'}
                            </button>
                            <button
                              type="button"
                              className="btn border border-gray-300 text-gray-700"
                              onClick={() => setShowDonationForm(false)}
                              disabled={isSubmitting}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          onClick={handleDonate}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 mb-4"
                          disabled={isEnded}
                        >
                          {isEnded ? 'Campaign Ended' : 'Donate Now'}
                        </button>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="mb-4">
                  <p className="text-gray-600 mb-2">Connect your wallet to donate:</p>
                  <div className="flex justify-center">
                    <WalletMultiButton />
                  </div>
                </div>
              )}
              
              <div className="flex justify-between text-sm text-gray-600 mt-4">
                <div>
                  <p className="font-medium">{donations.length}</p>
                  <p>Donors</p>
                </div>
                <div>
                  <p className="font-medium">{currentAmount.toFixed(2)}</p>
                  <p>LAKKHI Raised</p>
                </div>
                <div>
                  <p className="font-medium">{daysLeft < 0 ? 0 : daysLeft}</p>
                  <p>Days Left</p>
                </div>
              </div>
            </div>
            
            {/* Recent Donations */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold mb-4">Recent Donations</h3>
              
              {donations.length > 0 ? (
                <div className="space-y-4">
                  {donations.slice(0, 5).map((donation) => (
                    <div key={donation.publicKey} className="border-b pb-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 text-sm">
                          {donation.donor.substring(0, 4)}...{donation.donor.substring(donation.donor.length - 4)}
                        </span>
                        <span className="font-bold text-gray-800">
                          ${lakkiToUsd(donation.amount / 1_000_000_000).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(donation.timestamp * 1000).toLocaleString()}
                      </div>
                      {donation.message && (
                        <div className="mt-2 p-2 bg-gray-50 rounded-md text-sm">
                          "{donation.message}"
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {donations.length > 5 && (
                    <button 
                      className="text-blue-600 hover:text-blue-800 text-sm mt-2"
                      onClick={() => alert(`This campaign has received ${donations.length} donations totaling ${currentAmount.toFixed(2)} LAKKHI.`)}
                    >
                      View all {donations.length} donations
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No donations yet. Be the first to support this campaign!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CampaignV2DetailPage; 