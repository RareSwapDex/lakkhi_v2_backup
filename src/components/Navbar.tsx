import { FC } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';

// Import WalletMultiButton dynamically with ssr: false to prevent hydration errors
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);

const Navbar: FC = () => {
  const router = useRouter();
  const wallet = useWallet();
  
  // Helper to determine if a link is active
  const isActive = (path: string) => router.pathname === path;
  
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-indigo-600">Lakkhi</span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-4">
              <Link 
                href="/on-chain-campaigns-v2"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/on-chain-campaigns-v2') 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Campaigns
              </Link>
              
              {wallet.connected && (
                <Link 
                  href="/create-campaign-v2"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/create-campaign-v2') 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Create Campaign
                </Link>
              )}
              
              <Link 
                href="/about"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  isActive('/about') 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                About
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {wallet.connected && (
              <div className="hidden md:block text-sm text-gray-500">
                <span className="font-medium">{wallet.publicKey?.toString().slice(0, 4)}...{wallet.publicKey?.toString().slice(-4)}</span>
              </div>
            )}
            
            <WalletMultiButton className="!bg-indigo-600 hover:!bg-indigo-700" />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 