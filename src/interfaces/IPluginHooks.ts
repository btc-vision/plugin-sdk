/**
 * Plugin hook system types, configuration, and dispatch interfaces.
 *
 * This module defines the hook-based event system that the OPNet plugin
 * runtime uses to notify plugins about lifecycle transitions, block processing,
 * epoch changes, mempool activity, chain reorganizations, and reindex operations.
 *
 * Hooks are the primary mechanism through which plugins receive data from the
 * OPNet indexer. Each hook type has a predefined {@link IHookConfig} in the
 * {@link HOOK_CONFIGS} record that specifies its execution mode (parallel or
 * sequential), timeout, and required permission string.
 *
 * @remarks
 * - **Lifecycle hooks** (`LOAD`, `UNLOAD`, `ENABLE`, `DISABLE`) are always
 *   executed sequentially and do not require explicit permissions.
 * - **Block hooks** (`BLOCK_PRE_PROCESS`, `BLOCK_POST_PROCESS`, `BLOCK_CHANGE`)
 *   execute in parallel across plugins and require the corresponding
 *   `blocks.*` permission in the plugin manifest.
 * - **Critical hooks** (`REORG`, `REINDEX_REQUIRED`, `PURGE_BLOCKS`) are
 *   sequential and **blocking** - the indexer halts until every plugin
 *   completes its handler. These hooks have extended timeouts (5-10 minutes).
 *
 * @example
 * ```typescript
 * import {
 *     HookType,
 *     HookExecutionMode,
 *     HOOK_CONFIGS,
 *     IHookResult,
 *     HookPayload,
 * } from '@btc-vision/plugin-sdk';
 *
 * // Inspect the configuration for a specific hook
 * const blockConfig = HOOK_CONFIGS[HookType.BLOCK_PRE_PROCESS];
 * console.log(blockConfig.executionMode); // 'parallel'
 * console.log(blockConfig.timeoutMs);     // 5000
 * console.log(blockConfig.requiredPermission); // 'blocks.preProcess'
 * ```
 *
 * @packageDocumentation
 */

import { IBlockData, IBlockProcessedData } from '../types/BlockTypes.js';
import { IEpochData } from '../types/EpochTypes.js';
import { IMempoolTransaction } from '../types/MempoolTypes.js';
import { IReorgData } from '../types/ReorgTypes.js';
import { IReindexCheck } from './IPluginInstallState.js';

/**
 * Determines how multiple plugin handlers for the same hook type are executed.
 *
 * When the OPNet indexer dispatches a hook event, it must invoke every
 * registered handler across all loaded plugins. The execution mode controls
 * whether those handlers run concurrently or one-by-one.
 *
 * - {@link PARALLEL} is used for hooks where handler order does not matter
 *   and handlers are independent (e.g., block processing, epoch events).
 * - {@link SEQUENTIAL} is used for hooks where ordering or blocking semantics
 *   are required (e.g., lifecycle hooks, reorg handling).
 *
 * @example
 * ```typescript
 * import { HookExecutionMode, HOOK_CONFIGS, HookType } from '@btc-vision/plugin-sdk';
 *
 * // Check whether a hook runs in parallel or sequentially
 * const mode = HOOK_CONFIGS[HookType.BLOCK_PRE_PROCESS].executionMode;
 * if (mode === HookExecutionMode.PARALLEL) {
 *     console.log('Block pre-process handlers run concurrently');
 * }
 *
 * // Sequential hooks block the pipeline until all handlers complete
 * const reorgMode = HOOK_CONFIGS[HookType.REORG].executionMode;
 * console.log(reorgMode === HookExecutionMode.SEQUENTIAL); // true
 * ```
 */
export enum HookExecutionMode {
    /**
     * Execute all handlers in parallel.
     *
     * All registered handlers for this hook type are dispatched simultaneously
     * using `Promise.all` (or `Promise.allSettled` when `continueOnError` is
     * enabled). This maximizes throughput for independent operations such as
     * block indexing across multiple plugins.
     *
     * @example
     * ```typescript
     * import { HookExecutionMode } from '@btc-vision/plugin-sdk';
     *
     * const mode = HookExecutionMode.PARALLEL;
     * console.log(mode); // 'parallel'
     * ```
     */
    PARALLEL = 'parallel',

    /**
     * Execute handlers sequentially in order.
     *
     * Handlers are invoked one at a time, awaiting each before proceeding to
     * the next. This guarantees that handlers complete in a deterministic order
     * and is required for lifecycle transitions (load/unload) and critical
     * operations like reorg handling where data consistency depends on ordered
     * execution.
     *
     * @example
     * ```typescript
     * import { HookExecutionMode } from '@btc-vision/plugin-sdk';
     *
     * const mode = HookExecutionMode.SEQUENTIAL;
     * console.log(mode); // 'sequential'
     * ```
     */
    SEQUENTIAL = 'sequential',
}

