/**
 * Mock implementation of @solana/web3.js
 */

// Utility function to create a buffer
function createBuffer(data) {
  return Buffer.from(data || []);
}

// Define clusterApiUrl function
const clusterApiUrl = (cluster) => `https://api.${cluster || 'devnet'}.solana.com`;

// PublicKey implementation
class PublicKey {
  constructor(value) {
    this._key = value;
  }
  
  equals() { return true; }
  toBase58() { return ''; }
  toBuffer() { return createBuffer(); }
  toString() { return ''; }
  
  static isPublicKey(obj) { return obj instanceof PublicKey; }
  static createWithSeed() { return new PublicKey(); }
  static createProgramAddress() { return new PublicKey(); }
  static findProgramAddress() { return Promise.resolve([new PublicKey(), 0]); }
}

// Transaction implementation
class Transaction {
  constructor() {
    this.signatures = [];
    this.feePayer = null;
    this.instructions = [];
    this.recentBlockhash = null;
  }
  
  add() { return this; }
  sign() { return this; }
  serialize() { return createBuffer(); }
  
  static from() { return new Transaction(); }
}

// Connection implementation
class Connection {
  constructor() {}
  
  getBalance() { return Promise.resolve(0); }
  getLatestBlockhash() { return Promise.resolve({ blockhash: '', lastValidBlockHeight: 0 }); }
  confirmTransaction() { return Promise.resolve({ value: { err: null } }); }
  getAccountInfo() { return Promise.resolve(null); }
  getProgramAccounts() { return Promise.resolve([]); }
  sendRawTransaction() { return Promise.resolve(''); }
  getRecentBlockhash() { return Promise.resolve({ blockhash: '', feeCalculator: { lamportsPerSignature: 0 } }); }
}

// Keypair implementation
class Keypair {
  constructor() {
    this.publicKey = new PublicKey();
    this.secretKey = new Uint8Array(32);
  }
  
  static generate() { return new Keypair(); }
  static fromSecretKey() { return new Keypair(); }
  static fromSeed() { return new Keypair(); }
}

// Message implementations
class Message {
  constructor() {}
  serialize() { return new Uint8Array(); }
  static from() { return new Message(); }
}

class VersionedMessage {
  constructor() {}
  static deserialize() { return new VersionedMessage(); }
}

class VersionedTransaction {
  constructor(message) {
    this.signatures = [];
    this.message = message || new VersionedMessage();
  }
  
  serialize() { return new Uint8Array(); }
  static deserialize() { return new VersionedTransaction(); }
}

// Constants
const SIGNATURE_LENGTH_IN_BYTES = 64;
const LAMPORTS_PER_SOL = 1000000000;

// System Program
const SystemProgram = {
  programId: new PublicKey('11111111111111111111111111111111'),
  transfer: () => ({
    programId: new PublicKey('11111111111111111111111111111111'),
    keys: [],
    data: createBuffer()
  }),
  createAccount: () => ({
    programId: new PublicKey('11111111111111111111111111111111'),
    keys: [],
    data: createBuffer()
  })
};

// Commitment enum
const Commitment = { 
  confirmed: 'confirmed', 
  finalized: 'finalized',
  processed: 'processed'
};

// ES Module exports for TypeScript
export {
  PublicKey,
  Transaction,
  Connection,
  Keypair,
  Message,
  VersionedMessage,
  VersionedTransaction,
  SIGNATURE_LENGTH_IN_BYTES,
  LAMPORTS_PER_SOL,
  SystemProgram,
  clusterApiUrl,
  Commitment
};

// CommonJS exports for Node.js
module.exports = {
  PublicKey,
  Transaction,
  Connection,
  Keypair,
  Message,
  VersionedMessage,
  VersionedTransaction,
  SIGNATURE_LENGTH_IN_BYTES,
  LAMPORTS_PER_SOL,
  SystemProgram,
  clusterApiUrl,
  Commitment
}; 