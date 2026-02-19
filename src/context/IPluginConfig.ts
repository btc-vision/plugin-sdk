/**
 * Plugin configuration interface.
 *
 * Provides typed access to plugin configuration values. Configuration
 * is loaded from the node's plugin configuration system and can be
 * modified at runtime by the plugin.
 *
 * @remarks
 * Configuration keys and types can be declared in the plugin manifest
 * via {@link IPluginConfigSchema}. The node validates user-provided
 * configuration against this schema before passing it to the plugin.
 *
 * @example
 * ```typescript
 * import { PluginBase, IPluginContext } from '@btc-vision/plugin-sdk';
 *
 * export default class MyPlugin extends PluginBase {
 *     async onLoad(context: IPluginContext): Promise<void> {
 *         await super.onLoad(context);
 *
 *         // Read configuration with type inference
 *         const apiUrl = this.context.config.get<string>('apiUrl', 'https://default.api.com');
 *         const maxRetries = this.context.config.get<number>('maxRetries', 3);
 *         const verbose = this.context.config.get<boolean>('verbose', false);
 *
 *         this.context.logger.info(`Config: apiUrl=${apiUrl}, maxRetries=${maxRetries}`);
 *
 *         // Update configuration at runtime
 *         this.context.config.set('lastLoadTime', Date.now());
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Plugin configuration interface for reading and writing settings.
 *
 * Provides a simple key-value store for plugin configuration with
 * type-safe getters and setters.
 *
 * @example
 * ```typescript
 * import type { IPluginConfig } from '@btc-vision/plugin-sdk';
 *
 * function loadSettings(config: IPluginConfig): {
 *     batchSize: number;
 *     enabled: boolean;
 * } {
 *     return {
 *         batchSize: config.get<number>('batchSize', 100),
 *         enabled: config.get<boolean>('enabled', true),
 *     };
 * }
 * ```
 */
export interface IPluginConfig {
    /**
     * Get a configuration value by key.
     *
     * Returns `undefined` if the key does not exist.
     *
     * @typeParam T - Expected type of the configuration value.
     * @param key - Configuration key.
     * @returns The configuration value cast to `T`, or `undefined`.
     *
     * @example
     * ```typescript
     * const apiUrl = config.get<string>('apiUrl');
     * if (apiUrl === undefined) {
     *     throw new Error('apiUrl configuration is required');
     * }
     * ```
     */
    get<T>(key: string): T | undefined;

    /**
     * Get a configuration value by key with a default fallback.
     *
     * @typeParam T - Expected type of the configuration value.
     * @param key - Configuration key.
     * @param defaultValue - Value to return if the key does not exist.
     * @returns The configuration value cast to `T`, or the default.
     *
     * @example
     * ```typescript
     * const batchSize = config.get<number>('batchSize', 100);
     * const verbose = config.get<boolean>('verbose', false);
     * const name = config.get<string>('name', 'default-name');
     * ```
     */
    get<T>(key: string, defaultValue: T): T;

    /**
     * Set a configuration value.
     *
     * The value is stored in memory and may be persisted depending
     * on the node's configuration storage backend.
     *
     * @param key - Configuration key.
     * @param value - Value to store.
     *
     * @example
     * ```typescript
     * config.set('lastProcessedBlock', 850000);
     * config.set('syncState', { complete: true, timestamp: Date.now() });
     * ```
     */
    set(key: string, value: unknown): void;

    /**
     * Check if a configuration key exists.
     *
     * @param key - Configuration key.
     * @returns `true` if the key exists (even if the value is `null` or `false`).
     *
     * @example
     * ```typescript
     * if (config.has('webhookUrl')) {
     *     const url = config.get<string>('webhookUrl')!;
     *     await sendWebhook(url, data);
     * }
     * ```
     */
    has(key: string): boolean;

    /**
     * Get all configuration values as a plain object.
     *
     * @returns Record of all configuration key-value pairs.
     *
     * @example
     * ```typescript
     * const allConfig = config.getAll();
     * logger.debug('Current configuration:', allConfig);
     * ```
     */
    getAll(): Record<string, unknown>;
}