/**
 * Enumeration of all hook types available in the OPNet plugin system.
 *
 * Each value corresponds to a method name on the {@link PluginBase} class
 * (e.g., `HookType.LOAD` maps to `PluginBase.onLoad()`). Plugins override
 * these methods to receive the corresponding events.
 *
 * Hook types are organized into categories:
 *
 * | Category   | Hooks                                                  | Execution  |
 * |------------|--------------------------------------------------------|------------|
 * | Lifecycle  | `LOAD`, `UNLOAD`, `ENABLE`, `DISABLE`                  | Sequential |
 * | Block      | `BLOCK_PRE_PROCESS`, `BLOCK_POST_PROCESS`, `BLOCK_CHANGE` | Parallel |
 * | Epoch      | `EPOCH_CHANGE`, `EPOCH_FINALIZED`                      | Parallel   |
 * | Mempool    | `MEMPOOL_TRANSACTION`                                  | Parallel   |
 * | Reorg      | `REORG`                                                | Sequential |
 * | Reindex    | `REINDEX_REQUIRED`, `PURGE_BLOCKS`                     | Sequential |
 *
 * @example
 * ```typescript
 * import { HookType, HOOK_CONFIGS } from '@btc-vision/plugin-sdk';
 *
 * // Iterate over all hook types and log their configurations
 * for (const hookType of Object.values(HookType)) {
 *     const config = HOOK_CONFIGS[hookType];
 *     console.log(
 *         `${hookType}: mode=${config.executionMode}, ` +
 *         `timeout=${config.timeoutMs}ms, ` +
 *         `permission=${config.requiredPermission ?? 'none'}`
 *     );
 * }
 * ```
 */
export enum HookType {
    // Lifecycle

    /**
     * Fired when the plugin is loaded into the runtime.
     *
     * This is the first hook invoked after the plugin worker thread is
     * created. Use it to perform one-time initialization such as
     * establishing database connections or loading configuration.
     *
     * - **Payload:** `undefined` (no data is passed)
     * - **Execution mode:** Sequential
     * - **Timeout:** 30,000 ms
     * - **Permission:** None required
     *
     * @example
     * ```typescript
     * import { PluginBase } from '@btc-vision/plugin-sdk';
     *
     * export default class MyPlugin extends PluginBase {
     *     async onLoad(): Promise<void> {
     *         this.context.logger.info('Plugin loaded, initializing resources...');
     *         await this.initDatabase();
     *     }
     * }
     * ```
     */
    LOAD = 'onLoad',

    /**
     * Fired when the plugin is being unloaded from the runtime.
     *
     * Use it to clean up resources such as closing database connections,
     * flushing caches, or canceling pending timers. After this hook
     * completes, the plugin worker thread is terminated.
     *
     * - **Payload:** `undefined`
     * - **Execution mode:** Sequential
     * - **Timeout:** 10,000 ms
     * - **Permission:** None required
     *
     * @example
     * ```typescript
     * import { PluginBase } from '@btc-vision/plugin-sdk';
     *
     * export default class MyPlugin extends PluginBase {
     *     async onUnload(): Promise<void> {
     *         this.context.logger.info('Plugin unloading, releasing resources...');
     *         await this.closeConnections();
     *     }
     * }
     * ```
     */
    UNLOAD = 'onUnload',

    /**
     * Fired when the plugin transitions from disabled to enabled state.
     *
     * Called after the plugin is loaded and authorized to begin receiving
     * block and event hooks. This is a good place to start background
     * tasks or register interval timers.
     *
     * - **Payload:** `undefined`
     * - **Execution mode:** Sequential
     * - **Timeout:** 5,000 ms
     * - **Permission:** None required
     *
     * @example
     * ```typescript
     * import { PluginBase } from '@btc-vision/plugin-sdk';
     *
     * export default class MyPlugin extends PluginBase {
     *     async onEnable(): Promise<void> {
     *         this.context.logger.info('Plugin enabled, starting watchers...');
     *     }
     * }
     * ```
     */
    ENABLE = 'onEnable',

    /**
     * Fired when the plugin transitions from enabled to disabled state.
     *
     * The plugin will stop receiving block, epoch, and mempool hooks
     * after this event completes. Use it to pause background tasks
     * without fully unloading the plugin.
     *
     * - **Payload:** `undefined`
     * - **Execution mode:** Sequential
     * - **Timeout:** 5,000 ms
     * - **Permission:** None required
     *
     * @example
     * ```typescript
     * import { PluginBase } from '@btc-vision/plugin-sdk';
     *
     * export default class MyPlugin extends PluginBase {
     *     async onDisable(): Promise<void> {
     *         this.context.logger.info('Plugin disabled, pausing watchers...');
     *     }
     * }
     * ```
     */
    DISABLE = 'onDisable',

    // Block

    /**
     * Fired before a block is processed by the OPNet indexer.
     *
     * Receives the raw Bitcoin block data ({@link IBlockData}) with full
     * transaction details as returned by Bitcoin Core's `getblock` RPC
     * (verbosity=2). This hook fires before OPNet computes merkle roots,
     * storage state, or receipt data.
     *
     * - **Payload:** {@link IBlockData}
     * - **Execution mode:** Parallel
     * - **Timeout:** 5,000 ms
     * - **Permission:** `blocks.preProcess`
     *
     * @example
     * ```typescript
     * import { PluginBase, IBlockData } from '@btc-vision/plugin-sdk';
     *
     * export default class BlockScanner extends PluginBase {
     *     async onBlockPreProcess(block: IBlockData): Promise<void> {
     *         this.context.logger.info(
     *             `Pre-processing block ${block.height} with ${block.tx.length} txs`
     *         );
     *     }
     * }
     * ```
     */
    BLOCK_PRE_PROCESS = 'onBlockPreProcess',

