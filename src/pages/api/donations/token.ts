import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// In a real application, you would use a database to store donations
// For now, we'll store them in memory
let tokenDonations: any[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { campaignId, walletAddress, amount, signature, stakedAmount, incentiveId } = req.body;

    // Validation
    if (!campaignId || !walletAddress || !amount || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create Solana connection
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    // Verify the transaction (in a real implementation)
    let isVerified = true;
    if (process.env.NODE_ENV !== 'development') {
      try {
        const tx = await connection.getTransaction(signature, {
          commitment: 'confirmed',
        });
        
        isVerified = !!tx;
      } catch (error) {
        console.error('Error verifying transaction:', error);
        isVerified = false;
      }
    }

    if (isVerified) {
      // Add the donation to our in-memory database
      const donation = {
        id: Date.now().toString(),
        campaignId,
        walletAddress,
        amount,
        signature,
        stakedAmount: stakedAmount || amount, // If stakedAmount is not provided, assume all tokens were staked
        currency: 'LAKKHI',
        method: 'token',
        timestamp: new Date().toISOString(),
        incentiveId: incentiveId || null // Store the claimed incentive ID if provided
      };

      tokenDonations.push(donation);

      // In a real implementation, update the campaign in the database
      // await updateCampaignStats(campaignId, amount, incentiveId);

      return res.status(200).json({
        success: true,
        donation
      });
    } else {
      return res.status(400).json({ error: 'Transaction verification failed' });
    }
  } catch (error) {
    console.error('Error processing token donation:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// This would be implemented in a real application
async function updateCampaignStats(campaignId: string, amount: string, incentiveId?: string) {
  // Connect to database and update campaign stats
  // Example with MongoDB:
  // const db = await connectToDatabase();
  // 
  // // Update campaign stats
  // await db.collection('campaigns').updateOne(
  //   { _id: campaignId },
  //   { 
  //     $inc: { 
  //       currentAmount: amount,
  //       stakedAmount: amount,
  //       donorsCount: 1
  //     }
  //   }
  // );
  // 
  // // If an incentive was claimed, update its claimed slots
  // if (incentiveId) {
  //   await db.collection('campaigns').updateOne(
  //     { 
  //       _id: campaignId,
  //       'incentives.id': incentiveId
  //     },
  //     {
  //       $inc: {
  //         'incentives.$.claimedSlots': 1
  //       }
  //     }
  //   );
  // }
} 