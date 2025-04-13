import fs from 'fs';
import path from 'path';
import { ScriptManager } from '../../../src/services/scriptManager';
import {
    createMockRedisClient
} from '../../helpers/test-utils';

describe('ScriptManager', () => {
    let scriptManager: ScriptManager;
    let mockRedisClient: ReturnType<typeof createMockRedisClient>;
    const mockScriptPath = path.join(__dirname, '__mocks__', 'lua');
    const originalReaddirSync = fs.readdirSync;
    const originalReadFileSync = fs.readFileSync;
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    let mockConsoleError: jest.Mock;

    beforeEach(() => {
        mockConsoleError = jest.fn();
        console.error = mockConsoleError;
        console.log = jest.fn();

        mockRedisClient = createMockRedisClient();
        mockRedisClient.loadScript.mockClear();

        fs.readdirSync = jest.fn().mockReturnValue(['rateLimiter.lua', 'scriptLoadMonitor.lua']);
        fs.readFileSync = jest.fn().mockImplementation((filePath) => {
            const fileName = path.basename(filePath as string);
            switch (fileName) {
                case 'rateLimiter.lua':
                    return 'local mock rate limiter script content';
                case 'scriptLoadMonitor.lua':
                    return 'local mock script load monitor content';
                default:
                    return '';
            }
        });

        scriptManager = new ScriptManager(mockRedisClient, mockScriptPath);
    });

    afterEach(() => {
        fs.readdirSync = originalReaddirSync;
        fs.readFileSync = originalReadFileSync;
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
    });

    describe('Initialization', () => {
        test('should load all Lua scripts during initialization', async () => {
            await scriptManager.initialize();

            const loadScriptCalls = (mockRedisClient.loadScript as jest.Mock).mock.calls;
            const uniqueScripts = new Set(loadScriptCalls.map(call => call[0]));

            expect(uniqueScripts.size).toBe(2);
            expect(loadScriptCalls.length).toBe(2);
            expect(loadScriptCalls[0][0]).toBe('local mock rate limiter script content');
            expect(loadScriptCalls[1][0]).toBe('local mock script load monitor content');
        });

        test('should not reload scripts if already initialized', async () => {
            await scriptManager.initialize();

            (fs.readdirSync as jest.Mock).mockClear();
            (fs.readFileSync as jest.Mock).mockClear();
            mockRedisClient.loadScript.mockClear();

            await scriptManager.initialize();

            expect(fs.readdirSync).not.toHaveBeenCalled();
            expect(fs.readFileSync).not.toHaveBeenCalled();
            expect(mockRedisClient.loadScript).not.toHaveBeenCalled();
        });

        test('should throw error if script loading fails', async () => {
            (fs.readdirSync as jest.Mock).mockImplementation(() => {
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
            const uninitializedScriptManager = new ScriptManager(mockRedisClient, mockScriptPath);

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

            expect(mockConsoleError).toHaveBeenCalledWith(
                'Error loading script to Redis:',
                scriptLoadError
            );
        });

        test('should handle partial script loading failure', async () => {
            mockRedisClient.loadScript
                .mockResolvedValueOnce('firstScriptSha')
                .mockRejectedValueOnce(new Error('Second script load failed'));

            await expect(scriptManager.initialize()).rejects.toThrow('Script initialization failed');

            expect(mockConsoleError).toHaveBeenCalledWith(
                'Error loading script to Redis:',
                expect.any(Error)
            );
            expect(scriptManager.isInitialized()).toBe(false);
            expect(() => {
                scriptManager.getScriptSha('rateLimiter.lua');
            }).toThrow('ScriptManager not initialized');
        });
    });
});
