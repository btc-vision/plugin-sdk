/**
 * Plugin sub-worker thread interface.
 *
 * Allows plugins to spawn additional worker threads for CPU-intensive
 * or parallel processing tasks. Sub-workers communicate with the main
 * plugin thread via message passing.
 *
 * @remarks
 * - Requires `threading` permission with `maxWorkers > 0`.
 * - Workers are created via `context.createWorker(scriptPath)`.
 * - Worker memory is limited by `threading.maxMemoryMB`.
 * - The total number of workers across all invocations cannot exceed `threading.maxWorkers`.
 *
 * @example
 * ```typescript
 * import { PluginBase, IPluginContext, IPluginWorker } from '@btc-vision/plugin-sdk';
 *
 * export default class ParallelPlugin extends PluginBase {
 *     private worker?: IPluginWorker;
 *
 *     async onLoad(context: IPluginContext): Promise<void> {
 *         await super.onLoad(context);
 *
 *         // Spawn a sub-worker for heavy computation
 *         this.worker = this.context.createWorker('./compute-worker.js');
 *
 *         this.worker.on('message', (result) => {
 *             this.context.logger.info('Worker result:', result);
 *         });
 *
 *         this.worker.on('error', (err) => {
 *             this.context.logger.error('Worker error:', err);
 *         });
 *
 *         this.worker.on('exit', (code) => {
 *             this.context.logger.info(`Worker exited with code ${code}`);
 *         });
 *     }
 *
 *     async onUnload(): Promise<void> {
 *         if (this.worker) {
 *             await this.worker.terminate();
 *         }
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Sub-worker thread interface for parallel processing.
 *
 * Wraps a Node.js worker thread with a simplified API for
 * message passing and lifecycle management.
 *
 * @example
 * ```typescript
 * import type { IPluginWorker } from '@btc-vision/plugin-sdk';
 *
 * async function runComputation(
 *     worker: IPluginWorker,
 *     data: unknown,
 * ): Promise<unknown> {
 *     return new Promise((resolve, reject) => {
 *         worker.on('message', resolve);
 *         worker.on('error', reject);
 *         worker.postMessage(data);
 *     });
 * }
 * ```
 */
export interface IPluginWorker {
    /**
     * Send a message to the worker thread.
     *
     * The message is serialized via the structured clone algorithm
     * (supports most JavaScript types including `ArrayBuffer`,
     * `Map`, `Set`, etc. but not functions or symbols).
     *
     * @param message - Data to send to the worker.
     *
     * @example
     * ```typescript
     * worker.postMessage({ type: 'process', data: blockData });
     * worker.postMessage({ type: 'shutdown' });
     * ```
     */
    postMessage(message: unknown): void;

    /**
     * Subscribe to messages from the worker thread.
     *
     * @param event - Must be `'message'`.
     * @param handler - Callback invoked with each message from the worker.
     *
     * @example
     * ```typescript
     * worker.on('message', (msg) => {
     *     if (msg.type === 'result') {
     *         console.log('Computation result:', msg.data);
     *     }
     * });
     * ```
     */
    on(event: 'message', handler: (message: unknown) => void): void;

    /**
     * Subscribe to worker errors.
     *
     * Fires when an unhandled exception occurs in the worker thread.
     *
     * @param event - Must be `'error'`.
     * @param handler - Callback invoked with the error.
     *
     * @example
     * ```typescript
     * worker.on('error', (err) => {
     *     logger.error('Worker crashed:', err.message);
     * });
     * ```
     */
    on(event: 'error', handler: (error: Error) => void): void;

    /**
     * Subscribe to worker exit events.
     *
     * Fires when the worker thread terminates (normally or due to an error).
     *
     * @param event - Must be `'exit'`.
     * @param handler - Callback invoked with the exit code (0 = normal).
     *
     * @example
     * ```typescript
     * worker.on('exit', (code) => {
     *     if (code !== 0) {
     *         logger.warn(`Worker exited abnormally with code ${code}`);
     *     }
     * });
     * ```
     */
    on(event: 'exit', handler: (code: number) => void): void;

    /**
     * Terminate the worker thread.
     *
     * Sends a termination signal to the worker. The worker should
     * clean up and exit. Returns the exit code.
     *
     * @returns Exit code (0 = normal termination).
     *
     * @example
     * ```typescript
     * const exitCode = await worker.terminate();
     * logger.info(`Worker terminated with code ${exitCode}`);
     * ```
     */
    terminate(): Promise<number>;
}

/**
 * Event handler type for inter-plugin communication.
 *
 * Used with `context.on()` and `context.off()` to subscribe to
 * events emitted by other plugins via `context.emit()`.
 *
 * @example
 * ```typescript
 * import type { EventHandler } from '@btc-vision/plugin-sdk';
 *
 * const handler: EventHandler = (data) => {
 *     console.log('Received event:', data);
 * };
 *
 * // Subscribe
 * context.on('price-update', handler);
 *
 * // Unsubscribe
 * context.off('price-update', handler);
 * ```
 */
export type EventHandler = (data: unknown) => void | Promise<void>;
