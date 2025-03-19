import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { PublicKey } from '@solana/web3.js';
import { getAllCampaigns, initializePlatformData } from '@/utils/anchor-client-v2';
import { toast } from 'react-hot-toast';
import { lakkhiToUsd, formatUsd } from '@/utils/currency-utils';
import { useRouter } from 'next/router';

// Import WalletMultiButton dynamically with ssr: false to prevent hydration errors
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);

// Define a simplified Campaign type that matches our JSON data
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
}

const OnChainCampaignsPage: NextPage = () => {
  const wallet = useWallet();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  // Prevent hydration errors by only rendering after component mount
  useEffect(() => {
    setIsMounted(true);
    
    // Initialize platform data
    initializePlatformData().then(success => {
      if (success) {
        console.log('Platform data initialized successfully');
      } else {
        console.error('Failed to initialize platform data');
      }
    });
  }, []);

  // Load campaigns from the blockchain
  useEffect(() => {
    if (!isMounted) return;
    
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        toast.loading('Loading campaigns from blockchain...', { id: 'load-campaigns' });
        
        // Fetch campaigns from the blockchain using the utility function
        const blockchainCampaigns = await getAllCampaigns();
        
        // Transform the data to match our Campaign interface and filter out non-deployed campaigns
        const formattedCampaigns = blockchainCampaigns
          .filter((campaign: any) => {
            // Only include campaigns with a valid public key/address and transaction signature
            // This helps filter out campaigns that may not be properly deployed on chain
            return (campaign.publicKey || campaign.address) && 
              // Additional verification could be added here if there are other indicators of on-chain deployment
              (campaign.verified !== false); // Filter out campaigns explicitly marked as not verified
          })
          .map((campaign: any) => ({
            address: campaign.address || campaign.publicKey || '',
            name: campaign.name || '',
            description: campaign.description || '',
            targetAmount: campaign.targetAmount?.toString() || '0',
            currentAmount: parseFloat(campaign.currentAmount?.toString() || '0'),
            creator: campaign.creator?.toString() || '',
            endDate: campaign.endDate?.toString() || '',
            imageUrl: campaign.imageUrl || 'https://via.placeholder.com/300',
            category: campaign.category || '',
            donorsCount: parseInt(campaign.donorsCount?.toString() || '0')
          }));
        
        setCampaigns(formattedCampaigns);
        setLoading(false);
        toast.success('Campaigns loaded successfully!', { id: 'load-campaigns' });
      } catch (err) {
        console.error('Error loading campaigns from blockchain:', err);
        setError(err instanceof Error ? err : new Error('Failed to load campaigns'));
        setLoading(false);
        toast.error('Failed to load campaigns from blockchain', { id: 'load-campaigns' });
      }
    };
    
    fetchCampaigns();
  }, [isMounted]);

  // Function to handle creating a new campaign - will redirect to create form
  const handleCreateCampaign = () => {
    window.location.href = '/create-campaign-v2';
  };

  // Function to handle donation - redirect to donation page with campaign ID
  const handleDonate = (campaignAddress: string) => {
    window.location.href = `/donate-v2/${campaignAddress}`;
  };

  // Don't render until component has mounted on the client
  if (!isMounted) {
    return null;
  }

  return (
    <>
      <Head>
        <title>Campaigns - LAKKHI Crowdfunding</title>
        <meta name="description" content="View and donate to blockchain-based crowdfunding campaigns" />
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Campaigns</h1>
          {wallet.connected && (
            <button
              onClick={handleCreateCampaign}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
            >
              Create Campaign
            </button>
          )}
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p>Error loading campaigns: {error.message}</p>
            <p className="mt-2">Please try again later.</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">No Campaigns Found</h2>
            <p className="text-gray-600 mb-6">There are no active campaigns at the moment.</p>
            {wallet.connected && (
              <button
                onClick={handleCreateCampaign}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
              >
                Create the First Campaign
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => {
              const endDate = new Date(parseInt(campaign.endDate) * 1000);
              const now = new Date();
              const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              
              // Convert amounts from LAKKHI to USD
              const currentAmountUsd = lakkhiToUsd(campaign.currentAmount || 0);
              const targetAmountUsd = lakkhiToUsd(parseFloat(campaign.targetAmount));
              const progressPercentage = parseFloat(campaign.targetAmount) > 0 
                ? Math.min(((campaign.currentAmount || 0) / parseFloat(campaign.targetAmount)) * 100, 100)
                : 0;

              return (
                <div key={campaign.address} className="flex flex-col h-full bg-white rounded-lg shadow-md overflow-hidden transition-transform hover:scale-[1.01] hover:shadow-lg">
                  <div className="h-48 overflow-hidden">
                    <img
                      src={campaign.imageUrl}
                      alt={campaign.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/600x400?text=No+Image';
                      }}
                    />
                  </div>
                  
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-bold text-gray-900 hover:text-indigo-600 truncate">{campaign.name}</h3>
                      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                        {campaign.category}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-4 line-clamp-2">{campaign.description}</p>
                    
                    <div className="mt-auto">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className="font-medium text-gray-700">
                          {formatUsd(currentAmountUsd)} of {formatUsd(targetAmountUsd)}
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                        <div
                          className="bg-indigo-600 h-2.5 rounded-full"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between text-sm text-gray-500 mb-4">
                        <div>
                          <span className="font-medium">{campaign.donorsCount || 0}</span> donors
                        </div>
                        <div>
                          <span className="font-medium">{daysLeft < 0 ? 0 : daysLeft}</span> days left
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => router.push(`/campaign-v2/${campaign.address}`)}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => router.push(`/donate-v2/${campaign.address}`)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors"
                        >
                          Donate
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default OnChainCampaignsPage; 