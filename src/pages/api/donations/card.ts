import { NextApiRequest, NextApiResponse } from 'next';
import { BN } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';

// In a real application, you would use a database to store donations
// For now, we'll store them in memory
let donations: any[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { campaignId, walletAddress, amount, txId, currency } = req.body;

    // Validation
    if (!campaignId || !amount || !txId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify the transaction with Mercuryo (in a real implementation)
    // const verificationResponse = await verifyMercuryoTransaction(txId);
    // if (!verificationResponse.verified) {
    //   return res.status(400).json({ error: 'Invalid transaction' });
    // }

    // For development, simulate verification
    const isVerified = true;

    if (isVerified) {
      // Add the donation to our in-memory database
      const donation = {
        id: Date.now().toString(),
        campaignId,
        walletAddress: walletAddress || 'anonymous',
        amount,
        txId,
        currency,
        method: 'card',
        timestamp: new Date().toISOString(),
      };

      donations.push(donation);

      // In development mode, update localStorage data (for mock implementation)
      if (process.env.NODE_ENV === 'development') {
        // Send instruction to update campaign stats in localStorage (done by client-side)
        // We can't directly access localStorage from API routes
      }

      return res.status(200).json({
        success: true,
        donation
      });
    } else {
      return res.status(400).json({ error: 'Transaction verification failed' });
    }
  } catch (error) {
    console.error('Error processing card donation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// This would be implemented in a real application
async function verifyMercuryoTransaction(txId: string) {
  // Make API call to Mercuryo to verify transaction
  // const response = await fetch(`https://api.mercuryo.io/v1/verify-transaction/${txId}`, {
  //   headers: {
  //     'Authorization': `Bearer ${process.env.MERCURYO_API_KEY}`
  //   }
  // });
  // const data = await response.json();
  // return {
  //   verified: data.success
  // };
  
  // For development, always return success
  return {
    verified: true
  };
} 