    /**
     * Fired after a block has been fully processed by the OPNet indexer.
     *
     * Receives the processed block data ({@link IBlockProcessedData}) with
     * OPNet-specific fields including receipt roots, storage roots, and
     * checksum proofs. This is the primary hook for indexing finalized
     * block state.
     *
     * - **Payload:** {@link IBlockProcessedData}
     * - **Execution mode:** Parallel
     * - **Timeout:** 5,000 ms
     * - **Permission:** `blocks.postProcess`
     *
     * @example
     * ```typescript
     * import { PluginBase, IBlockProcessedData } from '@btc-vision/plugin-sdk';
     *
     * export default class StateIndexer extends PluginBase {
     *     async onBlockPostProcess(block: IBlockProcessedData): Promise<void> {
     *         const collection = this.context.db!.collection('my-plugin_blocks');
     *         await collection.insertOne({
     *             blockNumber: block.blockNumber.toString(),
     *             storageRoot: block.storageRoot,
     *             receiptRoot: block.receiptRoot,
     *             txCount: block.txCount,
     *         });
     *         await this.context.updateLastSyncedBlock(block.blockNumber);
     *     }
     * }
     * ```
     */
    BLOCK_POST_PROCESS = 'onBlockPostProcess',

    /**
     * Fired when the chain tip advances to a new block.
     *
     * Similar to {@link BLOCK_POST_PROCESS} but specifically indicates a
     * chain tip change. Receives {@link IBlockProcessedData}. Useful for
     * plugins that need to track the current chain head (e.g., dashboard
     * updates, WebSocket notifications).
     *
     * - **Payload:** {@link IBlockProcessedData}
     * - **Execution mode:** Parallel
     * - **Timeout:** 5,000 ms
     * - **Permission:** `blocks.onChange`
     *
     * @example
     * ```typescript
     * import { PluginBase, IBlockProcessedData } from '@btc-vision/plugin-sdk';
     *
     * export default class TipTracker extends PluginBase {
     *     async onBlockChange(block: IBlockProcessedData): Promise<void> {
     *         this.context.logger.info(
     *             `New chain tip: block #${block.blockNumber} (${block.blockHash.slice(0, 16)}...)`
     *         );
     *     }
     * }
     * ```
     */
    BLOCK_CHANGE = 'onBlockChange',

    // Epoch

    /**
     * Fired when the OPNet epoch transitions to a new epoch.
     *
     * Receives {@link IEpochData} containing the epoch number, block range,
     * and (if already finalized) the checksum root. This hook fires when a
     * new epoch boundary is crossed during block processing.
     *
     * - **Payload:** {@link IEpochData}
     * - **Execution mode:** Parallel
     * - **Timeout:** 5,000 ms
     * - **Permission:** `epochs.onChange`
     *
     * @example
     * ```typescript
     * import { PluginBase, IEpochData } from '@btc-vision/plugin-sdk';
     *
     * export default class EpochLogger extends PluginBase {
     *     async onEpochChange(epoch: IEpochData): Promise<void> {
     *         this.context.logger.info(
     *             `Epoch ${epoch.epochNumber}: blocks ${epoch.startBlock}-${epoch.endBlock}`
     *         );
     *     }
     * }
     * ```
     */
    EPOCH_CHANGE = 'onEpochChange',

    /**
     * Fired when an OPNet epoch has been finalized.
     *
     * Receives {@link IEpochData} with a guaranteed non-undefined
     * `checksumRoot` field containing the merkle root of all block checksums
     * within the epoch. Use this hook to store finalized epoch data or
     * trigger downstream validation.
     *
     * - **Payload:** {@link IEpochData}
     * - **Execution mode:** Parallel
     * - **Timeout:** 5,000 ms
     * - **Permission:** `epochs.onFinalized`
     *
     * @example
     * ```typescript
     * import { PluginBase, IEpochData } from '@btc-vision/plugin-sdk';
     *
     * export default class EpochArchiver extends PluginBase {
     *     async onEpochFinalized(epoch: IEpochData): Promise<void> {
     *         const collection = this.context.db!.collection('my-plugin_epochs');
     *         await collection.insertOne({
     *             epochNumber: epoch.epochNumber.toString(),
     *             startBlock: epoch.startBlock.toString(),
     *             endBlock: epoch.endBlock.toString(),
     *             checksumRoot: epoch.checksumRoot,
     *         });
     *     }
     * }
     * ```
     */
    EPOCH_FINALIZED = 'onEpochFinalized',

    // Mempool

    /**
     * Fired for each new transaction entering the Bitcoin mempool.
     *
     * Receives {@link IMempoolTransaction} with basic transaction metadata
     * (txid, hash, size, fee, timestamp). Mempool transactions are
     * **unconfirmed** and may never be mined (e.g., replaced via RBF).
     *
     * - **Payload:** {@link IMempoolTransaction}
     * - **Execution mode:** Parallel
     * - **Timeout:** 2,000 ms
     * - **Permission:** `mempool.txFeed`
     *
     * @remarks
     * The short 2-second timeout reflects the high-frequency nature of
     * mempool events. Handlers should be lightweight and avoid heavy I/O.
     *
     * @example
     * ```typescript
     * import { PluginBase, IMempoolTransaction } from '@btc-vision/plugin-sdk';
     *
     * export default class FeeMonitor extends PluginBase {
     *     async onMempoolTransaction(tx: IMempoolTransaction): Promise<void> {
     *         const feeRate = Number(tx.fee) / tx.size;
     *         if (feeRate > 100) {
     *             this.context.logger.warn(
     *                 `High-fee TX detected: ${tx.txid} (${feeRate.toFixed(1)} sat/byte)`
     *             );
     *         }
     *     }
     * }
     * ```
     */
    MEMPOOL_TRANSACTION = 'onMempoolTransaction',

