"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const config_1 = require("../../src/config");
async function importApp() {
    try {
        const module = await Promise.resolve().then(() => __importStar(require('../../src/app')));
        return module.default;
    }
    catch (error) {
        console.error('Failed to import app:', error);
        throw error;
    }
}
describe('Application Tests', () => {
    let app;
    beforeAll(async () => {
        app = await importApp();
    });
    describe('Configuration', () => {
        it('should load configuration correctly', () => {
            expect(config_1.config).toBeDefined();
            expect(config_1.config.app).toBeDefined();
            expect(config_1.config.redis).toBeDefined();
            expect(config_1.config.rateLimiter).toBeDefined();
        });
    });
    describe('Application Startup', () => {
        it('should initialize the application', () => {
            expect(app).toBeDefined();
        });
    });
    describe('Error Handling', () => {
        it('should have an error handler', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/non-existent-route')
                .set('X-User-ID', 'test-user')
                .set('X-User-Tier', 'standard');
            expect(response.status).toBe(404);
        });
    });
});
