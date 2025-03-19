import { PublicKey } from '@solana/web3.js';
import { BN } from '@project-serum/anchor';

/**
 * Creates a test campaign in localStorage for development purposes
 * @param name Campaign name
 * @param description Campaign description
 * @param targetAmount Target amount in LAKKHI
 * @param days Number of days until campaign ends
 * @param imageUrl Optional image URL
 * @param category Optional category
 * @returns The ID of the created campaign
 */
export const createTestCampaign = (
  name: string,
  description: string,
  targetAmount: number,
  days: number = 30,
  imageUrl: string = '',
  category: string = 'Other'
): string => {
  if (typeof window === 'undefined') {
    console.error('createTestCampaign can only be used in browser environment');
    return '';
  }
  
  // Generate a unique campaign ID
  const timestamp = Date.now();
  const randomValue = Math.floor(Math.random() * 100000);
  const campaignId = `${timestamp}-${randomValue}`;
  
  // Create a random pubkey-like string if needed
  const randomPublicKey = '11111111111111111111111111111111';
  
  // Create the campaign
  const campaign = {
    pubkey: campaignId,
    creator: randomPublicKey,
    name,
    description,
    imageUrl: imageUrl || 'https://via.placeholder.com/800x400?text=Campaign+Image',
    category,
    targetAmount: (targetAmount * 1e9).toString(),
    currentAmount: '0',
    endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    donorsCount: '0',
    updatesCount: '0'
  };
  
  // Save to localStorage
  const existingCampaigns = JSON.parse(localStorage.getItem('mockCampaigns') || '[]');
  existingCampaigns.push(campaign);
  localStorage.setItem('mockCampaigns', JSON.stringify(existingCampaigns));
  
  console.log('Created test campaign:', campaign);
  return campaignId;
}; 