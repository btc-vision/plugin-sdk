/**
 * Plugin context - the primary API surface available to plugins.
 *
 * The context is passed to the plugin's `onLoad` hook and provides
 * access to all node APIs: database, filesystem, blockchain queries,
 * logging, configuration, inter-plugin events, and sync state management.
 *
 * @remarks
 * The context is the plugin's "window into the node." All interactions
 * with the OPNet node go through this interface. Store the context
 * reference during `onLoad` for use in other hooks.
 *
 * @example
 * ```typescript
 * import { PluginBase, IPluginContext, IBlockProcessedData } from '@btc-vision/plugin-sdk';
 *
 * export default class MyPlugin extends PluginBase {
 *     async onLoad(context: IPluginContext): Promise<void> {
 *         await super.onLoad(context);
 *
 *         // Access plugin identity
 *         this.context.logger.info(`${this.context.name} v${this.context.version} loaded`);
 *         this.context.logger.info(`Network: ${this.context.network.network}`);
 *         this.context.logger.info(`Data dir: ${this.context.dataDir}`);
 *
 *         // Check available APIs
 *         if (this.context.db) {
 *             this.context.logger.info('Database access available');
 *         }
 *         if (this.context.blockchain) {
 *             const tip = await this.context.blockchain.getChainTip();
 *             this.context.logger.info(`Chain tip: ${tip}`);
 *         }
 *
 *         // Subscribe to inter-plugin events
 *         this.context.on('price-update', (data) => {
 *             this.context.logger.debug('Price update received:', data);
 *         });
 *     }
 *
 *     async onBlockPostProcess(block: IBlockProcessedData): Promise<void> {
 *         // Use database API
 *         const collection = this.context.db!.collection('my-plugin_blocks');
 *         await collection.insertOne({
 *             blockNumber: block.blockNumber.toString(),
 *             txCount: block.txCount,
 *         });
 *
 *         // Track sync progress
 *         await this.context.updateLastSyncedBlock(block.blockNumber);
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

import { IPluginPermissions } from '../interfaces/IPluginPermissions.js';
import {
    INetworkInfo,
    IPluginInstallState,
    IPluginSyncCheck,
    IReindexCheck,
    IReindexInfo,
} from '../interfaces/IPluginInstallState.js';
import { IPlugin } from '../interfaces/IPlugin.js';
import { IPluginDatabaseAPI } from './IPluginDatabaseAPI.js';
import { IPluginFilesystemAPI } from './IPluginFilesystemAPI.js';
import { IPluginLogger } from './IPluginLogger.js';
import { IPluginConfig } from './IPluginConfig.js';
import { IPluginWorker, EventHandler } from './IPluginWorker.js';
import { IPluginBlockchainAPI } from './IPluginBlockchainAPI.js';

/**
 * Plugin context interface - the main API surface available to plugins.
 *
 * Provides access to all node APIs and plugin state management.
 * Passed to the plugin during the `onLoad` lifecycle hook.
 *
 * @remarks
 * **API availability depends on permissions:**
 * - `db` - Available only if `database.enabled: true`.
 * - `blockchain` - Available only if any `blockchain.*` permission is `true`.
 * - `fs` - Always available (sandboxed to plugin data directory).
 * - `logger` - Always available.
 * - `config` - Always available.
 *
 * @example
 * ```typescript
 * import type { IPluginContext } from '@btc-vision/plugin-sdk';
 *
 * // Type-safe context usage
 * function useContext(ctx: IPluginContext): void {
 *     // Always available
 *     ctx.logger.info(`Plugin: ${ctx.name} v${ctx.version}`);
 *     ctx.logger.info(`Network: ${ctx.network.network}, Chain ID: ${ctx.network.chainId}`);
 *
 *     // Check before using optional APIs
 *     if (ctx.db) {
 *         const collection = ctx.db.collection('my-plugin_data');
 *         // ... use collection
 *     }
 *
 *     if (ctx.blockchain) {
 *         // ... query blockchain
 *     }
 * }
 * ```
 */
export interface IPluginContext {
    /**
     * Plugin name as declared in the manifest.
     *
     * @example `"my-block-indexer"`
     */
    readonly name: string;

    /**
     * Plugin version as declared in the manifest.
     *
     * @example `"1.0.0"`
     */
    readonly version: string;

