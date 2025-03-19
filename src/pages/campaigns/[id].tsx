import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { fetchCampaignById, donateToCampaign, Campaign } from '@/utils/anchor-client';
import { useWallet } from '@solana/wallet-adapter-react';
import Layout from '@/components/Layout';

export default function CampaignDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const wallet = useWallet();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (!id) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await fetchCampaignById(id.toString());
        setCampaign(result);
      } catch (err) {
        console.error('Error loading campaign:', err);
        setError(err as Error);
    } finally {
        setLoading(false);
    }
  };
  
    fetchData();
  }, [id]);
  
  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading campaign details...</p>
      </div>
      </Layout>
    );
  }
  
  if (error) {
    return (
      <Layout>
      <div className="container mx-auto px-4 py-16 text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>Error loading campaign: {error.message}</p>
          </div>
      </div>
      </Layout>
    );
  }
  
  if (!campaign) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            <p>Campaign not found.</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Calculate funding percentage
  const fundingPercentage = campaign.targetAmount && campaign.currentAmount
    ? Math.min(100, Math.round((campaign.currentAmount.toNumber() / campaign.targetAmount.toNumber()) * 100))
    : 0;
    
  // Calculate days left
  const daysLeft = campaign.endDate
    ? Math.max(0, Math.ceil((new Date(campaign.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  
  return (
    <Layout>
      <Head>
        <title>{campaign.name} | Lakkhi Fundraising</title>
        <meta name="description" content={campaign.description} />
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/2">
              <img 
                src={campaign.imageUrl || "https://via.placeholder.com/800x600?text=No+Image"} 
                  alt={campaign.name}
                className="w-full h-[400px] object-cover"
                />
              </div>
            <div className="md:w-1/2 p-6">
              <h1 className="text-3xl font-bold mb-2">{campaign.name}</h1>
              
              <div className="flex items-center mb-4">
                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                  {campaign.category}
                </span>
                <span className="ml-2 text-sm text-gray-500">
                  {daysLeft} days left
                </span>
              </div>
              
              <div className="mb-6">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-700 font-medium">
                    ${campaign.currentAmount.toNumber().toLocaleString()} raised
                  </span>
                  <span className="text-gray-600">
                    of ${campaign.targetAmount.toNumber().toLocaleString()} goal
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${fundingPercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1 text-sm">
                  <span>{campaign.donorsCount.toNumber()} donors</span>
                  <span>{fundingPercentage}% funded</span>
                </div>
              </div>
              
              <div className="flex gap-4 mb-6">
                <button
                  className={`px-4 py-2 rounded-lg text-white ${
                    wallet.connected ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
                  } flex-1`}
                  disabled={!wallet.connected}
                  onClick={() => {
                    if (wallet.connected) {
                      alert('Donate with crypto feature coming soon!');
                    }
                  }}
                >
                  Donate with Crypto
                </button>
                <button
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex-1"
                  onClick={() => {
                    alert('Card payment feature coming soon!');
                  }}
                >
                  Donate with Card
                </button>
              </div>
              
              {!wallet.connected && (
                <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm mb-4">
                  Connect your wallet to donate with cryptocurrency
                  </div>
              )}
              
              {campaign.fundsReleased && (
                <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm">
                  Funds have been released to the campaign creator
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6 border-t">
            <h2 className="text-2xl font-bold mb-4">About this campaign</h2>
            <p className="whitespace-pre-line">{campaign.description}</p>
          </div>
        </div>
      </div>
    </Layout>
  );
} 