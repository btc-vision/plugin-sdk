/**
 * Abstract base class for OPNet plugins.
 *
 * Provides no-op default implementations for all {@link IPlugin} hooks,
 * so plugin authors only need to override the hooks they care about.
 * This is the **recommended** way to create plugins.
 *
 * @remarks
 * - Always call `super.onLoad(context)` when overriding `onLoad` to
 *   ensure the `this.context` reference is set.
 * - The `onReorg` default logs a warning. Plugins storing block-indexed
 *   data **must** override this to maintain data consistency.
 * - The `onSyncRequired` default returns `true` (system-managed sync).
 * - The `onReindexRequired` default returns `true` (handled successfully).
 *
 * @example
 * ```typescript
 * import {
 *     PluginBase,
 *     IPluginContext,
 *     IBlockProcessedData,
 *     IReorgData,
 *     INetworkInfo,
 * } from '@btc-vision/plugin-sdk';
 *
 * export default class MyPlugin extends PluginBase {
 *     async onLoad(context: IPluginContext): Promise<void> {
 *         await super.onLoad(context);
 *         this.context.logger.info('MyPlugin loaded!');
 *
 *         // Initialize database indexes
 *         const collection = this.context.db!.collection('my-plugin_events');
 *         await collection.createIndex({ blockHeight: -1 });
 *     }
 *
 *     async onBlockPostProcess(block: IBlockProcessedData): Promise<void> {
 *         this.context.logger.info(`Block #${block.blockNumber}: ${block.txCount} txs`);
 *         await this.context.updateLastSyncedBlock(block.blockNumber);
 *     }
 *
 *     async onReorg(reorg: IReorgData): Promise<void> {
 *         const collection = this.context.db!.collection('my-plugin_events');
 *         await collection.deleteMany({
 *             blockHeight: { $gte: reorg.fromBlock.toString() },
 *         });
 *         await this.context.resetSyncStateToBlock(reorg.fromBlock - 1n);
 *     }
 *
 *     async onUnload(): Promise<void> {
 *         this.context.logger.info('MyPlugin shutting down');
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

import { IPlugin } from '../interfaces/IPlugin.js';
import { IPluginContext } from '../context/IPluginContext.js';
import { IBlockData, IBlockProcessedData } from '../types/BlockTypes.js';
import { IEpochData } from '../types/EpochTypes.js';
import { IMempoolTransaction } from '../types/MempoolTypes.js';
import { IReorgData } from '../types/ReorgTypes.js';
import { IPluginRouter, IPluginWebSocket } from '../types/RouterTypes.js';
import {
    INetworkInfo,
    ISyncBlockData,
    ISyncProgress,
    IPluginSyncCheck,
    IReindexCheck,
} from '../interfaces/IPluginInstallState.js';

/**
 * Abstract base class for OPNet plugins with no-op defaults for all hooks.
 *
 * Extend this class and override only the hooks your plugin needs.
 * The `context` property is set automatically during `onLoad`.
 *
 * @example
 * ```typescript
 * import { PluginBase, IPluginContext, IBlockProcessedData } from '@btc-vision/plugin-sdk';
 *
 * export default class MyPlugin extends PluginBase {
 *     async onLoad(context: IPluginContext): Promise<void> {
 *         await super.onLoad(context);
 *         this.context.logger.info('Plugin loaded!');
 *     }
 *
 *     async onBlockChange(block: IBlockProcessedData): Promise<void> {
 *         this.context.logger.info(`New block: ${block.blockNumber}`);
 *     }
 * }
 * ```
 */
export abstract class PluginBase implements IPlugin {
    /**
     * Plugin context - available after `onLoad` is called.
     *
     * Provides access to all node APIs (database, filesystem, blockchain,
     * logging, config, events). The `!` assertion is safe because the node
     * always calls `onLoad` before any other hook.
     *
     * @example
     * ```typescript
     * // Access in any hook after onLoad
     * async onBlockPostProcess(block: IBlockProcessedData): Promise<void> {
     *     this.context.logger.info(`Block #${block.blockNumber}`);
     *     const db = this.context.db!.collection('my-plugin_data');
     *     await db.insertOne({ block: block.blockNumber.toString() });
     * }
     * ```
     */
    protected context!: IPluginContext;

    /**
     * Called when the plugin is loaded. Stores the context reference.
     *
     * **Always call `super.onLoad(context)` first** when overriding this
     * method, otherwise `this.context` will be undefined.
     *
     * @param context - The plugin context with all APIs and configuration.
     *
     * @example
     * ```typescript
     * async onLoad(context: IPluginContext): Promise<void> {
     *     await super.onLoad(context); // REQUIRED - sets this.context
     *     this.context.logger.info('Plugin initialized');
     * }
     * ```
     */
    onLoad(context: IPluginContext): Promise<void> {
        this.context = context;
        return Promise.resolve();
    }

