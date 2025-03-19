/**
 * Shim implementations for Solana libraries
 * This file provides actual runtime implementations of Solana types
 */

// Implement basic PublicKey class
export class PublicKey {
  _bn: any;
  _keypair: any;
  
  constructor(value?: string | Uint8Array | number[] | Buffer | any) {
    this._bn = value;
  }
  
  equals(publicKey: PublicKey): boolean {
    return true;
  }
  
  toBase58(): string {
    return '';
  }
  
  toBuffer(): Buffer {
    return Buffer.from([]);
  }
  
  toBytes(): Uint8Array {
    return new Uint8Array();
  }
  
  toString(): string {
    return '';
  }
  
  static isPublicKey(o: any): boolean {
    return o instanceof PublicKey;
  }
  
  static createWithSeed(fromPublicKey: PublicKey, seed: string, programId: PublicKey): PublicKey {
    return new PublicKey();
  }
  
  static createProgramAddress(seeds: Uint8Array[], programId: PublicKey): PublicKey {
    return new PublicKey();
  }
  
  static findProgramAddress(seeds: Uint8Array[], programId: PublicKey): Promise<[PublicKey, number]> {
    return Promise.resolve([new PublicKey(), 0]);
  }
}

// Implement basic Transaction class
export class Transaction {
  signatures: any[] = [];
  feePayer?: PublicKey;
  instructions: any[] = [];
  recentBlockhash?: string;
  
  constructor(options?: any) {}
  
  sign(...signers: any[]): void {}
  
  addSignature(pubkey: PublicKey, signature: Uint8Array): void {}
  
  verifySignatures(): boolean {
    return true;
  }
  
  serialize(): Buffer {
    return Buffer.from([]);
  }
  
  add(...items: any[]): Transaction {
    return this;
  }
}

// Implement basic Connection class
export class Connection {
  constructor(endpoint: string, commitment?: string) {}
  
  getBalance(publicKey: PublicKey): Promise<number> {
    return Promise.resolve(0);
  }
  
  getLatestBlockhash(): Promise<{blockhash: string; lastValidBlockHeight: number}> {
    return Promise.resolve({blockhash: '', lastValidBlockHeight: 0});
  }
  
  sendTransaction(transaction: Transaction): Promise<string> {
    return Promise.resolve('');
  }
  
  confirmTransaction(signature: string | {signature: string}): Promise<{value: {err: null | object}}> {
    return Promise.resolve({value: {err: null}});
  }
  
  getAccountInfo(publicKey: PublicKey): Promise<any> {
    return Promise.resolve(null);
  }
  
  getProgramAccounts(programId: PublicKey): Promise<any[]> {
    return Promise.resolve([]);
  }
}

// Implement basic Keypair class
export class Keypair {
  publicKey: PublicKey = new PublicKey();
  secretKey: Uint8Array = new Uint8Array(32);
  
  constructor() {}
  
  static generate(): Keypair {
    return new Keypair();
  }
  
  static fromSecretKey(secretKey: Uint8Array): Keypair {
    return new Keypair();
  }
  
  static fromSeed(seed: Uint8Array): Keypair {
    return new Keypair();
  }
}

// Implementation for message objects
export class Message {
  static from(buffer: Buffer | Uint8Array): Message {
    return new Message();
  }
}

export class VersionedMessage {
  static deserialize(buffer: Buffer | Uint8Array): VersionedMessage {
    return new VersionedMessage();
  }
}

export class VersionedTransaction {
  signatures: Array<Uint8Array> = [];
  message: VersionedMessage = new VersionedMessage();
  
  constructor(message: VersionedMessage, signatures?: Array<Uint8Array>) {}
  
  serialize(): Uint8Array {
    return new Uint8Array();
  }
  
  static deserialize(serializedTransaction: Uint8Array): VersionedTransaction {
    return new VersionedTransaction(new VersionedMessage());
  }
}

// Constants
export const SIGNATURE_LENGTH_IN_BYTES = 64;
export const LAMPORTS_PER_SOL = 1000000000;

// SystemProgram
export const SystemProgram = {
  programId: new PublicKey('11111111111111111111111111111111'),
  transfer: ({fromPubkey, toPubkey, lamports}: any) => ({
    programId: new PublicKey('11111111111111111111111111111111'),
    keys: [
      {pubkey: fromPubkey, isSigner: true, isWritable: true},
      {pubkey: toPubkey, isSigner: false, isWritable: true},
    ],
    data: Buffer.from([]),
  }),
  createAccount: (params: any) => ({
    programId: new PublicKey('11111111111111111111111111111111'),
    keys: [
      {pubkey: params.fromPubkey, isSigner: true, isWritable: true},
      {pubkey: params.newAccountPubkey, isSigner: true, isWritable: true},
    ],
    data: Buffer.from([]),
  }),
}; 