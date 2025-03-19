import { useEffect, useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { useCampaigns, useAnchorClient, Campaign } from '@/utils/anchor-client';
import { PublicKey } from '@solana/web3.js';
import { formatDistanceToNow } from 'date-fns';
import { BN } from '@project-serum/anchor';
import { isAdmin } from '@/utils/admin-auth';
import toast from 'react-hot-toast';

// Import WalletMultiButton dynamically with ssr: false to prevent hydration errors
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);

// Helper function to format a Solana address
const formatAddress = (address: string): string => {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

const AdminDashboard: NextPage = () => {
  const router = useRouter();
  const wallet = useWallet();
  const { campaigns, loading, error, setCampaigns } = useCampaigns();
  const { program } = useAnchorClient();
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isDeleting, setIsDeleting] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);
  
  // Check if the connected wallet is authorized
  useEffect(() => {
    setIsAuthorized(isAdmin(wallet.publicKey));
  }, [wallet.publicKey]);
  
  // Filtered campaigns based on search and status
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = (
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.pubkey.toString().includes(searchTerm.toLowerCase())
    );
    
    const matchesStatus = selectedStatus === 'all' ||
      (selectedStatus === 'active' && campaign.isActive) ||
      (selectedStatus === 'ended' && !campaign.isActive);
    
    return matchesSearch && matchesStatus;
  });

  // Handle campaign deletion
  const handleDeleteCampaign = async (campaignPubkey: string) => {
    if (!program || !wallet.publicKey) {
      toast.error('Wallet not connected');
      return;
    }
    
    try {
      setIsDeleting(true);
      setCampaignToDelete(campaignPubkey);
      toast.loading('Deleting campaign...', { id: 'delete-campaign' });
      
      // In a real app, you would call a program instruction to delete the campaign
      // This is just a mock implementation for demonstration
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Campaign deleted successfully!', { id: 'delete-campaign' });
      
      // Refresh the campaigns list
      // In a real app, this would be after confirmation from the blockchain
      setCampaigns((prevCampaigns: Campaign[]) => 
        prevCampaigns.filter((c: Campaign) => c.pubkey.toString() !== campaignPubkey)
      );
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign', { id: 'delete-campaign' });
    } finally {
      setIsDeleting(false);
      setCampaignToDelete(null);
    }
  };
  
  // Format the progress percentage
  const formatProgress = (current: BN, target: BN) => {
    if (!target || typeof target.toNumber !== 'function') return 0;
    const targetNum = target.toNumber();
    if (targetNum === 0) return 0;
    
    const currentNum = current && typeof current.toNumber === 'function' ? current.toNumber() : 0;
    return Math.min(100, (currentNum / targetNum) * 100);
  };
  
  // Debug: Check localStorage campaigns
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCampaigns = localStorage.getItem('mockCampaigns');
      console.log('Stored campaigns in localStorage:', storedCampaigns);
      if (storedCampaigns) {
        try {
          const parsed = JSON.parse(storedCampaigns);
          console.log('Parsed campaigns:', parsed);
          console.log('Campaign IDs:', parsed.map((c: any) => c.pubkey));
        } catch (e) {
          console.error('Error parsing stored campaigns:', e);
        }
      }
    }
  }, []);
  
  if (!wallet.connected) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        <p className="text-gray-600 mb-8">Please connect your wallet to access the admin dashboard</p>
        <div className="flex justify-center">
          <WalletMultiButton />
        </div>
      </div>
    );
  }
  
  if (!isAuthorized) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
        <p className="text-gray-600 mb-8">You do not have permission to access the admin dashboard.</p>
        <p className="text-sm text-gray-500 mb-4">Connected wallet: {wallet.publicKey?.toString()}</p>
        <div className="flex justify-center">
          <Link href="/" passHref>
            <button className="bg-indigo-600 text-white font-medium py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              Return to Home
            </button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Head>
        <title>Admin Dashboard - Lakkhi Fundraising Platform</title>
        <meta name="description" content="Admin dashboard for managing fundraising campaigns" />
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Campaign Management</h1>
          <Link href="/admin/campaigns/create" passHref>
            <button className="btn btn-primary">
              Create Campaign
            </button>
          </Link>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search campaigns..."
                className="input w-full"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <select
                className="select select-bordered"
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
              >
                <option value="all">All Campaigns</option>
                <option value="active">Active Campaigns</option>
                <option value="ended">Ended Campaigns</option>
              </select>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mt-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error loading campaigns
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    {error.toString().includes('403') || error.toString().includes('Access forbidden') ? 
                      "Access to blockchain data is restricted. This could be due to network limitations or RPC endpoint restrictions." :
                      error.toString()
                    }
                  </p>
                  <p className="mt-2">
                    <button 
                      onClick={() => window.location.reload()} 
                      className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      Try again
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="bg-gray-50 p-8 rounded-lg text-center">
            <h3 className="text-xl font-medium mb-2">No campaigns found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedStatus !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Click "Create Campaign" to add your first campaign'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-white shadow-md rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-4">Campaign</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Progress</th>
                  <th className="text-left p-4">Creator</th>
                  <th className="text-left p-4">End Date</th>
                  <th className="text-center p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map(campaign => (
                  <tr key={campaign.pubkey.toString()} className="border-t border-gray-200">
                    <td className="p-4">
                      <div>
                        <h3 className="font-medium">{campaign.name}</h3>
                        <p className="text-sm text-gray-500 truncate max-w-xs">{campaign.description}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      {campaign.isActive ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                          Ended
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-indigo-600 rounded-full" 
                              style={{ width: `${formatProgress(campaign.currentAmount, campaign.targetAmount)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm whitespace-nowrap">
                            {campaign.currentAmount.toString()}/{campaign.targetAmount.toString()} LAKKHI
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">
                        {formatAddress(campaign.creator.toString())}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">
                        {formatDistanceToNow(campaign.endDate, { addSuffix: true })}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center space-x-2">
                        <Link 
                          href={`/admin/campaigns/${campaign.pubkey.toString()}`}
                          passHref
                        >
                          <button className="btn btn-sm bg-blue-600 hover:bg-blue-700 text-white">
                            View
                          </button>
                        </Link>
                        <Link 
                          href={`/admin/campaigns/${campaign.pubkey.toString()}/edit`}
                          passHref
                        >
                          <button className="btn btn-sm bg-yellow-600 hover:bg-yellow-700 text-white">
                            Edit
                          </button>
                        </Link>
                        <Link 
                          href={`/campaigns/${campaign.pubkey.toString()}`}
                          passHref
                          target="_blank"
                        >
                          <button className="btn btn-sm bg-green-600 hover:bg-green-700 text-white">
                            Public
                          </button>
                        </Link>
                        <button 
                          className="btn btn-sm bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => handleDeleteCampaign(campaign.pubkey.toString())}
                          disabled={isDeleting && campaignToDelete === campaign.pubkey.toString()}
                        >
                          {isDeleting && campaignToDelete === campaign.pubkey.toString() ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminDashboard; 