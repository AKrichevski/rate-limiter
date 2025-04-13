import { IRedisClient } from "../interfaces/IRedisClient";
import { IScriptManager } from "./scriptManager";
import { config } from "../config";
import {RateLimitResult, Tier} from "../interfaces/IRateLimiter";

export class RateLimiterService {
    private readonly tierLimits: Record<Tier, number>;
    private readonly windowSize: number;
    private readonly scriptName = 'rateLimiter.lua';

    constructor(
        private readonly redisClient: IRedisClient,
        private readonly scriptManager: IScriptManager
    ) {
        this.tierLimits = {
            high: config.rateLimiter.limits.high,
            standard: config.rateLimiter.limits.standard,
        };
        this.windowSize = config.rateLimiter.windowSizeSeconds;

        if (!this.scriptManager.isInitialized()) {
            throw new Error('ScriptManager must be initialized before creating RateLimiterService');
        }
    }

    /**
     * Process a request with rate limiting
     * @returns An object containing rate limit information and whether the request is allowed
     */
    public async processRequest(userId: string, tier: Tier): Promise<RateLimitResult> {
        const limit = this.tierLimits[tier];
        const now = Math.floor(Date.now() / 1000);
        const userKey = `ratelimit:${userId}`;
        const scriptSha = this.scriptManager.getScriptSha(this.scriptName);

        const result = await this.redisClient.evalScript(
            scriptSha,
            [userKey],
            [now.toString(), this.windowSize.toString(), limit.toString()]
        );

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
    public async close(): Promise<void> {
        try {
            await this.redisClient.quit();
        } catch (error) {
            this.redisClient.disconnect?.();
        }
    }
}
