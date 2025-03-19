import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';

interface CampaignCardProps {
  campaign: {
    pubkey: string;
    name: string;
    description: string;
    amountDonated: number;
    targetAmount: number;
    endDate: Date;
    imageUrl: string;
    active: boolean;
  };
}

const CampaignCard: React.FC<CampaignCardProps> = ({ campaign }) => {
  const progress = (campaign.amountDonated / campaign.targetAmount) * 100;
  const isExpired = new Date() > campaign.endDate;
  const fundingComplete = campaign.amountDonated >= campaign.targetAmount;

  return (
    <div className="card hover:shadow-lg transition-shadow duration-300">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={campaign.imageUrl || "https://via.placeholder.com/400x200?text=Campaign"} 
          alt={campaign.name}
          className="w-full h-full object-cover"
        />
        {!campaign.active && (
          <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
            <span className="text-white font-bold text-xl">CLOSED</span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="text-xl font-bold mb-2 truncate">{campaign.name}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{campaign.description}</p>
        
        <div className="mb-3">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${fundingComplete ? 'bg-green-500' : isExpired ? 'bg-red-500' : 'bg-primary'}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="font-medium">{progress.toFixed(1)}% Funded</span>
            <span>{campaign.amountDonated} / {campaign.targetAmount} SOL</span>
          </div>
        </div>
        
        <div className="flex justify-between text-sm text-gray-500 mb-4">
          <span>Ends: {format(campaign.endDate, 'MMM dd, yyyy')}</span>
          <span className={`font-medium ${isExpired ? 'text-red-500' : 'text-green-500'}`}>
            {isExpired ? 'Expired' : 'Active'}
          </span>
        </div>

        <Link href={`/campaign/${campaign.pubkey}`}>
          <a className="btn btn-primary w-full text-center">View Campaign</a>
        </Link>
      </div>
    </div>
  );
};

export default CampaignCard; 