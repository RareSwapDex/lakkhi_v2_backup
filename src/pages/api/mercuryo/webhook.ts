import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

/**
 * Verify the signature from Mercuryo webhook
 * @param payload The webhook payload
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
 * API handler for Mercuryo webhooks
 * This endpoint receives transaction status updates from Mercuryo
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Log the webhook payload for debugging
    console.log('Received Mercuryo webhook:', JSON.stringify(req.body, null, 2));
    
    const payload = req.body;
    const signature = req.headers['x-mercuryo-signature'] as string;
    
    // Verify the signature if provided
    if (signature && !verifySignature(payload, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Process the webhook based on event type
    const eventType = payload.event;
    
    switch (eventType) {
      case 'transaction_status_changed':
        // Handle transaction status updates
        const { id, status, address, currency, amount } = payload.data || {};
        console.log(`Transaction ${id} status changed to ${status}`);
        
        // Store the transaction status in your database
        // This is important for reconciliation and tracking
        
        break;
      
      case 'widget_closed':
        // User closed the widget before completing payment
        console.log('User closed the widget');
        break;
      
      case 'error':
        // Handle error events
        console.error('Mercuryo error event:', payload.data);
        break;
      
      default:
        console.log(`Unhandled Mercuryo event type: ${eventType}`);
    }
    
    // Always return 200 OK for webhooks to acknowledge receipt
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing Mercuryo webhook:', error);
    
    // Still return 200 to prevent Mercuryo from retrying
    // Log the error for your monitoring system
    return res.status(200).json({
      received: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 