    // Reorg (CRITICAL - BLOCKING)

    /**
     * Fired when a blockchain reorganization (reorg) is detected.
     *
     * **CRITICAL - BLOCKING:** The indexer halts until every plugin completes
     * its reorg handler. Plugins that store any block-indexed data **must**
     * handle this hook to delete or revert data for the affected block range.
     *
     * Receives {@link IReorgData} with `fromBlock`, `toBlock`, and `reason`.
     *
     * - **Payload:** {@link IReorgData}
     * - **Execution mode:** Sequential
     * - **Timeout:** 300,000 ms (5 minutes)
     * - **Permission:** None required (all plugins must handle reorgs)
     *
     * @remarks
     * Failure to properly handle reorgs will result in stale or inconsistent
     * data persisting in the plugin's database. The extended 5-minute timeout
     * accommodates plugins that need to perform extensive data cleanup.
     *
     * @example
     * ```typescript
     * import { PluginBase, IReorgData } from '@btc-vision/plugin-sdk';
     *
     * export default class DataPlugin extends PluginBase {
     *     async onReorg(reorg: IReorgData): Promise<void> {
     *         this.context.logger.warn(
     *             `REORG: reverting blocks ${reorg.fromBlock}-${reorg.toBlock}`
     *         );
     *
     *         // Delete all data for reverted blocks
     *         const collection = this.context.db!.collection('my-plugin_events');
     *         await collection.deleteMany({
     *             blockHeight: {
     *                 $gte: reorg.fromBlock.toString(),
     *                 $lte: reorg.toBlock.toString(),
     *             },
     *         });
     *
     *         // Reset sync state to before the reorg
     *         await this.context.resetSyncStateToBlock(reorg.fromBlock - 1n);
     *     }
     * }
     * ```
     */
    REORG = 'onReorg',

    // Reindex (CRITICAL - BLOCKING)

    /**
     * Fired at startup when a reindex operation is required.
     *
     * **CRITICAL - BLOCKING:** The indexer waits for every plugin to
     * acknowledge or prepare for the reindex. Receives {@link IReindexCheck}
     * which specifies the action the plugin must take (purge, sync, reset,
     * or none).
     *
     * - **Payload:** {@link IReindexCheck}
     * - **Execution mode:** Sequential
     * - **Timeout:** 600,000 ms (10 minutes)
     * - **Permission:** None required
     *
     * @example
     * ```typescript
     * import { PluginBase, IReindexCheck, ReindexAction } from '@btc-vision/plugin-sdk';
     *
     * export default class DataPlugin extends PluginBase {
     *     async onReindexRequired(check: IReindexCheck): Promise<void> {
     *         this.context.logger.info(
     *             `Reindex required: action=${check.action}, ` +
     *             `from block ${check.reindexFromBlock}`
     *         );
     *
     *         if (check.action === ReindexAction.RESET) {
     *             await this.dropAllCollections();
     *         }
     *     }
     * }
     * ```
     */
    REINDEX_REQUIRED = 'onReindexRequired',

    /**
     * Fired when blocks need to be purged during a reindex operation.
     *
     * **CRITICAL - BLOCKING:** The indexer halts until all plugins have
     * purged the specified block range. Receives {@link IPurgeBlocksPayload}
     * specifying the range of blocks whose data must be deleted.
     *
     * - **Payload:** {@link IPurgeBlocksPayload}
     * - **Execution mode:** Sequential
     * - **Timeout:** 600,000 ms (10 minutes)
     * - **Permission:** None required
     *
     * @example
     * ```typescript
     * import { PluginBase, IPurgeBlocksPayload } from '@btc-vision/plugin-sdk';
     *
     * export default class DataPlugin extends PluginBase {
     *     async onPurgeBlocks(payload: IPurgeBlocksPayload): Promise<void> {
     *         this.context.logger.info(
     *             `Purging blocks from ${payload.fromBlock}` +
     *             (payload.toBlock ? ` to ${payload.toBlock}` : ' to latest')
     *         );
     *
     *         const collection = this.context.db!.collection('my-plugin_data');
     *         const filter: Record<string, unknown> = {
     *             blockHeight: { $gte: payload.fromBlock.toString() },
     *         };
     *         if (payload.toBlock !== undefined) {
     *             (filter.blockHeight as Record<string, unknown>).$lte =
     *                 payload.toBlock.toString();
     *         }
     *         await collection.deleteMany(filter);
     *     }
     * }
     * ```
     */
    PURGE_BLOCKS = 'onPurgeBlocks',
}

