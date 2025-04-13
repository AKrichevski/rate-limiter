"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = require("./config");
const redisClient_1 = require("./services/redisClient");
const scriptManager_1 = require("./services/scriptManager");
const routes_1 = require("./routes");
const errorHandler_1 = require("./middleware/errorHandler");
const rateLimiter_1 = require("./services/rateLimiter");
const http_1 = __importDefault(require("http"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
const redisClient = new redisClient_1.RedisClient({
    host: config_1.config.redis.host,
    port: config_1.config.redis.port,
    password: config_1.config.redis.password
});
async function initializeApp() {
    try {
        const scriptManager = new scriptManager_1.ScriptManager(redisClient);
        await scriptManager.initialize();
        const rateLimiterService = new rateLimiter_1.RateLimiterService(redisClient, scriptManager);
        app.use((0, routes_1.createRoutes)(rateLimiterService));
        app.use(errorHandler_1.errorHandler);
        const signals = ['SIGTERM', 'SIGINT'];
        signals.forEach(signal => {
            process.on(signal, async () => {
                console.log(`Received ${signal}. Shutting down gracefully...`);
                try {
                    await rateLimiterService.close();
                    process.exit(0);
                }
                catch (error) {
                    console.error('Error during graceful shutdown:', error);
                    process.exit(1);
                }
            });
        });
        if (require.main === module) {
            const PORT = config_1.config.app.port;
            const server = http_1.default.createServer(app);
            server.listen(PORT, () => {
                console.log(`Server running on port ${PORT} in ${config_1.config.app.env} mode`);
            });
        }
        return { rateLimiterService, app };
    }
    catch (error) {
        console.error('Failed to initialize application:', error);
        process.exit(1);
    }
}
initializeApp().catch(err => {
    console.error('Fatal error during app initialization:', err);
    process.exit(1);
});
exports.default = app;
