"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiterService = void 0;
const config_1 = require("../config");
class RateLimiterService {
    constructor(redisClient, scriptManager) {
        this.redisClient = redisClient;
        this.scriptManager = scriptManager;
        this.scriptName = 'rateLimiter.lua';
        this.tierLimits = {
            high: config_1.config.rateLimiter.limits.high,
            standard: config_1.config.rateLimiter.limits.standard,
        };
        this.windowSize = config_1.config.rateLimiter.windowSizeSeconds;
        if (!this.scriptManager.isInitialized()) {
            throw new Error('ScriptManager must be initialized before creating RateLimiterService');
        }
    }
    /**
     * Process a request with rate limiting
     * @returns An object containing rate limit information and whether the request is allowed
     */
    async processRequest(userId, tier) {
        const limit = this.tierLimits[tier];
        const now = Math.floor(Date.now() / 1000);
        const userKey = `ratelimit:${userId}`;
        const scriptSha = this.scriptManager.getScriptSha(this.scriptName);
        const result = await this.redisClient.evalScript(scriptSha, [userKey], [now.toString(), this.windowSize.toString(), limit.toString()]);
        // Ensure we got a valid response
        if (!Array.isArray(result) || result.length < 5) {
            throw new Error(`Invalid response from rate limiter script: ${JSON.stringify(result)}`);
        }
        const [allowed, remaining, resetTime, effectiveCount, maxRequests] = result;
        return {
            allowed: allowed === 1,
            remaining: Number(remaining),
            resetTime: Number(resetTime),
            effectiveCount: Number(effectiveCount),
            limit: Number(maxRequests),
        };
    }
    /**
     * Clean up resources
     */
    async close() {
        try {
            await this.redisClient.quit();
        }
        catch (error) {
            this.redisClient.disconnect?.();
        }
    }
}
exports.RateLimiterService = RateLimiterService;
