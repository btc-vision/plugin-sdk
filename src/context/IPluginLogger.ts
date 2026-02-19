/**
 * Plugin logging interface.
 *
 * Provides structured logging with automatic plugin name prefixing.
 * All log messages are forwarded to the node's logging system with
 * the plugin name prepended for easy identification.
 *
 * @remarks
 * The logger is always available via `context.logger` - no permissions required.
 * Log levels follow standard severity: debug < info < warn < error.
 * The node's logging configuration determines which levels are actually output.
 *
 * @example
 * ```typescript
 * import { PluginBase, IPluginContext } from '@btc-vision/plugin-sdk';
 *
 * export default class MyPlugin extends PluginBase {
 *     async onLoad(context: IPluginContext): Promise<void> {
 *         await super.onLoad(context);
 *
 *         this.context.logger.debug('Detailed initialization info');
 *         this.context.logger.info('Plugin loaded successfully');
 *         this.context.logger.warn('Configuration value missing, using default');
 *         this.context.logger.error('Failed to connect to external service', error);
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Plugin logger interface with automatic plugin name prefix.
 *
 * All log messages are automatically prefixed with `[plugin-name]` by the
 * node's logging system. Additional arguments are formatted inline,
 * similar to `console.log()`.
 *
 * @example
 * ```typescript
 * import type { IPluginLogger } from '@btc-vision/plugin-sdk';
 *
 * function processBlock(logger: IPluginLogger, height: bigint): void {
 *     logger.debug('Starting block processing', { height: height.toString() });
 *     logger.info(`Processed block #${height}`);
 * }
 *
 * function handleError(logger: IPluginLogger, operation: string, err: unknown): void {
 *     logger.error(`Operation "${operation}" failed:`, err);
 * }
 * ```
 */
export interface IPluginLogger {
    /**
     * Log a debug-level message.
     *
     * Use for detailed diagnostic information during development.
     * Debug messages may be suppressed in production configurations.
     *
     * @param message - Primary log message.
     * @param args - Additional values to include in the log entry.
     *
     * @example
     * ```typescript
     * logger.debug('Processing transaction', { txid, inputCount: tx.vin.length });
     * logger.debug(`Cache hit ratio: ${(hits / total * 100).toFixed(1)}%`);
     * ```
     */
    debug(message: string, ...args: unknown[]): void;

    /**
     * Log an info-level message.
     *
     * Use for general operational information: startup messages,
     * configuration summaries, periodic status updates.
     *
     * @param message - Primary log message.
     * @param args - Additional values to include in the log entry.
     *
     * @example
     * ```typescript
     * logger.info('Plugin initialized');
     * logger.info(`Indexed ${count} transactions in block #${height}`);
     * ```
     */
    info(message: string, ...args: unknown[]): void;

    /**
     * Log a warning-level message.
     *
     * Use for potentially harmful situations that don't prevent operation
     * but should be investigated: deprecated usage, missing optional
     * configuration, approaching resource limits.
     *
     * @param message - Primary log message.
     * @param args - Additional values to include in the log entry.
     *
     * @example
     * ```typescript
     * logger.warn('Deprecated API usage detected');
     * logger.warn(`Memory usage at ${usage}% of limit`);
     * logger.warn('Reorg handler not implemented - data may be inconsistent');
     * ```
     */
    warn(message: string, ...args: unknown[]): void;

    /**
     * Log an error-level message.
     *
     * Use for error events that prevent normal operation: failed
     * database writes, unhandled exceptions, connection failures.
     *
     * @param message - Primary log message.
     * @param args - Additional values (typically `Error` objects) to include.
     *
     * @example
     * ```typescript
     * logger.error('Database write failed', error);
     * logger.error(`Failed to process block #${height}:`, error.message);
     * ```
     */
    error(message: string, ...args: unknown[]): void;
}
