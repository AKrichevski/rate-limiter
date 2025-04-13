export interface IRedisClient {
    evalScript(sha: string, keys: string[], args: string[]): Promise<any>;
    loadScript(script: string): Promise<string>;
    deleteKey(key: string): Promise<number>;
    getKey(key: string): Promise<string | null>;
    setKey(key: string, value: string, mode?: string, expiry?: number): Promise<boolean>;
    quit(): Promise<void>;
    disconnect?(): void;
}