    /**
     * Absolute path to the plugin's data directory on the filesystem.
     *
     * All filesystem operations via `this.context.fs` are relative to this path.
     *
     * @example `"/opt/opnet/plugin-data/my-block-indexer"`
     */
    readonly dataDir: string;

    /**
     * Plugin permissions as declared in the manifest.
     *
     * Use this to check which APIs are available at runtime.
     *
     * @example
     * ```typescript
     * if (ctx.permissions.blockchain?.contracts) {
     *     // Contract queries are available
     * }
     * ```
     */
    readonly permissions: IPluginPermissions;

    /**
     * Network information (chain ID, network type, current height).
     *
     * @example
     * ```typescript
     * ctx.logger.info(`Running on ${ctx.network.network}`);
     * ctx.logger.info(`Chain tip: ${ctx.network.currentBlockHeight}`);
     * ```
     */
    readonly network: INetworkInfo;

    /**
     * Database API for MongoDB-style document storage.
     *
     * `undefined` if `database.enabled` is `false` in the manifest.
     *
     * @example
     * ```typescript
     * if (ctx.db) {
     *     const events = ctx.db.collection('my-plugin_events');
     *     await events.insertOne({ txid: '...', blockHeight: '850000' });
     * }
     * ```
     */
    readonly db?: IPluginDatabaseAPI;

    /**
     * Blockchain query API for accessing historical chain data.
     *
     * `undefined` if no `blockchain.*` permissions are granted.
     *
     * @example
     * ```typescript
     * if (ctx.blockchain) {
     *     const tip = await ctx.blockchain.getChainTip();
     *     const block = await ctx.blockchain.getBlock(tip);
     * }
     * ```
     */
    readonly blockchain?: IPluginBlockchainAPI;

    /**
     * Sandboxed filesystem API for reading/writing plugin data files.
     *
     * Always available. Operations are confined to the plugin's data directory.
     *
     * @example
     * ```typescript
     * await ctx.fs.writeFile('state.json', JSON.stringify({ lastBlock: 850000 }));
     * const data = await ctx.fs.readFile('state.json');
     * ```
     */
    readonly fs: IPluginFilesystemAPI;

    /**
     * Logger with automatic plugin name prefix.
     *
     * Always available. Messages are forwarded to the node's logging system.
     *
     * @example
     * ```typescript
     * ctx.logger.info('Processing complete');
     * ctx.logger.error('Failed to process block', error);
     * ```
     */
    readonly logger: IPluginLogger;

    /**
     * Plugin configuration store.
     *
     * Always available. Provides typed access to plugin settings.
     *
     * @example
     * ```typescript
     * const batchSize = ctx.config.get<number>('batchSize', 100);
     * ```
     */
    readonly config: IPluginConfig;

    /**
     * Whether this is the first time the plugin has been installed on this node.
     *
     * `true` during the initial installation, `false` on subsequent loads.
     * Use this to perform one-time setup in `onLoad` if `onFirstInstall`
     * is not sufficient.
     */
    readonly isFirstInstall: boolean;

    /**
     * Block height at which this plugin was first enabled.
     *
     * `0n` means the plugin has been enabled since genesis.
     * Used to determine the starting point for sync operations.
     *
     * @example `840000n`
     */
    readonly enabledAtBlock: bigint;

    /**
     * Get another plugin instance for inter-plugin communication.
     *
     * Only works for library plugins that the current plugin declares
     * as a dependency in its manifest.
     *
     * @typeParam T - Expected plugin interface type.
     * @param name - Plugin name to look up.
     * @returns Plugin instance cast to `T`, or `undefined` if not found.
     *
     * @example
     * ```typescript
     * interface IPriceFeed extends IPlugin {
     *     getPrice(symbol: string): Promise<number>;
     * }
     *
     * const priceFeed = ctx.getPlugin<IPriceFeed>('price-feed-plugin');
     * if (priceFeed) {
     *     const btcPrice = await priceFeed.getPrice('BTC');
     * }
     * ```
     */
    getPlugin<T extends IPlugin>(name: string): T | undefined;

    /**
     * Emit an event to other plugins.
     *
     * Events are broadcast to all plugins that have subscribed via `on()`.
     *
     * @param event - Event name (convention: `"plugin-name:event-type"`).
     * @param data - Event payload (must be JSON-serializable).
     *
     * @example
     * ```typescript
     * ctx.emit('my-plugin:price-update', { symbol: 'BTC', price: 100000 });
     * ```
     */
    emit(event: string, data: unknown): void;

