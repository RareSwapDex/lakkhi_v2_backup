import axios from 'axios';
import crypto from 'crypto';
import { donateToCampaign } from '@/utils/anchor-client';
import { MERCURYO_CONFIG, TOKEN_CONFIG, getLiveMode } from '@/utils/constants';
import { debugLog } from '@/utils/debug-utils';

// Define the Mercuryo window type
declare global {
  interface Window {
    Mercuryo?: {
      run: (options: any) => void;
    };
  }
}

// Mercuryo widget options interface
interface MercuryoWidgetOptions {
  widget_id: string;
  type?: string;
  currency?: string;
  fiat_currency?: string;
  signature?: string;
  address?: string;
  email?: string;
  host_element?: string | HTMLElement;
  amount?: number;
  redirect_url?: string;
  theme?: {
    main_color?: string;
    secondary_color?: string;
    main_background?: string;
    card_background?: string;
    card_border?: string;
    text_color?: string;
    secondary_text_color?: string;
    [key: string]: any;
  };
  transaction_id?: string;
  [key: string]: any;
}

// Track script loading state
let mercuryoLoaded = false;
let mercuryoLoadingPromise: Promise<boolean> | null = null;

/**
 * Initialize the Mercuryo widget for payment processing
 */
export async function initMercuryoWidget(
  amountOrParams: number | {
    amount: number;
    campaignAddress: string;
    walletAddress?: string;
    fiatCurrency?: string;
    email?: string;
  },
  campaignAddress?: string,
  walletAddress?: string,
  onSuccess?: (txHash: string) => void,
  onError?: (error: string) => void,
  onClose?: () => void
): Promise<void> {
  // Support both parameter formats for backward compatibility
  let amount: number;
  let actualCampaignAddress: string;
  let actualWalletAddress: string = '';
  let actualOnSuccess: (txHash: string) => void = () => {};
  let actualOnError: (error: string) => void = () => {};
  let actualOnClose: () => void = () => {};
  let email: string = '';
  let fiatCurrency: string = 'USD';

  // Handle object parameter format (legacy)
  if (typeof amountOrParams === 'object') {
    amount = amountOrParams.amount;
    actualCampaignAddress = amountOrParams.campaignAddress;
    actualWalletAddress = amountOrParams.walletAddress || '';
    email = amountOrParams.email || '';
    fiatCurrency = amountOrParams.fiatCurrency || 'USD';
    
    // For object format, callbacks must be passed via event listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('mercuryo-payment-success', ((event: CustomEvent) => {
        const detail = event.detail;
        if (detail && detail.txHash) {
          console.log('Payment successful:', detail.txHash);
        }
      }) as EventListener, { once: true });
      
      window.addEventListener('mercuryo-payment-error', ((event: CustomEvent) => {
        const detail = event.detail;
        if (detail && detail.error) {
          console.error('Payment error:', detail.error);
        }
      }) as EventListener, { once: true });
      
      window.addEventListener('mercuryo-payment-close', (() => {
        console.log('Payment widget closed');
      }) as EventListener, { once: true });
    }
  } 
  // Handle individual parameters format (new)
  else {
    amount = amountOrParams;
    actualCampaignAddress = campaignAddress || '';
    actualWalletAddress = walletAddress || '';
    actualOnSuccess = onSuccess || (() => {});
    actualOnError = onError || (() => {});
    actualOnClose = onClose || (() => {});
  }

  debugLog('Initializing Mercuryo widget with parameters:', { amount, campaignAddress: actualCampaignAddress, walletAddress: actualWalletAddress });

  if (typeof window === 'undefined') {
    if (typeof amountOrParams === 'object') {
      // Can't dispatch event server-side
      console.error('Cannot initialize Mercuryo widget server-side');
    } else {
      actualOnError('Cannot initialize Mercuryo widget server-side');
    }
    return;
  }

  try {
    // Load script if needed
    if (!mercuryoLoaded) {
      debugLog('Loading Mercuryo script...');
      await loadMercuryoScript();
    }

    // Generate transaction ID and signature
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const transactionId = `tx_${timestamp}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Create or find container
    const container = document.getElementById('mercuryo-widget-container');
    if (!container) {
      if (typeof amountOrParams === 'object') {
        const errorEvent = new CustomEvent('mercuryo-payment-error', {
          detail: { error: 'Widget container not found' }
        });
        window.dispatchEvent(errorEvent);
      } else {
        actualOnError('Widget container not found');
      }
      return;
    }

    // Clear container
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Create signature params
    const signatureParams = {
      widget_id: MERCURYO_CONFIG.WIDGET_ID,
      currency: 'LAKKHI',
      fiat_currency: fiatCurrency,
      amount: amount,
      address: TOKEN_CONFIG.LAKKHI_TOKEN_MINT.toString(),
      signature_required: true,
      transaction_id: transactionId
    };
    
    debugLog('Creating signature with params:', signatureParams);
    const signature = await createSignature(signatureParams);
    debugLog('Generated signature:', signature);

    // Configure widget options
    const options: MercuryoWidgetOptions = {
      widget_id: MERCURYO_CONFIG.WIDGET_ID,
      type: 'buy',
      currency: 'LAKKHI',
      fiat_currency: fiatCurrency,
      amount: amount,
      address: TOKEN_CONFIG.LAKKHI_TOKEN_MINT.toString(),
      email: email, // Optional user email
      signature: signature,
      host_element: container,
      redirect_url: MERCURYO_CONFIG.REDIRECT_URL,
      transaction_id: transactionId,
      theme: {
        main_color: '#6366f1',  // Primary brand color
        secondary_color: '#4f46e5',
        main_background: '#f9fafb',
        card_background: '#ffffff',
        card_border: '#e5e7eb',
        text_color: '#1f2937',
        secondary_text_color: '#6b7280'
      }
    };

    debugLog('Initializing Mercuryo widget with options:', options);

    // Run the widget
    if (window.Mercuryo) {
      window.Mercuryo.run(options);
      
      // Attach status change listener
      window.addEventListener('message', function mercuryoListener(event) {
        if (event.data && event.data.type === 'mercuryo-event') {
          debugLog('Mercuryo event received:', event.data);
          
          switch (event.data.status) {
            case 'success':
              debugLog('Payment successful:', event.data.payload);
              try {
                // Convert to LAKKHI tokens
                const lakkhiAmount = amount * 10;
                
                // Call the donation method
                donateToCampaign(actualCampaignAddress, lakkhiAmount)
                  .then(() => {
                    if (typeof amountOrParams === 'object') {
                      const successEvent = new CustomEvent('mercuryo-payment-success', {
                        detail: { txHash: event.data.payload.transaction_hash || transactionId }
                      });
                      window.dispatchEvent(successEvent);
                    } else {
                      actualOnSuccess(event.data.payload.transaction_hash || transactionId);
                    }
                  })
                  .catch((error) => {
                    console.error('Error processing donation:', error);
                    if (typeof amountOrParams === 'object') {
                      const errorEvent = new CustomEvent('mercuryo-payment-error', {
                        detail: { error: error instanceof Error ? error.message : 'Donation processing failed' }
                      });
                      window.dispatchEvent(errorEvent);
                    } else {
                      actualOnError(error instanceof Error ? error.message : 'Donation processing failed');
                    }
                  });
              } catch (error) {
                console.error('Error in success handler:', error);
                if (typeof amountOrParams === 'object') {
                  const errorEvent = new CustomEvent('mercuryo-payment-error', {
                    detail: { error: 'Payment successful but donation failed' }
                  });
                  window.dispatchEvent(errorEvent);
                } else {
                  actualOnError('Payment successful but donation failed');
                }
              }
              window.removeEventListener('message', mercuryoListener);
              break;
            case 'error':
              debugLog('Payment error:', event.data.payload);
              if (typeof amountOrParams === 'object') {
                const errorEvent = new CustomEvent('mercuryo-payment-error', {
                  detail: { error: event.data.payload.message || 'Payment failed' }
                });
                window.dispatchEvent(errorEvent);
              } else {
                actualOnError(event.data.payload.message || 'Payment failed');
              }
              window.removeEventListener('message', mercuryoListener);
              break;
            case 'close':
              debugLog('Widget closed');
              if (typeof amountOrParams === 'object') {
                const closeEvent = new CustomEvent('mercuryo-payment-close');
                window.dispatchEvent(closeEvent);
              } else {
                actualOnClose();
              }
              window.removeEventListener('message', mercuryoListener);
              break;
            default:
              debugLog('Unhandled Mercuryo event:', event.data);
          }
        }
      });
    } else {
      if (typeof amountOrParams === 'object') {
        const errorEvent = new CustomEvent('mercuryo-payment-error', {
          detail: { error: 'Mercuryo widget failed to load' }
        });
        window.dispatchEvent(errorEvent);
      } else {
        actualOnError('Mercuryo widget failed to load');
      }
    }
  } catch (error) {
    console.error('Error initializing Mercuryo widget:', error);
    if (typeof amountOrParams === 'object') {
      const errorEvent = new CustomEvent('mercuryo-payment-error', {
        detail: { error: 'Failed to initialize payment widget: ' + (error instanceof Error ? error.message : String(error)) }
      });
      window.dispatchEvent(errorEvent);
    } else {
      actualOnError('Failed to initialize payment widget: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
}

/**
 * Load the Mercuryo script
 */
async function loadMercuryoScript(): Promise<boolean> {
  if (mercuryoLoaded) return true;
  
  if (mercuryoLoadingPromise) return mercuryoLoadingPromise;
  
  mercuryoLoadingPromise = new Promise((resolve, reject) => {
    try {
      const script = document.createElement('script');
      script.src = 'https://widget.mercuryo.io/embed.2.0.js';
      script.crossOrigin = 'anonymous';
      script.async = true;
      
      // Add timeout
      const timeout = setTimeout(() => {
        debugLog('Mercuryo script load timeout');
        reject(new Error('Mercuryo script load timeout'));
      }, 10000);
      
      script.onload = () => {
        clearTimeout(timeout);
        debugLog('Mercuryo script loaded successfully');
        mercuryoLoaded = true;
        resolve(true);
      };
      
      script.onerror = () => {
        clearTimeout(timeout);
        debugLog('Error loading Mercuryo script');
        reject(new Error('Failed to load Mercuryo script'));
      };
      
      document.head.appendChild(script);
    } catch (error) {
      debugLog('Error in script loading process:', error);
      reject(error);
    }
  });
  
  try {
    await mercuryoLoadingPromise;
    return true;
  } catch (error) {
    mercuryoLoadingPromise = null; // Reset
    throw error;
  }
}

/**
 * Create a signature for Mercuryo transactions
 */
async function createSignature(params: Record<string, any>): Promise<string> {
  try {
    // Try backend first
    if (typeof window !== 'undefined') {
      try {
        const response = await axios.post('/api/mercuryo/signature', params);
        return response.data.signature;
      } catch (error) {
        console.error('Failed to get signature from backend, generating locally:', error);
      }
    }
    
    // Fallback: Generate client-side
    const signatureKey = MERCURYO_CONFIG.SIGNATURE_KEY;
    if (!signatureKey) {
      throw new Error('Missing Mercuryo signature key');
    }
    
    // Create the signature string
    const signatureString = Object.keys(params)
      .sort()
      .filter(key => key !== 'signature' && key !== 'signature_required')
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    // Create HMAC SHA-256 signature
    const signature = crypto
      .createHmac('sha256', signatureKey)
      .update(signatureString)
      .digest('hex');
    
    return signature;
  } catch (error) {
    console.error('Error creating Mercuryo signature:', error);
    throw new Error('Failed to create payment signature');
  }
} 