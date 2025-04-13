import { RateLimiterService } from '../../../src/services/rateLimiter';
import {
    createMockRedisClient,
    createMockScriptManager,
    TEST_CONFIG
} from '../../helpers/test-utils';
import { Tier } from '../../../src/interfaces/IRateLimiter';

describe('RateLimiterService', () => {
    let rateLimiterService: RateLimiterService;
    let mockRedisClient: ReturnType<typeof createMockRedisClient>;
    let mockScriptManager: ReturnType<typeof createMockScriptManager>;

    beforeEach(() => {
        mockRedisClient = createMockRedisClient();
        mockScriptManager = createMockScriptManager();
        mockScriptManager.isInitialized.mockReturnValue(true);

        rateLimiterService = new RateLimiterService(mockRedisClient, mockScriptManager);
    });

    describe('processRequest', () => {
        const testCases: Array<{
            description: string;
            userId: string;
            tier: Tier;
            redisResult: any[];
            expectedResult: any;
        }> = [
            {
                description: 'standard tier - first request',
                userId: 'user-standard-1',
                tier: 'standard',
                redisResult: [1, 499, 60, 1, 500],
                expectedResult: {
                    allowed: true,
                    remaining: 499,
                    resetTime: 60,
                    effectiveCount: 1,
                    limit: 500
                }
            },
            {
                description: 'high tier - first request',
                userId: 'user-high-1',
                tier: 'high',
                redisResult: [1, 999, 60, 1, 1000],
                expectedResult: {
                    allowed: true,
                    remaining: 999,
                    resetTime: 60,
                    effectiveCount: 1,
                    limit: 1000
                }
            },
            {
                description: 'standard tier - rate limit exceeded',
                userId: 'user-standard-limited',
                tier: 'standard',
                redisResult: [0, 0, 30, 500, 500],
                expectedResult: {
                    allowed: false,
                    remaining: 0,
                    resetTime: 30,
                    effectiveCount: 500,
                    limit: 500
                }
            }
        ];

        test.each(testCases)('$description', async ({ userId, tier, redisResult, expectedResult }) => {
            mockRedisClient.evalScript.mockResolvedValue(redisResult);
            mockScriptManager.getScriptSha.mockReturnValue('test-script-sha');

            const result = await rateLimiterService.processRequest(userId, tier);

            expect(mockRedisClient.evalScript).toHaveBeenCalledWith(
                'test-script-sha',
                [`ratelimit:${userId}`],
                [
                    expect.any(String),
                    TEST_CONFIG.WINDOW_SIZE.toString(),
                    (tier === 'high' ? TEST_CONFIG.HIGH_TIER_LIMIT : TEST_CONFIG.STANDARD_TIER_LIMIT).toString()
                ]
            );

            expect(result).toEqual(expectedResult);
        });

        test('should throw error for invalid Redis script response', async () => {
            mockRedisClient.evalScript.mockResolvedValue('invalid');
            mockScriptManager.getScriptSha.mockReturnValue('test-script-sha');

            await expect(rateLimiterService.processRequest('user123', 'standard'))
                .rejects
                .toThrow('Invalid response from rate limiter script');
        });
    });

    describe('close method', () => {
        test('should call quit on redisClient', async () => {
            mockRedisClient.quit.mockResolvedValue(undefined);

            await rateLimiterService.close();

            expect(mockRedisClient.quit).toHaveBeenCalled();
        });

        test('should call disconnect if quit fails', async () => {
            mockRedisClient.quit.mockRejectedValue(new Error('Quit failed'));
            mockRedisClient.disconnect = jest.fn();

            await rateLimiterService.close();

            expect(mockRedisClient.disconnect).toHaveBeenCalled();
        });
    });

    describe('constructor', () => {
        test('should throw error if scriptManager is not initialized', () => {
            mockScriptManager.isInitialized.mockReturnValue(false);

            expect(() => {
                new RateLimiterService(mockRedisClient, mockScriptManager);
            }).toThrow('ScriptManager must be initialized before creating RateLimiterService');
        });
    });
});
