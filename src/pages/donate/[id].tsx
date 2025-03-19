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
}

interface Donation {
  publicKey: string;
  campaign: string;
  donor: string;
  amount: number;
  timestamp: number;
  verified?: boolean;
}

const DonatePage: NextPage = () => {
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

  // Function to handle donation
  const handleDonate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet.connected || !campaign) {
      toast.error('Please connect your wallet to donate');
      return;
    }
    
    const donationAmount = parseFloat(amount);
    if (isNaN(donationAmount) || donationAmount <= 0) {
      toast.error('Please enter a valid donation amount');
      return;
    }
    
    setIsSubmitting(true);
    toast.loading('Processing donation on the blockchain...', { id: 'donation' });
    
    try {
      // Convert to lamports (smallest unit)
      const lamports = donationAmount * 1_000_000_000; // 1 LAKKHI = 10^9 lamports
      
      // Create the donation on the blockchain
      const donationId = await createDonation(
        campaign.address,
        lamports,
        wallet
      );
      
      setDonationTxId(donationId);
      toast.success('Donation successful!', { id: 'donation' });
      
      // Reload donations
      const updatedDonations = await getDonationsForCampaign(campaign.address);
      setDonations(updatedDonations);
      
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

  // Don't render until component has mounted on the client
  if (!isMounted) {
    return null;
  }

  if (!wallet.connected) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">Donate to Campaign</h1>
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
        <h1 className="text-3xl font-bold mb-8">Donate to Campaign</h1>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">Donate to Campaign</h1>
        <div className="bg-red-50 p-4 rounded-lg text-red-600 text-center mb-6">
          Campaign not found
        </div>
        <Link href="/on-chain-campaigns" passHref>
          <button className="btn btn-primary">Back to Campaigns</button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Donate to {campaign.name} | LAKKHI Crowdfunding</title>
        <meta name="description" content={`Donate to ${campaign.name} campaign`} />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Donate to Campaign</h1>
          <Link href="/on-chain-campaigns" passHref>
            <button className="btn border border-gray-300 text-gray-700">
              Back to Campaigns
            </button>
          </Link>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <p className="text-blue-700">
            <span className="font-bold">Connected Wallet:</span> {wallet.publicKey?.toString()}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-800">{campaign.name}</h2>
              <p className="text-gray-500">{campaign.category}</p>
              <p className="text-gray-600 mt-4">{campaign.description}</p>
            </div>
            
            <div className="flex justify-between items-center mt-6">
              <div>
                <p className="text-sm text-gray-500">Target Amount</p>
                <p className="font-bold text-gray-800">{campaign.targetAmount} LAKKHI</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">End Date</p>
                <p className="font-bold text-gray-800">{new Date(parseInt(campaign.endDate) * 1000).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            {donationTxId ? (
              <div className="text-center">
                <h2 className="text-xl font-bold mb-4 text-green-600">Donation Successful!</h2>
                <p className="mb-4">Your donation to <strong>{campaign.name}</strong> has been processed on the blockchain.</p>
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
                  onClick={() => {
                    setDonationTxId(null);
                  }}
                  className="btn bg-indigo-600 hover:bg-indigo-700 text-white w-full mb-4"
                >
                  Make Another Donation
                </button>
                <Link href="/on-chain-campaigns" passHref>
                  <button className="btn bg-gray-600 hover:bg-gray-700 text-white w-full">
                    Back to Campaigns
                  </button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleDonate}>
                <h2 className="text-xl font-bold mb-4">Make a Donation</h2>
                
                <div className="mb-4">
                  <label htmlFor="amount" className="block text-gray-700 font-medium mb-2">
                    Donation Amount (LAKKHI)*
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
                
                <button
                  type="submit"
                  className="btn bg-indigo-600 hover:bg-indigo-700 text-white w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Processing...' : 'Donate Now'}
                </button>
              </form>
            )}
          </div>
        </div>
        
        {/* Donations section */}
        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-4">Recent Donations</h2>
          
          {donations.length > 0 ? (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Donor
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {donations.map((donation) => (
                    <tr key={donation.publicKey}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {donation.donor.substring(0, 4)}...{donation.donor.substring(donation.donor.length - 4)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {(donation.amount / 1_000_000_000).toFixed(2)} LAKKHI
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {new Date(donation.timestamp * 1000).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${donation.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {donation.verified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <p className="text-gray-500">No donations yet. Be the first to support this campaign!</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DonatePage; 