    /**
     * Subscribe to events from other plugins.
     *
     * @param event - Event name to listen for.
     * @param handler - Callback invoked when the event is emitted.
     *
     * @example
     * ```typescript
     * ctx.on('price-feed:update', (data) => {
     *     const { symbol, price } = data as { symbol: string; price: number };
     *     ctx.logger.info(`${symbol}: $${price}`);
     * });
     * ```
     */
    on(event: string, handler: EventHandler): void;

    /**
     * Unsubscribe from events.
     *
     * @param event - Event name to stop listening for.
     * @param handler - The exact handler function reference to remove.
     *
     * @example
     * ```typescript
     * const handler: EventHandler = (data) => { /* ... *\/ };
     * ctx.on('some-event', handler);
     * // Later:
     * ctx.off('some-event', handler);
     * ```
     */
    off(event: string, handler: EventHandler): void;

    /**
     * Spawn a sub-worker thread for parallel processing.
     *
     * @param script - Path to the worker script (relative to plugin directory).
     * @returns Worker interface for message passing and lifecycle management.
     * @throws Error if threading permission is not granted or worker limit exceeded.
     *
     * @remarks Requires `threading.maxWorkers > 0` permission.
     *
     * @example
     * ```typescript
     * const worker = ctx.createWorker('./heavy-computation.js');
     * worker.on('message', (result) => {
     *     ctx.logger.info('Worker result:', result);
     * });
     * worker.postMessage({ data: largeDataSet });
     * ```
     */
    createWorker(script: string): IPluginWorker;

    /**
     * Get the current chain tip block height.
     *
     * @returns Current block height as `bigint`.
     *
     * @example
     * ```typescript
     * const height = ctx.getCurrentBlockHeight();
     * ctx.logger.info(`Current chain height: ${height}`);
     * ```
     */
    getCurrentBlockHeight(): bigint;

    /**
     * Get the plugin's persisted sync state.
     *
     * @returns Install state including sync progress, or `undefined`
     *   if the plugin has never been installed.
     *
     * @example
     * ```typescript
     * const state = ctx.getSyncState();
     * if (state) {
     *     ctx.logger.info(`Last synced block: ${state.lastSyncedBlock}`);
     *     ctx.logger.info(`Sync completed: ${state.syncCompleted}`);
     * }
     * ```
     */
    getSyncState(): IPluginInstallState | undefined;

    /**
     * Get the last block height the plugin has processed.
     *
     * @returns Last synced block height as `bigint`.
     *
     * @example
     * ```typescript
     * const lastBlock = ctx.getLastSyncedBlock();
     * ctx.logger.info(`Resuming from block ${lastBlock + 1n}`);
     * ```
     */
    getLastSyncedBlock(): bigint;

    /**
     * Check if the plugin is fully synced with the chain.
     *
     * @returns `true` if `lastSyncedBlock >= chainTip`.
     *
     * @example
     * ```typescript
     * if (!ctx.isSynced()) {
     *     ctx.logger.warn('Plugin is behind the chain tip');
     * }
     * ```
     */
    isSynced(): boolean;

    /**
     * Get detailed sync status information.
     *
     * @returns Sync check result with status, blocks behind, and
     *   reindex information.
     *
     * @example
     * ```typescript
     * const status = ctx.getSyncStatus();
     * ctx.logger.info(
     *     `Sync status: ${status.status}, ` +
     *     `${status.blocksBehind} blocks behind`
     * );
     * ```
     */
    getSyncStatus(): IPluginSyncCheck;

    /**
     * Update the last synced block after processing.
     *
     * Call this after successfully processing a block to persist
     * sync progress. This ensures the plugin resumes from the
     * correct position after a restart.
     *
     * @param blockHeight - Block height that was just processed.
     *
     * @example
     * ```typescript
     * async onBlockPostProcess(block: IBlockProcessedData): Promise<void> {
     *     await this.processBlock(block);
     *     await this.context.updateLastSyncedBlock(block.blockNumber);
     * }
     * ```
     */
    updateLastSyncedBlock(blockHeight: bigint): Promise<void>;

