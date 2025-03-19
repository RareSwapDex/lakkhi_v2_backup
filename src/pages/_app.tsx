import '@/styles/globals.css';
import { AppProps } from 'next/app';
import { useEffect } from 'react';
import Layout from '@/components/Layout';
import { Toaster } from 'react-hot-toast';
import { initDebugMode } from '@/utils/debug-utils';
import platformData from '../platform-data.json';
import WalletConnectionProvider from '@/components/WalletConnectionProvider';

// Import styles
import '@solana/wallet-adapter-react-ui/styles.css';

function MyApp({ Component, pageProps }: AppProps) {
  // Initialize debug mode
  useEffect(() => {
    initDebugMode();
  }, []);

  // Initialize platform data in localStorage
  useEffect(() => {
    try {
      // Check if platform data already exists in localStorage
      if (!localStorage.getItem('platformAddress')) {
        console.log('Initializing platform data in localStorage');
        localStorage.setItem('platformAddress', platformData.address);
        localStorage.setItem('tokenMint', platformData.tokenMint);
        localStorage.setItem('adminAddress', platformData.admin);
        console.log('Platform data initialized successfully');
      }
    } catch (error) {
      console.error('Error initializing platform data:', error);
    }
  }, []);

  return (
    <WalletConnectionProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
      <Toaster position="bottom-right" />
    </WalletConnectionProvider>
  );
}

export default MyApp; 