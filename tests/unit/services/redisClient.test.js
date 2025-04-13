"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
const redisClient_1 = require("../../../src/services/redisClient");
const test_utils_1 = require("../../helpers/test-utils");
jest.mock('ioredis');
describe('RedisClient', () => {
    let redisClient;
    let mockRedis;
    beforeEach(() => {
        ioredis_1.default.mockClear();
        mockRedis = new ioredis_1.default();
        mockRedis.on = jest.fn().mockReturnThis();
        mockRedis.evalsha = jest.fn();
        mockRedis.script = jest.fn();
        mockRedis.get = jest.fn();
        mockRedis.set = jest.fn().mockResolvedValue('OK');
        mockRedis.del = jest.fn().mockResolvedValue(1);
        mockRedis.quit = jest.fn().mockResolvedValue('OK');
        mockRedis.disconnect = jest.fn();
        ioredis_1.default.mockImplementation(() => mockRedis);
        redisClient = new redisClient_1.RedisClient({
            host: test_utils_1.TEST_CONFIG.REDIS_HOST,
            port: test_utils_1.TEST_CONFIG.REDIS_PORT
        });
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('Constructor', () => {
        it('should create a Redis client with proper options', () => {
            // Verify the Redis constructor was called with correct options
            expect(ioredis_1.default).toHaveBeenCalledWith(expect.objectContaining({
                host: test_utils_1.TEST_CONFIG.REDIS_HOST,
                port: test_utils_1.TEST_CONFIG.REDIS_PORT,
                retryStrategy: expect.any(Function)
            }));
        });
        it('should register event handlers', () => {
            expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
            expect(mockRedis.on).toHaveBeenCalledWith('ready', expect.any(Function));
            const onCalls = mockRedis.on.mock.calls;
            const errorCall = onCalls.find(call => call[0] === 'error');
            if (errorCall && errorCall.length > 1 && typeof errorCall[1] === 'function') {
                const errorHandler = errorCall[1];
                errorHandler(new Error('Test error'));
                expect(console.error).toHaveBeenCalledWith('Redis connection error:', expect.any(Error));
            }
            const readyCall = onCalls.find(call => call[0] === 'ready');
            if (readyCall && readyCall.length > 1 && typeof readyCall[1] === 'function') {
                const readyHandler = readyCall[1];
                readyHandler();
                expect(console.log).toHaveBeenCalledWith('Redis connection established');
            }
        });
    });
    describe('evalScript', () => {
        it('should call evalsha with correct parameters', async () => {
            mockRedis.evalsha.mockResolvedValue('result');
            const result = await redisClient.evalScript('testsha', ['key1', 'key2'], ['arg1', 'arg2']);
            expect(mockRedis.evalsha).toHaveBeenCalledWith('testsha', 2, 'key1', 'key2', 'arg1', 'arg2');
            expect(result).toBe('result');
        });
        it('should handle NOSCRIPT error', async () => {
            const noscriptError = new Error('NOSCRIPT No matching script');
            mockRedis.evalsha.mockRejectedValue(noscriptError);
            await expect(redisClient.evalScript('testsha', [], [])).rejects.toThrow('NOSCRIPT');
        });
        it('should handle connection errors', async () => {
            const connectionError = new Error('connection error');
            mockRedis.evalsha.mockRejectedValue(connectionError);
            await expect(redisClient.evalScript('testsha', [], [])).rejects.toThrow('connection error');
            expect(console.error).toHaveBeenCalledWith('Redis connection error during script execution:', 'connection error');
        });
        it('should rethrow other errors', async () => {
            const otherError = new Error('some other error');
            mockRedis.evalsha.mockRejectedValue(otherError);
            await expect(redisClient.evalScript('testsha', [], [])).rejects.toThrow('some other error');
        });
    });
    describe('loadScript', () => {
        it('should load the script correctly', async () => {
            mockRedis.script.mockResolvedValue('scripthash');
            const result = await redisClient.loadScript('scriptcontent');
            expect(mockRedis.script).toHaveBeenCalledWith('LOAD', 'scriptcontent');
            expect(result).toBe('scripthash');
        });
    });
    describe('getKey', () => {
        it('should call get with the key', async () => {
            mockRedis.get.mockResolvedValue('value');
            const result = await redisClient.getKey('testkey');
            expect(mockRedis.get).toHaveBeenCalledWith('testkey');
            expect(result).toBe('value');
        });
        it('should handle null values', async () => {
            mockRedis.get.mockResolvedValue(null);
            const result = await redisClient.getKey('testkey');
            expect(result).toBeNull();
        });
    });
    describe('setKey', () => {
        it('should set key with value', async () => {
            const result = await redisClient.setKey('testkey', 'testvalue');
            expect(mockRedis.set).toHaveBeenCalledWith('testkey', 'testvalue');
            expect(result).toBe(true);
        });
        it('should set key with expiry', async () => {
            const result = await redisClient.setKey('testkey', 'testvalue', undefined, 60);
            expect(mockRedis.set).toHaveBeenCalledWith('testkey', 'testvalue', 'EX', 60);
            expect(result).toBe(true);
        });
        it('should set key with NX mode', async () => {
            const result = await redisClient.setKey('testkey', 'testvalue', 'NX');
            expect(mockRedis.set).toHaveBeenCalledWith('testkey', 'testvalue', 'NX');
            expect(result).toBe(true);
        });
        it('should set key with NX mode and expiry', async () => {
            const result = await redisClient.setKey('testkey', 'testvalue', 'NX', 60);
            expect(mockRedis.set).toHaveBeenCalledWith('testkey', 'testvalue', 'EX', 60, 'NX');
            expect(result).toBe(true);
        });
        it('should handle errors during set operation', async () => {
            mockRedis.set.mockRejectedValue(new Error('Set error'));
            const result = await redisClient.setKey('testkey', 'testvalue');
            expect(console.error).toHaveBeenCalledWith('Error setting key in Redis:', expect.any(Error));
            expect(result).toBe(false);
        });
        it('should handle non-OK responses', async () => {
            mockRedis.set.mockResolvedValue('NOT OK');
            const result = await redisClient.setKey('testkey', 'testvalue');
            expect(result).toBe(false);
        });
    });
    describe('deleteKey', () => {
        it('should call del with the key', async () => {
            const result = await redisClient.deleteKey('testkey');
            expect(mockRedis.del).toHaveBeenCalledWith('testkey');
            expect(result).toBe(1);
        });
    });
    describe('quit and disconnect', () => {
        it('should call quit on the Redis instance', async () => {
            await redisClient.quit();
            expect(mockRedis.quit).toHaveBeenCalled();
        });
        it('should handle errors during quit', async () => {
            mockRedis.quit.mockRejectedValue(new Error('Quit error'));
            await redisClient.quit();
            expect(console.error).toHaveBeenCalledWith('Error closing Redis connection:', expect.any(Error));
        });
        it('should call disconnect on the Redis instance', () => {
            redisClient.disconnect();
            expect(mockRedis.disconnect).toHaveBeenCalled();
        });
        it('should handle errors during disconnect', () => {
            mockRedis.disconnect.mockImplementation(() => {
                throw new Error('Disconnect error');
            });
            redisClient.disconnect();
            expect(console.error).toHaveBeenCalledWith('Error disconnecting Redis:', expect.any(Error));
        });
    });
});
