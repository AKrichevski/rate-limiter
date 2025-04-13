import { Request, Response } from 'express';
import {RequestController} from "../../../src/controllers/requestController";
import {    createMockRequest,
    createMockResponse,
    createMockRateLimiterService} from "../../helpers/test-utils";

describe('RequestController', () => {
    let mockRateLimiterService: ReturnType<typeof createMockRateLimiterService>;
    let requestController: RequestController;

    beforeEach(() => {
        mockRateLimiterService = createMockRateLimiterService();
        requestController = new RequestController(mockRateLimiterService);
    });

    test('should process request successfully', async () => {
        const mockRequest = createMockRequest({
            userId: 'user123',
            tier: 'standard'
        }) as Request;
        const mockResponse = createMockResponse() as Response;

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
        const mockRequest = createMockRequest({
            userId: 'rate-limited-user',
            tier: 'standard'
        }) as Request;
        const mockResponse = createMockResponse() as Response;

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
        const mockRequest = createMockRequest({
            userId: 'error-user',
            tier: 'standard'
        }) as Request;
        const mockResponse = createMockResponse() as Response;

        mockRateLimiterService.processRequest.mockRejectedValue(new Error('Redis error'));

        await requestController.handleRequest(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Internal Server Error',
            message: 'Failed to process rate limit'
        });
    });
});
