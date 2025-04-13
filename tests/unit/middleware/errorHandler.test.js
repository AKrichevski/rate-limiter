"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errorHandler_1 = require("../../../src/middleware/errorHandler");
describe('Error Handler Middleware', () => {
    let mockRequest;
    let mockResponse;
    let nextFunction;
    beforeEach(() => {
        mockRequest = {};
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        nextFunction = jest.fn();
        jest.spyOn(console, 'error').mockImplementation();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    it('should handle errors and return 500 status with error message', () => {
        const testError = new Error('Test error message');
        (0, errorHandler_1.errorHandler)(testError, mockRequest, mockResponse, nextFunction);
        expect(console.error).toHaveBeenCalledWith('Unhandled error:', testError);
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred'
        });
        expect(nextFunction).not.toHaveBeenCalled();
    });
    it('should handle different types of errors', () => {
        const stringError = 'String error';
        (0, errorHandler_1.errorHandler)(stringError, mockRequest, mockResponse, nextFunction);
        expect(console.error).toHaveBeenCalledWith('Unhandled error:', stringError);
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        const objectError = { message: 'Object error' };
        (0, errorHandler_1.errorHandler)(objectError, mockRequest, mockResponse, nextFunction);
        expect(console.error).toHaveBeenCalledWith('Unhandled error:', objectError);
        expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
    it('should handle errors with different properties', () => {
        const customError = new Error('Custom error');
        customError.statusCode = 400;
        customError.customProp = 'Custom property';
        (0, errorHandler_1.errorHandler)(customError, mockRequest, mockResponse, nextFunction);
        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred'
        });
    });
});
