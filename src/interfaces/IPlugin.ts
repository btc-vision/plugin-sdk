/**
 * Core plugin interface definitions.
 *
 * {@link IPlugin} is the primary interface that every OPNet plugin must implement.
 * It defines the complete set of lifecycle hooks and event handlers that the
 * OPNet node calls during operation.
 *
 * @remarks
 * Most plugins should extend {@link PluginBase} instead of implementing
 * `IPlugin` directly. `PluginBase` provides no-op defaults for all hooks
 * so you only need to override the ones you care about.
 *
 * @example
 * ```typescript
 * import {
 *     PluginBase,
 *     IPluginContext,
 *     IBlockProcessedData,
 *     IReorgData,
 * } from '@btc-vision/plugin-sdk';
 *
 * export default class MyPlugin extends PluginBase {
 *     async onLoad(context: IPluginContext): Promise<void> {
 *         await super.onLoad(context);
 *         this.context.logger.info('MyPlugin loaded!');
 *     }
 *
 *     async onBlockPostProcess(block: IBlockProcessedData): Promise<void> {
 *         this.context.logger.info(`Processed block #${block.blockNumber}`);
 *         await this.context.updateLastSyncedBlock(block.blockNumber);
 *     }
 *
 *     async onReorg(reorg: IReorgData): Promise<void> {
 *         this.context.logger.warn(`Reorg: reverting blocks ${reorg.fromBlock}-${reorg.toBlock}`);
 *         const collection = this.context.db!.collection('my-plugin_data');
 *         await collection.deleteMany({ blockHeight: { $gte: reorg.fromBlock.toString() } });
 *         await this.context.resetSyncStateToBlock(reorg.fromBlock - 1n);
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

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
} from './IPluginInstallState.js';

/**
 * Main plugin interface that all OPNet plugins must implement.
 *
 * Defines lifecycle hooks (load, unload, enable, disable), block processing
 * hooks, epoch hooks, mempool hooks, reorg/reindex handlers, and API
 * registration methods. All methods are optional - implement only the
 * hooks your plugin needs.
 *
 * @remarks
 * **Hook execution model:**
 * - Plugins run in isolated worker threads (bytenode-compiled V8 bytecode).
 * - Hook payloads are serialized via `JSON.stringify()` across the thread boundary.
 * - Most hooks execute in parallel across plugins. **BLOCKING** hooks
 *   (reorg, reindex, sync) execute sequentially and halt the indexer.
 * - Each hook has a timeout (see {@link HOOK_CONFIGS}). Exceeding it crashes the plugin.
 *
 * **Permission model:**
 * - Block hooks require `blocks.*` permissions.
 * - Epoch hooks require `epochs.*` permissions.
 * - Mempool hooks require `mempool.txFeed` permission.
 * - API hooks require `api.*` permissions.
 * - Permissions are declared in the plugin manifest (`plugin.json`).
 *
 * @example
 * ```typescript
 * // Minimal plugin implementing IPlugin directly (prefer PluginBase instead)
 * import type { IPlugin, IPluginContext } from '@btc-vision/plugin-sdk';
 *
 * class MinimalPlugin implements IPlugin {
 *     async onLoad(context: IPluginContext): Promise<void> {
 *         context.logger.info('Hello from MinimalPlugin!');
 *     }
 * }
 *
 * export default MinimalPlugin;
 * ```
 */
export interface IPlugin {
    /**
     * Called when the plugin is loaded into the worker thread.
     *
     * This is the first lifecycle hook called. Use it to initialize resources,
     * set up database connections, and store the context reference.
     *
     * @param context - The plugin context providing access to all APIs
     *   (database, filesystem, blockchain, logging, config, events).
     *
     * @remarks
     * - Always store the context for use in other hooks.
     * - If extending `PluginBase`, call `super.onLoad(context)` first.
     * - This hook has a 30-second timeout.
     *
     * @example
     * ```typescript
     * async onLoad(context: IPluginContext): Promise<void> {
     *     await super.onLoad(context);
     *     this.context.logger.info('Plugin loaded');
     *
     *     // Initialize database indexes
     *     const collection = this.context.db!.collection('my-plugin_events');
     *     await collection.createIndex({ blockHeight: -1 });
     * }
     * ```
     */
    onLoad?(context: IPluginContext): Promise<void>;

