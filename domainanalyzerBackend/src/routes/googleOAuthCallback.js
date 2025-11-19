"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addStateToken = addStateToken;
exports.handleOAuthCallback = handleOAuthCallback;
const prisma_1 = require("../../generated/prisma");
const googleOAuthService_1 = require("../services/googleOAuthService");
const tokenEncryption_1 = require("../services/tokenEncryption");
const prisma = new prisma_1.PrismaClient();
// Store state tokens temporarily (in production, use Redis or similar)
const stateTokens = new Map();
// Clean up expired state tokens every 10 minutes
setInterval(() => {
    const now = new Date();
    for (const [state, data] of stateTokens.entries()) {
        if (now > data.expiresAt) {
            stateTokens.delete(state);
        }
    }
}, 10 * 60 * 1000);
// Export function to add state token (called from GSC router)
function addStateToken(state, userId, expiresAt) {
    stateTokens.set(state, { userId, expiresAt });
}
/**
 * GET /api/auth/google/callback
 * Handles OAuth callback from Google
 */
async function handleOAuthCallback(req, res) {
    const { code, state, error } = req.query;
    if (error) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/integration?error=${encodeURIComponent(error)}`);
    }
    if (!code || !state) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/integration?error=missing_code_or_state`);
    }
    // Verify state token
    const stateData = stateTokens.get(state);
    if (!stateData) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/integration?error=invalid_state`);
    }
    // Check if expired
    if (new Date() > stateData.expiresAt) {
        stateTokens.delete(state);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/integration?error=state_expired`);
    }
    const userId = stateData.userId;
    stateTokens.delete(state); // Use once
    try {
        // Exchange code for tokens
        const { accessToken, refreshToken, expiryDate } = await (0, googleOAuthService_1.exchangeCodeForTokens)(code);
        // Get user info
        const userInfo = await (0, googleOAuthService_1.getUserInfo)(accessToken);
        // Encrypt refresh token
        const encryptedRefreshToken = (0, tokenEncryption_1.encryptToken)(refreshToken);
        // Save or update connection in database
        await prisma.googleSearchConsoleConnection.upsert({
            where: { userId },
            update: {
                googleEmail: userInfo.email,
                googleUserId: userInfo.id,
                accessToken,
                refreshToken: encryptedRefreshToken,
                tokenExpiry: expiryDate,
                isConnected: true,
                lastSyncedAt: new Date()
            },
            create: {
                userId,
                googleEmail: userInfo.email,
                googleUserId: userInfo.id,
                accessToken,
                refreshToken: encryptedRefreshToken,
                tokenExpiry: expiryDate,
                isConnected: true,
                lastSyncedAt: new Date()
            }
        });
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/integration?success=true`);
    }
    catch (error) {
        console.error('Error in OAuth callback:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/integration?error=oauth_failed`);
    }
}
