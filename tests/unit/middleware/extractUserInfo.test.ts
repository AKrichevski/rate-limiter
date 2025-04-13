import { Request, Response } from 'express';
import { createExtractUserInfoMiddleware, extractUserInfo } from '../../../src/middleware/extractUserInfo';
import { createMockRequest, createMockResponse } from '../../helpers/test-utils';

describe('Extract User Info Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: jest.Mock<void, []>;

    beforeEach(() => {
        mockRequest = createMockRequest();
        mockResponse = createMockResponse();
        nextFunction = jest.fn();
    });

    describe('extractUserInfo function', () => {
        const testCases = [
            {
                name: 'valid standard tier',
                userId: 'user123',
                userTier: 'standard',
                expectedResult: {
                    isValid: true,
                    data: { userId: 'user123', tier: 'standard' }
                }
            },
            {
                name: 'valid high tier',
                userId: 'user456',
                userTier: 'HIGH',
                expectedResult: {
                    isValid: true,
                    data: { userId: 'user456', tier: 'high' }
                }
            },
            {
                name: 'missing user ID',
                userId: undefined,
                userTier: 'standard',
                expectedResult: {
                    isValid: false,
                    error: {
                        status: 400,
                        message: 'Missing required headers',
                        details: 'X-User-ID and X-User-Tier headers are required'
                    }
                }
            },
            {
                name: 'missing user tier',
                userId: 'user123',
                userTier: undefined,
                expectedResult: {
                    isValid: false,
                    error: {
                        status: 400,
                        message: 'Missing required headers',
                        details: 'X-User-ID and X-User-Tier headers are required'
                    }
                }
            },
            {
                name: 'empty user ID',
                userId: '',
                userTier: 'standard',
                expectedResult: {
                    isValid: false,
                    error: {
                        status: 400,
                        message: 'Missing required headers',
                        details: 'X-User-ID and X-User-Tier headers are required'
                    }
                }
            },
            {
                name: 'invalid tier',
                userId: 'user123',
                userTier: 'premium',
                expectedResult: {
                    isValid: false,
                    error: {
                        status: 400,
                        message: 'Invalid tier',
                        details: 'X-User-Tier must be either "standard" or "high"'
                    }
                }
            }
        ];

        test.each(testCases)('$name', ({ userId, userTier, expectedResult }) => {
            const result = extractUserInfo(userId, userTier);

            if (expectedResult.isValid) {
                expect(result.isValid).toBe(true);
                expect(result.data).toEqual(expectedResult.data);
            } else {
                expect(result.isValid).toBe(false);

                if (result.error) {
                    expect(result.error.status).toBe(expectedResult.error?.status);
                    expect(result.error.message).toBe(expectedResult.error?.message);
                } else {
                    fail('Expected an error, but no error was returned');
                }
            }
        });
    });

    describe('createExtractUserInfoMiddleware', () => {
        test('should call next for valid request', () => {
            const middleware = createExtractUserInfoMiddleware();

            mockRequest.headers = {
                'x-user-id': 'user123',
                'x-user-tier': 'standard'
            };

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(nextFunction).toHaveBeenCalled();
            expect((mockRequest as any).userInfo).toEqual({
                userId: 'user123',
                tier: 'standard'
            });
        });

        test('should return 400 for missing headers', () => {
            const middleware = createExtractUserInfoMiddleware();

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Missing required headers',
                details: 'X-User-ID and X-User-Tier headers are required'
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });

        test('should return 400 for invalid tier', () => {
            const middleware = createExtractUserInfoMiddleware();

            mockRequest.headers = {
                'x-user-id': 'user123',
                'x-user-tier': 'premium'
            };

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                nextFunction
            );

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Invalid tier',
                details: 'X-User-Tier must be either "standard" or "high"'
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });
    });
});
