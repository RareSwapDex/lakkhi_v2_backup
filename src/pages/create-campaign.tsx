import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { PublicKey } from '@solana/web3.js';
import toast from 'react-hot-toast';

// Import WalletMultiButton dynamically with ssr: false to prevent hydration errors
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);

const CATEGORIES = [
  'Education', 'Health', 'Environment', 'Technology', 
  'Arts', 'Community', 'Business', 'Charity', 'Other'
];

// Use client-side rendering for this entire page
const CreateCampaignPage: NextPage = () => {
  const router = useRouter();
  const wallet = useWallet();
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [campaignData, setCampaignData] = useState<any>(null);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration errors by only rendering after component mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Set default end date (30 days from now)
  useEffect(() => {
    if (!isMounted) return;
    
    const date = new Date();
    date.setDate(date.getDate() + 30);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    setEndDate(`${year}-${month}-${day}`);
  }, [isMounted]);
  
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!description.trim()) {
      errors.description = 'Description is required';
    }
    
    if (!category) {
      errors.category = 'Category is required';
    }
    
    if (!targetAmount.trim()) {
      errors.targetAmount = 'Target amount is required';
    } else {
      const amount = parseFloat(targetAmount);
      if (isNaN(amount) || amount <= 0) {
        errors.targetAmount = 'Target amount must be a positive number';
      }
    }
    
    if (!endDate) {
      errors.endDate = 'End date is required';
    } else {
      const selectedDate = new Date(endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        errors.endDate = 'End date must be in the future';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (!wallet.publicKey) {
      toast.error('Wallet not connected');
      return;
    }
    
    try {
      setIsSubmitting(true);
      toast.loading('Preparing campaign creation...', { id: 'create-campaign' });
      
      // Create campaign data object
      const campaignDataObj = {
        name,
        description,
        targetAmount: parseFloat(targetAmount),
        endDate: Math.floor(new Date(endDate).getTime() / 1000),
        imageUrl: imageUrl || 'https://via.placeholder.com/300',
        category
      };
      
      // Store campaign data for the next step
      setCampaignData(campaignDataObj);
      
      toast.success('Campaign prepared! Ready to create.', { id: 'create-campaign' });
    } catch (error) {
      console.error('Error preparing campaign:', error);
      toast.error(`Failed to prepare campaign: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'create-campaign' });
      setCampaignData(null);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const executeCampaignCreation = async () => {
    if (!campaignData) return;
    
    setIsSubmitting(true);
    toast.loading('Creating campaign on the blockchain...', { id: 'execute-campaign' });
    
    try {
      // Import the createCampaign function
      const { createCampaign } = await import('@/utils/anchor-client');
      
      // Call the actual createCampaign function with the wallet
      const campaignId = await createCampaign(
        campaignData.name,
        campaignData.description,
        campaignData.targetAmount,
        new Date(campaignData.endDate * 1000), // Convert Unix timestamp back to Date
        campaignData.imageUrl,
        campaignData.category,
        wallet
      );
      
      toast.success(`Campaign created successfully! ID: ${campaignId}`, { id: 'execute-campaign' });
      
      // Redirect to campaigns page after successful creation
      setTimeout(() => {
        router.push('/on-chain-campaigns');
      }, 2000);
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error(`Failed to create campaign: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'execute-campaign' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render until component has mounted on the client
  if (!isMounted) {
    return null;
  }
  
  if (!wallet.connected) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">Create Campaign</h1>
        <p className="text-gray-600 mb-8">Please connect your wallet to create a campaign</p>
        <div className="flex justify-center">
          <WalletMultiButton />
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Head>
        <title>Create Campaign - LAKKHI Crowdfunding</title>
        <meta name="description" content="Create a new fundraising campaign" />
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Create Campaign</h1>
          <Link href="/on-chain-campaigns" passHref>
            <button className="btn border border-gray-300 text-gray-700">
              Back to Campaigns
            </button>
          </Link>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <p className="text-blue-700">
            <span className="font-bold">Connected Wallet:</span> {wallet.publicKey?.toString()}
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          {campaignData ? (
            <div className="text-center">
              <h2 className="text-xl font-bold mb-4 text-green-600">Campaign Ready!</h2>
              <p className="mb-4">Your campaign <strong>{campaignData.name}</strong> has been prepared and is ready to be created on the blockchain.</p>
              
              <div className="bg-gray-100 p-4 rounded-md mb-6 text-left">
                <h3 className="font-bold mb-2">Campaign Summary:</h3>
                <ul className="text-sm space-y-1">
                  <li><strong>Name:</strong> {campaignData.name}</li>
                  <li><strong>Category:</strong> {campaignData.category}</li>
                  <li><strong>Target Amount:</strong> {campaignData.targetAmount} LAKKHI</li>
                  <li><strong>End Date:</strong> {new Date(campaignData.endDate * 1000).toLocaleDateString()}</li>
                </ul>
              </div>
              
              <button
                onClick={executeCampaignCreation}
                disabled={isSubmitting}
                className="btn bg-green-600 hover:bg-green-700 text-white w-full mb-4"
              >
                {isSubmitting ? 'Processing...' : 'Create Campaign Now'}
              </button>
              <p className="text-sm text-gray-500">
                Click the button above to create your campaign on the Solana blockchain.
              </p>
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
                  className={`input w-full ${formErrors.name ? 'border-red-500' : ''}`}
                  placeholder="Campaign name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
              </div>
              
              <div className="mb-4">
                <label htmlFor="description" className="block text-gray-700 font-medium mb-2">
                  Description*
                </label>
                <textarea
                  id="description"
                  className={`input w-full h-32 ${formErrors.description ? 'border-red-500' : ''}`}
                  placeholder="Campaign description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                {formErrors.description && <p className="text-red-500 text-sm mt-1">{formErrors.description}</p>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="category" className="block text-gray-700 font-medium mb-2">
                    Category*
                  </label>
                  <select
                    id="category"
                    className={`select select-bordered w-full ${formErrors.category ? 'border-red-500' : ''}`}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={isSubmitting}
                    required
                  >
                    <option value="" disabled>Select category</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {formErrors.category && <p className="text-red-500 text-sm mt-1">{formErrors.category}</p>}
                </div>
                
                <div>
                  <label htmlFor="imageUrl" className="block text-gray-700 font-medium mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    id="imageUrl"
                    className="input w-full"
                    placeholder="https://example.com/image.jpg"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="targetAmount" className="block text-gray-700 font-medium mb-2">
                    Target Amount (LAKKHI)*
                  </label>
                  <input
                    type="number"
                    id="targetAmount"
                    className={`input w-full ${formErrors.targetAmount ? 'border-red-500' : ''}`}
                    placeholder="1000"
                    step="0.1"
                    min="0"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                  {formErrors.targetAmount && <p className="text-red-500 text-sm mt-1">{formErrors.targetAmount}</p>}
                </div>
                
                <div>
                  <label htmlFor="endDate" className="block text-gray-700 font-medium mb-2">
                    End Date*
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    className={`input w-full ${formErrors.endDate ? 'border-red-500' : ''}`}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                  {formErrors.endDate && <p className="text-red-500 text-sm mt-1">{formErrors.endDate}</p>}
                </div>
              </div>
              
              <div className="flex justify-end space-x-4">
                <Link href="/on-chain-campaigns" passHref>
                  <button
                    type="button"
                    className="btn border border-gray-300 text-gray-700"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                </Link>
                <button
                  type="submit"
                  className="btn bg-indigo-600 hover:bg-indigo-700 text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Preparing...' : 'Prepare Campaign'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
};

export default CreateCampaignPage; 