    /**
     * Called when the plugin is being unloaded from the worker thread.
     *
     * Use this to clean up resources, close connections, flush buffers, etc.
     *
     * @remarks
     * - This hook has a 10-second timeout.
     * - After this hook completes, the worker thread will be terminated.
     *
     * @example
     * ```typescript
     * async onUnload(): Promise<void> {
     *     this.context.logger.info('Shutting down...');
     *     await this.flushPendingWrites();
     * }
     * ```
     */
    onUnload?(): Promise<void>;

    /**
     * Called when the plugin transitions from disabled to enabled state.
     *
     * A plugin may be loaded but disabled. This hook fires when it becomes
     * active and starts receiving event hooks.
     *
     * @remarks
     * - This hook has a 5-second timeout.
     *
     * @example
     * ```typescript
     * async onEnable(): Promise<void> {
     *     this.context.logger.info('Plugin enabled - starting to process events');
     * }
     * ```
     */
    onEnable?(): Promise<void>;

    /**
     * Called when the plugin transitions from enabled to disabled state.
     *
     * The plugin remains loaded but stops receiving event hooks until
     * re-enabled.
     *
     * @remarks
     * - This hook has a 5-second timeout.
     *
     * @example
     * ```typescript
     * async onDisable(): Promise<void> {
     *     this.context.logger.info('Plugin disabled - pausing event processing');
     * }
     * ```
     */
    onDisable?(): Promise<void>;

    /**
     * Called when the plugin is installed on this node for the first time.
     *
     * Use for one-time setup like creating database indexes, initial state
     * seeding, or migration tasks.
     *
     * @param networkInfo - Information about the Bitcoin network (mainnet/testnet/regtest),
     *   current block height, and genesis block hash.
     *
     * @remarks
     * **Not yet dispatched by the node** - the worker thread does not
     * currently invoke this hook. Use `onLoad` with
     * `context.isFirstInstall` to detect first installation instead.
     *
     * @experimental
     */
    onFirstInstall?(networkInfo: INetworkInfo): Promise<void>;

    /**
     * Called on every plugin load with network information.
     *
     * Use to verify the plugin is running on the expected network
     * and to initialize network-specific configuration.
     *
     * @param networkInfo - Network and chain information including chain ID,
     *   network type, current block height, and genesis hash.
     *
     * @remarks
     * **Not yet dispatched by the node** - the worker thread does not
     * currently invoke this hook. Access network info via
     * `context.network` in `onLoad` instead.
     *
     * @experimental
     */
    onNetworkInit?(networkInfo: INetworkInfo): Promise<void>;

    /**
     * Called when the plugin needs to sync/catch-up with the chain.
     *
     * This is a **BLOCKING** hook - the indexer will not start until
     * sync completes. Return `true` to let the system perform sync
     * (calling `onSyncBlock` for each block), or `false` to skip
     * (if the plugin handles its own sync logic).
     *
     * @param syncCheck - Sync status including last synced block,
     *   chain tip, blocks behind count, and reindex information.
     * @returns `true` to perform system-managed sync, `false` to skip.
     *
     * @remarks
     * **Not yet dispatched by the node** - the sync pipeline is not
     * yet implemented. This hook is reserved for future use.
     *
     * @experimental
     */
    onSyncRequired?(syncCheck: IPluginSyncCheck): Promise<boolean>;

    /**
     * Called for each block during sync/catch-up.
     *
     * Plugins should process the block data and update their state.
     * This is called sequentially from `enabledAtBlock` to the current tip.
     *
     * @param block - Block data with transactions for the current sync block.
     * @param progress - Current sync progress (percentage, ETA, blocks/sec).
     *
     * @remarks
     * **Not yet dispatched by the node** - the sync pipeline is not
     * yet implemented. This hook is reserved for future use.
     *
     * @experimental
     */
    onSyncBlock?(block: ISyncBlockData, progress: ISyncProgress): Promise<void>;

