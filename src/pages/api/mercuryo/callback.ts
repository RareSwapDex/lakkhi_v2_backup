import { NextApiRequest, NextApiResponse } from 'next';
import { processCardPaymentDonation } from '@/services/token-swap-service';
import { Connection } from '@solana/web3.js';
import crypto from 'crypto';

/**
 * Verify the signature from Mercuryo callback
 * @param payload The callback payload
 * @param receivedSignature The signature received from Mercuryo
 * @returns true if signature is valid
 */
const verifySignature = (
  payload: Record<string, any>, 
  receivedSignature: string
): boolean => {
  try {
    const secretKey = process.env.MERCURYO_SECRET_KEY;
    
    if (!secretKey) {
      throw new Error('Mercuryo secret key not configured');
    }
    
    // Remove the signature field for signature calculation
    const { signature, ...dataForSignature } = payload;
    
    // Sort parameters alphabetically
    const sortedParams = Object.keys(dataForSignature)
      .sort()
      .reduce((acc, key) => {
        acc[key] = dataForSignature[key];
        return acc;
      }, {} as Record<string, any>);
    
    // Create a string of key=value pairs
    const paramsString = Object.entries(sortedParams)
      .map(([key, value]) => {
        // Handle nested objects by stringifying them
        const val = typeof value === 'object' ? JSON.stringify(value) : value;
        return `${key}=${val}`;
      })
      .join('&');
    
    // Create expected signature using SHA-256 HMAC
    const expectedSignature = crypto
      .createHmac('sha256', secretKey)
      .update(paramsString)
      .digest('hex');
    
    return expectedSignature === receivedSignature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
};

/**
 * API handler for Mercuryo callbacks
 * This receives payment status updates from Mercuryo and processes donations
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    const signature = payload.signature;
    
    // Verify the signature
    if (!signature || !verifySignature(payload, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Check transaction status
    if (payload.status !== 'success') {
      console.log(`Mercuryo payment ${payload.id} status: ${payload.status}`);
      return res.status(200).json({ 
        message: `Payment status: ${payload.status}` 
      });
    }
    
    // Get transaction details
    const { 
      id: transactionId, 
      email,
      fiat_amount: fiatAmount,
      metadata
    } = payload;
    
    // Process the donation
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com'
    );
    
    // Extract campaign address from metadata
    const campaignAddress = metadata?.campaign_address;
    
    if (!campaignAddress) {
      console.error('No campaign address in metadata');
      return res.status(400).json({ error: 'Missing campaign address' });
    }
    
    // Process the donation by swapping SOL to LAKKHI and making the donation
    const result = await processCardPaymentDonation(
      email,
      fiatAmount,
      campaignAddress,
      connection
    );
    
    if (result) {
      return res.status(200).json({
        success: true,
        message: 'Donation processed successfully',
        transactionSignature: result
      });
    } else {
      console.error('Failed to process donation');
      return res.status(500).json({
        error: 'Failed to process donation'
      });
    }
  } catch (error) {
    console.error('Error processing Mercuryo callback:', error);
    return res.status(500).json({
      error: 'Failed to process callback',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 