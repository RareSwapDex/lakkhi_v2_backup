// Import our shim implementations
import * as SolanaShims from './solana-shims';

// Re-export everything from our shims as if it were the real web3.js module
export const PublicKey = SolanaShims.PublicKey;
export const Transaction = SolanaShims.Transaction;
export const Connection = SolanaShims.Connection;
export const Keypair = SolanaShims.Keypair;
export const Message = SolanaShims.Message;
export const VersionedMessage = SolanaShims.VersionedMessage;
export const VersionedTransaction = SolanaShims.VersionedTransaction;
export const SIGNATURE_LENGTH_IN_BYTES = SolanaShims.SIGNATURE_LENGTH_IN_BYTES;
export const LAMPORTS_PER_SOL = SolanaShims.LAMPORTS_PER_SOL;
export const SystemProgram = SolanaShims.SystemProgram;

// Module augmentation - this ensures TypeScript recognizes our implementation
declare module '@solana/web3.js' {
  export const PublicKey: typeof SolanaShims.PublicKey;
  export const Transaction: typeof SolanaShims.Transaction;
  export const Connection: typeof SolanaShims.Connection;
  export const Keypair: typeof SolanaShims.Keypair;
  export const Message: typeof SolanaShims.Message;
  export const VersionedMessage: typeof SolanaShims.VersionedMessage;
  export const VersionedTransaction: typeof SolanaShims.VersionedTransaction;
  export const SIGNATURE_LENGTH_IN_BYTES: typeof SolanaShims.SIGNATURE_LENGTH_IN_BYTES;
  export const LAMPORTS_PER_SOL: typeof SolanaShims.LAMPORTS_PER_SOL;
  export const SystemProgram: typeof SolanaShims.SystemProgram;
} 