/**
 * Configuration for a single hook type.
 *
 * Each hook type in the system has a corresponding configuration that controls
 * how the runtime dispatches the hook to registered plugin handlers. The
 * configuration is immutable and defined in the {@link HOOK_CONFIGS} constant.
 *
 * @example
 * ```typescript
 * import { IHookConfig, HookType, HookExecutionMode, HOOK_CONFIGS } from '@btc-vision/plugin-sdk';
 *
 * // Read the configuration for the REORG hook
 * const reorgConfig: IHookConfig = HOOK_CONFIGS[HookType.REORG];
 * console.log(reorgConfig.type);              // 'onReorg'
 * console.log(reorgConfig.executionMode);     // 'sequential'
 * console.log(reorgConfig.timeoutMs);         // 300000
 * console.log(reorgConfig.requiredPermission); // undefined (no permission needed)
 *
 * // Check whether a hook requires a specific permission
 * function requiresPermission(config: IHookConfig): boolean {
 *     return config.requiredPermission !== undefined;
 * }
 * ```
 */
export interface IHookConfig {
    /**
     * The hook type this configuration belongs to.
     *
     * This matches one of the {@link HookType} enum values and corresponds
     * to the method name on {@link PluginBase}.
     *
     * @example
     * ```typescript
     * import { HOOK_CONFIGS, HookType } from '@btc-vision/plugin-sdk';
     *
     * const config = HOOK_CONFIGS[HookType.BLOCK_PRE_PROCESS];
     * console.log(config.type); // HookType.BLOCK_PRE_PROCESS ('onBlockPreProcess')
     * ```
     */
    readonly type: HookType;

    /**
     * How handlers for this hook are executed across plugins.
     *
     * - {@link HookExecutionMode.PARALLEL}: All handlers run concurrently.
     * - {@link HookExecutionMode.SEQUENTIAL}: Handlers run one at a time in order.
     *
     * @example
     * ```typescript
     * import { HOOK_CONFIGS, HookType, HookExecutionMode } from '@btc-vision/plugin-sdk';
     *
     * const config = HOOK_CONFIGS[HookType.LOAD];
     * if (config.executionMode === HookExecutionMode.SEQUENTIAL) {
     *     console.log('LOAD handlers execute one at a time');
     * }
     * ```
     */
    readonly executionMode: HookExecutionMode;

    /**
     * Maximum time in milliseconds a single handler is allowed to run.
     *
     * If a handler exceeds this timeout, it is aborted and the result is
     * recorded as a failure in the {@link IHookResult}. Timeout values range
     * from 2,000 ms (mempool hooks) to 600,000 ms (reindex hooks).
     *
     * @example
     * ```typescript
     * import { HOOK_CONFIGS, HookType } from '@btc-vision/plugin-sdk';
     *
     * const mempoolTimeout = HOOK_CONFIGS[HookType.MEMPOOL_TRANSACTION].timeoutMs;
     * console.log(`Mempool handler timeout: ${mempoolTimeout}ms`); // 2000ms
     *
     * const reorgTimeout = HOOK_CONFIGS[HookType.REORG].timeoutMs;
     * console.log(`Reorg handler timeout: ${reorgTimeout / 1000}s`); // 300s
     * ```
     */
    readonly timeoutMs: number;

    /**
     * Permission string required in the plugin manifest to receive this hook.
     *
     * If defined, the plugin must declare this permission in its manifest's
     * `permissions` array. Lifecycle hooks and critical hooks (reorg, reindex)
     * do not require permissions and this field is `undefined`.
     *
     * Common permission strings:
     * - `'blocks.preProcess'` - for {@link HookType.BLOCK_PRE_PROCESS}
     * - `'blocks.postProcess'` - for {@link HookType.BLOCK_POST_PROCESS}
     * - `'blocks.onChange'` - for {@link HookType.BLOCK_CHANGE}
     * - `'epochs.onChange'` - for {@link HookType.EPOCH_CHANGE}
     * - `'epochs.onFinalized'` - for {@link HookType.EPOCH_FINALIZED}
     * - `'mempool.txFeed'` - for {@link HookType.MEMPOOL_TRANSACTION}
     *
     * @example
     * ```typescript
     * import { HOOK_CONFIGS, HookType } from '@btc-vision/plugin-sdk';
     *
     * // Block hooks require permissions
     * const perm = HOOK_CONFIGS[HookType.BLOCK_POST_PROCESS].requiredPermission;
     * console.log(perm); // 'blocks.postProcess'
     *
     * // Lifecycle hooks do not
     * const loadPerm = HOOK_CONFIGS[HookType.LOAD].requiredPermission;
     * console.log(loadPerm); // undefined
     * ```
     */
    readonly requiredPermission?: string;
}

/**
 * Result of executing a single hook handler for one plugin.
 *
 * After the runtime invokes a hook handler, it produces an {@link IHookResult}
 * capturing whether the handler succeeded, how long it took, and (on failure)
 * an error message. These results are collected and returned to the dispatcher
 * for logging, metrics, and error handling.
 *
 * @example
 * ```typescript
 * import { IHookResult, HookType } from '@btc-vision/plugin-sdk';
 *
 * function logResult(result: IHookResult): void {
 *     const status = result.success ? 'OK' : 'FAILED';
 *     console.log(
 *         `[${status}] ${result.pluginName}.${result.hookType} ` +
 *         `completed in ${result.durationMs}ms`
 *     );
 *     if (result.error) {
 *         console.error(`  Error: ${result.error}`);
 *     }
 * }
 *
 * // Example result object
 * const result: IHookResult = {
 *     success: true,
 *     pluginName: 'my-analytics-plugin',
 *     hookType: HookType.BLOCK_POST_PROCESS,
 *     durationMs: 42,
 * };
 * logResult(result);
 * ```
 */
