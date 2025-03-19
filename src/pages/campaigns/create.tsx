import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';

export default function CreateCampaignPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    category: 'Other',
    targetAmount: '',
    endDate: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.description || !formData.targetAmount || !formData.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    const targetAmount = parseFloat(formData.targetAmount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      toast.error('Please enter a valid target amount');
      return;
    }
    
    try {
      setIsSubmitting(true);
      toast.loading('Creating campaign...', { id: 'create' });
      
      // Generate a random pubkey-like string
      const randomPubkey = Array.from(Array(32), () => Math.floor(Math.random() * 36).toString(36)).join('');
      
      // Create campaign object
      const newCampaign = {
        pubkey: randomPubkey,
        creator: '11111111111111111111111111111111', // Mock creator
        name: formData.name,
        description: formData.description,
        imageUrl: formData.imageUrl || 'https://via.placeholder.com/800x400?text=Campaign+Image',
        category: formData.category,
        targetAmount: (targetAmount * 1e9).toString(), // Convert to lamports/LAKKHI format
        currentAmount: '0',
        endDate: new Date(formData.endDate).toISOString(),
        isActive: true,
        donorsCount: '0',
        updatesCount: '0'
      };
      
      // Add to localStorage
      if (typeof window !== 'undefined') {
        const existingCampaigns = JSON.parse(localStorage.getItem('mockCampaigns') || '[]');
        existingCampaigns.push(newCampaign);
        localStorage.setItem('mockCampaigns', JSON.stringify(existingCampaigns));
      }
      
      // Simulate a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Campaign created successfully!', { id: 'create' });
      
      // Redirect to the new campaign
      router.push(`/campaigns/${randomPubkey}`);
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign. Please try again.', { id: 'create' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create Campaign | Lakkhi Fundraising</title>
        <meta name="description" content="Create a new fundraising campaign" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/campaigns" className="text-indigo-600 hover:text-indigo-800 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Campaigns
          </Link>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold mb-6">Create a New Campaign</h1>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="description" className="block text-gray-700 font-medium mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="imageUrl" className="block text-gray-700 font-medium mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  id="imageUrl"
                  name="imageUrl"
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                  placeholder="https://example.com/image.jpg"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank to use a default image</p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="category" className="block text-gray-700 font-medium mb-2">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                  value={formData.category}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="Other">Other</option>
                  <option value="Art">Art</option>
                  <option value="Community">Community</option>
                  <option value="Education">Education</option>
                  <option value="Environment">Environment</option>
                  <option value="Health">Health</option>
                  <option value="Technology">Technology</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label htmlFor="targetAmount" className="block text-gray-700 font-medium mb-2">
                  Target Amount (USD) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="number"
                    id="targetAmount"
                    name="targetAmount"
                    min="1"
                    step="0.01"
                    className="w-full pl-8 border border-gray-300 rounded-md py-2 px-3"
                    value={formData.targetAmount}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    required
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="endDate" className="block text-gray-700 font-medium mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  className="w-full border border-gray-300 rounded-md py-2 px-3"
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.endDate}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </>
  );
} 