    /**
     * Mark the plugin's initial sync as completed.
     *
     * Call this at the end of the sync process (typically in `onSyncComplete`).
     *
     * @example
     * ```typescript
     * async onSyncComplete(finalBlock: bigint): Promise<void> {
     *     ctx.logger.info(`Sync complete at block ${finalBlock}`);
     *     await ctx.markSyncCompleted();
     * }
     * ```
     */
    markSyncCompleted(): Promise<void>;

    /**
     * Check if reindex mode is currently enabled on the node.
     *
     * @experimental Not yet functional — the node does not serialize the
     * `reindex` field of `INetworkInfo` across the worker thread boundary,
     * so this always returns `false`. Will be connected in a future release.
     *
     * @returns `true` if the node is in reindex mode.
     *
     * @example
     * ```typescript
     * if (ctx.isReindexEnabled()) {
     *     ctx.logger.info('Node is in reindex mode');
     * }
     * ```
     */
    isReindexEnabled(): boolean;

    /**
     * Get reindex configuration details (if reindex is enabled).
     *
     * @experimental Not yet functional — the node does not serialize the
     * `reindex` field of `INetworkInfo` across the worker thread boundary,
     * so this always returns `undefined`. Will be connected in a future release.
     *
     * @returns Reindex info or `undefined` if reindex is not enabled.
     *
     * @example
     * ```typescript
     * const reindex = ctx.getReindexInfo();
     * if (reindex?.enabled) {
     *     ctx.logger.info(`Reindexing from block ${reindex.fromBlock}`);
     * }
     * ```
     */
    getReindexInfo(): IReindexInfo | undefined;

    /**
     * Get the target block height for the current reindex operation.
     *
     * @experimental Not yet functional — the node does not serialize the
     * `reindex` field of `INetworkInfo` across the worker thread boundary,
     * so this always returns `undefined`. Will be connected in a future release.
     *
     * @returns Reindex from-block or `undefined` if not in reindex mode.
     *
     * @example
     * ```typescript
     * const fromBlock = ctx.getReindexFromBlock();
     * if (fromBlock !== undefined) {
     *     ctx.logger.info(`Reindexing from block ${fromBlock}`);
     * }
     * ```
     */
    getReindexFromBlock(): bigint | undefined;

    /**
     * Check what reindex action is required for this plugin.
     *
     * Determines whether the plugin needs to purge data, sync, or both
     * based on the reindex target and the plugin's current state.
     *
     * @experimental Not yet functional — the node does not serialize the
     * `reindex` field of `INetworkInfo` across the worker thread boundary,
     * so this always returns `undefined`. Will be connected in a future release.
     *
     * @returns Reindex check result or `undefined` if reindex is not enabled.
     *
     * @example
     * ```typescript
     * const check = ctx.getReindexCheck();
     * if (check?.requiresPurge) {
     *     ctx.logger.warn(`Need to purge data to block ${check.purgeToBlock}`);
     * }
     * if (check?.requiresSync) {
     *     ctx.logger.info(`Need to sync from block ${check.syncFromBlock}`);
     * }
     * ```
     */
    getReindexCheck(): IReindexCheck | undefined;

    /**
     * Check if the plugin needs reindex handling before it can start.
     *
     * @experimental Not yet functional — the node does not serialize the
     * `reindex` field of `INetworkInfo` across the worker thread boundary,
     * so this always returns `false`. Will be connected in a future release.
     *
     * @returns `true` if reindex handling is required.
     *
     * @example
     * ```typescript
     * if (ctx.requiresReindexHandling()) {
     *     ctx.logger.warn('Reindex handling required before normal operation');
     * }
     * ```
     */
    requiresReindexHandling(): boolean;

    /**
     * Reset the plugin's sync state to a specific block height.
     *
     * Use this after purging data during a reorg or reindex to ensure
     * the plugin re-syncs from the correct position.
     *
     * @param blockHeight - Block height to reset to (plugin will sync from `blockHeight + 1`).
     *
     * @example
     * ```typescript
     * async onReorg(reorg: IReorgData): Promise<void> {
     *     // Purge data for reverted blocks
     *     await this.purgeBlockData(reorg.fromBlock, reorg.toBlock);
     *     // Reset sync state to just before the reorg
     *     await this.context.resetSyncStateToBlock(reorg.fromBlock - 1n);
     * }
     * ```
     */
    resetSyncStateToBlock(blockHeight: bigint): Promise<void>;
}
