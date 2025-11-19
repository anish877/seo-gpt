import { Router, Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { getAuthUrl, exchangeCodeForTokens } from '../services/googleOAuthService';
import { encryptToken } from '../services/tokenEncryption';
import { listProperties, querySearchAnalytics, SearchAnalyticsQuery } from '../services/googleSearchConsoleService';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

function asyncHandler(fn: (req: Request, res: Response, next: any) => Promise<any>) {
  return function (req: Request, res: Response, next: any) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Store state tokens temporarily (in production, use Redis or session store)
export const stateTokens = new Map<string, { userId: number; expiresAt: Date }>();

// Clean up expired state tokens every 10 minutes
setInterval(() => {
  const now = new Date();
  for (const [state, data] of stateTokens.entries()) {
    if (data.expiresAt < now) {
      stateTokens.delete(state);
    }
  }
}, 10 * 60 * 1000);

/**
 * GET /api/gsc/auth/initiate
 * Initiates Google OAuth flow
 */
router.get('/auth/initiate', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user.userId;

  // Generate CSRF state token
  const state = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  stateTokens.set(state, { userId, expiresAt });

  // Generate OAuth URL
  try {
    const authUrl = getAuthUrl(state);
  res.json({
    success: true,
      authUrl
    });
  } catch (error: any) {
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
export const handleOAuthCallback = asyncHandler(async (req: Request, res: Response) => {
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
  const stateData = stateTokens.get(state as string);
  if (!stateData || stateData.expiresAt < new Date()) {
    stateTokens.delete(state as string);
    return res.redirect(`${frontendUrl}${redirectPath}&error=invalid_state`);
  }

  const userId = stateData.userId;
  stateTokens.delete(state as string);

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code as string);

    // Encrypt refresh token
    const encryptedRefreshToken = encryptToken(tokens.refreshToken);

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
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.redirect(`${frontendUrl}${redirectPath}&error=connection_failed`);
  }
});

/**
 * GET /api/gsc/status
 * Get connection status
 */
router.get('/status', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
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
router.get('/properties', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user.userId;

  try {
    const properties = await listProperties(userId);

    res.json({
      success: true,
      properties: properties.map(p => ({
        siteUrl: p.siteUrl,
        permissionLevel: p.permissionLevel
      }))
    });
  } catch (error) {
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
router.post('/select-property', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
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
    const properties = await listProperties(userId);
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
  } catch (error) {
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
router.get('/data', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
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
    const query: SearchAnalyticsQuery = {
      startDate: startDate as string,
      endDate: endDate as string,
      dimensions: dimensions ? (dimensions as string).split(',') : ['query'],
      rowLimit: rowLimit ? parseInt(rowLimit as string) : 1000,
      startRow: startRow ? parseInt(startRow as string) : 0,
      searchType: searchType as any
    };

    const data = await querySearchAnalytics(userId, connection.selectedProperty, query);

    // Update last synced time
    await prisma.googleSearchConsoleConnection.update({
      where: { userId },
      data: { lastSyncedAt: new Date() }
    });

    res.json({
      success: true,
      data
    });
  } catch (error) {
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
router.delete('/disconnect', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user.userId;

  try {
    await prisma.googleSearchConsoleConnection.delete({
      where: { userId }
    });

    res.json({
      success: true,
      message: 'Google Search Console disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect Google Search Console'
    });
  }
}));

export default router;
