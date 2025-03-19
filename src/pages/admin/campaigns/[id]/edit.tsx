import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAnchorClient, useCampaign } from '@/utils/anchor-client';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import toast from 'react-hot-toast';
import { BN } from '@project-serum/anchor';
import { isAdmin } from '@/utils/admin-auth';

const CATEGORIES = [
  'Education', 'Health', 'Environment', 'Technology', 
  'Arts', 'Community', 'Business', 'Charity', 'Other'
];

const EditCampaignPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const wallet = useWallet();
  const { campaign, loading, error } = useCampaign(id as string);
  const { program } = useAnchorClient();
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  
  // Set form values when campaign data is loaded
  useEffect(() => {
    if (campaign) {
      setName(campaign.name);
      setDescription(campaign.description);
      setImageUrl(campaign.imageUrl);
      setCategory(campaign.category);
      setTargetAmount(campaign.targetAmount.toString());
      
      // Format the date for the input
      const date = campaign.endDate;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setEndDate(`${year}-${month}-${day}`);
      
      setIsActive(campaign.isActive);
    }
  }, [campaign]);
  
  // Check if the connected wallet is authorized
  useEffect(() => {
    setIsAuthorized(isAdmin(wallet.publicKey));
  }, [wallet.publicKey]);
  
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
    
    if (!program || !wallet.publicKey || !id) {
      toast.error('Wallet not connected or campaign ID missing');
      return;
    }
    
    try {
      setIsSubmitting(true);
      toast.loading('Updating campaign...', { id: 'update-campaign' });
      
      // In a real application, you would call your contract's update function here
      // For example:
      // await program.methods
      //   .updateCampaign(
      //     name,
      //     description,
      //     new BN(parseFloat(targetAmount) * LAMPORTS_PER_SOL),
      //     new BN(new Date(endDate).getTime() / 1000),
      //     imageUrl,
      //     category,
      //     isActive
      //   )
      //   .accounts({
      //     campaign: new PublicKey(id as string),
      //     authority: wallet.publicKey,
      //     systemProgram: anchor.web3.SystemProgram.programId,
      //   })
      //   .rpc();
      
      // For now, we'll simulate updating with a timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Campaign updated successfully', { id: 'update-campaign' });
      
      // Redirect to admin dashboard
      router.push('/admin');
      
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error(`Failed to update campaign: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'update-campaign' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!wallet.connected) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">Edit Campaign</h1>
        <p className="text-gray-600 mb-8">Please connect your wallet to edit the campaign</p>
        <div className="flex justify-center">
          <WalletMultiButton />
        </div>
      </div>
    );
  }
  
  if (!isAuthorized) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">Edit Campaign</h1>
        <p className="text-gray-600 mb-8">You do not have permission to edit campaigns.</p>
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
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">Edit Campaign</h1>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }
  
  if (error || !campaign) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-8">Edit Campaign</h1>
        <div className="bg-red-50 p-4 rounded-lg text-red-600 text-center mb-6">
          {error ? `Error: ${error.message}` : 'Campaign not found'}
        </div>
        <Link href="/admin" passHref>
          <button className="btn btn-primary">Back to Dashboard</button>
        </Link>
      </div>
    );
  }
  
  return (
    <>
      <Head>
        <title>Edit Campaign - Admin Dashboard</title>
        <meta name="description" content="Edit an existing fundraising campaign" />
      </Head>
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Edit Campaign</h1>
          <div className="flex space-x-3">
            <Link href={`/campaigns/${id}`} passHref target="_blank">
              <button className="btn bg-green-600 hover:bg-green-700 text-white">
                View Public Page
              </button>
            </Link>
            <Link href="/admin" passHref>
              <button className="btn border border-gray-300 text-gray-700">
                Back to Dashboard
              </button>
            </Link>
          </div>
        </div>
        
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
            
            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="checkbox mr-2"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isSubmitting}
                />
                <span className="text-gray-700">Campaign is active</span>
              </label>
            </div>
            
            <div className="flex justify-end space-x-4">
              <Link href="/admin" passHref>
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
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update Campaign'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default EditCampaignPage; 