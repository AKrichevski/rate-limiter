import { Request, Response } from 'express';
import Redis from 'ioredis';
import { RateLimitResult, Tier } from '../../src/interfaces/IRateLimiter';
import { IScriptManager } from '../../src/services/scriptManager';
import { IRedisClient } from '../../src/interfaces/IRedisClient';
import { RateLimiterService } from '../../src/services/rateLimiter';
import { config } from '../../src/config';

export const TEST_CONFIG = {
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
    STANDARD_TIER_LIMIT: config.rateLimiter.limits.standard,
    HIGH_TIER_LIMIT: config.rateLimiter.limits.high,
    WINDOW_SIZE: config.rateLimiter.windowSizeSeconds
};

export const MOCK_RESPONSES = {
    STANDARD_ALLOWED: {
        allowed: true,
        remaining: TEST_CONFIG.STANDARD_TIER_LIMIT - 1,
        resetTime: 60,
        limit: TEST_CONFIG.STANDARD_TIER_LIMIT,
        effectiveCount: 1
    },
    STANDARD_DENIED: {
        allowed: false,
        remaining: 0,
        resetTime: 30,
        limit: TEST_CONFIG.STANDARD_TIER_LIMIT,
        effectiveCount: TEST_CONFIG.STANDARD_TIER_LIMIT
    },
    HIGH_ALLOWED: {
        allowed: true,
        remaining: TEST_CONFIG.HIGH_TIER_LIMIT - 1,
        resetTime: 60,
        limit: TEST_CONFIG.HIGH_TIER_LIMIT,
        effectiveCount: 1
    },
    HIGH_DENIED: {
        allowed: false,
        remaining: 0,
        resetTime: 30,
        limit: TEST_CONFIG.HIGH_TIER_LIMIT,
        effectiveCount: TEST_CONFIG.HIGH_TIER_LIMIT
    }
};

export function createMockRedisClient(): jest.Mocked<IRedisClient> {
    return {
        evalScript: jest.fn(),
        loadScript: jest.fn().mockResolvedValue('mockScriptSha'),
        deleteKey: jest.fn().mockResolvedValue(1),
        getKey: jest.fn().mockResolvedValue(null),
        setKey: jest.fn().mockResolvedValue(true),
        quit: jest.fn().mockResolvedValue(undefined),
        disconnect: jest.fn()
    };
}

export function createMockScriptManager(): jest.Mocked<IScriptManager> {
    return {
        initialize: jest.fn().mockResolvedValue(undefined),
        getScriptSha: jest.fn().mockReturnValue('mockScriptSha'),
        isInitialized: jest.fn().mockReturnValue(true)
    };
}

export function createMockRateLimiterService(): jest.Mocked<RateLimiterService> {
    const mockRedisClient = createMockRedisClient();
    const mockScriptManager = createMockScriptManager();
    const mockService = new RateLimiterService(mockRedisClient, mockScriptManager) as jest.Mocked<RateLimiterService>;

    mockService.processRequest = jest.fn().mockImplementation((userId: string, tier: Tier): Promise<RateLimitResult> => {
        const tierConfig = tier === 'high' ? MOCK_RESPONSES.HIGH_ALLOWED : MOCK_RESPONSES.STANDARD_ALLOWED;
        return Promise.resolve(tierConfig);
    });

    mockService.close = jest.fn().mockResolvedValue(undefined);
    (mockService as any).tierLimits = {
        high: TEST_CONFIG.HIGH_TIER_LIMIT,
        standard: TEST_CONFIG.STANDARD_TIER_LIMIT
    };
    (mockService as any).windowSize = TEST_CONFIG.WINDOW_SIZE;
    (mockService as any).scriptName = 'rateLimiter.lua';

    return mockService;
}

export interface RequestWithUserInfo extends Request {
    userInfo?: {
        userId: string;
        tier: Tier;
    };
}

export function createMockRequest(userInfo?: {
    userId: string;
    tier: Tier;
}): Partial<RequestWithUserInfo> {
    const mockRequest: Partial<RequestWithUserInfo> = {
        headers: {}
    };

    if (userInfo) {
        mockRequest.userInfo = userInfo;
        mockRequest.headers = {
            'x-user-id': userInfo.userId,
            'x-user-tier': userInfo.tier
        };
    }

    return mockRequest;
}

export function createMockResponse(): Partial<Response> {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        set: jest.fn()
    };
}

export async function clearRedisTestKeys(redis: Redis): Promise<void> {
    try {
        const keys = await redis.keys('ratelimit:*');
        if (keys.length > 0) {
            await redis.del(...keys);
        }

        const scriptKeys = await redis.keys('script_*');
        if (scriptKeys.length > 0) {
            await redis.del(...scriptKeys);
        }

        const debugKeys = await redis.keys('debug:*');
        if (debugKeys.length > 0) {
            await redis.del(...debugKeys);
        }
    } catch (error) {
        console.error('Error clearing Redis keys:', error);
    }
}

export function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function setupJestGlobals(): void {
    jest.setTimeout(30000);

    const originalQuit = Redis.prototype.quit;
    Redis.prototype.quit = function() {
        return Promise.resolve(originalQuit.call(this));
    };

    // Helper to find open handles
    const findOpenHandles = () => {
        return new Promise<void>(resolve => {
            // Allow queued processes to execute first
            setImmediate(() => {
                // Force garbage collection if node was started with --expose-gc
                if (global.gc) {
                    global.gc();
                }
                resolve();
            });
        });
    };

    afterAll(async () => {
        await findOpenHandles();
        await wait(1000);
    });
}
