"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisClient = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
class RedisClient {
    constructor(options = {}) {
        this.redis = new ioredis_1.default({
            ...options,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000) + Math.floor(Math.random() * 100);
                console.log(`Redis connection retry in ${delay}ms (attempt ${times})`);
                return delay;
            }
        });
        this.redis.on('error', (err) => {
            console.error('Redis connection error:', err);
        });
        this.redis.on('ready', () => {
            console.log('Redis connection established');
        });
    }
    async evalScript(sha, keys, args) {
        try {
            return await this.redis.evalsha(sha, keys.length, ...keys, ...args);
        }
        catch (error) {
            if (error.message?.includes('NOSCRIPT')) {
                throw error;
            }
            if (error.message?.includes('connection')) {
                console.error('Redis connection error during script execution:', error.message);
            }
            throw error;
        }
    }
    async loadScript(script) {
        try {
            // This method will load the Lua script and return the SHA1 hash
            return this.redis.script('LOAD', script);
        }
        catch (error) {
            console.error('Error loading script to Redis:', error.message);
            throw error;
        }
    }
    async getKey(key) {
        return this.redis.get(key);
    }
    async setKey(key, value, mode, expiry) {
        try {
            let result;
            if (mode === 'NX' && expiry) {
                result = await this.redis.set(key, value, 'EX', expiry, 'NX');
            }
            else if (mode === 'NX') {
                result = await this.redis.set(key, value, 'NX');
            }
            else if (expiry) {
                result = await this.redis.set(key, value, 'EX', expiry);
            }
            else {
                result = await this.redis.set(key, value);
            }
            return result === 'OK';
        }
        catch (error) {
            console.error('Error setting key in Redis:', error);
            return false;
        }
    }
    async deleteKey(key) {
        return this.redis.del(key);
    }
    async quit() {
        try {
            await this.redis.quit();
        }
        catch (err) {
            console.error('Error closing Redis connection:', err);
        }
    }
    disconnect() {
        try {
            this.redis.disconnect();
        }
        catch (err) {
            console.error('Error disconnecting Redis:', err);
        }
    }
}
exports.RedisClient = RedisClient;
