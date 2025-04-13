import { Router } from 'express';
import { RequestController } from '../controllers/requestController';
import { createExtractUserInfoMiddleware } from '../middleware/extractUserInfo';
import {RateLimiterService} from "../services/rateLimiter";

export const createApiRouter = (rateLimiterService: RateLimiterService): Router => {
    const router = Router();
    const extractUserInfoMiddleware = createExtractUserInfoMiddleware();
    const requestController = new RequestController(rateLimiterService);

    router.post('/request',
        extractUserInfoMiddleware,
        requestController.handleRequest.bind(requestController)
    );

    return router;
};
