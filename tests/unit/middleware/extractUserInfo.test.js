"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const extractUserInfo_1 = require("../../../src/middleware/extractUserInfo");
const test_utils_1 = require("../../helpers/test-utils");
describe('Extract User Info Middleware', () => {
    let mockRequest;
    let mockResponse;
    let nextFunction;
    beforeEach(() => {
        mockRequest = (0, test_utils_1.createMockRequest)();
        mockResponse = (0, test_utils_1.createMockResponse)();
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
            const result = (0, extractUserInfo_1.extractUserInfo)(userId, userTier);
            if (expectedResult.isValid) {
                expect(result.isValid).toBe(true);
                expect(result.data).toEqual(expectedResult.data);
            }
            else {
                expect(result.isValid).toBe(false);
                if (result.error) {
                    expect(result.error.status).toBe(expectedResult.error?.status);
                    expect(result.error.message).toBe(expectedResult.error?.message);
                }
                else {
                    fail('Expected an error, but no error was returned');
                }
            }
        });
    });
    describe('createExtractUserInfoMiddleware', () => {
        test('should call next for valid request', () => {
            const middleware = (0, extractUserInfo_1.createExtractUserInfoMiddleware)();
            mockRequest.headers = {
                'x-user-id': 'user123',
                'x-user-tier': 'standard'
            };
            middleware(mockRequest, mockResponse, nextFunction);
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(nextFunction).toHaveBeenCalled();
            expect(mockRequest.userInfo).toEqual({
                userId: 'user123',
                tier: 'standard'
            });
        });
        test('should return 400 for missing headers', () => {
            const middleware = (0, extractUserInfo_1.createExtractUserInfoMiddleware)();
            middleware(mockRequest, mockResponse, nextFunction);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Missing required headers',
                details: 'X-User-ID and X-User-Tier headers are required'
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });
        test('should return 400 for invalid tier', () => {
            const middleware = (0, extractUserInfo_1.createExtractUserInfoMiddleware)();
            mockRequest.headers = {
                'x-user-id': 'user123',
                'x-user-tier': 'premium'
            };
            middleware(mockRequest, mockResponse, nextFunction);
            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: 'Invalid tier',
                details: 'X-User-Tier must be either "standard" or "high"'
            });
            expect(nextFunction).not.toHaveBeenCalled();
        });
    });
});
