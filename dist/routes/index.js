"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoutes = void 0;
const express_1 = require("express");
const api_routes_1 = require("./api.routes");
const createRoutes = (rateLimiterService) => {
    const router = (0, express_1.Router)();
    router.use('/api', (0, api_routes_1.createApiRouter)(rateLimiterService));
    router.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok' });
    });
    return router;
};
exports.createRoutes = createRoutes;
