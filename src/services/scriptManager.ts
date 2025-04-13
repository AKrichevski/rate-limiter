import fs from 'fs';
import path from 'path';
import { IRedisClient } from '../interfaces/IRedisClient';

export interface IScriptManager {
    initialize(): Promise<void>;
    getScriptSha(scriptName: string): string;
    isInitialized(): boolean;
    loadScript?(script: string): Promise<string>; // Made optional to match test usage patterns
}

/**
 * ScriptManager is responsible for loading Lua scripts into Redis at application startup
 * and providing access to script SHAs for execution.
 */
export class ScriptManager implements IScriptManager {
    private scriptShas: Map<string, string> = new Map();
    private initialized: boolean = false;
    private readonly scriptPath: string;

    constructor(
        private readonly redisClient: IRedisClient,
        scriptPath?: string
    ) {
        this.scriptPath = scriptPath || path.join(__dirname, '../lua');
    }

    /**
     * Initialize the ScriptManager by loading all Lua scripts in the script directory
     * This should be called once during application startup
     */
    public async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        try {
            const files = fs.readdirSync(this.scriptPath)
                .filter(file => file.endsWith('.lua'));

            for (const file of files) {
                try {
                const scriptName = file;
                const scriptContent = fs.readFileSync(path.join(this.scriptPath, file), 'utf-8');
                const sha = await this.redisClient.loadScript(scriptContent);
                this.scriptShas.set(scriptName, sha);
                console.log(`Loaded script ${scriptName} with SHA: ${sha}`);
                } catch (error) {
                    console.error('Error loading script to Redis:', error);
                    throw error;
                }
            }

            this.initialized = true;
            console.log('Script manager initialized successfully');
        } catch (error) {
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
    public getScriptSha(scriptName: string): string {
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
    public isInitialized(): boolean {
        return this.initialized;
    }
}
