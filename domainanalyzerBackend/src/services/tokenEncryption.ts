import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.GOOGLE_ENCRYPTION_KEY || 'default-key-change-in-production-32chars';

/**
 * Encrypts a refresh token before storing in database
 */
export function encryptToken(token: string): string {
  try {
    const encrypted = CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Error encrypting token:', error);
    throw new Error('Failed to encrypt token');
  }
}

/**
 * Decrypts a refresh token from database
 */
export function decryptToken(encryptedToken: string): string {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedString) {
      throw new Error('Failed to decrypt token - invalid key or corrupted data');
    }
    
    return decryptedString;
  } catch (error) {
    console.error('Error decrypting token:', error);
    throw new Error('Failed to decrypt token');
  }
}