    /**
     * Called when the plugin is being unloaded. Override to clean up resources.
     *
     * @example
     * ```typescript
     * async onUnload(): Promise<void> {
     *     this.context.logger.info('Cleaning up...');
     *     await this.flushPendingWrites();
     * }
     * ```
     */
    async onUnload(): Promise<void> {
        // No-op default
    }

    /**
     * Called when the plugin is enabled. Override to start processing.
     *
     * @example
     * ```typescript
     * async onEnable(): Promise<void> {
     *     this.context.logger.info('Plugin enabled');
     * }
     * ```
     */
    async onEnable(): Promise<void> {
        // No-op default
    }

    /**
     * Called when the plugin is disabled. Override to pause processing.
     *
     * @example
     * ```typescript
     * async onDisable(): Promise<void> {
     *     this.context.logger.info('Plugin disabled');
     * }
     * ```
     */
    async onDisable(): Promise<void> {
        // No-op default
    }

    /**
     * Called on first installation. Override for one-time setup.
     *
     * @param _networkInfo - Network and chain information.
     *
     * @remarks
     * **Not yet dispatched by the node.** Use `onLoad` with
     * `context.isFirstInstall` to detect first installation instead.
     *
     * @experimental
     */
    async onFirstInstall(_networkInfo: INetworkInfo): Promise<void> {
        // No-op default
    }

    /**
     * Called on every load with network information.
     *
     * @param _networkInfo - Network and chain information.
     *
     * @remarks
     * **Not yet dispatched by the node.** Access network info via
     * `context.network` in `onLoad` instead.
     *
     * @experimental
     */
    async onNetworkInit(_networkInfo: INetworkInfo): Promise<void> {
        // No-op default
    }

    /**
     * Called when sync is needed. Default returns `true` (system-managed sync).
     *
     * @param _syncCheck - Sync status information.
     * @returns `true` to use system sync, `false` to skip.
     *
     * @remarks
     * **Not yet dispatched by the node.** The sync pipeline is reserved
     * for future implementation.
     *
     * @experimental
     */
    onSyncRequired(_syncCheck: IPluginSyncCheck): Promise<boolean> {
        return Promise.resolve(true);
    }

    /**
     * Called for each block during sync. Override to process sync blocks.
     *
     * @param _block - Block data with transactions.
     * @param _progress - Sync progress (percentage, ETA, speed).
     *
     * @remarks
     * **Not yet dispatched by the node.** The sync pipeline is reserved
     * for future implementation.
     *
     * @experimental
     */
    async onSyncBlock(_block: ISyncBlockData, _progress: ISyncProgress): Promise<void> {
        // No-op default
    }

    /**
     * Called when sync finishes. Override to finalize sync state.
     *
     * @param _finalBlock - Height of the last synced block.
     *
     * @remarks
     * **Not yet dispatched by the node.** The sync pipeline is reserved
     * for future implementation.
     *
     * @experimental
     */
    async onSyncComplete(_finalBlock: bigint): Promise<void> {
        // No-op default
    }

    /**
     * Called before block processing with raw Bitcoin data. Override to analyze raw blocks.
     *
     * @param _block - Raw Bitcoin block from `getblock verbosity=2`.
     *
     * @example
     * ```typescript
     * async onBlockPreProcess(block: IBlockData): Promise<void> {
     *     this.context.logger.debug(`Raw block ${block.height}: ${block.tx.length} txs`);
     * }
     * ```
     */
    async onBlockPreProcess(_block: IBlockData): Promise<void> {
        // No-op default
    }

    /**
     * Called after block processing with OPNet data. Override to track state changes.
     *
     * @param _block - Processed block with OPNet merkle roots and checksums.
     *
     * @example
     * ```typescript
     * async onBlockPostProcess(block: IBlockProcessedData): Promise<void> {
     *     const db = this.context.db!.collection('my-plugin_blocks');
     *     await db.insertOne({
     *         blockNumber: block.blockNumber.toString(),
     *         txCount: block.txCount,
     *     });
     *     await this.context.updateLastSyncedBlock(block.blockNumber);
     * }
     * ```
     */
    async onBlockPostProcess(_block: IBlockProcessedData): Promise<void> {
        // No-op default
    }

    /**
     * Called when a new block is confirmed. Override for confirmation-based logic.
     *
     * @param _block - Processed block data.
     *
     * @example
     * ```typescript
     * async onBlockChange(block: IBlockProcessedData): Promise<void> {
     *     this.context.logger.info(`Confirmed block #${block.blockNumber}`);
     * }
     * ```
     */
    async onBlockChange(_block: IBlockProcessedData): Promise<void> {
        // No-op default
    }

    /**
     * Called when a new epoch begins. Override to track epoch transitions.
     *
     * @param _epoch - Epoch data with number and block range.
     *
     * @example
     * ```typescript
     * async onEpochChange(epoch: IEpochData): Promise<void> {
     *     this.context.logger.info(`Epoch #${epoch.epochNumber} started`);
     * }
     * ```
     */
    async onEpochChange(_epoch: IEpochData): Promise<void> {
        // No-op default
    }

