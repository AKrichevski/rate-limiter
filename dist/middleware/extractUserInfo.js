"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractUserInfo = extractUserInfo;
exports.createExtractUserInfoMiddleware = createExtractUserInfoMiddleware;
const UserRequestDTO_1 = require("../dto/UserRequestDTO");
function extractUserInfo(userId, userTier) {
    if (!userId || !userTier) {
        return {
            isValid: false,
            error: {
                status: 400,
                message: 'Missing required headers',
                details: 'X-User-ID and X-User-Tier headers are required'
            }
        };
    }
    const normalizedTier = String(userTier).toLowerCase();
    if (normalizedTier !== 'standard' && normalizedTier !== 'high') {
        return {
            isValid: false,
            error: {
                status: 400,
                message: 'Invalid tier',
                details: 'X-User-Tier must be either "standard" or "high"'
            }
        };
    }
    try {
        const parsed = UserRequestDTO_1.UserRequestSchema.parse({
            userId: String(userId),
            tier: normalizedTier,
        });
        return {
            isValid: true,
            data: parsed
        };
    }
    catch (err) {
        return {
            isValid: false,
            error: {
                status: 400,
                message: 'Validation failed',
                details: err.errors ?? err.message
            }
        };
    }
}
/**
 * Creates a middleware function using the extractUserInfo utility
 * This allows the utility to be used in Express middleware chains
 */
function createExtractUserInfoMiddleware() {
    return (req, res, next) => {
        const userId = req.headers['x-user-id'];
        const userTier = req.headers['x-user-tier'];
        const result = extractUserInfo(userId, userTier);
        if (!result.isValid) {
            res.status(result.error.status).json({
                error: result.error.message,
                details: result.error.details
            });
            return;
        }
        req.userInfo = result.data;
        next();
    };
}
