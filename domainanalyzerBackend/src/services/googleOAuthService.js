"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOAuth2Client = createOAuth2Client;
exports.getAuthUrl = getAuthUrl;
exports.exchangeCodeForTokens = exchangeCodeForTokens;
exports.refreshAccessToken = refreshAccessToken;
exports.isTokenExpired = isTokenExpired;
const googleapis_1 = require("googleapis");
const tokenEncryption_1 = require("./tokenEncryption");
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3002/api/auth/google/callback';
if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ ERROR: Google OAuth credentials not configured!');
    console.error('Please set the following in your .env file:');
    console.error('  GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com');
    console.error('  GOOGLE_CLIENT_SECRET=your-client-secret');
    console.error('  GOOGLE_REDIRECT_URI=http://localhost:3002/api/auth/google/callback');
}
else {
    console.log('✅ Google OAuth credentials loaded');
    console.log(`   Client ID: ${CLIENT_ID.substring(0, 20)}...`);
    console.log(`   Redirect URI: ${REDIRECT_URI}`);
}
/**
 * Creates OAuth2 client instance
 */
function createOAuth2Client() {
    return new googleapis_1.google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}
/**
 * Generates OAuth2 authorization URL
 * @param state - CSRF protection token
 * @returns Authorization URL
 */
function getAuthUrl(state) {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
    }
    const oauth2Client = createOAuth2Client();
    const scopes = [
        'https://www.googleapis.com/auth/webmasters.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
    ];
    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline', // Required to get refresh token
        scope: scopes,
        state: state,
        prompt: 'consent' // Force consent screen to ensure refresh token
    });
    console.log('Generated OAuth URL with:', {
        clientId: CLIENT_ID?.substring(0, 20) + '...',
        redirectUri: REDIRECT_URI,
        scopes
    });
    return url;
}
/**
 * Exchanges authorization code for tokens
 * @param code - Authorization code from Google callback
 * @returns Tokens and user info
 */
async function exchangeCodeForTokens(code) {
    const oauth2Client = createOAuth2Client();
    try {
        const { tokens } = await oauth2Client.getToken(code);
        if (!tokens.access_token || !tokens.refresh_token) {
            throw new Error('Failed to get tokens from Google');
        }
        // Get user info (optional - if it fails, we'll continue without it)
        let email = null;
        let googleUserId = null;
        try {
            oauth2Client.setCredentials(tokens);
            const oauth2 = googleapis_1.google.oauth2({ version: 'v2', auth: oauth2Client });
            const userInfo = await oauth2.userinfo.get();
            email = userInfo.data.email || null;
            googleUserId = userInfo.data.id || null;
        }
        catch (userInfoError) {
            console.warn('Could not fetch user info (this is optional):', userInfoError);
            // Continue without user info - we can get it later from Search Console API if needed
        }
        return {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : new Date(Date.now() + 3600000), // Default 1 hour
            email: email,
            googleUserId: googleUserId
        };
    }
    catch (error) {
        console.error('Error exchanging code for tokens:', error);
        if (error.response?.data) {
            console.error('Error details:', error.response.data);
        }
        throw new Error(`Failed to exchange authorization code for tokens: ${error.message}`);
    }
}
/**
 * Refreshes access token using refresh token
 * @param encryptedRefreshToken - Encrypted refresh token from database
 * @returns New access token and expiry
 */
async function refreshAccessToken(encryptedRefreshToken) {
    try {
        const refreshToken = (0, tokenEncryption_1.decryptToken)(encryptedRefreshToken);
        const oauth2Client = createOAuth2Client();
        oauth2Client.setCredentials({
            refresh_token: refreshToken
        });
        const { credentials } = await oauth2Client.refreshAccessToken();
        if (!credentials.access_token) {
            throw new Error('Failed to refresh access token');
        }
        return {
            accessToken: credentials.access_token,
            expiryDate: credentials.expiry_date
                ? new Date(credentials.expiry_date)
                : new Date(Date.now() + 3600000) // Default 1 hour
        };
    }
    catch (error) {
        console.error('Error refreshing access token:', error);
        throw new Error('Failed to refresh access token. User may need to reconnect.');
    }
}
/**
 * Checks if token is expired or will expire soon (within 5 minutes)
 */
function isTokenExpired(expiryDate) {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    return expiryDate <= fiveMinutesFromNow;
}
