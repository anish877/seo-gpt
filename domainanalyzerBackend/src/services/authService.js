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
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const prisma_1 = require("../../generated/prisma");
const bcrypt = __importStar(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const prisma = new prisma_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
class AuthService {
    // Register a new user
    async register(userData) {
        const { email, password, name } = userData;
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            throw new Error('User with this email already exists');
        }
        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name
            },
            select: {
                id: true,
                email: true,
                name: true
            }
        });
        // Generate JWT token
        const token = this.generateToken(user.id, user.email);
        return {
            user: {
                ...user,
                name: user.name === null ? undefined : user.name
            },
            token
        };
    }
    // Login user
    async login(loginData) {
        const { email, password } = loginData;
        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email }
        });
        if (!user) {
            throw new Error('Invalid email or password');
        }
        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }
        // Generate JWT token
        const token = this.generateToken(user.id, user.email);
        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name === null ? undefined : user.name
            },
            token
        };
    }
    // Verify JWT token
    async verifyToken(token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            // Check if user still exists
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId }
            });
            if (!user) {
                throw new Error('User not found');
            }
            return decoded;
        }
        catch (error) {
            throw new Error('Invalid token');
        }
    }
    // Get user by ID
    async getUserById(userId) {
        return await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
                domains: {
                    select: {
                        id: true,
                        url: true,
                        context: true,
                        createdAt: true,
                        _count: {
                            select: {
                                keywords: true,
                                crawlResults: true
                            }
                        }
                    }
                }
            }
        });
    }
    // Generate JWT token
    generateToken(userId, email) {
        return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    }
    // Change password
    async changePassword(userId, currentPassword, newPassword) {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            throw new Error('User not found');
        }
        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new Error('Current password is incorrect');
        }
        // Hash new password
        const saltRounds = 12;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword }
        });
    }
    // Update user profile
    async updateProfile(userId, name) {
        await prisma.user.update({
            where: { id: userId },
            data: { name }
        });
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
