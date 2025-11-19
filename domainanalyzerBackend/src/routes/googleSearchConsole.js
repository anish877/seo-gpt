"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleOAuthCallback = exports.stateTokens = void 0;
const express_1 = require("express");
const prisma_1 = require("../../generated/prisma");
const auth_1 = require("../middleware/auth");
const googleOAuthService_1 = require("../services/googleOAuthService");
const tokenEncryption_1 = require("../services/tokenEncryption");
const googleSearchConsoleService_1 = require("../services/googleSearchConsoleService");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
const prisma = new prisma_1.PrismaClient();
function asyncHandler(fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// Store state tokens temporarily (in production, use Redis or session store)
exports.stateTokens = new Map();
// Clean up expired state tokens every 10 minutes
setInterval(() => {
    const now = new Date();
    for (const [state, data] of exports.stateTokens.entries()) {
        if (data.expiresAt < now) {
            exports.stateTokens.delete(state);
        }
    }
}, 10 * 60 * 1000);
/**
 * GET /api/gsc/auth/initiate
 * Initiates Google OAuth flow
 */
router.get('/auth/initiate', auth_1.authenticateToken, asyncHandler(async (req, res) => {
    const authReq = req;
    const userId = authReq.user.userId;
    // Generate CSRF state token
    const state = crypto_1.default.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    exports.stateTokens.set(state, { userId, expiresAt });
    // Generate OAuth URL
    try {
        const authUrl = (0, googleOAuthService_1.getAuthUrl)(state);
        res.json({
            success: true,
            authUrl
        });
    }
    catch (error) {
        console.error('Error generating OAuth URL:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate OAuth URL. Please check your Google OAuth configuration.'
        });
    }
}));
/**
 * OAuth callback handler (exported for use in index.ts at correct path)
 */
exports.handleOAuthCallback = asyncHandler(async (req, res) => {
    const { code, state, error } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectPath = '/newdashboard?tab=analytics&subtab=integration';
    if (error) {
        return res.redirect(`${frontendUrl}${redirectPath}&error=access_denied`);
    }
    if (!code || !state) {
        return res.redirect(`${frontendUrl}${redirectPath}&error=invalid_request`);
    }
    // Verify state token
    const stateData = exports.stateTokens.get(state);
    if (!stateData || stateData.expiresAt < new Date()) {
        exports.stateTokens.delete(state);
        return res.redirect(`${frontendUrl}${redirectPath}&error=invalid_state`);
    }
    const userId = stateData.userId;
    exports.stateTokens.delete(state);
    try {
        // Exchange code for tokens
        const tokens = await (0, googleOAuthService_1.exchangeCodeForTokens)(code);
        // Encrypt refresh token
        const encryptedRefreshToken = (0, tokenEncryption_1.encryptToken)(tokens.refreshToken);
        // Save or update connection
        await prisma.googleSearchConsoleConnection.upsert({
            where: { userId },
            update: {
                accessToken: tokens.accessToken,
                refreshToken: encryptedRefreshToken,
                tokenExpiry: tokens.expiryDate,
                googleEmail: tokens.email,
                googleUserId: tokens.googleUserId,
                isConnected: true,
                lastSyncedAt: new Date()
            },
            create: {
                userId,
                accessToken: tokens.accessToken,
                refreshToken: encryptedRefreshToken,
                tokenExpiry: tokens.expiryDate,
                googleEmail: tokens.email,
                googleUserId: tokens.googleUserId,
                isConnected: true,
                lastSyncedAt: new Date()
            }
        });
        res.redirect(`${frontendUrl}${redirectPath}&success=true`);
    }
    catch (error) {
        console.error('Error in OAuth callback:', error);
        res.redirect(`${frontendUrl}${redirectPath}&error=connection_failed`);
    }
});
/**
 * GET /api/gsc/status
 * Get connection status
 */
