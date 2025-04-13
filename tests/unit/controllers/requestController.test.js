"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const requestController_1 = require("../../../src/controllers/requestController");
const test_utils_1 = require("../../helpers/test-utils");
describe('RequestController', () => {
    let mockRateLimiterService;
    let requestController;
    beforeEach(() => {
        mockRateLimiterService = (0, test_utils_1.createMockRateLimiterService)();
        requestController = new requestController_1.RequestController(mockRateLimiterService);
    });
    test('should process request successfully', async () => {
        const mockRequest = (0, test_utils_1.createMockRequest)({
            userId: 'user123',
            tier: 'standard'
        });
        const mockResponse = (0, test_utils_1.createMockResponse)();
        mockRateLimiterService.processRequest.mockResolvedValue({
            allowed: true,
            remaining: 499,
            resetTime: 60,
            effectiveCount: 1,
            limit: 500
        });
        await requestController.handleRequest(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
            success: true,
            message: 'Request processed successfully'
        });
        expect(mockResponse.set).toHaveBeenCalledWith({
            'X-RateLimit-Limit': '500',
            'X-RateLimit-Remaining': '499',
            'X-RateLimit-Reset': '60'
        });
    });
    test('should return 429 when rate limit is exceeded', async () => {
        const mockRequest = (0, test_utils_1.createMockRequest)({
            userId: 'rate-limited-user',
            tier: 'standard'
        });
        const mockResponse = (0, test_utils_1.createMockResponse)();
        mockRateLimiterService.processRequest.mockResolvedValue({
            allowed: false,
            remaining: 0,
            resetTime: 30,
            effectiveCount: 500,
            limit: 500
        });
        await requestController.handleRequest(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(429);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Try again in 30 seconds.'
        });
        expect(mockResponse.set).toHaveBeenCalledWith({
            'X-RateLimit-Limit': '500',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': '30'
        });
    });
    test('should handle errors during rate limit processing', async () => {
        const mockRequest = (0, test_utils_1.createMockRequest)({
            userId: 'error-user',
            tier: 'standard'
        });
        const mockResponse = (0, test_utils_1.createMockResponse)();
        mockRateLimiterService.processRequest.mockRejectedValue(new Error('Redis error'));
        await requestController.handleRequest(mockRequest, mockResponse);
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Internal Server Error',
            message: 'Failed to process rate limit'
        });
    });
});
