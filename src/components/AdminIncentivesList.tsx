import React from 'react';
import { IncentiveTier } from '@/utils/anchor-client';

interface AdminIncentivesListProps {
  incentives: IncentiveTier[];
}

const AdminIncentivesList: React.FC<AdminIncentivesListProps> = ({ incentives }) => {
  if (!incentives || incentives.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
        No incentives configured for this campaign
      </div>
    );
  }

  // Sort incentives by minimum amount (ascending)
  const sortedIncentives = [...incentives].sort((a, b) => 
    parseFloat(a.minAmount) - parseFloat(b.minAmount)
  );

  return (
    <div className="space-y-4">
      {sortedIncentives.map((incentive) => {
        const minAmount = parseFloat(incentive.minAmount);
        const maxSlots = parseInt(incentive.maxSlots);
        const remainingSlots = maxSlots - incentive.claimedSlots;
        const isAvailable = maxSlots === 0 || remainingSlots > 0;
        const claimPercentage = maxSlots > 0 ? (incentive.claimedSlots / maxSlots) * 100 : 0;
        
        return (
          <div 
            key={incentive.id}
            className="border rounded-lg overflow-hidden"
          >
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">{incentive.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{incentive.description}</p>
                  
                  <div className="mt-2 flex items-center space-x-4">
                    <span className="text-indigo-600 font-medium">${incentive.minAmount}+</span>
                    {maxSlots > 0 ? (
                      <span className="text-sm text-gray-600">
                        {incentive.claimedSlots} of {maxSlots} slots claimed
                      </span>
                    ) : (
                      <span className="text-sm text-gray-600">Unlimited slots</span>
                    )}
                  </div>
                </div>
                
                <div className={`px-2 py-1 rounded text-xs ${
                  isAvailable 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {isAvailable ? 'Available' : 'Fully Claimed'}
                </div>
              </div>
              
              {maxSlots > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{incentive.claimedSlots} claimed</span>
                    <span>{remainingSlots} remaining</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        isAvailable ? 'bg-indigo-600' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(claimPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdminIncentivesList; 