export interface IHookResult {
    /**
     * Whether the handler completed successfully.
     *
     * `true` if the handler returned (or resolved) without throwing an error
     * and within the configured timeout. `false` if the handler threw, timed
     * out, or was otherwise aborted.
     *
     * @example
     * ```typescript
     * import type { IHookResult } from '@btc-vision/plugin-sdk';
     *
     * function countFailures(results: IHookResult[]): number {
     *     return results.filter((r) => !r.success).length;
     * }
     * ```
     */
    readonly success: boolean;

    /**
     * Name of the plugin whose handler produced this result.
     *
     * Corresponds to the `name` field in the plugin's `manifest.json`.
     *
     * @example `"my-analytics-plugin"`
     */
    readonly pluginName: string;

    /**
     * The hook type that was executed.
     *
     * Identifies which hook method was invoked on the plugin (e.g.,
     * `HookType.BLOCK_POST_PROCESS` maps to `onBlockPostProcess`).
     *
     * @example
     * ```typescript
     * import { HookType } from '@btc-vision/plugin-sdk';
     * import type { IHookResult } from '@btc-vision/plugin-sdk';
     *
     * function isBlockHook(result: IHookResult): boolean {
     *     return [
     *         HookType.BLOCK_PRE_PROCESS,
     *         HookType.BLOCK_POST_PROCESS,
     *         HookType.BLOCK_CHANGE,
     *     ].includes(result.hookType);
     * }
     * ```
     */
    readonly hookType: HookType;

    /**
     * Wall-clock duration of the handler execution in milliseconds.
     *
     * Measured from the moment the handler is invoked to when it resolves
     * (or rejects). Useful for performance monitoring and identifying slow
     * handlers that may approach the configured timeout.
     *
     * @example
     * ```typescript
     * import type { IHookResult } from '@btc-vision/plugin-sdk';
     *
     * function isSlowHandler(result: IHookResult, thresholdMs: number): boolean {
     *     return result.durationMs > thresholdMs;
     * }
     * ```
     */
    readonly durationMs: number;

    /**
     * Error message if the handler failed.
     *
     * Contains the stringified error when `success` is `false`. May include
     * timeout messages (e.g., `"Handler timed out after 5000ms"`) or
     * exception messages from the handler itself.
     *
     * @example
     * ```typescript
     * import type { IHookResult } from '@btc-vision/plugin-sdk';
     *
     * function getErrorSummary(result: IHookResult): string {
     *     if (result.success) return 'No error';
     *     return result.error ?? 'Unknown error (no message)';
     * }
     * ```
     */
    readonly error?: string;
}

/**
 * Options for dispatching a hook to all registered plugins.
 *
 * Allows the caller to override the default timeout and control whether
 * execution continues when individual handlers fail. These options are
 * applied on top of the hook's base {@link IHookConfig}.
 *
 * @example
 * ```typescript
 * import type { IHookDispatchOptions } from '@btc-vision/plugin-sdk';
 *
 * // Override timeout and continue even if some handlers fail
 * const options: IHookDispatchOptions = {
 *     timeoutMs: 15000,
 *     continueOnError: true,
 * };
 *
 * // Use default configuration (no overrides)
 * const defaultOptions: IHookDispatchOptions = {};
 * ```
 */
export interface IHookDispatchOptions {
    /**
     * Override the default timeout for this dispatch in milliseconds.
     *
     * When set, this value replaces the {@link IHookConfig.timeoutMs} from
     * the hook's configuration for this specific dispatch invocation.
     * If `undefined`, the default timeout from {@link HOOK_CONFIGS} is used.
     *
     * @example
     * ```typescript
     * import type { IHookDispatchOptions } from '@btc-vision/plugin-sdk';
     *
     * // Give handlers extra time for a large block
     * const options: IHookDispatchOptions = { timeoutMs: 30000 };
     * ```
     */
    readonly timeoutMs?: number;

    /**
     * Whether to continue dispatching to remaining handlers if one fails.
     *
     * - `true`: A handler failure is recorded in the results but dispatch
     *   continues to the next handler (or remaining parallel handlers
     *   complete normally).
     * - `false` or `undefined`: A handler failure aborts the dispatch for
     *   sequential hooks. For parallel hooks, all handlers are awaited
     *   regardless.
     *
     * @defaultValue `undefined` (treated as `false`)
     *
     * @example
     * ```typescript
     * import type { IHookDispatchOptions } from '@btc-vision/plugin-sdk';
     *
     * // Continue even if some plugin handlers throw errors
     * const resilientOptions: IHookDispatchOptions = {
     *     continueOnError: true,
     * };
     * ```
     */
    readonly continueOnError?: boolean;
}

