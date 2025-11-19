"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authService_1 = require("../services/authService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Utility function to wrap async route handlers
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// POST /api/auth/register - Register a new user
router.post('/register', asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;
    // Validate input
    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }
    if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters long' });
        return;
    }
    if (!email.includes('@')) {
        res.status(400).json({ error: 'Please provide a valid email address' });
        return;
    }
    try {
        const result = await authService_1.authService.register({ email, password, name });
        res.status(201).json(result);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('already exists')) {
                res.status(409).json({ error: error.message });
                return;
            }
        }
        throw error;
    }
}));
// POST /api/auth/login - Login user
router.post('/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    // Validate input
    if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
    }
    try {
        const result = await authService_1.authService.login({ email, password });
        res.json(result);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('Invalid email or password')) {
                res.status(401).json({ error: error.message });
                return;
            }
        }
        throw error;
    }
}));
// GET /api/auth/me - Get current user profile
router.get('/me', auth_1.authenticateToken, asyncHandler(async (req, res) => {
    const user = await authService_1.authService.getUserById(req.user.userId);
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    res.json({ user });
}));
// PUT /api/auth/profile - Update user profile
router.put('/profile', auth_1.authenticateToken, asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (name !== undefined && typeof name !== 'string') {
        res.status(400).json({ error: 'Name must be a string' });
        return;
    }
    await authService_1.authService.updateProfile(req.user.userId, name);
    res.json({ message: 'Profile updated successfully' });
}));
// PUT /api/auth/password - Change password
router.put('/password', auth_1.authenticateToken, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Current password and new password are required' });
        return;
    }
    if (newPassword.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters long' });
        return;
    }
    try {
        await authService_1.authService.changePassword(req.user.userId, currentPassword, newPassword);
        res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message.includes('Current password is incorrect')) {
                res.status(400).json({ error: error.message });
                return;
            }
        }
        throw error;
    }
}));
// POST /api/auth/verify - Verify token (for frontend token validation)
router.post('/verify', asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) {
        res.status(400).json({ error: 'Token is required' });
        return;
    }
    try {
        const decoded = await authService_1.authService.verifyToken(token);
        const user = await authService_1.authService.getUserById(decoded.userId);
        res.json({ valid: true, user });
    }
    catch (error) {
        res.json({ valid: false, error: 'Invalid token' });
    }
}));
exports.default = router;
