import { useEffect, useState } from 'react';
import { LAKKHI_TOKEN_MINT } from '@/utils/anchor-client';
import { getLakkhiPrice } from '@/services/price-service';
import toast from 'react-hot-toast';

const LakkhiTokenInfo: React.FC = () => {
  const [price, setPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTokenInfo = async () => {
      try {
        const tokenPrice = await getLakkhiPrice();
        setPrice(tokenPrice);
      } catch (error) {
        console.error('Error fetching LAKKHI price:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenInfo();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4">LAKKHI Token</h2>
      
      <div className="mb-4">
        <p className="text-gray-700 mb-2">
          LAKKHI is the native token used for donations on this platform. All card donations are automatically
          converted to LAKKHI tokens before being sent to campaigns.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-gray-800">Token Address</h3>
          <div className="flex items-center mt-1">
            <code className="bg-gray-100 p-2 rounded text-sm flex-grow overflow-x-auto">
              {LAKKHI_TOKEN_MINT.toString()}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(LAKKHI_TOKEN_MINT.toString());
                toast.success('Token address copied to clipboard!');
              }}
              className="ml-2 p-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
            </button>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800">Current Price</h3>
          <p className="text-lg mt-1">
            {isLoading ? (
              <span className="text-gray-500">Loading...</span>
            ) : price ? (
              <span>${price.toFixed(6)} USD</span>
            ) : (
              <span className="text-gray-500">Price unavailable</span>
            )}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800">How It Works</h3>
          <ul className="list-disc pl-5 mt-1 text-gray-700 text-sm">
            <li>Card payments are automatically converted to LAKKHI tokens</li>
            <li>Wallet holders can directly donate LAKKHI tokens to campaigns</li>
            <li>Campaign creators can withdraw LAKKHI tokens when campaigns end</li>
            <li>LAKKHI is a standard SPL token on the Solana blockchain</li>
          </ul>
        </div>
        
        <div>
          <h3 className="font-semibold text-gray-800">Acquiring LAKKHI</h3>
          <ul className="list-disc pl-5 mt-1 text-gray-700 text-sm">
            <li>Use the "Donate with Card" option on any campaign page</li>
            <li>Swap SOL for LAKKHI on a decentralized exchange</li>
            <li>Purchase directly from supported exchanges</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LakkhiTokenInfo; 