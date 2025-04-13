"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const ioredis_1 = __importDefault(require("ioredis"));
const config_1 = require("../../src/config");
const test_utils_1 = require("../helpers/test-utils");
const API_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_USERS = {
    STANDARD: {
        userId: `test-standard-${Date.now()}`,
        tier: 'standard',
        limit: config_1.config.rateLimiter.limits.standard,
    },
    HIGH: {
        userId: `test-high-${Date.now()}`,
        tier: 'high',
        limit: config_1.config.rateLimiter.limits.high,
    },
};
const TEST_BATCH_SIZE = 10;
const TEST_LIMIT_STANDARD = Math.min(15, TEST_USERS.STANDARD.limit);
const TEST_LIMIT_HIGH = Math.min(30, TEST_USERS.HIGH.limit);
const request = (0, supertest_1.default)(API_URL);
async function sendBatchedRequests(userId, tier, count, batchSize = TEST_BATCH_SIZE) {
    const responses = [];
    for (let i = 0; i < count; i += batchSize) {
        const currentBatchSize = Math.min(batchSize, count - i);
        const batchPromises = Array(currentBatchSize)
            .fill(0)
            .map(() => request
            .post('/api/request')
            .set('X-User-ID', userId)
            .set('X-User-Tier', tier));
        const batchResponses = await Promise.all(batchPromises);
        responses.push(...batchResponses);
        await (0, test_utils_1.wait)(20);
        if (count > batchSize * 2 && i % (batchSize * 2) === 0) {
            console.log(`Progress: ${i + currentBatchSize}/${count} requests completed`);
        }
    }
    return responses;
}
let redis;
beforeAll(async () => {
    redis = new ioredis_1.default({
        host: config_1.config.redis.host,
        port: config_1.config.redis.port,
        password: config_1.config.redis.password,
    });
    const existingKeys = await redis.keys('ratelimit:test-*');
    if (existingKeys.length > 0) {
        await redis.del(...existingKeys);
        console.log(`Cleaned up ${existingKeys.length} existing test keys`);
    }
});
afterAll(async () => {
    for (const user of Object.values(TEST_USERS)) {
        const userKeys = await redis.keys(`ratelimit:${user.userId}*`);
        if (userKeys.length > 0) {
            await redis.del(...userKeys);
            console.log(`Cleaned up ${userKeys.length} keys for user ${user.userId}`);
        }
    }
    const otherTestKeys = await redis.keys('ratelimit:test-*');
    if (otherTestKeys.length > 0) {
        await redis.del(...otherTestKeys);
        console.log(`Cleaned up ${otherTestKeys.length} additional test keys`);
    }
    await redis.quit();
});
describe('Rate Limiter E2E Tests', () => {
    describe('Basic Functionality', () => {
        test('Should process a standard tier request successfully', async () => {
            const user = TEST_USERS.STANDARD;
            const response = await request
                .post('/api/request')
                .set('X-User-ID', user.userId)
                .set('X-User-Tier', user.tier);
            expect(response.status).toBe(200);
            expect(response.headers['x-ratelimit-limit']).toBeDefined();
            expect(response.headers['x-ratelimit-remaining']).toBeDefined();
            expect(response.headers['x-ratelimit-reset']).toBeDefined();
            expect(parseInt(response.headers['x-ratelimit-limit'])).toBe(user.limit);
            expect(parseInt(response.headers['x-ratelimit-remaining'])).toBe(user.limit - 1);
        });
        test('Should process a high tier request successfully', async () => {
            const user = TEST_USERS.HIGH;
            const response = await request
                .post('/api/request')
                .set('X-User-ID', user.userId)
                .set('X-User-Tier', user.tier);
            expect(response.status).toBe(200);
            expect(parseInt(response.headers['x-ratelimit-limit'])).toBe(user.limit);
            expect(parseInt(response.headers['x-ratelimit-remaining'])).toBe(user.limit - 1);
        });
    });
    describe('Rate Limiting Logic', () => {
        test('Should eventually rate limit after many requests', async () => {
            const userId = `test-standard-limit-${Date.now()}`;
            const tier = 'standard';
            const testResponse = await request
                .post('/api/request')
                .set('X-User-ID', userId)
                .set('X-User-Tier', tier);
            const actualLimit = parseInt(testResponse.headers['x-ratelimit-limit'], 10);
            const testLimit = Math.min(TEST_LIMIT_STANDARD, actualLimit);
            const initialCount = Math.floor(testLimit * 0.7);
            console.log(`Sending ${initialCount} initial requests (standard tier)...`);
            const initialResponses = await sendBatchedRequests(userId, tier, initialCount);
            expect(initialResponses.every(res => res.status === 200)).toBe(true);
            const additionalCount = actualLimit * 2;
            console.log(`Sending ${additionalCount} additional requests to trigger rate limiting...`);
            const additionalResponses = await sendBatchedRequests(userId, tier, additionalCount);
            const rateLimitedCount = additionalResponses.filter(res => res.status === 429).length;
            console.log(`Got ${rateLimitedCount} rate limited responses`);
            expect(rateLimitedCount).toBeGreaterThan(0);
            const keys = await redis.keys(`ratelimit:${userId}*`);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        }, 30000);
        test('High tier should have a higher limit than standard tier', async () => {
            const standardUserId = `test-standard-compare-${Date.now()}`;
            const highUserId = `test-high-compare-${Date.now()}`;
            const standardResponse = await request
                .post('/api/request')
                .set('X-User-ID', standardUserId)
                .set('X-User-Tier', 'standard');
            const highResponse = await request
                .post('/api/request')
                .set('X-User-ID', highUserId)
                .set('X-User-Tier', 'high');
            const standardLimit = parseInt(standardResponse.headers['x-ratelimit-limit'], 10);
            const highLimit = parseInt(highResponse.headers['x-ratelimit-limit'], 10);
            expect(highLimit).toBeGreaterThan(standardLimit);
            const standardKeys = await redis.keys(`ratelimit:${standardUserId}*`);
            const highKeys = await redis.keys(`ratelimit:${highUserId}*`);
            if (standardKeys.length > 0)
                await redis.del(...standardKeys);
            if (highKeys.length > 0)
                await redis.del(...highKeys);
        });
    });
    describe('Multi-User Isolation', () => {
        test('Different users should have separate rate limit counters', async () => {
            const user1Id = `test-isolation-1-${Date.now()}`;
            const user2Id = `test-isolation-2-${Date.now()}`;
            const tier = 'standard';
            const response1 = await request
                .post('/api/request')
                .set('X-User-ID', user1Id)
                .set('X-User-Tier', tier);
            const response2 = await request
                .post('/api/request')
                .set('X-User-ID', user2Id)
                .set('X-User-Tier', tier);
            expect(response1.status).toBe(200);
            expect(response2.status).toBe(200);
            const requestCount = parseInt(response1.headers['x-ratelimit-limit'], 10) * 2;
            console.log(`Sending ${requestCount} requests for user1 to trigger rate limiting...`);
            await sendBatchedRequests(user1Id, tier, requestCount);
            const finalResponse1 = await request
                .post('/api/request')
                .set('X-User-ID', user1Id)
                .set('X-User-Tier', tier);
            const finalResponse2 = await request
                .post('/api/request')
                .set('X-User-ID', user2Id)
                .set('X-User-Tier', tier);
            expect(finalResponse1.status).toBe(429);
            expect(finalResponse2.status).toBe(200);
            const keys1 = await redis.keys(`ratelimit:${user1Id}*`);
            const keys2 = await redis.keys(`ratelimit:${user2Id}*`);
            if (keys1.length > 0)
                await redis.del(...keys1);
            if (keys2.length > 0)
                await redis.del(...keys2);
        }, 30000);
    });
    describe('Input Validation', () => {
        test('Should reject requests without required headers', async () => {
            const response1 = await request
                .post('/api/request')
                .set('X-User-Tier', 'standard');
            const response2 = await request
                .post('/api/request')
                .set('X-User-ID', 'test-user');
            const response3 = await request
                .post('/api/request')
                .set('X-User-ID', 'test-user')
                .set('X-User-Tier', 'premium');
            expect(response1.status).toBe(400);
            expect(response2.status).toBe(400);
            expect(response3.status).toBe(400);
            expect(response1.body.error).toBeDefined();
            expect(response2.body.error).toBeDefined();
            expect(response3.body.error).toBeDefined();
        });
    });
    describe('Sliding Window Behavior', () => {
        test('Sliding window behavior - basic validation', async () => {
            const userId = `test-sliding-window-basic-${Date.now()}`;
            const tier = 'standard';
            const response = await request
                .post('/api/request')
                .set('X-User-ID', userId)
                .set('X-User-Tier', tier);
            expect(response.status).toBe(200);
            const resetTime = parseInt(response.headers['x-ratelimit-reset'], 10);
            expect(resetTime).toBeGreaterThan(0);
            expect(resetTime).toBeLessThanOrEqual(config_1.config.rateLimiter.windowSizeSeconds);
            const keys = await redis.keys(`ratelimit:${userId}*`);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        });
        test('Multiple requests impact sliding window', async () => {
            const userId = `test-sliding-window-requests-${Date.now()}`;
            const tier = 'standard';
            const firstResponse = await request
                .post('/api/request')
                .set('X-User-ID', userId)
                .set('X-User-Tier', tier);
            const firstRemaining = parseInt(firstResponse.headers['x-ratelimit-remaining'], 10);
            const additionalRequests = 5;
            await sendBatchedRequests(userId, tier, additionalRequests);
            const checkResponse = await request
                .post('/api/request')
                .set('X-User-ID', userId)
                .set('X-User-Tier', tier);
            const checkRemaining = parseInt(checkResponse.headers['x-ratelimit-remaining'], 10);
            expect(checkRemaining).toBe(firstRemaining - additionalRequests - 1);
            const keys = await redis.keys(`ratelimit:${userId}*`);
            if (keys.length > 0) {
                await redis.del(...keys);
            }
        });
    });
});
