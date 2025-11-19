"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDomainOwnership = exports.optionalAuth = exports.authenticateToken = void 0;
const authService_1 = require("../services/authService");
// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
        if (!token) {
            return res.status(401).json({ error: 'Access token required' });
        }
        const decoded = await authService_1.authService.verifyToken(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};
exports.authenticateToken = authenticateToken;
// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            const decoded = await authService_1.authService.verifyToken(token);
            req.user = decoded;
        }
        next();
    }
    catch (error) {
        // Continue without authentication
        next();
    }
};
exports.optionalAuth = optionalAuth;
// Middleware to check if user owns a domain
const checkDomainOwnership = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const domainId = parseInt(req.params.domainId || req.params.domain);
        if (!domainId || isNaN(domainId)) {
            return res.status(400).json({ error: 'Invalid domain ID' });
        }
        // Check if domain exists and belongs to user
        const { PrismaClient } = require('../../generated/prisma');
        const prisma = new PrismaClient();
        const domain = await prisma.domain.findFirst({
            where: {
                id: domainId,
                userId: req.user.userId
            }
        });
        if (!domain) {
            return res.status(404).json({ error: 'Domain not found or access denied' });
        }
        next();
    }
    catch (error) {
        console.error('Domain ownership check error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.checkDomainOwnership = checkDomainOwnership;
