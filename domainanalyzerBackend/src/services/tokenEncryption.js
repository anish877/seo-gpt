"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptToken = encryptToken;
exports.decryptToken = decryptToken;
const crypto_js_1 = __importDefault(require("crypto-js"));
const ENCRYPTION_KEY = process.env.GOOGLE_ENCRYPTION_KEY || 'default-key-change-in-production-32chars';
/**
 * Encrypts a refresh token before storing in database
 */
function encryptToken(token) {
    try {
        const encrypted = crypto_js_1.default.AES.encrypt(token, ENCRYPTION_KEY).toString();
        return encrypted;
    }
    catch (error) {
        console.error('Error encrypting token:', error);
        throw new Error('Failed to encrypt token');
    }
}
/**
 * Decrypts a refresh token from database
 */
function decryptToken(encryptedToken) {
    try {
        const decrypted = crypto_js_1.default.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
        const decryptedString = decrypted.toString(crypto_js_1.default.enc.Utf8);
        if (!decryptedString) {
            throw new Error('Failed to decrypt token - invalid key or corrupted data');
        }
        return decryptedString;
    }
    catch (error) {
        console.error('Error decrypting token:', error);
        throw new Error('Failed to decrypt token');
    }
}
