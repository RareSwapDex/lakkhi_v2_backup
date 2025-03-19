import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { PublicKey } from '@solana/web3.js';
import { getAllCampaigns } from '@/utils/anchor-client';
import { toast } from 'react-hot-toast';

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

  // Prevent hydration errors by only rendering after component mount
  useEffect(() => {
    setIsMounted(true);
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
        
        // Transform the data to match our Campaign interface
        const formattedCampaigns = blockchainCampaigns.map((campaign: any) => ({
          address: campaign.address || '',
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
        
        // Fall back to local JSON if blockchain fetch fails
        try {
          // Dynamic import of campaigns.json as fallback
          const { default: campaignsData } = await import('../campaigns.json');
          
          const loadedCampaigns = campaignsData.map(campaign => ({
            address: campaign.address,
            name: campaign.name,
            description: campaign.description,
            targetAmount: campaign.targetAmount,
            currentAmount: 0,
            creator: campaign.creator,
            endDate: campaign.endDate,
            imageUrl: campaign.imageUrl || 'https://via.placeholder.com/300',
            category: campaign.category,
            donorsCount: 0
          }));
          
          setCampaigns(loadedCampaigns);
          toast.success('Loaded campaigns from local cache', { id: 'load-campaigns' });
        } catch (jsonErr) {
          console.error('Error loading fallback campaigns:', jsonErr);
          toast.error('Failed to load campaigns from any source', { id: 'load-campaigns' });
        }
      }
    };
    
    fetchCampaigns();
  }, [isMounted]);

  // Function to handle creating a new campaign - will redirect to create form
  const handleCreateCampaign = () => {
    window.location.href = '/create-campaign';
  };

  // Function to handle donation - redirect to donation page with campaign ID
  const handleDonate = (campaignAddress: string) => {
    window.location.href = `/donate/${campaignAddress}`;
  };

  // Don't render until component has mounted on the client
  if (!isMounted) {
    return null;
  }

  if (!wallet.connected) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">On-Chain Campaigns</h1>
        <p className="text-gray-600 mb-8">Please connect your wallet to view and interact with campaigns</p>
        <div className="flex justify-center">
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">On-Chain Campaigns</h1>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">On-Chain Campaigns</h1>
        <div className="bg-red-50 p-4 rounded-lg text-red-600 text-center mb-6">
          Error: {error.message}
        </div>
        <Link href="/" passHref>
          <button className="btn btn-primary">Back to Home</button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>On-Chain Campaigns | LAKKHI Crowdfunding</title>
        <meta name="description" content="View and interact with on-chain campaigns" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">On-Chain Campaigns</h1>
          <div className="flex space-x-3">
            <button
              className="btn bg-green-600 hover:bg-green-700 text-white"
              onClick={handleCreateCampaign}
            >
              Create Campaign
            </button>
            <button className="btn border border-gray-300 text-gray-700">
              <Link href="/">Back to Home</Link>
            </button>
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <p className="text-blue-700">
            <span className="font-bold">Connected Wallet:</span> {wallet.publicKey?.toString()}
          </p>
        </div>

        {campaigns.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <p className="text-gray-600 mb-4">No campaigns found.</p>
            <button
              className="btn bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={handleCreateCampaign}
            >
              Create Your First Campaign
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <div key={campaign.address} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="h-40 bg-gray-200 relative">
                  {campaign.imageUrl ? (
                    <img 
                      src={campaign.imageUrl} 
                      alt={campaign.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "https://via.placeholder.com/300x150?text=No+Image";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <span className="text-gray-400">No Image</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {campaign.category}
                  </div>
                </div>
                <div className="p-4">
                  <h2 className="text-xl font-bold mb-2 text-gray-800">{campaign.name}</h2>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{campaign.description}</p>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(((campaign.currentAmount || 0) / parseFloat(campaign.targetAmount)) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-indigo-600 h-2.5 rounded-full" 
                        style={{ width: `${Math.min(100, Math.round(((campaign.currentAmount || 0) / parseFloat(campaign.targetAmount)) * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Raised</p>
                      <p className="font-bold text-gray-800">{campaign.currentAmount || 0} LAKKHI</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Target</p>
                      <p className="font-bold text-gray-800">{campaign.targetAmount} LAKKHI</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Donors</p>
                      <p className="font-bold text-gray-800">{campaign.donorsCount || 0}</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                      Ends on {new Date(parseInt(campaign.endDate) * 1000).toLocaleDateString()}
                    </p>
                    <button 
                      className="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => handleDonate(campaign.address)}
                    >
                      Donate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default OnChainCampaignsPage; 