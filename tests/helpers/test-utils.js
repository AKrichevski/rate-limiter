"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOCK_RESPONSES = exports.TEST_CONFIG = void 0;
exports.createMockRedisClient = createMockRedisClient;
exports.createMockScriptManager = createMockScriptManager;
exports.createMockRateLimiterService = createMockRateLimiterService;
exports.createMockRequest = createMockRequest;
exports.createMockResponse = createMockResponse;
exports.clearRedisTestKeys = clearRedisTestKeys;
exports.wait = wait;
exports.setupJestGlobals = setupJestGlobals;
const ioredis_1 = __importDefault(require("ioredis"));
const rateLimiter_1 = require("../../src/services/rateLimiter");
const config_1 = require("../../src/config");
exports.TEST_CONFIG = {
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
    STANDARD_TIER_LIMIT: config_1.config.rateLimiter.limits.standard,
    HIGH_TIER_LIMIT: config_1.config.rateLimiter.limits.high,
    WINDOW_SIZE: config_1.config.rateLimiter.windowSizeSeconds
};
exports.MOCK_RESPONSES = {
    STANDARD_ALLOWED: {
        allowed: true,
        remaining: exports.TEST_CONFIG.STANDARD_TIER_LIMIT - 1,
        resetTime: 60,
        limit: exports.TEST_CONFIG.STANDARD_TIER_LIMIT,
        effectiveCount: 1
    },
    STANDARD_DENIED: {
        allowed: false,
        remaining: 0,
        resetTime: 30,
        limit: exports.TEST_CONFIG.STANDARD_TIER_LIMIT,
        effectiveCount: exports.TEST_CONFIG.STANDARD_TIER_LIMIT
    },
    HIGH_ALLOWED: {
        allowed: true,
        remaining: exports.TEST_CONFIG.HIGH_TIER_LIMIT - 1,
        resetTime: 60,
        limit: exports.TEST_CONFIG.HIGH_TIER_LIMIT,
        effectiveCount: 1
    },
    HIGH_DENIED: {
        allowed: false,
        remaining: 0,
        resetTime: 30,
        limit: exports.TEST_CONFIG.HIGH_TIER_LIMIT,
        effectiveCount: exports.TEST_CONFIG.HIGH_TIER_LIMIT
    }
};
function createMockRedisClient() {
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
function createMockScriptManager() {
    return {
        initialize: jest.fn().mockResolvedValue(undefined),
        getScriptSha: jest.fn().mockReturnValue('mockScriptSha'),
        isInitialized: jest.fn().mockReturnValue(true)
    };
}
function createMockRateLimiterService() {
    const mockRedisClient = createMockRedisClient();
    const mockScriptManager = createMockScriptManager();
    const mockService = new rateLimiter_1.RateLimiterService(mockRedisClient, mockScriptManager);
    mockService.processRequest = jest.fn().mockImplementation((userId, tier) => {
        const tierConfig = tier === 'high' ? exports.MOCK_RESPONSES.HIGH_ALLOWED : exports.MOCK_RESPONSES.STANDARD_ALLOWED;
        return Promise.resolve(tierConfig);
    });
    mockService.close = jest.fn().mockResolvedValue(undefined);
    mockService.tierLimits = {
        high: exports.TEST_CONFIG.HIGH_TIER_LIMIT,
        standard: exports.TEST_CONFIG.STANDARD_TIER_LIMIT
    };
    mockService.windowSize = exports.TEST_CONFIG.WINDOW_SIZE;
    mockService.scriptName = 'rateLimiter.lua';
    return mockService;
}
function createMockRequest(userInfo) {
    const mockRequest = {
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
function createMockResponse() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        set: jest.fn()
    };
}
async function clearRedisTestKeys(redis) {
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
    }
    catch (error) {
        console.error('Error clearing Redis keys:', error);
    }
}
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function setupJestGlobals() {
    jest.setTimeout(30000);
    const originalQuit = ioredis_1.default.prototype.quit;
    ioredis_1.default.prototype.quit = function () {
        return Promise.resolve(originalQuit.call(this));
    };
    // Helper to find open handles
    const findOpenHandles = () => {
        return new Promise(resolve => {
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
