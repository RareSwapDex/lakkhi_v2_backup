import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useCampaigns, Campaign } from '@/utils/anchor-client';
import Layout from '@/components/Layout';

export default function CampaignsPage() {
  const { campaigns, loading, error } = useCampaigns();
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [filter, setFilter] = useState('all');
  
  useEffect(() => {
    if (!campaigns) return;
    
    let filtered = [...campaigns];
    
    // Apply category filter
    if (filter !== 'all') {
      filtered = filtered.filter(c => c.category.toLowerCase() === filter.toLowerCase());
    }
    
    setFilteredCampaigns(filtered);
  }, [campaigns, filter]);
  
  return (
    <Layout>
      <Head>
        <title>Explore Campaigns | Lakkhi Fundraising</title>
        <meta name="description" content="Explore fundraising campaigns on Lakkhi" />
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Explore Campaigns</h1>
          <Link 
            href="/campaigns/create" 
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Create Campaign
          </Link>
        </div>
        
        {/* Simple category filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            <button 
              className={`px-3 py-1 rounded-lg ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button 
              className={`px-3 py-1 rounded-lg ${filter === 'education' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
              onClick={() => setFilter('education')}
            >
              Education
            </button>
            <button 
              className={`px-3 py-1 rounded-lg ${filter === 'health' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
              onClick={() => setFilter('health')}
            >
              Health
            </button>
            <button 
              className={`px-3 py-1 rounded-lg ${filter === 'environment' ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
              onClick={() => setFilter('environment')}
            >
              Environment
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent"></div>
            <p className="mt-4 text-gray-600">Loading campaigns...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <p>Error loading campaigns: {error.message}</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-medium text-gray-700 mb-2">No campaigns found</h2>
            <p className="text-gray-500 mb-6">Be the first to create a fundraising campaign!</p>
            <Link 
              href="/campaigns/create" 
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Create Campaign
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => (
              <div 
                key={campaign.pubkey.toString()}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <Link href={`/campaigns/${campaign.pubkey.toString()}`}>
                  <div className="h-48 overflow-hidden">
                    <img
                      src={campaign.imageUrl || 'https://via.placeholder.com/600x400?text=No+Image'}
                      alt={campaign.name}
                      className="w-full h-full object-cover transition-transform hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h2 className="text-xl font-semibold mb-2 text-gray-800">{campaign.name}</h2>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{campaign.description}</p>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">
                          ${campaign.currentAmount.toNumber().toFixed(2)} raised
                        </span>
                        <span className="text-gray-600">
                          {Math.floor((campaign.currentAmount.toNumber() / campaign.targetAmount.toNumber()) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full" 
                          style={{ width: `${Math.min((campaign.currentAmount.toNumber() / campaign.targetAmount.toNumber()) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>
                        {campaign.donorsCount.toNumber()} donors
                      </span>
                      <span>
                        {campaign.category || 'General'}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
} 