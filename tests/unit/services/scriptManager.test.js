"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const scriptManager_1 = require("../../../src/services/scriptManager");
const test_utils_1 = require("../../helpers/test-utils");
describe('ScriptManager', () => {
    let scriptManager;
    let mockRedisClient;
    const mockScriptPath = path_1.default.join(__dirname, '__mocks__', 'lua');
    const originalReaddirSync = fs_1.default.readdirSync;
    const originalReadFileSync = fs_1.default.readFileSync;
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    let mockConsoleError;
    beforeEach(() => {
        mockConsoleError = jest.fn();
        console.error = mockConsoleError;
        console.log = jest.fn();
        mockRedisClient = (0, test_utils_1.createMockRedisClient)();
        mockRedisClient.loadScript.mockClear();
        fs_1.default.readdirSync = jest.fn().mockReturnValue(['rateLimiter.lua', 'scriptLoadMonitor.lua']);
        fs_1.default.readFileSync = jest.fn().mockImplementation((filePath) => {
            const fileName = path_1.default.basename(filePath);
            switch (fileName) {
                case 'rateLimiter.lua':
                    return 'local mock rate limiter script content';
                case 'scriptLoadMonitor.lua':
                    return 'local mock script load monitor content';
                default:
                    return '';
            }
        });
        scriptManager = new scriptManager_1.ScriptManager(mockRedisClient, mockScriptPath);
    });
    afterEach(() => {
        fs_1.default.readdirSync = originalReaddirSync;
        fs_1.default.readFileSync = originalReadFileSync;
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
    });
    describe('Initialization', () => {
        test('should load all Lua scripts during initialization', async () => {
            await scriptManager.initialize();
            const loadScriptCalls = mockRedisClient.loadScript.mock.calls;
            const uniqueScripts = new Set(loadScriptCalls.map(call => call[0]));
            expect(uniqueScripts.size).toBe(2);
            expect(loadScriptCalls.length).toBe(2);
            expect(loadScriptCalls[0][0]).toBe('local mock rate limiter script content');
            expect(loadScriptCalls[1][0]).toBe('local mock script load monitor content');
        });
        test('should not reload scripts if already initialized', async () => {
            await scriptManager.initialize();
            fs_1.default.readdirSync.mockClear();
            fs_1.default.readFileSync.mockClear();
            mockRedisClient.loadScript.mockClear();
            await scriptManager.initialize();
            expect(fs_1.default.readdirSync).not.toHaveBeenCalled();
            expect(fs_1.default.readFileSync).not.toHaveBeenCalled();
            expect(mockRedisClient.loadScript).not.toHaveBeenCalled();
        });
        test('should throw error if script loading fails', async () => {
            fs_1.default.readdirSync.mockImplementation(() => {
                throw new Error('File system error');
            });
            await expect(scriptManager.initialize()).rejects.toThrow('Script initialization failed');
        });
    });
    describe('Script SHA Management', () => {
        beforeEach(async () => {
            // Preset loadScript to return specific SHAs
            mockRedisClient.loadScript
                .mockResolvedValueOnce('rateLimiterSha')
                .mockResolvedValueOnce('scriptLoadMonitorSha');
            await scriptManager.initialize();
        });
        test('should return SHA for loaded script', () => {
            const rateLimiterSha = scriptManager.getScriptSha('rateLimiter.lua');
            expect(rateLimiterSha).toBe('rateLimiterSha');
            const scriptLoadMonitorSha = scriptManager.getScriptSha('scriptLoadMonitor.lua');
            expect(scriptLoadMonitorSha).toBe('scriptLoadMonitorSha');
        });
        test('should throw error when getting SHA for unknown script', () => {
            expect(() => {
                scriptManager.getScriptSha('nonexistent.lua');
            }).toThrow(/Script nonexistent.lua not found/);
        });
        test('should throw error when getting SHA before initialization', () => {
            const uninitializedScriptManager = new scriptManager_1.ScriptManager(mockRedisClient, mockScriptPath);
            expect(() => {
                uninitializedScriptManager.getScriptSha('rateLimiter.lua');
            }).toThrow('ScriptManager not initialized');
        });
    });
    describe('Initialization State', () => {
        test('should report correct initialization state', async () => {
            expect(scriptManager.isInitialized()).toBe(false);
            await scriptManager.initialize();
            expect(scriptManager.isInitialized()).toBe(true);
        });
    });
    describe('Error Handling', () => {
        test('should log and rethrow error when loading script fails', async () => {
            const scriptLoadError = new Error('Redis script load failed');
            mockRedisClient.loadScript.mockRejectedValue(scriptLoadError);
            await expect(scriptManager.initialize()).rejects.toThrow('Script initialization failed');
            expect(mockConsoleError).toHaveBeenCalledWith('Error loading script to Redis:', scriptLoadError);
        });
        test('should handle partial script loading failure', async () => {
            mockRedisClient.loadScript
                .mockResolvedValueOnce('firstScriptSha')
                .mockRejectedValueOnce(new Error('Second script load failed'));
            await expect(scriptManager.initialize()).rejects.toThrow('Script initialization failed');
            expect(mockConsoleError).toHaveBeenCalledWith('Error loading script to Redis:', expect.any(Error));
            expect(scriptManager.isInitialized()).toBe(false);
            expect(() => {
                scriptManager.getScriptSha('rateLimiter.lua');
            }).toThrow('ScriptManager not initialized');
        });
    });
});