    /**
     * Called when sync is complete.
     *
     * Use to finalize any sync-related state, build summary indexes,
     * or log completion.
     *
     * @param finalBlock - The height of the final block that was synced.
     *
     * @remarks
     * **Not yet dispatched by the node** - the sync pipeline is not
     * yet implemented. This hook is reserved for future use.
     *
     * @experimental
     */
    onSyncComplete?(finalBlock: bigint): Promise<void>;

    /**
     * Called before a block is processed with raw Bitcoin block data.
     *
     * Receives the full block including all transactions directly from
     * the Bitcoin Core RPC (`getblock verbosity=2` format). Use this
     * for raw Bitcoin data analysis before OPNet processing.
     *
     * @param block - Raw Bitcoin block data. Field names follow Bitcoin Core
     *   conventions (e.g., `previousblockhash`, `merkleroot`, `height: number`).
     *
     * @remarks
     * - Requires `blocks.preProcess` permission.
     * - Executes in parallel across plugins (5-second timeout).
     * - Data crosses JSON serialization boundary - no `BigInt` or `Buffer`.
     *
     * @example
     * ```typescript
     * async onBlockPreProcess(block: IBlockData): Promise<void> {
     *     // Analyze raw Bitcoin transactions before OPNet processing
     *     for (const tx of block.tx) {
     *         for (const vout of tx.vout) {
     *             if (vout.scriptPubKey.type === 'nulldata') {
     *                 this.context.logger.debug(`OP_RETURN in TX ${tx.txid}`);
     *             }
     *         }
     *     }
     * }
     * ```
     */
    onBlockPreProcess?(block: IBlockData): Promise<void>;

    /**
     * Called after a block is processed with OPNet consensus data.
     *
     * Receives processed block data including OPNet merkle roots,
     * checksums, and state roots. This is the primary hook for
     * tracking OPNet state changes.
     *
     * @param block - Processed block data with OPNet information including
     *   receipt root, storage root, checksum hash, and proofs.
     *
     * @remarks
     * - Requires `blocks.postProcess` permission.
     * - Executes in parallel across plugins (5-second timeout).
     * - Block heights are `bigint` (not `number` like in `IBlockData`).
     *
     * @example
     * ```typescript
     * async onBlockPostProcess(block: IBlockProcessedData): Promise<void> {
     *     const collection = this.context.db!.collection('my-plugin_blocks');
     *     await collection.insertOne({
     *         blockNumber: block.blockNumber.toString(),
     *         storageRoot: block.storageRoot,
     *         receiptRoot: block.receiptRoot,
     *         txCount: block.txCount,
     *     });
     *     await this.context.updateLastSyncedBlock(block.blockNumber);
     * }
     * ```
     */
    onBlockPostProcess?(block: IBlockProcessedData): Promise<void>;

    /**
     * Called when a new block is confirmed with OPNet processed data.
     *
     * Similar to `onBlockPostProcess` but specifically for confirmed blocks.
     *
     * @param block - Processed block data.
     *
     * @remarks
     * - Requires `blocks.onChange` permission.
     * - Executes in parallel across plugins (5-second timeout).
     *
     * @example
     * ```typescript
     * async onBlockChange(block: IBlockProcessedData): Promise<void> {
     *     this.context.logger.info(`Confirmed block #${block.blockNumber}`);
     * }
     * ```
     */
    onBlockChange?(block: IBlockProcessedData): Promise<void>;

    /**
     * Called when the epoch number changes (new epoch begins).
     *
     * @param epoch - Epoch data including epoch number and block range.
     *
     * @remarks
     * - Requires `epochs.onChange` permission.
     * - Executes in parallel (5-second timeout).
     *
     * @example
     * ```typescript
     * async onEpochChange(epoch: IEpochData): Promise<void> {
     *     this.context.logger.info(
     *         `Epoch #${epoch.epochNumber}: blocks ${epoch.startBlock}-${epoch.endBlock}`
     *     );
     * }
     * ```
     */
    onEpochChange?(epoch: IEpochData): Promise<void>;

