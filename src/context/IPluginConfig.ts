/**
 * Plugin configuration interface
 * Provides access to plugin configuration values
 */
export interface IPluginConfig {
    /**
     * Get a configuration value
     * @param key - Configuration key
     * @returns Configuration value or undefined
     */
    get<T>(key: string): T | undefined;

    /**
     * Get a configuration value with default
     * @param key - Configuration key
     * @param defaultValue - Default value if key not found
     * @returns Configuration value or default
     */
    get<T>(key: string, defaultValue: T): T;

    /**
     * Set a configuration value
     * @param key - Configuration key
     * @param value - Value to set
     */
    set(key: string, value: unknown): void;

    /**
     * Check if a configuration key exists
     * @param key - Configuration key
     * @returns True if key exists
     */
    has(key: string): boolean;

    /**
     * Get all configuration values
     * @returns All configuration as a record
     */
    getAll(): Record<string, unknown>;
}
