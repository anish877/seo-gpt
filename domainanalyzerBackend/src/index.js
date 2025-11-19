"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const domain_1 = __importDefault(require("./routes/domain"));
const domainValidation_1 = __importDefault(require("./routes/domainValidation"));
const keywords_1 = __importDefault(require("./routes/keywords"));
const intentPhrases_1 = __importDefault(require("./routes/intentPhrases"));
const enhancedPhrasesUnified_1 = __importDefault(require("./routes/enhancedPhrasesUnified"));
const ai_queries_1 = __importDefault(require("./routes/ai-queries"));
const competitor_1 = __importDefault(require("./routes/competitor"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
// Onboarding router removed
const auth_1 = __importDefault(require("./routes/auth"));
const user_1 = __importDefault(require("./routes/user"));
const googleSearchConsole_1 = __importStar(require("./routes/googleSearchConsole"));
const campaigns_1 = __importDefault(require("./routes/campaigns"));
const prisma_1 = require("../generated/prisma");
const auth_2 = require("./middleware/auth");
const app = (0, express_1.default)();
const prisma = new prisma_1.PrismaClient();
// Load environment variables
require("dotenv/config");
const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:4173',
    'https://aichecker.blueoceanglobaltech.com',
    'https://phrase-score-insight-lxkj.vercel.app',
    'https://domainanalyzer-rosy.vercel.app'
];
const corsOptions = {
    origin: (origin, callback) => {
        // Allow all localhost origins in development
        if (!origin || origin.startsWith('http://localhost:') || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};
// Middleware
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: '5mb' }));
// Debug endpoint to list all domains (ADMIN ONLY - REMOVE IN PRODUCTION)
app.get('/api/debug/domains', auth_2.authenticateToken, async (req, res) => {
    const authReq = req;
    try {
        // Only allow admin users (you can add admin check here)
        // For now, this endpoint should be removed in production
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ error: 'Debug endpoint not available in production' });
        }
        const domains = await prisma.domain.findMany({
            select: {
                id: true,
                url: true,
                context: true,
                createdAt: true,
                updatedAt: true,
                userId: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true
                    }
                },
                _count: {
                    select: {
                        keywords: true,
                        crawlResults: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json({
            total: domains.length,
            domains: domains
        });
    }
    catch (error) {
        console.error('Error fetching domains:', error);
        res.status(500).json({ error: 'Failed to fetch domains' });
    }
});
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/user', user_1.default);
app.use('/api/domain', domain_1.default);
app.use('/api/gsc', googleSearchConsole_1.default);
app.use('/api/campaigns', campaigns_1.default);
// OAuth callback route (must be at /api/auth/google/callback for Google redirect)
app.get('/api/auth/google/callback', googleSearchConsole_1.handleOAuthCallback);
app.use('/api/domain-validation', domainValidation_1.default);
app.use('/api/keywords', keywords_1.default);
app.use('/api/intent-phrases', intentPhrases_1.default);
app.use('/api/enhanced-phrases', enhancedPhrasesUnified_1.default);
app.use('/api/ai-queries', ai_queries_1.default);
app.use('/api/competitor', competitor_1.default);
app.use('/api/dashboard', dashboard_1.default);
// Onboarding routes removed
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.url}`
    });
});
const PORT = Number(process.env?.PORT) || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';
app.listen(PORT, () => {
    console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/api/health`);
    console.log(`Debug domains available at http://localhost:${PORT}/api/debug/domains`);
});
