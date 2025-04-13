import { Request, Response } from 'express';
import { errorHandler } from '../../../src/middleware/errorHandler';

describe('Error Handler Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: jest.Mock<void, []>;

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

        errorHandler(
            testError,
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

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
        errorHandler(
            stringError as any,
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(console.error).toHaveBeenCalledWith('Unhandled error:', stringError);
        expect(mockResponse.status).toHaveBeenCalledWith(500);

        const objectError = { message: 'Object error' };
        errorHandler(
            objectError as any,
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(console.error).toHaveBeenCalledWith('Unhandled error:', objectError);
        expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it('should handle errors with different properties', () => {
        const customError = new Error('Custom error');
        (customError as any).statusCode = 400;
        (customError as any).customProp = 'Custom property';

        errorHandler(
            customError,
            mockRequest as Request,
            mockResponse as Response,
            nextFunction
        );

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            error: 'Internal Server Error',
            message: 'An unexpected error occurred'
        });
    });
});
