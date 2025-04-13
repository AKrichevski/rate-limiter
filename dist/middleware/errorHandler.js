"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, _req, res, _next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
    });
};
exports.errorHandler = errorHandler;
