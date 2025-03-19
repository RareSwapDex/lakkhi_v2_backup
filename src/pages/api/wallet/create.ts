import { NextApiRequest, NextApiResponse } from 'next';
import { createSolanaWallet, getOrCreateSolanaWallet } from '@/services/solana-wallet-service';

/**
 * API handler for creating or retrieving a wallet using our custom solution
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Normalize email (convert to lowercase)
    const normalizedEmail = email.toLowerCase();

    // Get or create wallet
    const publicKey = await getOrCreateSolanaWallet(normalizedEmail);

    // Return the wallet public key
    return res.status(200).json({
      success: true,
      wallet: {
        address: publicKey,
        type: 'solana'
      }
    });
  } catch (error) {
    console.error('Error creating/retrieving wallet:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create or retrieve wallet'
    });
  }
} 