/**
 * Payload for the {@link HookType.PURGE_BLOCKS} hook.
 *
 * Specifies the range of blocks whose data must be purged from the plugin's
 * storage during a reindex operation. The range is inclusive on both ends.
 *
 * @remarks
 * If {@link toBlock} is `undefined`, the plugin should purge all data from
 * {@link fromBlock} up to the most recent block it has processed. This
 * typically occurs during a full reindex where no upper bound is known.
 *
 * @example
 * ```typescript
 * import type { IPurgeBlocksPayload } from '@btc-vision/plugin-sdk';
 *
 * // Purge a specific range of blocks
 * const rangedPurge: IPurgeBlocksPayload = {
 *     fromBlock: 840000n,
 *     toBlock: 840500n,
 * };
 *
 * // Purge everything from a block height onward
 * const openEndedPurge: IPurgeBlocksPayload = {
 *     fromBlock: 840000n,
 * };
 *
 * function describePurge(payload: IPurgeBlocksPayload): string {
 *     const to = payload.toBlock !== undefined ? payload.toBlock.toString() : 'latest';
 *     return `Purging blocks ${payload.fromBlock} to ${to}`;
 * }
 * ```
 */
export interface IPurgeBlocksPayload {
    /**
     * First block height to purge (inclusive).
     *
     * All plugin data associated with this block height and above
     * (up to {@link toBlock} if specified) must be deleted.
     *
     * @example
     * ```typescript
     * import type { IPurgeBlocksPayload } from '@btc-vision/plugin-sdk';
     *
     * const payload: IPurgeBlocksPayload = { fromBlock: 840000n };
     * console.log(`Purging from block ${payload.fromBlock}`); // "Purging from block 840000"
     * ```
     */
    fromBlock: bigint;

    /**
     * Last block height to purge (inclusive).
     *
     * If `undefined`, the plugin should purge all data from {@link fromBlock}
     * through the most recent block it has processed. When defined, only
     * data within the closed range `[fromBlock, toBlock]` should be removed.
     *
     * @example
     * ```typescript
     * import type { IPurgeBlocksPayload } from '@btc-vision/plugin-sdk';
     *
     * const payload: IPurgeBlocksPayload = { fromBlock: 840000n, toBlock: 840100n };
     * if (payload.toBlock !== undefined) {
     *     const count = payload.toBlock - payload.fromBlock + 1n;
     *     console.log(`Purging ${count} blocks`); // "Purging 101 blocks"
     * }
     * ```
     */
    toBlock?: bigint;
}

/**
 * Union type of all possible hook payloads.
 *
 * Each hook type receives a specific payload type when dispatched. This union
 * type represents all possible payloads a hook handler may receive:
 *
 * | Payload Type              | Hook Types                                       |
 * |---------------------------|--------------------------------------------------|
 * | {@link IBlockData}        | {@link HookType.BLOCK_PRE_PROCESS}               |
 * | {@link IBlockProcessedData} | {@link HookType.BLOCK_POST_PROCESS}, {@link HookType.BLOCK_CHANGE} |
 * | {@link IEpochData}        | {@link HookType.EPOCH_CHANGE}, {@link HookType.EPOCH_FINALIZED} |
 * | {@link IMempoolTransaction} | {@link HookType.MEMPOOL_TRANSACTION}           |
 * | {@link IReorgData}        | {@link HookType.REORG}                           |
 * | {@link IReindexCheck}     | {@link HookType.REINDEX_REQUIRED}                |
 * | {@link IPurgeBlocksPayload} | {@link HookType.PURGE_BLOCKS}                 |
 * | `undefined`               | {@link HookType.LOAD}, {@link HookType.UNLOAD}, {@link HookType.ENABLE}, {@link HookType.DISABLE} |
 *
 * @example
 * ```typescript
 * import type { HookPayload } from '@btc-vision/plugin-sdk';
 * import { HookType, IBlockData, IReorgData } from '@btc-vision/plugin-sdk';
 *
 * function describePayload(hookType: HookType, payload: HookPayload): string {
 *     switch (hookType) {
 *         case HookType.BLOCK_PRE_PROCESS: {
 *             const block = payload as IBlockData;
 *             return `Raw block #${block.height}`;
 *         }
 *         case HookType.REORG: {
 *             const reorg = payload as IReorgData;
 *             return `Reorg from ${reorg.fromBlock} to ${reorg.toBlock}`;
 *         }
 *         case HookType.LOAD:
 *         case HookType.UNLOAD:
 *             return 'No payload (lifecycle hook)';
 *         default:
 *             return 'Unknown payload';
 *     }
 * }
 * ```
 */
export type HookPayload =
    | IBlockData // Raw block for pre-process
    | IBlockProcessedData // Processed block for post-process/change
    | IEpochData // Epoch data
    | IMempoolTransaction // Mempool transaction
    | IReorgData // Reorg data
    | IReindexCheck // Reindex check data
    | IPurgeBlocksPayload // Purge blocks data
    | undefined; // Lifecycle hooks (no payload)

