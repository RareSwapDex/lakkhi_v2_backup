import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { PublicKey } from '@solana/web3.js';
import toast from 'react-hot-toast';
import { createDonation, getDonationsForCampaign } from '../../utils/anchor-client-v2';
import { lakkhiToUsd, usdToLakkhi, formatUsd } from '@/utils/currency-utils';

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
  creator: string;
  endDate: string;
  imageUrl: string;
  category: string;
  currentAmount?: number;
}

interface Donation {
  publicKey: string;
  campaign: string;
  donor: string;
  amount: number;
  timestamp: number;
  verified?: boolean;
}

const DonateV2Page: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const wallet = useWallet();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [amount, setAmount] = useState<string>('10');
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [donationTxId, setDonationTxId] = useState<string | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration errors by only rendering after component mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load campaign from localStorage
  useEffect(() => {
    if (!id || !isMounted) return;
    
    try {
      // Load from localStorage
      const campaignsJson = localStorage.getItem('campaignsV2');
      if (campaignsJson) {
        const campaigns = JSON.parse(campaignsJson);
        const foundCampaign = campaigns.find((c: any) => c.address === id);
        if (foundCampaign) {
          setCampaign(foundCampaign as Campaign);
        }
      } else {
        // Try to load from public file
        fetch('/campaigns-v2.json')
          .then(response => response.json())
          .then(campaigns => {
            const foundCampaign = campaigns.find((c: any) => c.address === id);
            if (foundCampaign) {
              setCampaign(foundCampaign as Campaign);
            }
          })
          .catch(err => console.error('Error loading campaign from public file:', err));
      }
      setLoading(false);
    } catch (err) {
      console.error('Error loading campaign:', err);
      setLoading(false);
    }
  }, [id, isMounted]);

  // Load existing donations for this campaign
  useEffect(() => {
    if (!id || !isMounted) return;
    
    const loadDonations = async () => {
      try {
        const campaignDonations = await getDonationsForCampaign(id as string);
        setDonations(campaignDonations);
      } catch (err) {
        console.error('Error loading donations:', err);
      }
    };
    
    loadDonations();
  }, [id, isMounted]);

  // Handle donation form submission
  const handleSubmit = async (e: React.FormEvent) => {
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
    
    // Convert USD to LAKKHI tokens
    const donationAmountLakkhi = usdToLakkhi(donationAmountUsd);
    
    setIsSubmitting(true);
    toast.loading('Processing donation...', { id: 'donation' });
    
    try {
      // Convert to lamports (smallest unit)
      const lamports = donationAmountLakkhi * 1_000_000_000;
      
      // Create donation via the anchor client
      const donationId = await createDonation(
        campaign.address,
        lamports,
        wallet,
        message || undefined
      );
      
      setDonationTxId(donationId);
      toast.success('Donation successful!', { id: 'donation' });
    } catch (error) {
      console.error('Error creating donation:', error);
      toast.error(`Donation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'donation' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate USD and LAKKHI values
  let currentAmountLakkhi = 0;
  let targetAmountLakkhi = 0;
  let currentAmountUsd = 0;
  let targetAmountUsd = 0;
  let progress = 0;
  let daysLeft = 0;
  
  if (campaign) {
    currentAmountLakkhi = campaign.currentAmount || 0;
    targetAmountLakkhi = parseFloat(campaign.targetAmount);
    currentAmountUsd = lakkhiToUsd(currentAmountLakkhi);
    targetAmountUsd = lakkhiToUsd(targetAmountLakkhi);
    progress = targetAmountLakkhi > 0 ? (currentAmountLakkhi / targetAmountLakkhi) * 100 : 0;
    
    // Calculate days left
    const endDateTimestamp = parseInt(campaign.endDate) * 1000;
    const currentDate = new Date().getTime();
    daysLeft = Math.ceil((endDateTimestamp - currentDate) / (1000 * 60 * 60 * 24));
  }

  // Don't render until component has mounted on the client
  if (!isMounted) {
    return null;
  }

  if (!wallet.connected) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">Donate to Campaign (V2)</h1>
        <p className="text-gray-600 mb-8">Please connect your wallet to make a donation</p>
        <div className="flex justify-center">
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">Donate to Campaign (V2)</h1>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">Donate to Campaign (V2)</h1>
        <div className="bg-red-50 p-4 rounded-lg text-red-600 text-center mb-6">
          Campaign not found
        </div>
        <Link href="/on-chain-campaigns-v2" passHref>
          <button className="btn btn-primary">Back to V2 Campaigns</button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Donate to {campaign.name} | LAKKHI Crowdfunding V2</title>
        <meta name="description" content={`Donate to ${campaign.name} campaign`} />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Donate to Campaign (V2)</h1>
          <Link href="/on-chain-campaigns-v2" passHref>
            <button className="btn border border-gray-300 text-gray-700">
              Back to V2 Campaigns
            </button>
          </Link>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <p className="text-blue-700">
            <span className="font-bold">Connected Wallet:</span> {wallet.publicKey?.toString()}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="h-64 sm:h-72 overflow-hidden">
              <img
                src={campaign?.imageUrl}
                alt={campaign?.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x400?text=No+Image';
                }}
              />
            </div>
            
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-800">{campaign?.name}</h2>
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                  {campaign?.category}
                </span>
              </div>
              
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-medium">
                    {formatUsd(currentAmountUsd)} / {formatUsd(targetAmountUsd)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="flex justify-between text-sm text-gray-500 mb-4">
                <div>
                  <span className="font-medium">{donations.length}</span> donors
                </div>
                <div>
                  <span className="font-medium">{(daysLeft < 0) ? 0 : daysLeft}</span> days left
                </div>
              </div>
              
              <p className="text-gray-600 mb-4 line-clamp-3">{campaign?.description}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            {donationTxId ? (
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4 text-green-600">Donation Successful!</h2>
                <p className="mb-4">Your donation to <strong>{campaign?.name}</strong> has been processed.</p>
                
                <div className="bg-gray-100 p-4 rounded-md mb-6 text-left">
                  <p className="text-sm font-mono overflow-x-auto whitespace-pre-wrap break-all">Transaction ID: {donationTxId}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    <a href={`https://explorer.solana.com/address/${donationTxId}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      View on Solana Explorer
                    </a>
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Link href={`/campaign-v2/${id}`} passHref>
                    <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200">
                      View Campaign Details
                    </button>
                  </Link>
                  <Link href="/on-chain-campaigns-v2" passHref>
                    <button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg transition duration-200">
                      Back to Campaigns
                    </button>
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-6">Make a Donation</h2>
                
                {wallet.connected ? (
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label htmlFor="amount" className="block text-gray-700 font-medium mb-2">
                        Donation Amount (USD)*
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          id="amount"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full px-3 py-2 pl-8 border rounded-lg"
                          placeholder="Enter amount"
                          step="0.01"
                          min="0.1"
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                      {parseFloat(amount) > 0 && (
                        <p className="text-gray-500 text-sm mt-1">
                          = {usdToLakkhi(parseFloat(amount)).toFixed(2)} LAKKHI tokens
                        </p>
                      )}
                    </div>
                    
                    <div className="mb-6">
                      <label htmlFor="message" className="block text-gray-700 font-medium mb-2">
                        Message (Optional)
                      </label>
                      <textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Leave a message for the campaign creator"
                        rows={4}
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
                    >
                      {isSubmitting ? 'Processing...' : 'Donate Now'}
                    </button>
                  </form>
                ) : (
                  <div className="text-center">
                    <p className="text-gray-600 mb-6">Please connect your wallet to donate</p>
                    <div className="flex justify-center">
                      <WalletMultiButton />
                    </div>
                  </div>
                )}
              </>
            )}
            
            {donations.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-bold mb-4">Recent Donations</h3>
                <div className="space-y-3">
                  {donations.slice(0, 3).map((donation) => (
                    <div key={donation.publicKey} className="flex justify-between items-center border-b pb-2">
                      <div className="text-gray-600 text-sm">
                        {donation.donor.substring(0, 4)}...{donation.donor.substring(donation.donor.length - 4)}
                      </div>
                      <div className="font-bold text-gray-800">
                        {formatUsd(lakkhiToUsd(donation.amount / 1_000_000_000))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DonateV2Page; 