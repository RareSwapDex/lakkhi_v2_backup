import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/router';
import { initializePlatformData, createCampaign } from '@/utils/anchor-client-v2';
import { usdToLakkhi, formatUsd } from '@/utils/currency-utils';

// Import WalletMultiButton dynamically with ssr: false to prevent hydration errors
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);

// Define incentive type
interface Incentive {
  id: string;
  title: string;
  description: string;
  amountRequiredUsd: number;
  quantityAvailable: number;
}

const CreateCampaignV2Page: NextPage = () => {
  const wallet = useWallet();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmountUsd, setTargetAmountUsd] = useState('');
  
  // Calculate default end date (30 days from now)
  const getDefaultEndDate = () => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return thirtyDaysFromNow.toISOString().split('T')[0];
  };
  
  const [endDate, setEndDate] = useState(getDefaultEndDate());
  const [imageUrl, setImageUrl] = useState('');
  const [chain, setChain] = useState('Solana');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [campaignData, setCampaignData] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // Incentives state
  const [incentives, setIncentives] = useState<Incentive[]>([]);
  const [showIncentiveForm, setShowIncentiveForm] = useState(false);
  const [currentIncentive, setCurrentIncentive] = useState<Incentive>({
    id: '',
    title: '',
    description: '',
    amountRequiredUsd: 0,
    quantityAvailable: 0,
  });
  const [editingIncentiveIndex, setEditingIncentiveIndex] = useState<number | null>(null);

  // Add USD to LAKKHI conversion functions
  const lakkiToUsd = (lakkiAmount: number): number => {
    return lakkiAmount / 2; // 2 LAKKHI = $1
  };

  const usdToLakki = (usdAmount: number): number => {
    return usdAmount * 2; // $1 = 2 LAKKHI
  };

  // Update form state to include LAKKHI amount display
  const [form, setForm] = useState({
    name: '',
    description: '',
    targetAmount: '',
    targetAmountLakkhi: '0', // Added for LAKKHI display
    endDate: getDefaultEndDate(),
    imageUrl: '',
    chain: 'Solana', // Changed from category to chain
  });

  // Update the handleChange function to calculate LAKKHI equivalent
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If changing the target amount, calculate the LAKKHI equivalent
    if (name === 'targetAmount') {
      const usdAmount = parseFloat(value) || 0;
      const lakkiAmount = usdToLakki(usdAmount);
      setForm({
        ...form,
        [name]: value,
        targetAmountLakkhi: lakkiAmount.toString()
      });
    } else {
      setForm({
        ...form,
        [name]: value
      });
    }
  };

  // Prevent hydration errors by only rendering after component mount
  useEffect(() => {
    setIsMounted(true);
    
    // Initialize platform data
    initializePlatformData().then(success => {
      if (success) {
        console.log('Platform data initialized successfully');
      } else {
        console.error('Failed to initialize platform data');
      }
    });
  }, []);

  // Set minimum end date to tomorrow
  const minEndDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Validate form fields
  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!description.trim()) {
      errors.description = 'Description is required';
    }
    
    if (!targetAmountUsd) {
      errors.targetAmountUsd = 'Target amount is required';
    } else if (isNaN(parseFloat(targetAmountUsd)) || parseFloat(targetAmountUsd) <= 0) {
      errors.targetAmountUsd = 'Target amount must be a positive number';
    }
    
    if (!endDate) {
      errors.endDate = 'End date is required';
    } else {
      const selectedDate = new Date(endDate);
      const today = new Date();
      if (selectedDate <= today) {
        errors.endDate = 'End date must be in the future';
      }
    }
    
    if (!chain.trim()) {
      errors.chain = 'Chain is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Validate incentive form
  const validateIncentiveForm = () => {
    if (!currentIncentive.title) {
      toast.error('Please enter a tier title');
      return false;
    }
    if (!currentIncentive.description) {
      toast.error('Please enter a tier description');
      return false;
    }
    if (currentIncentive.amountRequiredUsd <= 0) {
      toast.error('Please enter a valid amount required');
      return false;
    }
    if (currentIncentive.quantityAvailable <= 0) {
      toast.error('Please enter a valid quantity available');
      return false;
    }
    return true;
  };
  
  // Handle adding a new incentive
  const handleAddIncentive = () => {
    if (!validateIncentiveForm()) return;
    
    const newIncentive = {
      ...currentIncentive,
      id: editingIncentiveIndex !== null ? currentIncentive.id : Date.now().toString()
    };
    
    if (editingIncentiveIndex !== null) {
      // Update existing incentive
      const updatedIncentives = [...incentives];
      updatedIncentives[editingIncentiveIndex] = newIncentive;
      setIncentives(updatedIncentives);
      setEditingIncentiveIndex(null);
    } else {
      // Add new incentive
      setIncentives([...incentives, newIncentive]);
    }
    
    // Reset form
    setCurrentIncentive({
      id: '',
      title: '',
      description: '',
      amountRequiredUsd: 0,
      quantityAvailable: 0,
    });
    setShowIncentiveForm(false);
  };
  
  // Edit an incentive
  const handleEditIncentive = (index: number) => {
    setCurrentIncentive(incentives[index]);
    setEditingIncentiveIndex(index);
    setShowIncentiveForm(true);
  };
  
  // Remove an incentive
  const handleRemoveIncentive = (index: number) => {
    const updatedIncentives = [...incentives];
    updatedIncentives.splice(index, 1);
    setIncentives(updatedIncentives);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!form.name || !form.description || !form.targetAmount) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!wallet.connected) {
      toast.error("Please connect your wallet to create a campaign");
      return;
    }
    
    try {
      setIsSubmitting(true);
      toast.loading('Creating campaign...', { id: 'create-campaign' });
      
      console.log("Creating campaign with form data:", form);
      const targetAmountLakkhi = form.targetAmountLakkhi;
      
      // Prepare incentives data with converted amounts
      const incentivesData = incentives.map(incentive => ({
        ...incentive,
        amountRequired: usdToLakki(incentive.amountRequiredUsd)
      }));
      
      const campaignAddress = await createCampaign(
        form.name,
        form.description,
        targetAmountLakkhi.toString(),
        Math.floor(new Date(form.endDate).getTime() / 1000),
        form.imageUrl || 'https://via.placeholder.com/600x400?text=No+Image',
        form.chain,
        wallet,
        incentivesData
      );
      
      console.log("Campaign created:", campaignAddress);
      toast.success("Campaign created successfully!", { id: 'create-campaign' });
      setForm({
        name: '',
        description: '',
        targetAmount: '',
        targetAmountLakkhi: '0',
        endDate: getDefaultEndDate(),
        imageUrl: '',
        chain: 'Solana'
      });
      
      // Redirect to campaign page
      router.push(`/campaign-v2/${campaignAddress}`);
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast.error(`Failed to create campaign: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'create-campaign' });
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
          <Link href="/on-chain-campaigns-v2" passHref>
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
        
        {campaignData ? (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-2xl font-bold text-green-600 mb-4">Campaign Ready!</h2>
            <p className="mb-4">Your campaign <strong>{campaignData.name}</strong> has been prepared and is ready to be created on the blockchain.</p>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-bold mb-2">Campaign Summary:</h3>
              <p><strong>Name:</strong> {campaignData.name}</p>
              <p><strong>Chain:</strong> {chain}</p>
              <p><strong>Target Amount:</strong> {formatUsd(campaignData.targetAmountUsd)} (converts to {campaignData.targetAmount.toFixed(2)} LAKKHI tokens)</p>
              <p><strong>End Date:</strong> {new Date(campaignData.endDate * 1000).toLocaleDateString()}</p>
              
              {campaignData.incentives && campaignData.incentives.length > 0 && (
                <>
                  <h4 className="text-md font-bold mt-4 mb-2">Incentives:</h4>
                  <ul className="list-disc pl-5">
                    {campaignData.incentives.map((incentive: any) => (
                      <li key={incentive.id} className="mb-2">
                        <strong>{incentive.title}</strong> - {formatUsd(incentive.amountRequiredUsd)} 
                        ({incentive.quantity} available)
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
            >
              Create Campaign Now
            </button>
            
            <p className="text-center text-gray-500 mt-4">
              Click the button above to create your campaign on the Solana blockchain.
            </p>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-6">Campaign Details</h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
                  Campaign Name*
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Enter campaign name"
                  required
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="description" className="block text-gray-700 font-medium mb-2">
                  Campaign Description*
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Describe your campaign"
                  rows={4}
                  required
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="targetAmount" className="block text-gray-700 font-medium mb-2">Target Amount ($)*</label>
                <input
                  type="number"
                  id="targetAmount"
                  name="targetAmount"
                  className="input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter target amount"
                  value={form.targetAmount}
                  onChange={handleChange}
                  required
                  min="1"
                  step="1"
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2">Equivalent in LAKKHI Tokens</label>
                <div className="bg-gray-100 p-3 rounded-md">
                  <p className="font-mono">{parseFloat(form.targetAmountLakkhi).toFixed(2)} LAKKHI</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Using token: 6pABjANnUTSyymBeXHKQBgAsu6BkDoCLh9rbj9WFNTAS
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Only this token will be accepted for donations
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-2" htmlFor="endDate">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                    min={minEndDate()}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-gray-700 font-bold mb-2" htmlFor="imageUrl">
                    Image URL (Optional)
                  </label>
                  <input
                    type="url"
                    id="imageUrl"
                    name="imageUrl"
                    value={form.imageUrl}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-bold mb-2" htmlFor="chain">
                    Chain
                  </label>
                  <select
                    id="chain"
                    name="chain"
                    value={form.chain}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="Solana">Solana</option>
                    <option value="Ethereum">Ethereum</option>
                    <option value="BSC">BSC</option>
                    <option value="Base">Base</option>
                  </select>
                </div>
              </div>
              
              {/* Incentives Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-gray-700 font-medium">
                    Campaign Incentives (Optional)
                  </label>
                  {!showIncentiveForm && (
                    <button
                      type="button"
                      onClick={() => setShowIncentiveForm(true)}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      disabled={isSubmitting}
                    >
                      + Add Incentive Tier
                    </button>
                  )}
                </div>
                
                {incentives.length > 0 && (
                  <div className="mb-4 space-y-3">
                    {incentives.map((incentive, index) => (
                      <div key={incentive.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{incentive.title}</h4>
                          <p className="text-sm text-gray-600">{incentive.description}</p>
                          <div className="flex space-x-4 mt-1 text-sm text-gray-500">
                            <span>{formatUsd(incentive.amountRequiredUsd)}</span>
                            <span>Quantity: {incentive.quantityAvailable}</span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => handleEditIncentive(index)}
                            className="text-blue-600 hover:text-blue-800"
                            disabled={isSubmitting}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveIncentive(index)}
                            className="text-red-600 hover:text-red-800"
                            disabled={isSubmitting}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {showIncentiveForm && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h3 className="text-lg font-medium mb-3">
                      {editingIncentiveIndex !== null ? 'Edit Incentive Tier' : 'Add Incentive Tier'}
                    </h3>
                    
                    <div className="mb-3">
                      <label htmlFor="incentiveTitle" className="block text-gray-700 font-medium mb-1">
                        Tier Title*
                      </label>
                      <input
                        type="text"
                        id="incentiveTitle"
                        value={currentIncentive.title}
                        onChange={(e) => setCurrentIncentive({...currentIncentive, title: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Early Bird Special"
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label htmlFor="incentiveDescription" className="block text-gray-700 font-medium mb-1">
                        Description*
                      </label>
                      <textarea
                        id="incentiveDescription"
                        value={currentIncentive.description}
                        onChange={(e) => setCurrentIncentive({...currentIncentive, description: e.target.value})}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Describe what donors will receive"
                        rows={2}
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div>
                        <label htmlFor="incentiveAmount" className="block text-gray-700 font-medium mb-1">
                          Amount Required (USD)*
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                          <input
                            type="number"
                            id="incentiveAmount"
                            value={currentIncentive.amountRequiredUsd || ''}
                            onChange={(e) => setCurrentIncentive({
                              ...currentIncentive, 
                              amountRequiredUsd: parseFloat(e.target.value) || 0
                            })}
                            className="w-full px-3 py-2 pl-8 border rounded-lg"
                            placeholder="50"
                            step="0.01"
                            min="1"
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="incentiveQuantity" className="block text-gray-700 font-medium mb-1">
                          Quantity Available*
                        </label>
                        <input
                          type="number"
                          id="incentiveQuantity"
                          value={currentIncentive.quantityAvailable || ''}
                          onChange={(e) => setCurrentIncentive({
                            ...currentIncentive, 
                            quantityAvailable: parseInt(e.target.value) || 0
                          })}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="10"
                          min="1"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={handleAddIncentive}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md"
                        disabled={isSubmitting}
                      >
                        {editingIncentiveIndex !== null ? 'Update Tier' : 'Add Tier'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowIncentiveForm(false);
                          setEditingIncentiveIndex(null);
                          setCurrentIncentive({
                            id: '',
                            title: '',
                            description: '',
                            amountRequiredUsd: 0,
                            quantityAvailable: 0,
                          });
                        }}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-md"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <button
                type="submit"
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner mr-2"></div>
                    Creating Campaign...
                  </div>
                ) : (
                  'Create Campaign with LAKKHI Token'
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
};

export default CreateCampaignV2Page; 