import Head from 'next/head';
import Link from 'next/link';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import CreateCampaignForm from '@/components/CreateCampaignForm';

export default function CreateCampaignPage() {
  return (
    <div>
      <Head>
        <title>Create Campaign - Lakkhi</title>
        <meta name="description" content="Create a new fundraising campaign on Lakkhi" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 flex justify-between items-center">
          <div>
            <Link href="/">
              <a className="text-2xl font-bold text-primary">Lakkhi</a>
            </Link>
          </div>
          <WalletMultiButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6">
        <div className="mb-8">
          <Link href="/">
            <a className="text-primary flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Back to campaigns
            </a>
          </Link>
        </div>
        
        <CreateCampaignForm />
      </main>

      <footer className="bg-gray-100 border-t">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
          <p className="text-center text-gray-500">
            © {new Date().getFullYear()} Lakkhi Fundraising. Built on Solana.
          </p>
        </div>
      </footer>
    </div>
  );
} 