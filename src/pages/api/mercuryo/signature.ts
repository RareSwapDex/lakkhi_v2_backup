import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

/**
 * Generate a signature for Mercuryo widget
 * @param params Parameters to include in the signature
 * @returns The generated signature
 */
const generateMercuryoSignature = (params: Record<string, string | number>): string => {
  const secretKey = process.env.MERCURYO_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('Mercuryo secret key not configured');
  }
  
  // Sort parameters alphabetically
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, string | number>);
  
  // Create a string of key=value pairs
  const paramsString = Object.entries(sortedParams)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  
  // Create signature using SHA-256 HMAC
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(paramsString)
    .digest('hex');
  
  return signature;
};

/**
 * API handler for generating Mercuryo signatures
 * This is a secure backend endpoint that generates signatures using the secret key
 * which should never be exposed to the client
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, currency, fiatCurrency, fiatAmount } = req.body;
    
    // Validate required parameters
    if (!address || !currency || !fiatCurrency || !fiatAmount) {
      return res.status(400).json({
        error: 'Missing required parameters',
      });
    }
    
    // Get Mercuryo widget ID from environment
    const widgetId = process.env.NEXT_PUBLIC_MERCURYO_WIDGET_ID;
    
    if (!widgetId) {
      return res.status(500).json({
        error: 'Mercuryo widget ID not configured',
      });
    }
    
    // Create params object for signature generation
    const params: Record<string, string | number> = {
      widget_id: widgetId,
      address: address,
      currency: currency,
      fiat_currency: fiatCurrency,
      fiat_amount: fiatAmount,
    };
    
    // Generate signature
    const signature = generateMercuryoSignature(params);
    
    // Return the signature
    return res.status(200).json({ signature });
  } catch (error) {
    console.error('Error generating Mercuryo signature:', error);
    return res.status(500).json({
      error: 'Failed to generate signature',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 