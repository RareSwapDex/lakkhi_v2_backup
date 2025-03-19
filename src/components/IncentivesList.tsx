import React from 'react';
import { IncentiveTier } from '@/utils/anchor-client';

interface IncentivesListProps {
  incentives: IncentiveTier[];
  donationAmount: string;
  setDonationAmount: (amount: string) => void;
}

const IncentivesList: React.FC<IncentivesListProps> = ({ 
  incentives, 
  donationAmount,
  setDonationAmount
}) => {
  if (!incentives || incentives.length === 0) {
    return null;
  }

  // Sort incentives by minimum amount (ascending)
  const sortedIncentives = [...incentives].sort((a, b) => 
    parseFloat(a.minAmount) - parseFloat(b.minAmount)
  );

  const handleSelectIncentive = (minAmount: string) => {
    setDonationAmount(minAmount);
  };

  return (
    <div className="mt-6 mb-8">
      <h3 className="text-lg font-semibold mb-3">Donation Incentives</h3>
      <p className="text-sm text-gray-600 mb-4">
        Support this campaign and receive special rewards based on your contribution level.
      </p>
      
      <div className="space-y-4">
        {sortedIncentives.map((incentive) => {
          const minAmount = parseFloat(incentive.minAmount);
          const maxSlots = parseInt(incentive.maxSlots);
          const remainingSlots = maxSlots - incentive.claimedSlots;
          const isAvailable = maxSlots === 0 || remainingSlots > 0;
          const isSelected = parseFloat(donationAmount) >= minAmount;
          
          return (
            <div 
              key={incentive.id}
              className={`border rounded-lg p-4 transition-all ${
                isSelected 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-200 hover:border-indigo-300'
              } ${!isAvailable ? 'opacity-60' : ''}`}
              onClick={() => isAvailable && handleSelectIncentive(incentive.minAmount)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">{incentive.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{incentive.description}</p>
                  
                  <div className="mt-2 flex items-center">
                    <span className="text-indigo-600 font-medium">${incentive.minAmount}+</span>
                    {maxSlots > 0 && (
                      <span className="ml-3 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {remainingSlots} of {maxSlots} remaining
                      </span>
                    )}
                  </div>
                </div>
                
                <button
                  type="button"
                  className={`px-3 py-1 rounded text-sm ${
                    isSelected 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${!isAvailable ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isAvailable) handleSelectIncentive(incentive.minAmount);
                  }}
                  disabled={!isAvailable}
                >
                  {isSelected ? 'Selected' : 'Select'}
                </button>
              </div>
              
              {!isAvailable && (
                <div className="mt-2 text-xs text-red-600">
                  All slots for this incentive have been claimed
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IncentivesList; 