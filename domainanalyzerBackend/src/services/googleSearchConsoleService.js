"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSearchConsoleClient = getSearchConsoleClient;
exports.listProperties = listProperties;
exports.querySearchAnalytics = querySearchAnalytics;
exports.verifyProperty = verifyProperty;
const googleapis_1 = require("googleapis");
const googleOAuthService_1 = require("./googleOAuthService");
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
/**
 * Gets authenticated Search Console client for a user
 * Automatically refreshes token if needed
 */
async function getSearchConsoleClient(userId) {
    const connection = await prisma.googleSearchConsoleConnection.findUnique({
        where: { userId }
    });
    if (!connection || !connection.isConnected) {
        throw new Error('Google Search Console not connected');
    }
    const oauth2Client = (0, googleOAuthService_1.createOAuth2Client)();
    // Check if token needs refresh
    let accessToken = connection.accessToken;
    let expiryDate = connection.tokenExpiry;
    if ((0, googleOAuthService_1.isTokenExpired)(expiryDate)) {
        const refreshed = await (0, googleOAuthService_1.refreshAccessToken)(connection.refreshToken);
        accessToken = refreshed.accessToken;
        expiryDate = refreshed.expiryDate;
        // Update in database
        await prisma.googleSearchConsoleConnection.update({
            where: { userId },
            data: {
                accessToken: refreshed.accessToken,
                tokenExpiry: refreshed.expiryDate
            }
        });
    }
    oauth2Client.setCredentials({
        access_token: accessToken
    });
    return googleapis_1.google.searchconsole({ version: 'v1', auth: oauth2Client });
}
/**
 * Lists all Search Console properties for a user
 */
async function listProperties(userId) {
    try {
        const searchConsole = await getSearchConsoleClient(userId);
        const response = await searchConsole.sites.list();
        return response.data.siteEntry || [];
    }
    catch (error) {
        console.error('Error listing Search Console properties:', error);
        throw new Error('Failed to list Search Console properties');
    }
}
async function querySearchAnalytics(userId, property, query) {
    try {
        const searchConsole = await getSearchConsoleClient(userId);
        const requestBody = {
            startDate: query.startDate,
            endDate: query.endDate,
            dimensions: query.dimensions || ['query'],
            rowLimit: query.rowLimit || 1000,
            startRow: query.startRow || 0
        };
        if (query.searchType) {
            requestBody.searchType = query.searchType;
        }
        const response = await searchConsole.searchanalytics.query({
            siteUrl: property,
            requestBody
        });
        return response.data;
    }
    catch (error) {
        console.error('Error querying search analytics:', error);
        throw new Error('Failed to query search analytics data');
    }
}
/**
 * Verifies if a property is verified in Search Console
 */
async function verifyProperty(userId, property) {
    try {
        const properties = await listProperties(userId);
        return properties.some(p => p.siteUrl === property);
    }
    catch (error) {
        console.error('Error verifying property:', error);
        return false;
    }
}