router.get('/status', auth_1.authenticateToken, asyncHandler(async (req, res) => {
    const authReq = req;
    const userId = authReq.user.userId;
    const connection = await prisma.googleSearchConsoleConnection.findUnique({
        where: { userId }
    });
    if (!connection || !connection.isConnected) {
        return res.json({
            success: true,
            connected: false
        });
    }
    res.json({
        success: true,
        connected: true,
        email: connection.googleEmail,
        selectedProperty: connection.selectedProperty,
        lastSyncedAt: connection.lastSyncedAt
    });
}));
/**
 * GET /api/gsc/properties
 * List user's Search Console properties
 */
router.get('/properties', auth_1.authenticateToken, asyncHandler(async (req, res) => {
    const authReq = req;
    const userId = authReq.user.userId;
    try {
        const properties = await (0, googleSearchConsoleService_1.listProperties)(userId);
        res.json({
            success: true,
            properties: properties.map(p => ({
                siteUrl: p.siteUrl,
                permissionLevel: p.permissionLevel
            }))
        });
    }
    catch (error) {
        console.error('Error listing properties:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list Search Console properties'
        });
    }
}));
/**
 * POST /api/gsc/select-property
 * User selects which property to use
 */
router.post('/select-property', auth_1.authenticateToken, asyncHandler(async (req, res) => {
    const authReq = req;
    const userId = authReq.user.userId;
    const { property } = req.body;
    if (!property) {
        return res.status(400).json({
            success: false,
            error: 'Property is required'
        });
    }
    try {
        // Verify property exists for user
        const properties = await (0, googleSearchConsoleService_1.listProperties)(userId);
        const propertyExists = properties.some(p => p.siteUrl === property);
        if (!propertyExists) {
            return res.status(400).json({
                success: false,
                error: 'Property not found or not accessible'
            });
        }
        // Update selected property
        await prisma.googleSearchConsoleConnection.update({
            where: { userId },
            data: { selectedProperty: property }
        });
        res.json({
            success: true,
            message: 'Property selected successfully'
        });
    }
    catch (error) {
        console.error('Error selecting property:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to select property'
        });
    }
}));
/**
 * GET /api/gsc/data
 * Fetch search analytics data
 */
router.get('/data', auth_1.authenticateToken, asyncHandler(async (req, res) => {
    const authReq = req;
    const userId = authReq.user.userId;
    const connection = await prisma.googleSearchConsoleConnection.findUnique({
        where: { userId }
    });
    if (!connection || !connection.isConnected || !connection.selectedProperty) {
        return res.status(400).json({
            success: false,
            error: 'Google Search Console not connected or no property selected'
        });
    }
    const { startDate, endDate, dimensions, rowLimit, startRow, searchType } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({
            success: false,
            error: 'startDate and endDate are required (YYYY-MM-DD format)'
        });
    }
    try {
        const query = {
            startDate: startDate,
            endDate: endDate,
            dimensions: dimensions ? dimensions.split(',') : ['query'],
            rowLimit: rowLimit ? parseInt(rowLimit) : 1000,
            startRow: startRow ? parseInt(startRow) : 0,
            searchType: searchType
        };
        const data = await (0, googleSearchConsoleService_1.querySearchAnalytics)(userId, connection.selectedProperty, query);
        // Update last synced time
        await prisma.googleSearchConsoleConnection.update({
            where: { userId },
            data: { lastSyncedAt: new Date() }
        });
        res.json({
            success: true,
            data
        });
    }
    catch (error) {
        console.error('Error fetching search analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch search analytics data'
        });
    }
}));
/**
 * DELETE /api/gsc/disconnect
 * Disconnect Google Search Console
 */
router.delete('/disconnect', auth_1.authenticateToken, asyncHandler(async (req, res) => {
    const authReq = req;
    const userId = authReq.user.userId;
    try {
        await prisma.googleSearchConsoleConnection.delete({
            where: { userId }
        });
        res.json({
            success: true,
            message: 'Google Search Console disconnected successfully'
        });
    }
    catch (error) {
        console.error('Error disconnecting:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to disconnect Google Search Console'
        });
    }
}));
exports.default = router;
