"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApiRouter = void 0;
const express_1 = require("express");
const requestController_1 = require("../controllers/requestController");
const extractUserInfo_1 = require("../middleware/extractUserInfo");
const createApiRouter = (rateLimiterService) => {
    const router = (0, express_1.Router)();
    const extractUserInfoMiddleware = (0, extractUserInfo_1.createExtractUserInfoMiddleware)();
    const requestController = new requestController_1.RequestController(rateLimiterService);
    router.post('/request', extractUserInfoMiddleware, requestController.handleRequest.bind(requestController));
    return router;
};
exports.createApiRouter = createApiRouter;
