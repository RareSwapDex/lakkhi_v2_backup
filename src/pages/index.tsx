import type { NextPage } from 'next';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import dynamic from 'next/dynamic';
import Head from 'next/head';

// Import WalletMultiButton dynamically with ssr: false to prevent hydration errors
const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then(mod => mod.WalletMultiButton),
  { ssr: false }
);

const Home: NextPage = () => {
  const { connected } = useWallet();
  
  return (
    <>
      <Head>
        <title>LAKKHI Crowdfunding Platform</title>
        <meta name="description" content="A decentralized crowdfunding platform built on Solana blockchain" />
      </Head>
      
      <div className="bg-indigo-700">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="flex flex-col md:flex-row items-center">
            <div className="w-full md:w-1/2 text-center md:text-left text-white mb-12 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Decentralized Crowdfunding on Solana
              </h1>
              <p className="text-xl mb-8 text-indigo-100">
                Create campaigns, fund projects, and support causes you care about - all on the Solana blockchain.
              </p>
              <div className="flex flex-col sm:flex-row justify-center md:justify-start space-y-4 sm:space-y-0 sm:space-x-4">
                <Link href="/on-chain-campaigns-v2" passHref className="btn bg-white text-indigo-700 hover:bg-indigo-50 px-6 py-3 rounded-lg font-medium">
                  Explore Campaigns
                </Link>
                {!connected && (
                  <WalletMultiButton className="!bg-indigo-600 !text-white !border !border-indigo-400 hover:!bg-indigo-500 !px-6 !py-3 !rounded-lg !font-medium" />
                )}
                {connected && (
                  <Link href="/create-campaign-v2" passHref className="btn bg-transparent border border-white text-white hover:bg-indigo-600 px-6 py-3 rounded-lg font-medium">
                    Create Campaign
                  </Link>
                )}
              </div>
            </div>
            <div className="w-full md:w-1/2">
              <img 
                src="/images/lakkhi-hero.png" 
                alt="LAKKHI Platform Illustration" 
                className="w-full max-w-md mx-auto rounded-lg shadow-xl"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://via.placeholder.com/500x400?text=LAKKHI+Platform";
                }}
              />
            </div>
          </div>
        </div>
      </div>
      
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 border border-gray-100 rounded-lg shadow-sm">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Create</h3>
              <p className="text-gray-600">
                Create a campaign with details about your project, funding goal, and timeline.
              </p>
            </div>
            
            <div className="text-center p-6 border border-gray-100 rounded-lg shadow-sm">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Fund</h3>
              <p className="text-gray-600">
                Contribute LAKKHI tokens to campaigns you want to support securely on Solana.
              </p>
            </div>
            
            <div className="text-center p-6 border border-gray-100 rounded-lg shadow-sm">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Track</h3>
              <p className="text-gray-600">
                Monitor campaign progress and see exactly how funds are being used with blockchain transparency.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4 text-center">Ready to Get Started?</h2>
          <p className="text-gray-600 text-center mb-8 max-w-lg mx-auto">
            Join the LAKKHI community today and start creating or funding campaigns that matter.
          </p>
          
          <div className="flex justify-center">
            <Link href="/on-chain-campaigns-v2" passHref className="btn bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-3 rounded-lg font-medium mr-4">
              Explore Campaigns
            </Link>
            {connected ? (
              <Link href="/create-campaign-v2" passHref className="btn bg-white text-indigo-600 border border-indigo-600 hover:bg-indigo-50 px-6 py-3 rounded-lg font-medium">
                Create Campaign
              </Link>
            ) : (
              <WalletMultiButton className="!bg-white !text-indigo-600 !border !border-indigo-600 hover:!bg-indigo-50 !px-6 !py-3 !rounded-lg !font-medium" />
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default Home; 