    /**
     * Called when an epoch is finalized (merkle tree complete).
     *
     * The epoch's checksum root is now available for verification.
     *
     * @param epoch - Finalized epoch data with `checksumRoot` populated.
     *
     * @remarks
     * - Requires `epochs.onFinalized` permission.
     * - Executes in parallel (5-second timeout).
     *
     * @example
     * ```typescript
     * async onEpochFinalized(epoch: IEpochData): Promise<void> {
     *     this.context.logger.info(
     *         `Epoch #${epoch.epochNumber} finalized: root=${epoch.checksumRoot}`
     *     );
     * }
     * ```
     */
    onEpochFinalized?(epoch: IEpochData): Promise<void>;

    /**
     * Called when a new transaction enters the mempool.
     *
     * @param tx - Mempool transaction data (txid, hash, size, fee, timestamp).
     *
     * @remarks
     * - Requires `mempool.txFeed` permission.
     * - Executes in parallel (2-second timeout).
     * - Mempool transactions may never confirm. Treat data as tentative.
     *
     * @example
     * ```typescript
     * async onMempoolTransaction(tx: IMempoolTransaction): Promise<void> {
     *     const feeRate = Number(tx.fee) / tx.size;
     *     if (feeRate > 100) {
     *         this.context.logger.info(`High-fee TX: ${tx.txid} (${feeRate} sat/byte)`);
     *     }
     * }
     * ```
     */
    onMempoolTransaction?(tx: IMempoolTransaction): Promise<void>;

    /**
     * Called when the blockchain reorganizes (CRITICAL - BLOCKING).
     *
     * Plugins **MUST** revert any state stored for blocks `>= fromBlock`.
     * This hook blocks the indexer until all plugins complete. Failure to
     * properly handle reorgs will result in data inconsistency.
     *
     * @param reorg - Reorg information including the affected block range
     *   (`fromBlock` to `toBlock`, both inclusive) and reason.
     *
     * @remarks
     * - **BLOCKING** - indexer halts until all plugins complete.
     * - 5-minute timeout (reorg handling can be slow for large datasets).
     * - No permission required - all plugins receive reorg notifications.
     *
     * @example
     * ```typescript
     * async onReorg(reorg: IReorgData): Promise<void> {
     *     this.context.logger.warn(
     *         `REORG: blocks ${reorg.fromBlock}-${reorg.toBlock} reverted`
     *     );
     *
     *     // Delete all data for reverted blocks
     *     const collection = this.context.db!.collection('my-plugin_events');
     *     await collection.deleteMany({
     *         blockHeight: { $gte: reorg.fromBlock.toString() },
     *     });
     *
     *     await this.context.resetSyncStateToBlock(reorg.fromBlock - 1n);
     * }
     * ```
     */
    onReorg?(reorg: IReorgData): Promise<void>;

    /**
     * Called when a reindex is required at startup (CRITICAL - BLOCKING).
     *
     * This fires when:
     * - The node config has `REINDEX=true`.
     * - Plugin's `lastSyncedBlock > reindexFromBlock` (data must be purged).
     * - Plugin's `lastSyncedBlock < reindexFromBlock` (sync required).
     *
     * Return `true` if the plugin handled the reindex successfully.
     * Return `false` to abort startup (plugin cannot handle reindex).
     *
     * @param reindexCheck - Reindex requirements including action type,
     *   purge/sync requirements, and target block heights.
     * @returns `true` if handled successfully, `false` to abort node startup.
     *
     * @remarks
     * - **BLOCKING** - 10-minute timeout.
     * - Must handle purge if `requiresPurge` is `true`.
     * - After purge, plugin will sync from `reindexFromBlock`.
     *
     * @example
     * ```typescript
     * async onReindexRequired(reindexCheck: IReindexCheck): Promise<boolean> {
     *     if (reindexCheck.requiresPurge) {
     *         this.context.logger.warn(
     *             `Purging data to block ${reindexCheck.purgeToBlock}`
     *         );
     *         await this.purgeData(reindexCheck.purgeToBlock!);
     *     }
     *     return true; // Ready for reindex
     * }
     * ```
     */
    onReindexRequired?(reindexCheck: IReindexCheck): Promise<boolean>;

