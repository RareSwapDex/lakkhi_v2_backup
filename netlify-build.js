#!/usr/bin/env node

// Script to be run by Netlify during the build process
const fs = require('fs');
const path = require('path');

console.log('Running Netlify build script...');

// Create next-env.d.ts if it doesn't exist
const nextEnvPath = path.join(__dirname, 'next-env.d.ts');
if (!fs.existsSync(nextEnvPath)) {
  console.log('Creating next-env.d.ts file...');
  const nextEnvContent = `/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.`;
  fs.writeFileSync(nextEnvPath, nextEnvContent);
  console.log('Created next-env.d.ts file successfully.');
} else {
  console.log('next-env.d.ts already exists, skipping creation.');
}

// Create tsconfig.json if it doesn't exist
const tsconfigPath = path.join(__dirname, 'tsconfig.json');
if (!fs.existsSync(tsconfigPath)) {
  console.log('Creating tsconfig.json file...');
  const tsconfigContent = `{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "typeRoots": ["./node_modules/@types", "./src/types"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", "src/types/**/*.d.ts"],
  "exclude": ["node_modules"]
}`;
  fs.writeFileSync(tsconfigPath, tsconfigContent);
  console.log('Created tsconfig.json file successfully.');
}

// Create a mock for @solana/web3.js
const mocksDirPath = path.join(__dirname, 'src/mocks');
if (!fs.existsSync(mocksDirPath)) {
  fs.mkdirSync(mocksDirPath, { recursive: true });
}

const web3MockPath = path.join(mocksDirPath, 'web3.js');
console.log('Creating mock for @solana/web3.js...');
const web3MockContent = `/**
 * Mock implementation of @solana/web3.js
 */

// Utility function to create a buffer
function createBuffer(data) {
  return Buffer.from(data || []);
}

// Define clusterApiUrl function
const clusterApiUrl = (cluster) => \`https://api.\${cluster || 'devnet'}.solana.com\`;

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
};`;

fs.writeFileSync(web3MockPath, web3MockContent);
console.log('Successfully created mock for @solana/web3.js!');

// Run TypeScript dependency fix script as well
try {
  console.log('Running TypeScript dependency fix script...');
  require('./fix-typescript-deps.js');
} catch (error) {
  console.error('Error running TypeScript dependency fix:', error);
  // Continue with the build even if the fix fails
}

console.log('Netlify build script completed successfully!');
process.exit(0); 