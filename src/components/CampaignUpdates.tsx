import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Update {
  id: string;
  content: string;
  createdAt: Date;
  author: string;
}

interface CampaignUpdatesProps {
  campaignId: string;
  isCreator: boolean;
}

const CampaignUpdates: React.FC<CampaignUpdatesProps> = ({ campaignId, isCreator }) => {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [newUpdate, setNewUpdate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const wallet = useWallet();

  // Fetch campaign updates
  useEffect(() => {
    const fetchUpdates = async () => {
      setIsLoading(true);
      try {
        // In development mode, use mock data from localStorage
        if (process.env.NODE_ENV === 'development') {
          const storedUpdates = JSON.parse(localStorage.getItem(`campaign_${campaignId}_updates`) || '[]');
          setUpdates(storedUpdates.map((update: any) => ({
            ...update,
            createdAt: new Date(update.createdAt)
          })));
        } else {
          // In production, fetch from API
          // const response = await fetch(`/api/campaigns/${campaignId}/updates`);
          // const data = await response.json();
          // setUpdates(data.map((update: any) => ({
          //   ...update,
          //   createdAt: new Date(update.createdAt)
          // })));
          
          // Placeholder for production
          setUpdates([]);
        }
      } catch (error) {
        console.error('Error fetching campaign updates:', error);
        toast.error('Failed to load campaign updates');
      } finally {
        setIsLoading(false);
      }
    };

    if (campaignId) {
      fetchUpdates();
    }
  }, [campaignId]);

  // Add a new update
  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newUpdate.trim()) {
      toast.error('Update content cannot be empty');
      return;
    }
    
    if (!wallet.connected) {
      toast.error('Please connect your wallet to add an update');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const update = {
        id: Date.now().toString(),
        content: newUpdate.trim(),
        createdAt: new Date(),
        author: wallet.publicKey?.toString() || 'Unknown'
      };
      
      // In development mode, store in localStorage
      if (process.env.NODE_ENV === 'development') {
        const storedUpdates = JSON.parse(localStorage.getItem(`campaign_${campaignId}_updates`) || '[]');
        const updatedUpdates = [update, ...storedUpdates];
        localStorage.setItem(`campaign_${campaignId}_updates`, JSON.stringify(updatedUpdates));
        setUpdates(updatedUpdates);
      } else {
        // In production, send to API
        // await fetch(`/api/campaigns/${campaignId}/updates`, {
        //   method: 'POST',
        //   headers: {
        //     'Content-Type': 'application/json',
        //   },
        //   body: JSON.stringify(update),
        // });
        
        // Optimistically update the UI
        setUpdates(prev => [update, ...prev]);
      }
      
      setNewUpdate('');
      toast.success('Update added successfully');
    } catch (error) {
      console.error('Error adding campaign update:', error);
      toast.error('Failed to add update');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {isCreator && (
        <div className="mb-6">
          <form onSubmit={handleAddUpdate}>
            <div className="mb-3">
              <label htmlFor="updateContent" className="block text-gray-700 font-medium mb-2">
                Add Campaign Update
              </label>
              <textarea
                id="updateContent"
                className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={4}
                placeholder="Share progress, news, or thank your supporters..."
                value={newUpdate}
                onChange={(e) => setNewUpdate(e.target.value)}
                disabled={isSubmitting}
              ></textarea>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="btn bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Posting...' : 'Post Update'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="space-y-6">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        ) : updates.length > 0 ? (
          updates.map((update) => (
            <div key={update.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="font-medium">{update.author.slice(0, 6)}...{update.author.slice(-4)}</div>
                <div className="text-sm text-gray-500">{format(update.createdAt, 'MMM d, yyyy')}</div>
              </div>
              <p className="text-gray-700 whitespace-pre-line">{update.content}</p>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <p>No updates yet</p>
            {isCreator && (
              <p className="mt-1 text-sm">Share progress with your supporters by posting an update</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignUpdates; 