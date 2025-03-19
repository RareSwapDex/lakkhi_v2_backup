import crypto from 'crypto';

/**
 * Encrypt a string using AES-256-CBC
 * @param text Text to encrypt
 * @param encryptionKey Key used for encryption
 * @returns Encrypted text
 */
export const encrypt = (text: string, encryptionKey: string): string => {
  try {
    // Create a hash of the encryption key to ensure it's the right length
    const key = crypto
      .createHash('sha256')
      .update(encryptionKey)
      .digest('hex')
      .slice(0, 32);
    
    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine IV and encrypted text
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt a string using AES-256-CBC
 * @param encryptedText Text to decrypt
 * @param encryptionKey Key used for decryption
 * @returns Decrypted text
 */
export const decrypt = (encryptedText: string, encryptionKey: string): string => {
  try {
    // Create a hash of the encryption key to ensure it's the right length
    const key = crypto
      .createHash('sha256')
      .update(encryptionKey)
      .digest('hex')
      .slice(0, 32);
    
    // Split IV and encrypted text
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    
    // Decrypt the text
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}; 