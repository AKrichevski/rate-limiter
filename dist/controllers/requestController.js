"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestController = void 0;
class RequestController {
    constructor(rateLimiterService) {
        this.rateLimiterService = rateLimiterService;
    }
    async handleRequest(req, res) {
        const userInfo = req.userInfo;
        try {
            const rateLimitResult = await this.rateLimiterService.processRequest(userInfo.userId, userInfo.tier);
            res.set({
                'X-RateLimit-Limit': rateLimitResult.limit.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            });
            if (!rateLimitResult.allowed) {
                res.status(429).json({
                    error: 'Too Many Requests',
                    message: `Rate limit exceeded. Try again in ${rateLimitResult.resetTime} seconds.`
                });
                return;
            }
            res.status(200).json({
                success: true,
                message: 'Request processed successfully',
            });
        }
        catch (error) {
            console.error('Rate limit error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Failed to process rate limit',
            });
        }
    }
}
exports.RequestController = RequestController;