    /**
     * Called when an epoch is finalized. Override to process epoch checksums.
     *
     * @param _epoch - Finalized epoch with checksumRoot.
     *
     * @example
     * ```typescript
     * async onEpochFinalized(epoch: IEpochData): Promise<void> {
     *     this.context.logger.info(`Epoch #${epoch.epochNumber} root: ${epoch.checksumRoot}`);
     * }
     * ```
     */
    async onEpochFinalized(_epoch: IEpochData): Promise<void> {
        // No-op default
    }

    /**
     * Called for new mempool transactions. Override to monitor the mempool.
     *
     * @param _tx - Mempool transaction data.
     *
     * @example
     * ```typescript
     * async onMempoolTransaction(tx: IMempoolTransaction): Promise<void> {
     *     const feeRate = Number(tx.fee) / tx.size;
     *     if (feeRate > 100) {
     *         this.context.logger.info(`High-fee TX: ${tx.txid}`);
     *     }
     * }
     * ```
     */
    async onMempoolTransaction(_tx: IMempoolTransaction): Promise<void> {
        // No-op default
    }

    /**
     * Called when a blockchain reorg occurs (CRITICAL).
     *
     * **MUST be overridden** if the plugin stores any block-indexed data.
     * The default implementation logs a warning about potential data inconsistency.
     *
     * @param _reorg - Reorg data with affected block range.
     *
     * @example
     * ```typescript
     * async onReorg(reorg: IReorgData): Promise<void> {
     *     this.context.logger.warn(`Reorg: blocks ${reorg.fromBlock}-${reorg.toBlock}`);
     *     const collection = this.context.db!.collection('my-plugin_data');
     *     await collection.deleteMany({
     *         blockHeight: { $gte: reorg.fromBlock.toString() },
     *     });
     *     await this.context.resetSyncStateToBlock(reorg.fromBlock - 1n);
     * }
     * ```
     */
    onReorg(_reorg: IReorgData): Promise<void> {
        if (this.context?.logger) {
            this.context.logger.warn(
                'onReorg not implemented - plugin may have inconsistent data after reorg',
            );
        }
        return Promise.resolve();
    }

    /**
     * Called when reindex is required. Default returns `true` (handled OK).
     *
     * Override to perform custom reindex handling (e.g., selective data purge).
     *
     * @param _reindexCheck - Reindex requirements and actions.
     * @returns `true` if handled, `false` to abort startup.
     *
     * @example
     * ```typescript
     * async onReindexRequired(reindexCheck: IReindexCheck): Promise<boolean> {
     *     if (reindexCheck.requiresPurge) {
     *         await this.purgeData(reindexCheck.purgeToBlock!);
     *     }
     *     return true;
     * }
     * ```
     */
    onReindexRequired(_reindexCheck: IReindexCheck): Promise<boolean> {
        return Promise.resolve(true);
    }

    /**
     * Called to purge blocks during reindex or reorg. Override to clean up data.
     *
     * @param _fromBlock - Start block to purge (inclusive).
     * @param _toBlock - End block to purge (inclusive), or `undefined` for all.
     *
     * @example
     * ```typescript
     * async onPurgeBlocks(fromBlock: bigint, toBlock?: bigint): Promise<void> {
     *     const query: Record<string, unknown> = {
     *         blockHeight: { $gte: fromBlock.toString() },
     *     };
     *     if (toBlock !== undefined) {
     *         query.blockHeight = {
     *             $gte: fromBlock.toString(),
     *             $lte: toBlock.toString(),
     *         };
     *     }
     *     const collection = this.context.db!.collection('my-plugin_data');
     *     await collection.deleteMany(query);
     * }
     * ```
     */
    async onPurgeBlocks(_fromBlock: bigint, _toBlock?: bigint): Promise<void> {
        // No-op default
    }

    /**
     * Called to register HTTP routes. Override to add API endpoints.
     *
     * @param _router - Router for registering GET/POST/PUT/DELETE/PATCH routes.
     *
     * @example
     * ```typescript
     * registerRoutes(router: IPluginRouter): void {
     *     router.get('/stats', 'handleGetStats');
     *     router.post('/query', 'handlePostQuery');
     * }
     * ```
     */
    registerRoutes(_router: IPluginRouter): void {
        // No-op default
    }

    /**
     * Called to register WebSocket handlers. Override to add WS endpoints.
     *
     * @param _ws - WebSocket interface for registering opcode handlers.
     *
     * @example
     * ```typescript
     * registerWebSocketHandlers(ws: IPluginWebSocket): void {
     *     ws.registerHandler('subscribe', 'handleSubscribe');
     * }
     * ```
     */
    registerWebSocketHandlers(_ws: IPluginWebSocket): void {
        // No-op default
    }
}
