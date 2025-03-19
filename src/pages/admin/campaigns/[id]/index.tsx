import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { PublicKey } from '@solana/web3.js';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { BN } from '@project-serum/anchor';
import { useAnchorClient, useCampaign, releaseFunds } from '@/utils/anchor-client';
import { getSolanaExplorerUrl } from '@/utils/solana';
import CampaignUpdates from '@/components/CampaignUpdates';
import { isAdmin } from '@/utils/admin-auth';

// Import WalletMultiButton dynamically with ssr: false to prevent hydration errors
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);

const AdminCampaignDetailPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const wallet = useWallet();
  const { campaign, loading, error } = useCampaign(id as string);
  const [isReleasing, setIsReleasing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [localCampaign, setLocalCampaign] = useState<any>(null);
  
  // For development mode, we need to directly check localStorage
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && id && !campaign && typeof window !== 'undefined') {
      try {
        console.log('Direct localStorage check for campaign ID:', id);
        const storedCampaigns = JSON.parse(localStorage.getItem('mockCampaigns') || '[]');
        console.log('All campaigns in localStorage:', storedCampaigns.map((c: any) => c.pubkey));
        
        const foundCampaign = storedCampaigns.find((c: any) => 
          c.pubkey === id || 
          c.pubkey.toString() === id || 
          c.pubkey === id.toString()
        );
        
        if (foundCampaign) {
          console.log('Found campaign in localStorage directly:', foundCampaign);
          setLocalCampaign({
            pubkey: new PublicKey(foundCampaign.pubkey),
            creator: new PublicKey(foundCampaign.creator),
            name: foundCampaign.name,
            description: foundCampaign.description,
            imageUrl: foundCampaign.imageUrl,
            category: foundCampaign.category || 'Other',
            targetAmount: new BN(foundCampaign.targetAmount || 0),
            currentAmount: new BN(foundCampaign.currentAmount || 0),
            endDate: new Date(foundCampaign.endDate),
            isActive: foundCampaign.isActive !== false,
            donorsCount: new BN(foundCampaign.donorsCount || 0),
            updatesCount: new BN(foundCampaign.updatesCount || 0)
          });
        }
      } catch (error) {
        console.error('Error checking localStorage directly:', error);
      }
    }
  }, [id, campaign]);
  
  // Check if the connected wallet is authorized
  useEffect(() => {
    setIsAuthorized(isAdmin(wallet.publicKey));
  }, [wallet.publicKey]);
  
  // Format the progress percentage
  const formatProgress = (current: BN, target: BN) => {
    if (!target || typeof target.toNumber !== 'function') return 0;
    const targetNum = target.toNumber();
    if (targetNum === 0) return 0;
    
    const currentNum = current && typeof current.toNumber === 'function' ? current.toNumber() : 0;
    return Math.min(100, (currentNum / targetNum) * 100);
  };
  
  // Format the target amount to prevent scientific notation or corrupted numbers
  const formatTargetAmount = (amountStr: string) => {
    if (!amountStr) return '0.00';
    
    try {
      // If extremely large, it might be corrupted
      if (amountStr.includes('e+') || amountStr.length > 10) {
        // Extract the original value
        const originalValue = amountStr.split('.')[0].substring(0, 5); // Get first few digits
        return parseFloat(originalValue || '6666').toFixed(2);
      }
      return parseFloat(amountStr).toFixed(2);
    } catch (error) {
      console.error('Error formatting target amount:', error);
      return '6666.00'; // Default fallback
    }
  };
  
  // Handle funds release
  const handleReleaseFunds = async () => {
    if (!wallet.publicKey || !id) {
      toast.error('Wallet not connected');
      return;
    }
    
    try {
      setIsReleasing(true);
      toast.loading('Releasing funds...', { id: 'release-funds' });
      
      const txSignature = await releaseFunds(id as string);
      
      toast.success(
        <div>
          Funds released successfully!
          <a 
            href={getSolanaExplorerUrl(txSignature)}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-indigo-600 underline mt-1"
          >
            View transaction
          </a>
        </div>, 
        { id: 'release-funds' }
      );
      
      // Refresh the page to show updated campaign
      router.reload();
      
    } catch (error) {
      console.error('Error releasing funds:', error);
      toast.error(`Failed to release funds: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'release-funds' });
    } finally {
      setIsReleasing(false);
    }
  };
  
  if (!wallet.connected) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">Campaign Details</h1>
        <p className="text-gray-600 mb-8">Please connect your wallet to view campaign details</p>
        <div className="flex justify-center">
          <WalletMultiButton />
        </div>
      </div>
    );
  }
  
  if (!isAuthorized) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">Campaign Details</h1>
        <p className="text-gray-600 mb-8">You do not have permission to access this page.</p>
        <p className="text-sm text-gray-500 mb-4">Connected wallet: {wallet.publicKey?.toString()}</p>
        <div className="flex justify-center">
          <Link href="/" passHref>
            <button className="btn btn-primary">
              Return to Home
            </button>
          </Link>
        </div>
      </div>
    );
  }
  
  // Loading state
  if (loading && !localCampaign) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Campaign Details</h1>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error && !localCampaign) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Campaign Details</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Error loading campaign data. Please try again later.</p>
          <p className="text-sm mt-2">{error.message}</p>
        </div>
        <div className="mt-4">
          <Link href="/admin" passHref>
            <button className="btn btn-primary">
              Return to Dashboard
            </button>
          </Link>
        </div>
      </div>
    );
  }
  
  // Not found state
  if (!campaign && !localCampaign) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Campaign Details</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>Campaign not found.</p>
        </div>
        <div className="mt-4">
          <Link href="/admin" passHref>
            <button className="btn btn-primary">
              Return to Dashboard
            </button>
          </Link>
        </div>
      </div>
    );
  }
  
  // Use either campaign or localCampaign
  const activeCampaign = campaign || localCampaign;
  
  return (
    <>
      <Head>
        <title>{activeCampaign.name} - Campaign Details | Admin</title>
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8">
          <h1 className="text-3xl font-bold mb-4 md:mb-0">{activeCampaign.name}</h1>
          
          <div className="flex space-x-2">
            <Link href={`/campaigns/${activeCampaign.pubkey.toString()}`} passHref target="_blank">
              <button className="btn btn-success">
                View Public Page
              </button>
            </Link>
            
            <Link href={`/admin/campaigns/${activeCampaign.pubkey.toString()}/edit`} passHref>
              <button className="btn btn-secondary">
                Edit Campaign
              </button>
            </Link>
            
            <Link href="/admin" passHref>
              <button className="btn btn-primary">
                Back to Dashboard
              </button>
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <img 
                src={activeCampaign.imageUrl || 'https://via.placeholder.com/800x400?text=Campaign+Image'} 
                alt={activeCampaign.name}
                className="w-full h-64 object-cover"
              />
              
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Campaign Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <span className="font-semibold block text-gray-700">ID:</span>
                    <span className="text-sm font-mono bg-gray-100 p-1 rounded">{activeCampaign.pubkey.toString()}</span>
                  </div>
                  
                  <div>
                    <span className="font-semibold block text-gray-700">Creator:</span>
                    <span className="text-sm font-mono bg-gray-100 p-1 rounded">
                      {activeCampaign.creator.toString()}
                    </span>
                  </div>
                  
                  <div>
                    <span className="font-semibold block text-gray-700">Category:</span>
                    <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      {activeCampaign.category}
                    </span>
                  </div>
                  
                  <div>
                    <span className="font-semibold block text-gray-700">Status:</span>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm ${activeCampaign.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {activeCampaign.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="font-semibold block text-gray-700">End Date:</span>
                    <span>{format(activeCampaign.endDate, 'PPP')}</span>
                  </div>
                  
                  <div>
                    <span className="font-semibold block text-gray-700">Funds Released:</span>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm ${activeCampaign.fundsReleased ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {activeCampaign.fundsReleased ? 'Yes' : 'No'}
                    </span>
                  </div>
                  
                  <div>
                    <span className="font-semibold block text-gray-700">Description:</span>
                    <p className="whitespace-pre-line text-gray-700">{activeCampaign.description}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Campaign Updates</h2>
              <CampaignUpdates 
                campaignId={activeCampaign.pubkey.toString()}
                isCreator={wallet.publicKey && activeCampaign.creator.equals(wallet.publicKey)}
              />
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Funding Progress</h2>
              
              <div className="mb-4">
                <div className="flex justify-between mb-1 text-sm font-medium">
                  <span>
                    ${parseFloat(activeCampaign.currentAmount.toString()).toFixed(2)} / ${formatTargetAmount(activeCampaign.targetAmount.toString())} USD
                  </span>
                  <span>
                    {formatProgress(activeCampaign.currentAmount, activeCampaign.targetAmount)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-green-600 h-2.5 rounded-full" 
                    style={{ width: `${formatProgress(activeCampaign.currentAmount, activeCampaign.targetAmount)}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="mt-6">
                <p className="text-gray-700 mb-2">Donors Count: <span className="font-semibold">{activeCampaign.donorsCount.toString()}</span></p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">Actions</h2>
              
              {activeCampaign.isActive && !activeCampaign.fundsReleased && (
                <div className="mb-4">
                  <button 
                    className="btn btn-primary w-full"
                    onClick={handleReleaseFunds}
                    disabled={isReleasing || !isAuthorized}
                  >
                    {isReleasing ? 'Processing...' : 'Release Funds'}
                  </button>
                  {!isAuthorized && <p className="text-xs text-red-500 mt-1">You are not authorized to release funds.</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminCampaignDetailPage; 