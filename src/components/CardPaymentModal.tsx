import React, { useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { initMercuryoWidget } from '@/services/mercuryo-service';
import { debugLog } from '@/utils/debug-utils';
import { useWallet } from '@solana/wallet-adapter-react';
import { getCurrentWallet } from '@/services/solana-wallet-service';

interface CardPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onFailure: (error: string) => void;
  amount: number;
  campaignAddress: string;
}

const CardPaymentModal: React.FC<CardPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onFailure,
  amount,
  campaignAddress
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidEmail, setIsValidEmail] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const wallet = useWallet();
  const [userWallet, setUserWallet] = useState<{ email: string; publicKey: string } | null>(null);
  
  // Load user wallet from cookie on component mount
  useEffect(() => {
    const currentWallet = getCurrentWallet();
    if (currentWallet) {
      setUserWallet(currentWallet);
      setEmail(currentWallet.email); // Pre-fill email if available
      setIsValidEmail(validateEmail(currentWallet.email));
    }
  }, []);

  // Create container for Mercuryo widget when modal opens
  useEffect(() => {
    if (isOpen) {
      debugLog('CardPaymentModal opened', { amount, campaignAddress });
      
      // Clear any existing container
      const existingContainer = document.getElementById('mercuryo-widget-container');
      if (existingContainer) {
        existingContainer.remove();
      }
      
      // Create container for the modal
      const container = document.createElement('div');
      container.id = 'mercuryo-widget-container';
      container.style.width = '100%';
      container.style.minHeight = '300px';
      
      // Only append it to DOM when we're processing
      if (isProcessing) {
        const parentElement = document.getElementById('payment-widget-container');
        if (parentElement) {
          parentElement.appendChild(container);
          debugLog('Attached Mercuryo container to payment-widget-container');
        } else {
          document.body.appendChild(container);
          debugLog('Attached Mercuryo container to body');
        }
      }
    }
    
    return () => {
      // Clean up on modal close
      const container = document.getElementById('mercuryo-widget-container');
      if (container) {
        container.remove();
        debugLog('Removed Mercuryo container on modal close');
      }
    };
  }, [isOpen, isProcessing, amount, campaignAddress, email]);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setIsValidEmail(validateEmail(value));
  };

  const handleProceed = async () => {
    if (!isValidEmail) return;
    
    setIsLoading(true);
    setIsProcessing(true);
    setErrorMessage(null);
    
    debugLog('Proceeding with payment', { email, amount, campaignAddress });
    
    try {
      // If we don't have a user wallet with this email, create one
      if (!userWallet || userWallet.email !== email) {
        // Create a wallet for this email
        const response = await fetch('/api/wallet/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to create wallet');
        }
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to create wallet');
        }
        
        // Use the newly created wallet address
        debugLog('Created wallet for payment', { address: data.wallet.address });
      }
      
      // Now proceed with the payment
      await initMercuryoWidget(
        amount,
        campaignAddress,
        userWallet?.publicKey || wallet?.publicKey?.toString() || '',
        (txHash) => {
          debugLog('Payment successful', { txHash });
          setIsLoading(false);
          setIsProcessing(false);
          onSuccess();
          onClose();
        },
        (error) => {
          debugLog('Payment failed', { error });
          setErrorMessage(error);
          setIsLoading(false);
          setIsProcessing(false);
          onFailure(error);
        },
        () => {
          debugLog('Payment widget closed');
          setIsLoading(false);
          setIsProcessing(false);
        }
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Payment initialization failed';
      debugLog('Exception during payment', { error });
      setErrorMessage(errorMsg);
      setIsLoading(false);
      setIsProcessing(false);
      onFailure(errorMsg);
    }
  };

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="fixed inset-0 z-50 overflow-y-auto" onClose={onClose}>
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black opacity-30" />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span className="inline-block h-screen align-middle" aria-hidden="true">
            &#8203;
          </span>
          
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                Credit Card Payment
              </Dialog.Title>
              
              <div className="mt-2">
                {errorMessage && (
                  <div className="mb-4 text-sm text-red-600 p-2 bg-red-50 border border-red-200 rounded">
                    Error: {errorMessage}
                  </div>
                )}
                
                {!isProcessing ? (
                  <>
                    <p className="mb-4 text-sm text-gray-500">
                      Enter your email to proceed with a credit card payment of ${amount.toFixed(2)} USD
                    </p>
                    
                    <div className="mt-4">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <input
                        type="email"
                        id="email"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="your@email.com"
                        value={email}
                        onChange={handleEmailChange}
                        disabled={isLoading}
                      />
                      {email && !isValidEmail && (
                        <p className="mt-1 text-sm text-red-600">Please enter a valid email address</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="my-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Processing your payment... Please wait.
                    </p>
                    <p className="text-xs text-gray-500">
                      You will be redirected to the payment provider shortly.
                    </p>
                  </div>
                )}
                
                <div id="payment-widget-container" className="mt-4">
                  {isLoading && (
                    <div className="flex justify-center items-center py-8">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing payment...</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                {!isProcessing && (
                  <>
                    <button
                      type="button"
                      className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-transparent rounded-md hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
                      onClick={onClose}
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
                      onClick={handleProceed}
                      disabled={!isValidEmail || isLoading}
                    >
                      Continue to Payment
                    </button>
                  </>
                )}
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

export default CardPaymentModal; 