import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { createCampaign } from '@/utils/anchor-client';
import { usdToSOL } from '@/services/price-service';

// Import WalletMultiButton dynamically with ssr: false to prevent hydration errors
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);

const CreateCampaignForm: React.FC = () => {
  const wallet = useWallet();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetAmount: '',
    endDate: '',
    imageUrl: '',
    category: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wallet.connected || !wallet.publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Basic validation
      if (!formData.name || !formData.description || !formData.targetAmount || !formData.endDate) {
        toast.error('Please fill in all required fields');
        setIsSubmitting(false);
        return;
      }

      const targetAmountUSD = parseFloat(formData.targetAmount);
      if (isNaN(targetAmountUSD) || targetAmountUSD <= 0) {
        toast.error('Please enter a valid target amount');
        setIsSubmitting(false);
        return;
      }

      const endDate = new Date(formData.endDate);
      if (endDate <= new Date()) {
        toast.error('End date must be in the future');
        setIsSubmitting(false);
        return;
      }

      // Convert USD to SOL
      const targetAmountSOL = await usdToSOL(targetAmountUSD);

      // Create campaign
      toast.loading('Creating campaign...', { id: 'create' });
      const campaignPublicKey = await createCampaign(
        formData.name,
        formData.description,
        Number(targetAmountSOL), // Convert BN to number
        endDate,
        formData.imageUrl || 'https://via.placeholder.com/400x200?text=Campaign',
        formData.category || 'General',
        wallet,
        []
      );

      toast.success('Campaign created successfully!', { id: 'create' });
      
      // Redirect to the new campaign page
      router.push(`/campaign/${campaignPublicKey}`);
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign. Please try again.', { id: 'create' });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Create a New Fundraising Campaign</h1>
      
      {!wallet.connected ? (
        <div className="text-center py-6">
          <p className="mb-4">Please connect your wallet to create a campaign</p>
          <WalletMultiButton className="btn btn-primary" />
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
              Campaign Name*
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="input w-full"
              placeholder="Enter campaign name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="description" className="block text-gray-700 font-medium mb-2">
              Description*
            </label>
            <textarea
              id="description"
              name="description"
              className="input w-full h-32"
              placeholder="Describe your campaign"
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="targetAmount" className="block text-gray-700 font-medium mb-2">
                Target Amount (USD)*
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <span className="text-gray-500">$</span>
                </div>
                <input
                  type="number"
                  id="targetAmount"
                  name="targetAmount"
                  className="input w-full pl-8"
                  placeholder="Amount in USD"
                  min="10"
                  step="1"
                  value={formData.targetAmount}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="endDate" className="block text-gray-700 font-medium mb-2">
                End Date*
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                className="input w-full"
                min={new Date().toISOString().split('T')[0]}
                value={formData.endDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="imageUrl" className="block text-gray-700 font-medium mb-2">
              Campaign Image URL
            </label>
            <input
              type="url"
              id="imageUrl"
              name="imageUrl"
              className="input w-full"
              placeholder="https://example.com/image.jpg"
              value={formData.imageUrl}
              onChange={handleChange}
            />
            <p className="text-sm text-gray-500 mt-1">
              Leave blank to use a default image
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="btn btn-primary px-6"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CreateCampaignForm; 