    /**
     * Called to purge plugin data for a block range (during reindex or reorg).
     *
     * Plugins should delete all data stored for blocks in the range
     * `[fromBlock, toBlock]`. If `toBlock` is undefined, delete all
     * data for blocks `>= fromBlock`.
     *
     * @param fromBlock - Start block to purge (inclusive).
     * @param toBlock - End block to purge (inclusive), or `undefined`
     *   to purge all blocks `>= fromBlock`.
     *
     * @remarks
     * - **BLOCKING** - 10-minute timeout.
     * - Called before sync to ensure clean state.
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
     *
     *     const collection = this.context.db!.collection('my-plugin_data');
     *     const result = await collection.deleteMany(query);
     *     this.context.logger.info(`Purged ${result.deletedCount} records`);
     * }
     * ```
     */
    onPurgeBlocks?(fromBlock: bigint, toBlock?: bigint): Promise<void>;

    /**
     * Called to register HTTP API routes.
     *
     * Routes are namespaced under the plugin's `api.basePath`.
     * Handler strings must be method names on the plugin class.
     *
     * @param router - Router interface for registering GET/POST/PUT/DELETE/PATCH routes.
     *
     * @remarks
     * - Requires `api.addEndpoints` permission.
     * - Called once during plugin initialization.
     *
     * @example
     * ```typescript
     * registerRoutes(router: IPluginRouter): void {
     *     router.get('/stats', 'handleGetStats');
     *     router.get('/blocks/:height', 'handleGetBlock');
     *     router.post('/query', 'handleQuery');
     * }
     * ```
     */
    registerRoutes?(router: IPluginRouter): void;

    /**
     * Called to register WebSocket handlers.
     *
     * @param ws - WebSocket interface for registering opcode handlers
     *   and managing client subscriptions.
     *
     * @remarks
     * - Requires `api.addWebsocket` permission.
     * - Called once during plugin initialization.
     *
     * @example
     * ```typescript
     * registerWebSocketHandlers(ws: IPluginWebSocket): void {
     *     ws.registerHandler('subscribe_blocks', 'handleBlockSubscription');
     *     ws.registerHandler('unsubscribe', 'handleUnsubscribe');
     * }
     * ```
     */
    registerWebSocketHandlers?(ws: IPluginWebSocket): void;
}

/**
 * Constructor type for plugin classes.
 *
 * Used by the plugin loader to instantiate plugins from their compiled bytecode.
 * The plugin class must have a parameterless constructor.
 *
 * @example
 * ```typescript
 * import type { PluginConstructor } from '@btc-vision/plugin-sdk';
 *
 * // The default export of a plugin module must be a PluginConstructor
 * const MyPluginClass: PluginConstructor = class MyPlugin extends PluginBase {
 *     // ...
 * };
 * ```
 */
export type PluginConstructor = new () => IPlugin;

/**
 * Plugin module export structure.
 *
 * Every compiled plugin `.jsc` file must export a default class
 * that implements {@link IPlugin}. The node loads this module
 * and calls `new module.default()` to instantiate the plugin.
 *
 * @example
 * ```typescript
 * // In your plugin's main file (e.g., index.ts):
 * import { PluginBase, IPluginContext } from '@btc-vision/plugin-sdk';
 *
 * // This class becomes the default export and must have a no-arg constructor
 * export default class MyPlugin extends PluginBase {
 *     async onLoad(context: IPluginContext): Promise<void> {
 *         await super.onLoad(context);
 *         this.context.logger.info('Plugin ready!');
 *     }
 * }
 * ```
 */
export interface IPluginModule {
    /** The plugin constructor as the default export. */
    default: PluginConstructor;
}
