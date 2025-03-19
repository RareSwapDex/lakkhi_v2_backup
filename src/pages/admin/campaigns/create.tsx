import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
// Import from real implementation, not mock
import { createCampaign } from '@/utils/anchor-client';
import { isAdmin } from '@/utils/admin-auth';
import toast from 'react-hot-toast';
import { debugLog } from '@/utils/debug-utils';

// Import WalletMultiButton dynamically with ssr: false to prevent hydration errors
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);

const CATEGORIES = [
  'Solana', 'BSC', 'Ethereum', 'Base'
];

// Interface for incentive tier
interface IncentiveTier {
  id: string;
  name: string;
  description: string;
  minAmount: string;
  maxSlots: string;
  claimedSlots: number;
}

const CreateCampaignPage: NextPage = () => {
  const router = useRouter();
  const wallet = useWallet();
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Check if the connected wallet is authorized
  useEffect(() => {
    setIsAuthorized(isAdmin(wallet.publicKey));
  }, [wallet.publicKey]);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('Solana');
  const [targetAmount, setTargetAmount] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Incentives state
  const [incentives, setIncentives] = useState<IncentiveTier[]>([]);
  const [showIncentiveForm, setShowIncentiveForm] = useState(false);
  const [currentIncentive, setCurrentIncentive] = useState<IncentiveTier>({
    id: '',
    name: '',
    description: '',
    minAmount: '',
    maxSlots: '',
    claimedSlots: 0
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [error, setError] = useState('');
  
  // Function to add a new incentive tier
  const addIncentive = () => {
    // Validate the incentive form
    const errors: {[key: string]: string} = {};
    
    if (!currentIncentive.name.trim()) {
      errors.incentiveName = 'Name is required';
    }
    
    if (!currentIncentive.description.trim()) {
      errors.incentiveDescription = 'Description is required';
    }
    
    if (!currentIncentive.minAmount.trim()) {
      errors.incentiveMinAmount = 'Minimum amount is required';
    } else {
      const amount = parseFloat(currentIncentive.minAmount);
      if (isNaN(amount) || amount <= 0) {
        errors.incentiveMinAmount = 'Minimum amount must be a positive number';
      }
    }
    
    if (!currentIncentive.maxSlots.trim()) {
      errors.incentiveMaxSlots = 'Maximum slots is required';
    } else {
      const slots = parseInt(currentIncentive.maxSlots);
      if (isNaN(slots) || slots <= 0) {
        errors.incentiveMaxSlots = 'Maximum slots must be a positive number';
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors({...formErrors, ...errors});
      return;
    }
    
    // Add the incentive to the list
    const newIncentive = {
      ...currentIncentive,
      id: Date.now().toString() // Generate a unique ID
    };
    
    setIncentives([...incentives, newIncentive]);
    
    // Reset the form
    setCurrentIncentive({
      id: '',
      name: '',
      description: '',
      minAmount: '',
      maxSlots: '',
      claimedSlots: 0
    });
    
    setShowIncentiveForm(false);
    
    // Clear any errors
    const updatedErrors = {...formErrors};
    delete updatedErrors.incentiveName;
    delete updatedErrors.incentiveDescription;
    delete updatedErrors.incentiveMinAmount;
    delete updatedErrors.incentiveMaxSlots;
    setFormErrors(updatedErrors);
  };
  
  // Function to remove an incentive tier
  const removeIncentive = (id: string) => {
    setIncentives(incentives.filter(incentive => incentive.id !== id));
  };
  
  // Function to update the current incentive form
  const handleIncentiveChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentIncentive(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
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
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!wallet.connected) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    // Validate required fields
    if (!name || !description || !targetAmount || !endDate || !category) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Validate target amount
    const targetAmountNum = parseFloat(targetAmount);
    if (isNaN(targetAmountNum) || targetAmountNum <= 0) {
      setError('Target amount must be greater than zero');
      return;
    }
    
    // Validate end date
    if (new Date(endDate) <= new Date()) {
      setError('End date must be in the future');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    // Log the form data for debugging
    debugLog('Submitting campaign form', {
      name,
      description,
      targetAmount: targetAmountNum,
      endDate,
      category,
      imageUrl: imageUrl || 'https://via.placeholder.com/800x600?text=Campaign+Image',
      walletAddress: wallet.publicKey?.toString(),
      incentiveCount: incentives.length
    });
    
    try {
      toast.loading('Creating campaign...', { id: 'create-campaign' });
      
      // Create the campaign using the real implementation
      const campaignId = await createCampaign(
        name,
        description,
        targetAmountNum,
        new Date(endDate),
        imageUrl || 'https://via.placeholder.com/800x600?text=Campaign+Image',
        category,
        wallet,
        incentives
      );
      
      toast.success('Campaign created successfully!', { id: 'create-campaign', duration: 5000 });
      debugLog('Campaign created successfully', { campaignId });
      
      // Redirect to the campaign page
      router.push(`/admin/campaigns/${campaignId}`);
    } catch (error: any) {
      console.error('Campaign creation error:', error);
      
      let errorMessage = 'Error creating campaign. Please try again.';
      
      if (error.message.includes('403') || error.message.includes('Access forbidden')) {
        errorMessage = 'Network access error: The RPC endpoint is restricting access. Please try again or use a different RPC.';
      } else if (error.message.includes('Too many requests')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      } else if (error.message.includes('Simulation failed')) {
        errorMessage = 'Transaction simulation failed. This may be due to program constraints.';
      }
      
      // Set error message
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
  
  if (!isAuthorized) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">Create Campaign</h1>
        <p className="text-gray-600 mb-8">You do not have permission to create campaigns.</p>
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
  
  return (
    <>
      <Head>
        <title>Create Campaign - Lakkhi</title>
        <meta name="description" content="Create a new fundraising campaign" />
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Create Campaign</h1>
          <Link href="/admin" passHref>
            <button className="bg-gray-200 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors">
              Back to Dashboard
            </button>
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error creating campaign</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p style={{ whiteSpace: 'pre-line' }}>{error}</p>
                  {error.includes('403') && (
                    <p className="mt-3">
                      <button 
                        onClick={() => window.location.reload()} 
                        className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 mr-3"
                      >
                        Try again
                      </button>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
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
                  Blockchain*
                </label>
                <select
                  id="category"
                  className={`select select-bordered w-full ${formErrors.category ? 'border-red-500' : ''}`}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isSubmitting}
                  required
                >
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="targetAmount" className="block text-gray-700 font-medium mb-2">
                  Target Amount (USD)*
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
            
            {/* Incentives section */}
            <div className="mt-8 mb-6">
              <h3 className="text-lg font-bold mb-4">Donation Incentives</h3>
              <p className="text-gray-600 mb-4">
                Configure special rewards for donors based on contribution amounts.
              </p>
              
              {/* List of added incentives */}
              {incentives.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md font-semibold mb-2">Configured Incentives</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {incentives.map((incentive) => (
                      <div key={incentive.id} className="mb-3 pb-3 border-b border-gray-200 last:border-0">
                        <div className="flex justify-between">
                          <div>
                            <h5 className="font-medium">{incentive.name}</h5>
                            <p className="text-sm text-gray-600">{incentive.description}</p>
                            <div className="mt-1 flex text-xs text-gray-500 space-x-4">
                              <span>Min: ${incentive.minAmount}</span>
                              <span>Max Slots: {incentive.maxSlots}</span>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => removeIncentive(incentive.id)}
                            className="text-red-600 hover:text-red-800"
                            disabled={isSubmitting}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Add incentive button or form */}
              {!showIncentiveForm ? (
                <button
                  type="button"
                  onClick={() => setShowIncentiveForm(true)}
                  className="btn border border-indigo-300 text-indigo-600 hover:bg-indigo-50"
                  disabled={isSubmitting}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Incentive Tier
                </button>
              ) : (
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h4 className="text-md font-semibold mb-3">Add Incentive Tier</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="incentiveName" className="block text-gray-700 text-sm font-medium mb-1">
                        Name*
                      </label>
                      <input
                        type="text"
                        id="incentiveName"
                        name="name"
                        className={`input w-full ${formErrors.incentiveName ? 'border-red-500' : ''}`}
                        placeholder="Early Bird Supporter"
                        value={currentIncentive.name}
                        onChange={handleIncentiveChange}
                        disabled={isSubmitting}
                      />
                      {formErrors.incentiveName && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.incentiveName}</p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="incentiveMinAmount" className="block text-gray-700 text-sm font-medium mb-1">
                        Minimum Donation Amount ($)*
                      </label>
                      <input
                        type="text"
                        id="incentiveMinAmount"
                        name="minAmount"
                        className={`input w-full ${formErrors.incentiveMinAmount ? 'border-red-500' : ''}`}
                        placeholder="50"
                        value={currentIncentive.minAmount}
                        onChange={handleIncentiveChange}
                        disabled={isSubmitting}
                      />
                      {formErrors.incentiveMinAmount && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.incentiveMinAmount}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="incentiveDescription" className="block text-gray-700 text-sm font-medium mb-1">
                      Description*
                    </label>
                    <textarea
                      id="incentiveDescription"
                      name="description"
                      className={`input w-full ${formErrors.incentiveDescription ? 'border-red-500' : ''}`}
                      placeholder="Receive a personalized thank you note and exclusive updates"
                      value={currentIncentive.description}
                      onChange={handleIncentiveChange}
                      rows={2}
                      disabled={isSubmitting}
                    />
                    {formErrors.incentiveDescription && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.incentiveDescription}</p>
                    )}
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="incentiveMaxSlots" className="block text-gray-700 text-sm font-medium mb-1">
                      Maximum Available Slots*
                    </label>
                    <input
                      type="text"
                      id="incentiveMaxSlots"
                      name="maxSlots"
                      className={`input w-full ${formErrors.incentiveMaxSlots ? 'border-red-500' : ''}`}
                      placeholder="10"
                      value={currentIncentive.maxSlots}
                      onChange={handleIncentiveChange}
                      disabled={isSubmitting}
                    />
                    {formErrors.incentiveMaxSlots && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.incentiveMaxSlots}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Set to 0 for unlimited slots
                    </p>
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowIncentiveForm(false)}
                      className="btn border border-gray-300 text-gray-700"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={addIncentive}
                      className="btn bg-indigo-600 hover:bg-indigo-700 text-white"
                      disabled={isSubmitting}
                    >
                      Add Incentive
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="flex justify-end">
              <button
                type="submit"
                  className="btn bg-indigo-600 hover:bg-indigo-700 text-white px-6"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Campaign'}
              </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateCampaignPage; 