/**
 * Default hook configurations for every {@link HookType}.
 *
 * This record provides the canonical configuration for each hook type in the
 * OPNet plugin system. The runtime uses these configurations to determine
 * execution mode, timeout, and required permissions when dispatching hooks.
 *
 * Configuration categories:
 *
 * - **Lifecycle hooks** (`LOAD`, `UNLOAD`, `ENABLE`, `DISABLE`):
 *   Sequential execution, moderate timeouts (5-30s), no permissions required.
 *
 * - **Block hooks** (`BLOCK_PRE_PROCESS`, `BLOCK_POST_PROCESS`, `BLOCK_CHANGE`):
 *   Parallel execution, 5s timeout, require `blocks.*` permissions.
 *
 * - **Epoch hooks** (`EPOCH_CHANGE`, `EPOCH_FINALIZED`):
 *   Parallel execution, 5s timeout, require `epochs.*` permissions.
 *
 * - **Mempool hooks** (`MEMPOOL_TRANSACTION`):
 *   Parallel execution, 2s timeout, requires `mempool.txFeed` permission.
 *
 * - **Critical hooks** (`REORG`, `REINDEX_REQUIRED`, `PURGE_BLOCKS`):
 *   Sequential execution, extended timeouts (5-10 min), no permissions
 *   required (all plugins must handle these).
 *
 * @example
 * ```typescript
 * import { HOOK_CONFIGS, HookType, HookExecutionMode } from '@btc-vision/plugin-sdk';
 *
 * // Look up the config for a specific hook type
 * const blockPreConfig = HOOK_CONFIGS[HookType.BLOCK_PRE_PROCESS];
 * console.log(blockPreConfig);
 * // {
 * //   type: 'onBlockPreProcess',
 * //   executionMode: 'parallel',
 * //   timeoutMs: 5000,
 * //   requiredPermission: 'blocks.preProcess'
 * // }
 *
 * // Find all hooks that require permissions
 * const permissionedHooks = Object.values(HOOK_CONFIGS).filter(
 *     (config) => config.requiredPermission !== undefined
 * );
 * console.log(`${permissionedHooks.length} hooks require permissions`);
 *
 * // Find all sequential (blocking) hooks
 * const blockingHooks = Object.values(HOOK_CONFIGS).filter(
 *     (config) => config.executionMode === HookExecutionMode.SEQUENTIAL
 * );
 * for (const hook of blockingHooks) {
 *     console.log(`${hook.type}: timeout=${hook.timeoutMs}ms`);
 * }
 * ```
 */
export const HOOK_CONFIGS: Record<HookType, IHookConfig> = {
    // Lifecycle hooks - sequential, longer timeout
    [HookType.LOAD]: {
        type: HookType.LOAD,
        executionMode: HookExecutionMode.SEQUENTIAL,
        timeoutMs: 30000,
    },
    [HookType.UNLOAD]: {
        type: HookType.UNLOAD,
        executionMode: HookExecutionMode.SEQUENTIAL,
        timeoutMs: 10000,
    },
    [HookType.ENABLE]: {
        type: HookType.ENABLE,
        executionMode: HookExecutionMode.SEQUENTIAL,
        timeoutMs: 5000,
    },
    [HookType.DISABLE]: {
        type: HookType.DISABLE,
        executionMode: HookExecutionMode.SEQUENTIAL,
        timeoutMs: 5000,
    },

    // Block hooks - parallel execution
    [HookType.BLOCK_PRE_PROCESS]: {
        type: HookType.BLOCK_PRE_PROCESS,
        executionMode: HookExecutionMode.PARALLEL,
        timeoutMs: 5000,
        requiredPermission: 'blocks.preProcess',
    },
    [HookType.BLOCK_POST_PROCESS]: {
        type: HookType.BLOCK_POST_PROCESS,
        executionMode: HookExecutionMode.PARALLEL,
        timeoutMs: 5000,
        requiredPermission: 'blocks.postProcess',
    },
    [HookType.BLOCK_CHANGE]: {
        type: HookType.BLOCK_CHANGE,
        executionMode: HookExecutionMode.PARALLEL,
        timeoutMs: 5000,
        requiredPermission: 'blocks.onChange',
    },

    // Epoch hooks - parallel execution
    [HookType.EPOCH_CHANGE]: {
        type: HookType.EPOCH_CHANGE,
        executionMode: HookExecutionMode.PARALLEL,
        timeoutMs: 5000,
        requiredPermission: 'epochs.onChange',
    },
    [HookType.EPOCH_FINALIZED]: {
        type: HookType.EPOCH_FINALIZED,
        executionMode: HookExecutionMode.PARALLEL,
        timeoutMs: 5000,
        requiredPermission: 'epochs.onFinalized',
    },

    // Mempool hooks - parallel execution
    [HookType.MEMPOOL_TRANSACTION]: {
        type: HookType.MEMPOOL_TRANSACTION,
        executionMode: HookExecutionMode.PARALLEL,
        timeoutMs: 2000,
        requiredPermission: 'mempool.txFeed',
    },

    // Reorg hook - SEQUENTIAL and BLOCKING (all plugins must complete)
    // This is critical for data consistency - plugins must revert their state
    [HookType.REORG]: {
        type: HookType.REORG,
        executionMode: HookExecutionMode.SEQUENTIAL,
        timeoutMs: 300000, // 5 minutes - reorg can take time
    },

    // Reindex hooks - SEQUENTIAL and BLOCKING
    // Called at startup when reindex is required
    [HookType.REINDEX_REQUIRED]: {
        type: HookType.REINDEX_REQUIRED,
        executionMode: HookExecutionMode.SEQUENTIAL,
        timeoutMs: 600000, // 10 minutes - reindex setup can take time
    },
    [HookType.PURGE_BLOCKS]: {
        type: HookType.PURGE_BLOCKS,
        executionMode: HookExecutionMode.SEQUENTIAL,
        timeoutMs: 600000, // 10 minutes - purging can take time for large datasets
    },
};
