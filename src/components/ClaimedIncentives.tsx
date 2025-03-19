import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { IncentiveTier } from '@/utils/anchor-client';

interface ClaimedIncentivesProps {
  campaignId: string;
  incentives: IncentiveTier[];
}

const ClaimedIncentives: React.FC<ClaimedIncentivesProps> = ({ campaignId, incentives }) => {
  const wallet = useWallet();
  const [claimedIncentives, setClaimedIncentives] = useState<IncentiveTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wallet.connected || !wallet.publicKey || !incentives || incentives.length === 0) {
      setClaimedIncentives([]);
      setLoading(false);
      return;
    }

    const fetchClaimedIncentives = async () => {
      try {
        setLoading(true);
        
        // In a real implementation, we would fetch the user's donations from the API
        // and check which incentives they've claimed
        // For now, we'll simulate this with a mock implementation
        
        // Mock implementation - in a real app, this would be an API call
        const mockDonations = JSON.parse(localStorage.getItem('mockDonations') || '[]');
        const userDonations = mockDonations.filter(
          (d: any) => d.campaignId === campaignId && d.walletAddress === wallet.publicKey?.toString()
        );
        
        // Get the incentive IDs from the user's donations
        const claimedIncentiveIds = userDonations
          .filter((d: any) => d.incentiveId)
          .map((d: any) => d.incentiveId);
        
        // Find the incentives that match the claimed IDs
        const claimed = incentives.filter(inc => claimedIncentiveIds.includes(inc.id));
        
        setClaimedIncentives(claimed);
      } catch (error) {
        console.error('Error fetching claimed incentives:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClaimedIncentives();
  }, [campaignId, incentives, wallet.connected, wallet.publicKey]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading your rewards...</div>;
  }

  if (!wallet.connected) {
    return null;
  }

  if (claimedIncentives.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 mb-4">
      <h3 className="text-lg font-semibold mb-3">Your Claimed Rewards</h3>
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-sm text-green-800 mb-3">
          You've claimed the following rewards for this campaign:
        </p>
        <ul className="space-y-2">
          {claimedIncentives.map(incentive => (
            <li key={incentive.id} className="flex items-start">
              <svg 
                className="h-5 w-5 text-green-600 mr-2 mt-0.5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <div>
                <span className="font-medium">{incentive.name}</span>
                <p className="text-sm text-gray-600">{incentive.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ClaimedIncentives; 