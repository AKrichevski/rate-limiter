"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScriptManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
/**
 * ScriptManager is responsible for loading Lua scripts into Redis at application startup
 * and providing access to script SHAs for execution.
 */
class ScriptManager {
    constructor(redisClient, scriptPath) {
        this.redisClient = redisClient;
        this.scriptShas = new Map();
        this.initialized = false;
        this.scriptPath = scriptPath || path_1.default.join(__dirname, '../lua');
    }
    /**
     * Initialize the ScriptManager by loading all Lua scripts in the script directory
     * This should be called once during application startup
     */
    async initialize() {
        if (this.initialized) {
            return;
        }
        try {
            const files = fs_1.default.readdirSync(this.scriptPath)
                .filter(file => file.endsWith('.lua'));
            for (const file of files) {
                try {
                    const scriptName = file;
                    const scriptContent = fs_1.default.readFileSync(path_1.default.join(this.scriptPath, file), 'utf-8');
                    const sha = await this.redisClient.loadScript(scriptContent);
                    this.scriptShas.set(scriptName, sha);
                    console.log(`Loaded script ${scriptName} with SHA: ${sha}`);
                }
                catch (error) {
                    console.error('Error loading script to Redis:', error);
                    throw error;
                }
            }
            this.initialized = true;
            console.log('Script manager initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize script manager:', error);
            throw new Error(`Script initialization failed: ${error}`);
        }
    }
    /**
     * Get the SHA for a previously loaded script
     * @param scriptName The name of the script (including .lua extension)
     * @returns The SHA of the loaded script
     * @throws Error if the script is not found or ScriptManager is not initialized
     */
    getScriptSha(scriptName) {
        if (!this.initialized) {
            throw new Error('ScriptManager not initialized. Call initialize() first.');
        }
        const sha = this.scriptShas.get(scriptName);
        if (!sha) {
            throw new Error(`Script ${scriptName} not found. Available scripts: ${Array.from(this.scriptShas.keys()).join(', ')}`);
        }
        return sha;
    }
    /**
     * Check if the ScriptManager has been initialized
     */
    isInitialized() {
        return this.initialized;
    }
}
exports.ScriptManager = ScriptManager;
