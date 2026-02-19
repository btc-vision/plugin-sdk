/**
 * @packageDocumentation
 *
 * Plugin installation state, synchronization, and reindexing interfaces for the
 * OPNet Plugin SDK.
 *
 * This module defines the core types that govern how an OPNet node plugin is
 * installed, how it tracks its synchronization progress against the Bitcoin
 * blockchain, and how it participates in chain reindexing operations. These
 * types are persisted to the node's database and drive the plugin lifecycle
 * managed by the host runtime.
 *
 * **Key concepts:**
 *
 * - **Install state** (`IPluginInstallState`) -- The persistent record of a
 *   plugin's installation, including the block range it has processed and the
 *   database collections it owns.
 * - **Sync pipeline** (`ISyncOptions`, `ISyncBlockData`, `ISyncProgress`,
 *   `PluginSyncStatus`, `IPluginSyncCheck`) -- The mechanism through which a
 *   plugin catches up from its last-processed block to the current chain tip.
 * - **Reindex pipeline** (`IReindexInfo`, `ReindexAction`, `IReindexCheck`) --
 *   The mechanism through which the node can request a plugin to purge and
 *   re-process historical data when the node itself is being reindexed.
 *
 * All interfaces in this module use `readonly` fields because the host runtime
 * is the sole owner of mutation; plugins receive these objects as immutable
 * snapshots.
 *
 * @example Importing the main types used in a typical plugin
 * ```typescript
 * import {
 *     IPluginInstallState,
 *     INetworkInfo,
 *     ISyncBlockData,
 *     ISyncProgress,
 *     PluginSyncStatus,
 *     IPluginSyncCheck,
 *     ReindexAction,
 *     IReindexCheck,
 * } from '@btc-vision/plugin-sdk';
 * ```
 */

/**
 * Persistent record of a plugin's installation within the OPNet node.
 *
 * The host runtime creates this record when a plugin is first installed and
 * updates it each time the plugin processes a new block or its state otherwise
 * changes. Plugin authors typically read this via
 * {@link IPluginContext.getSyncState} rather than constructing it directly.
 *
 * @example Reading the install state inside a plugin
 * ```typescript
 * import { PluginBase, IPluginContext } from '@btc-vision/plugin-sdk';
 *
 * export default class AnalyticsPlugin extends PluginBase {
 *     async onLoad(context: IPluginContext): Promise<void> {
 *         await super.onLoad(context);
 *
 *         const state = context.getSyncState();
 *         if (state) {
 *             this.context.logger.info(
 *                 `Plugin "${state.pluginId}" v${state.installedVersion} ` +
 *                 `last synced to block ${state.lastSyncedBlock}`,
 *             );
 *         }
 *     }
 * }
 * ```
 *
 * @example Checking whether initial sync is complete
 * ```typescript
 * import { IPluginInstallState } from '@btc-vision/plugin-sdk';
 *
 * function logSyncStatus(state: IPluginInstallState): void {
 *     if (state.syncCompleted) {
 *         console.log(`Sync done. Last block: ${state.lastSyncedBlock}`);
 *     } else {
 *         console.log('Initial sync still in progress...');
 *     }
 * }
 * ```
 */
export interface IPluginInstallState {
    /**
     * Unique identifier for the plugin, derived from the plugin's declared name
     * in its metadata manifest. This value is immutable for the lifetime of the
     * installation.
     *
     * @example
     * ```typescript
     * const state: IPluginInstallState = context.getSyncState()!;
     * console.log(`Running plugin: ${state.pluginId}`);
     * // => "Running plugin: my-analytics-plugin"
     * ```
     */
    readonly pluginId: string;

    /**
     * Semantic version string of the plugin at the time it was installed. When
     * the plugin is upgraded, this value is updated to reflect the new version.
     *
     * @example
     * ```typescript
     * const state: IPluginInstallState = context.getSyncState()!;
     * if (state.installedVersion !== '2.0.0') {
     *     context.logger.warn('Expected v2.0.0, running v' + state.installedVersion);
     * }
     * ```
     */
    readonly installedVersion: string;

    /**
     * Numeric chain identifier for the Bitcoin network the plugin is operating
     * on. Each network variant (mainnet, testnet, regtest) has a distinct
     * chain ID to prevent cross-network data contamination.
     *
     * @example
     * ```typescript
     * const state: IPluginInstallState = context.getSyncState()!;
     * if (state.chainId === 1n) {
     *     console.log('Running on mainnet');
     * }
     * ```
     */
    readonly chainId: bigint;

    /**
     * Human-readable network type string. Possible values are `"mainnet"`,
     * `"testnet"`, or `"regtest"`.
     *
     * @example
     * ```typescript
     * const state: IPluginInstallState = context.getSyncState()!;
     * if (state.network === 'regtest') {
     *     console.log('Running in local regtest mode');
     * }
     * ```
     */
    readonly network: string;

    /**
     * Unix timestamp (in milliseconds) when the plugin was first installed on
     * this node. This value never changes after initial installation.
     *
     * @example
     * ```typescript
     * const state: IPluginInstallState = context.getSyncState()!;
     * const installedDate = new Date(state.installedAt);
     * console.log(`Installed on: ${installedDate.toISOString()}`);
     * ```
     */
    readonly installedAt: number;

    /**
     * The block height at which the plugin was first enabled. A value of `0n`
     * means the plugin was enabled from the genesis block and should process
     * every block in the chain's history.
     *
     * @example
     * ```typescript
     * const state: IPluginInstallState = context.getSyncState()!;
     * if (state.enabledAtBlock === 0n) {
     *     console.log('Plugin processes all blocks from genesis');
     * } else {
     *     console.log(`Plugin starts from block ${state.enabledAtBlock}`);
     * }
     * ```
     */
    readonly enabledAtBlock: bigint;

    /**
     * The height of the most recent block that the plugin has fully processed.
     * The host runtime updates this after each successful call to
     * `onBlockChange` or `onSyncBlock`.
     *
     * @example
     * ```typescript
     * const state: IPluginInstallState = context.getSyncState()!;
     * const currentTip = context.getCurrentBlockHeight();
     * const behind = currentTip - state.lastSyncedBlock;
     * console.log(`Plugin is ${behind} blocks behind the chain tip`);
     * ```
     */
    readonly lastSyncedBlock: bigint;

    /**
     * Whether the plugin has completed its initial synchronization pass. Once
     * `true`, the plugin transitions to real-time block processing via the
     * `onBlockChange` hook.
     *
     * @example
     * ```typescript
     * const state: IPluginInstallState = context.getSyncState()!;
     * if (!state.syncCompleted) {
     *     console.log('Still performing initial sync...');
     * }
     * ```
     */
    readonly syncCompleted: boolean;

    /**
     * Names of the database collections that this plugin has created. The host
     * runtime tracks these so that collections can be cleaned up if the plugin
     * is uninstalled.
     *
     * @example
     * ```typescript
     * const state: IPluginInstallState = context.getSyncState()!;
     * console.log(`Plugin owns ${state.collections.length} collection(s):`);
     * for (const col of state.collections) {
     *     console.log(`  - ${col}`);
     * }
     * // => "  - analytics_events"
     * // => "  - analytics_aggregates"
     * ```
     */
    readonly collections: readonly string[];

    /**
     * Unix timestamp (in milliseconds) of the last time any field in this
     * install-state record was modified by the host runtime.
     *
     * @example
     * ```typescript
     * const state: IPluginInstallState = context.getSyncState()!;
     * const lastUpdate = new Date(state.updatedAt);
     * console.log(`State last updated: ${lastUpdate.toISOString()}`);
     * ```
     */
    readonly updatedAt: number;
}

/**
 * Immutable snapshot of the Bitcoin network to which the OPNet node is
 * connected. The host runtime provides this to every plugin during its
 * `onNetworkInit` and `onFirstInstall` lifecycle hooks.
 *
 * @example Logging network details on plugin startup
 * ```typescript
 * import { PluginBase, INetworkInfo } from '@btc-vision/plugin-sdk';
 *
 * export default class MyPlugin extends PluginBase {
 *     async onNetworkInit(networkInfo: INetworkInfo): Promise<void> {
 *         this.context.logger.info(
 *             `Connected to ${networkInfo.network} (chain ${networkInfo.chainId}), ` +
 *             `tip at block ${networkInfo.currentBlockHeight}`,
 *         );
 *     }
 * }
 * ```
 *
 * @example Checking for an active reindex
 * ```typescript
 * import { INetworkInfo } from '@btc-vision/plugin-sdk';
 *
 * function isReindexing(network: INetworkInfo): boolean {
 *     return network.reindex?.inProgress ?? false;
 * }
 * ```
 */
export interface INetworkInfo {
    /**
     * Unique numeric identifier for this network. Mainnet, testnet, and regtest
     * each have a different chain ID.
     *
     * @example
     * ```typescript
     * if (networkInfo.chainId === 1n) {
     *     console.log('Mainnet detected');
     * }
     * ```
     */
    readonly chainId: bigint;

    /**
     * The network variant as a string literal union. Determines which set of
     * consensus rules and address formats are in use.
     *
     * @example
     * ```typescript
     * switch (networkInfo.network) {
     *     case 'mainnet':
     *         console.log('Production network');
     *         break;
     *     case 'testnet':
     *         console.log('Test network');
     *         break;
     *     case 'regtest':
     *         console.log('Local regression-test network');
     *         break;
     * }
     * ```
     */
    readonly network: 'mainnet' | 'testnet' | 'regtest';

    /**
     * The height of the most recent block known to the node at the time this
     * snapshot was created.
     *
     * @example
     * ```typescript
     * console.log(`Chain tip is at block ${networkInfo.currentBlockHeight}`);
     * ```
     */
    readonly currentBlockHeight: bigint;

    /**
     * The SHA-256d hash of the genesis block (block 0) for this network,
     * encoded as a lowercase hex string.
     *
     * @example
     * ```typescript
     * console.log(`Genesis hash: ${networkInfo.genesisBlockHash}`);
     * // Mainnet => "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f"
     * ```
     */
    readonly genesisBlockHash: string;

    /**
     * Reindex metadata, present only when the node is performing (or has
     * recently completed) a reindex operation. When `undefined`, no reindex is
     * active.
     *
     * @example
     * ```typescript
     * if (networkInfo.reindex) {
     *     console.log(
     *         `Reindex active from block ${networkInfo.reindex.fromBlock}, ` +
     *         `in progress: ${networkInfo.reindex.inProgress}`,
     *     );
     * }
     * ```
     */
    readonly reindex?: IReindexInfo;
}

/**
 * Describes the state of a node-level reindex operation. When the OPNet node
 * operator triggers a reindex, every installed plugin receives this information
 * so it can decide how to handle its own persisted data.
 *
 * @example Inspecting reindex state in a lifecycle hook
 * ```typescript
 * import { PluginBase, INetworkInfo } from '@btc-vision/plugin-sdk';
 *
 * export default class MyPlugin extends PluginBase {
 *     async onNetworkInit(networkInfo: INetworkInfo): Promise<void> {
 *         const reindex = networkInfo.reindex;
 *         if (reindex?.enabled && reindex.inProgress) {
 *             this.context.logger.warn(
 *                 `Node is reindexing from block ${reindex.fromBlock}`,
 *             );
 *         }
 *     }
 * }
 * ```
 *
 * @example Checking for a full genesis reindex
 * ```typescript
 * import { IReindexInfo } from '@btc-vision/plugin-sdk';
 *
 * function isFullReindex(info: IReindexInfo): boolean {
 *     return info.enabled && info.fromBlock === 0n;
 * }
 * ```
 */
export interface IReindexInfo {
    /**
     * Whether the node-level reindex mode is currently enabled. When `false`,
     * the remaining fields are informational only and no reindex action is
     * expected from the plugin.
     *
     * @example
     * ```typescript
     * if (reindexInfo.enabled) {
     *     console.log('Reindex mode is ON');
     * }
     * ```
     */
    readonly enabled: boolean;

    /**
     * The starting block height for the reindex. A value of `0n` indicates a
     * full reindex from the genesis block; any other value means a partial
     * reindex starting at that height.
     *
     * @example
     * ```typescript
     * if (reindexInfo.fromBlock === 0n) {
     *     console.log('Full reindex from genesis');
     * } else {
     *     console.log(`Partial reindex from block ${reindexInfo.fromBlock}`);
     * }
     * ```
     */
    readonly fromBlock: bigint;

    /**
     * Whether the reindex operation is actively running right now. A reindex
     * can be `enabled` but not yet `inProgress` if the node is still preparing.
     *
     * @example
     * ```typescript
     * if (reindexInfo.enabled && !reindexInfo.inProgress) {
     *     console.log('Reindex scheduled but not yet started');
     * }
     * ```
     */
    readonly inProgress: boolean;
}

/**
 * A single block's worth of data delivered to a plugin during the
 * synchronization (catch-up) phase. The host runtime fetches historical blocks
 * and passes them one at a time through the `onSyncBlock` hook.
 *
 * @example Processing sync blocks in a plugin
 * ```typescript
 * import { PluginBase, ISyncBlockData, ISyncProgress } from '@btc-vision/plugin-sdk';
 *
 * export default class IndexerPlugin extends PluginBase {
 *     async onSyncBlock(block: ISyncBlockData, progress: ISyncProgress): Promise<void> {
 *         this.context.logger.info(
 *             `Syncing block ${block.blockHeight} (${block.blockHash}), ` +
 *             `${block.transactions.length} tx(s), ` +
 *             `progress: ${progress.percentage.toFixed(1)}%`,
 *         );
 *
 *         for (const tx of block.transactions) {
 *             await this.processTransaction(tx, block.blockHeight);
 *         }
 *
 *         await this.context.updateLastSyncedBlock(block.blockHeight);
 *     }
 * }
 * ```
 *
 * @example Filtering blocks by timestamp
 * ```typescript
 * import { ISyncBlockData } from '@btc-vision/plugin-sdk';
 *
 * function isAfterDate(block: ISyncBlockData, cutoff: Date): boolean {
 *     return block.timestamp >= cutoff.getTime();
 * }
 * ```
 */
export interface ISyncBlockData {
    /**
     * The height (ordinal position) of this block in the blockchain.
     *
     * @example
     * ```typescript
     * console.log(`Processing block at height ${block.blockHeight}`);
     * ```
     */
    readonly blockHeight: bigint;

    /**
     * The SHA-256d hash of the block header, encoded as a lowercase hex string.
     *
     * @example
     * ```typescript
     * console.log(`Block hash: ${block.blockHash}`);
     * // => "00000000000000000002a7c4c1e48d76c5a37902165a270156b7a8d72f8804c6"
     * ```
     */
    readonly blockHash: string;

    /**
     * Unix timestamp (in seconds) as recorded in the block header. Note that
     * Bitcoin block timestamps are only loosely ordered and may not be
     * monotonically increasing.
     *
     * @example
     * ```typescript
     * const date = new Date(block.timestamp * 1000);
     * console.log(`Block mined at: ${date.toISOString()}`);
     * ```
     */
    readonly timestamp: number;

    /**
     * The transactions contained in this block, in the order they appear in the
     * block's transaction list. May be empty if the block contains only the
     * coinbase transaction and no relevant OPNet activity.
     *
     * @example
     * ```typescript
     * for (const tx of block.transactions) {
     *     console.log(`  tx ${tx.txid} (${tx.size} bytes)`);
     *     if (tx.opnetData) {
     *         console.log('    Contains OPNet contract interaction');
     *     }
     * }
     * ```
     */
    readonly transactions: readonly ISyncTransactionData[];
}

/**
 * A single transaction's data within a sync block. This is a lightweight
 * representation carrying only the fields needed for plugin synchronization.
 *
 * @example Logging transaction details during sync
 * ```typescript
 * import { ISyncTransactionData } from '@btc-vision/plugin-sdk';
 *
 * function logTransaction(tx: ISyncTransactionData): void {
 *     console.log(`txid: ${tx.txid}`);
 *     console.log(`hash: ${tx.hash}`);
 *     console.log(`size: ${tx.size} bytes`);
 *     if (tx.opnetData) {
 *         console.log('Contains OPNet data:', tx.opnetData);
 *     }
 * }
 * ```
 *
 * @example Filtering for OPNet-specific transactions
 * ```typescript
 * import { ISyncTransactionData } from '@btc-vision/plugin-sdk';
 *
 * function filterOpnetTxs(
 *     txs: readonly ISyncTransactionData[],
 * ): ISyncTransactionData[] {
 *     return txs.filter((tx) => tx.opnetData !== undefined);
 * }
 * ```
 */
export interface ISyncTransactionData {
    /**
     * The transaction identifier -- the double-SHA-256 hash of the serialized
     * transaction in internal byte order (little-endian), encoded as a hex
     * string. For non-segwit transactions this is identical to {@link hash}.
     *
     * @example
     * ```typescript
     * console.log(`Transaction ID: ${tx.txid}`);
     * ```
     */
    readonly txid: string;

    /**
     * The witness transaction identifier. For segwit transactions this differs
     * from {@link txid} because it includes witness data in the hash. For
     * legacy transactions it is the same as `txid`.
     *
     * @example
     * ```typescript
     * if (tx.hash !== tx.txid) {
     *     console.log('Segwit transaction detected');
     * }
     * ```
     */
    readonly hash: string;

    /**
     * The fully serialized transaction in hexadecimal encoding. This can be
     * decoded to extract inputs, outputs, scripts, and witness data.
     *
     * @example
     * ```typescript
     * console.log(`Raw hex (first 40 chars): ${tx.hex.substring(0, 40)}...`);
     * ```
     */
    readonly hex: string;

    /**
     * The size of the serialized transaction in bytes (virtual size for segwit
     * transactions).
     *
     * @example
     * ```typescript
     * if (tx.size > 100_000) {
     *     console.log('Large transaction detected');
     * }
     * ```
     */
    readonly size: number;

    /**
     * Decoded OPNet smart-contract interaction data embedded in this
     * transaction, if any. The structure of this payload is determined by the
     * specific OPNet contract being invoked. When `undefined`, the transaction
     * does not contain any OPNet contract calls.
     *
     * @example
     * ```typescript
     * if (tx.opnetData) {
     *     console.log('OPNet contract data:', JSON.stringify(tx.opnetData));
     * }
     * ```
     */
    readonly opnetData?: unknown;
}

/**
 * Real-time progress information emitted during the synchronization phase.
 * The host runtime delivers this alongside each block via the `onSyncBlock`
 * hook so the plugin can report or log its catch-up progress.
 *
 * @example Logging sync progress
 * ```typescript
 * import { PluginBase, ISyncBlockData, ISyncProgress } from '@btc-vision/plugin-sdk';
 *
 * export default class MyPlugin extends PluginBase {
 *     async onSyncBlock(block: ISyncBlockData, progress: ISyncProgress): Promise<void> {
 *         this.context.logger.info(
 *             `Sync: block ${progress.currentBlock}/${progress.targetBlock} ` +
 *             `(${progress.percentage.toFixed(1)}%)` +
 *             (progress.estimatedTimeRemaining
 *                 ? ` ~${progress.estimatedTimeRemaining}s remaining`
 *                 : ''),
 *         );
 *     }
 * }
 * ```
 *
 * @example Building a progress bar string
 * ```typescript
 * import { ISyncProgress } from '@btc-vision/plugin-sdk';
 *
 * function progressBar(progress: ISyncProgress, width: number = 40): string {
 *     const filled = Math.round((progress.percentage / 100) * width);
 *     const empty = width - filled;
 *     const bar = '#'.repeat(filled) + '-'.repeat(empty);
 *     const rate = progress.blocksPerSecond?.toFixed(1) ?? '?';
 *     return `[${bar}] ${progress.percentage.toFixed(1)}% (${rate} blk/s)`;
 * }
 * ```
 */
export interface ISyncProgress {
    /**
     * The height of the block currently being processed in the sync pipeline.
     *
     * @example
     * ```typescript
     * console.log(`Now processing block ${progress.currentBlock}`);
     * ```
     */
    readonly currentBlock: bigint;

    /**
     * The chain-tip height that the sync pipeline is aiming to reach. Once
     * {@link currentBlock} equals this value the sync is complete.
     *
     * @example
     * ```typescript
     * const remaining = progress.targetBlock - progress.currentBlock;
     * console.log(`${remaining} blocks remaining`);
     * ```
     */
    readonly targetBlock: bigint;

    /**
     * Completion percentage as a floating-point number in the range `0` to
     * `100`. This is computed as
     * `(currentBlock - startBlock) / (targetBlock - startBlock) * 100`.
     *
     * @example
     * ```typescript
     * if (progress.percentage >= 99.9) {
     *     console.log('Sync nearly complete!');
     * }
     * ```
     */
    readonly percentage: number;

    /**
     * Estimated number of seconds until the sync pipeline reaches the target
     * block, based on the current processing rate. May be `undefined` when the
     * rate has not yet been established (e.g. during the first batch).
     *
     * @example
     * ```typescript
     * if (progress.estimatedTimeRemaining !== undefined) {
     *     const minutes = Math.ceil(progress.estimatedTimeRemaining / 60);
     *     console.log(`ETA: ~${minutes} minute(s)`);
     * }
     * ```
     */
    readonly estimatedTimeRemaining?: number;

    /**
     * The current processing throughput measured in blocks per second. May be
     * `undefined` when insufficient data is available for a reliable estimate.
     *
     * @example
     * ```typescript
     * if (progress.blocksPerSecond !== undefined) {
     *     console.log(`Throughput: ${progress.blocksPerSecond.toFixed(2)} blk/s`);
     * }
     * ```
     */
    readonly blocksPerSecond?: number;
}

/**
 * Configuration options that control how the sync pipeline fetches and
 * delivers historical blocks to a plugin during catch-up. Plugin authors can
 * provide these options to fine-tune performance characteristics.
 *
 * @example Using default sync options
 * ```typescript
 * import { ISyncOptions } from '@btc-vision/plugin-sdk';
 *
 * // All fields are optional; omitted fields use sensible defaults
 * const defaults: ISyncOptions = {};
 * ```
 *
 * @example Custom sync configuration for a high-throughput plugin
 * ```typescript
 * import { ISyncOptions } from '@btc-vision/plugin-sdk';
 *
 * const syncOpts: ISyncOptions = {
 *     fromBlock: 800_000n,
 *     toBlock: 850_000n,
 *     batchSize: 500,
 *     emitProgress: true,
 *     blockTimeoutMs: 60_000,
 * };
 * ```
 *
 * @example Syncing only the most recent 1000 blocks
 * ```typescript
 * import { ISyncOptions, INetworkInfo } from '@btc-vision/plugin-sdk';
 *
 * function recentSyncOptions(network: INetworkInfo): ISyncOptions {
 *     const tip = network.currentBlockHeight;
 *     return {
 *         fromBlock: tip - 1000n,
 *         toBlock: tip,
 *         batchSize: 200,
 *     };
 * }
 * ```
 */
export interface ISyncOptions {
    /**
     * The block height at which the sync pipeline should begin fetching blocks.
     * When omitted, defaults to the plugin's `enabledAtBlock` value.
     *
     * @defaultValue The plugin's `enabledAtBlock`
     *
     * @example
     * ```typescript
     * const opts: ISyncOptions = { fromBlock: 800_000n };
     * ```
     */
    readonly fromBlock?: bigint;

    /**
     * The block height at which the sync pipeline should stop. When omitted,
     * defaults to the current chain tip at the time sync begins.
     *
     * @defaultValue Current chain tip
     *
     * @example
     * ```typescript
     * const opts: ISyncOptions = { toBlock: 850_000n };
     * ```
     */
    readonly toBlock?: bigint;

    /**
     * The number of blocks to fetch in each batch during synchronization.
     * Larger batches reduce RPC round-trips but consume more memory.
     *
     * @defaultValue 100
     *
     * @example
     * ```typescript
     * // Fetch 500 blocks at a time for faster throughput
     * const opts: ISyncOptions = { batchSize: 500 };
     * ```
     */
    readonly batchSize?: number;

    /**
     * Whether the host runtime should emit {@link ISyncProgress} events
     * alongside each block delivery. Set to `false` to reduce overhead when
     * progress reporting is not needed.
     *
     * @defaultValue true
     *
     * @example
     * ```typescript
     * // Disable progress events for silent sync
     * const opts: ISyncOptions = { emitProgress: false };
     * ```
     */
    readonly emitProgress?: boolean;

    /**
     * Maximum time in milliseconds that the sync pipeline will wait for a
     * single block to be processed before considering it timed out.
     *
     * @defaultValue 30000
     *
     * @example
     * ```typescript
     * // Allow up to 60 seconds per block for heavy processing
     * const opts: ISyncOptions = { blockTimeoutMs: 60_000 };
     * ```
     */
    readonly blockTimeoutMs?: number;
}

/**
 * Enumeration of the possible synchronization states a plugin can be in
 * relative to the blockchain tip.
 *
 * The host runtime evaluates the plugin's {@link IPluginInstallState} against
 * the current chain height to determine the appropriate status value.
 *
 * @example Checking sync status in a plugin
 * ```typescript
 * import { PluginBase, IPluginContext, PluginSyncStatus } from '@btc-vision/plugin-sdk';
 *
 * export default class MyPlugin extends PluginBase {
 *     async onLoad(context: IPluginContext): Promise<void> {
 *         await super.onLoad(context);
 *
 *         const syncCheck = context.getSyncStatus();
 *         if (syncCheck.status === PluginSyncStatus.SYNCED) {
 *             this.context.logger.info('Plugin is fully synced');
 *         } else {
 *             this.context.logger.info(`Plugin status: ${syncCheck.status}`);
 *         }
 *     }
 * }
 * ```
 *
 * @example Using the enum in a switch statement
 * ```typescript
 * import { PluginSyncStatus } from '@btc-vision/plugin-sdk';
 *
 * function describeStatus(status: PluginSyncStatus): string {
 *     switch (status) {
 *         case PluginSyncStatus.SYNCED:       return 'Up to date';
 *         case PluginSyncStatus.BEHIND:       return 'Behind chain tip';
 *         case PluginSyncStatus.SYNCING:      return 'Currently syncing';
 *         case PluginSyncStatus.FAILED:       return 'Sync failed';
 *         case PluginSyncStatus.NEVER_SYNCED: return 'Never synced (new install)';
 *     }
 * }
 * ```
 */
export enum PluginSyncStatus {
    /**
     * The plugin has processed all blocks up to the current chain tip and is
     * receiving new blocks in real time via the `onBlockChange` hook.
     *
     * @example
     * ```typescript
     * if (syncCheck.status === PluginSyncStatus.SYNCED) {
     *     console.log('Plugin is fully caught up');
     * }
     * ```
     */
    SYNCED = 'synced',

    /**
     * The plugin's last-synced block is behind the current chain tip. The host
     * runtime will trigger the sync pipeline to catch the plugin up before
     * entering real-time mode.
     *
     * @example
     * ```typescript
     * if (syncCheck.status === PluginSyncStatus.BEHIND) {
     *     console.log(`Plugin is ${syncCheck.blocksBehind} blocks behind`);
     * }
     * ```
     */
    BEHIND = 'behind',

    /**
     * The plugin's sync pipeline is actively running and processing historical
     * blocks. The plugin is receiving blocks via the `onSyncBlock` hook.
     *
     * @example
     * ```typescript
     * if (syncCheck.status === PluginSyncStatus.SYNCING) {
     *     console.log('Sync in progress, please wait...');
     * }
     * ```
     */
    SYNCING = 'syncing',

    /**
     * The most recent sync attempt encountered an error and did not complete
     * successfully. The plugin may need manual intervention or a restart.
     *
     * @example
     * ```typescript
     * if (syncCheck.status === PluginSyncStatus.FAILED) {
     *     console.error('Sync failed! Check logs for details.');
     * }
     * ```
     */
    FAILED = 'failed',

    /**
     * The plugin has been installed but has never completed (or even started)
     * a sync. This is the initial state after first installation.
     *
     * @example
     * ```typescript
     * if (syncCheck.status === PluginSyncStatus.NEVER_SYNCED) {
     *     console.log('First run -- full sync required');
     * }
     * ```
     */
    NEVER_SYNCED = 'never_synced',
}

/**
 * The result of evaluating a plugin's synchronization status against the
 * current state of the blockchain. The host runtime computes this and
 * provides it through {@link IPluginContext.getSyncStatus}.
 *
 * @example Inspecting sync status in a plugin
 * ```typescript
 * import { PluginBase, IPluginContext, PluginSyncStatus } from '@btc-vision/plugin-sdk';
 *
 * export default class MyPlugin extends PluginBase {
 *     async onLoad(context: IPluginContext): Promise<void> {
 *         await super.onLoad(context);
 *
 *         const check = context.getSyncStatus();
 *         this.context.logger.info(
 *             `Status: ${check.status}, ` +
 *             `last synced: ${check.lastSyncedBlock}, ` +
 *             `chain tip: ${check.chainTip}, ` +
 *             `behind: ${check.blocksBehind}`,
 *         );
 *
 *         if (check.requiresSync) {
 *             this.context.logger.info('Sync will begin shortly...');
 *         }
 *     }
 * }
 * ```
 *
 * @example Deciding whether to defer plugin startup
 * ```typescript
 * import { IPluginSyncCheck, PluginSyncStatus } from '@btc-vision/plugin-sdk';
 *
 * function shouldDeferStartup(check: IPluginSyncCheck): boolean {
 *     return (
 *         check.requiresSync &&
 *         check.blocksBehind > 1000n &&
 *         check.status !== PluginSyncStatus.SYNCING
 *     );
 * }
 * ```
 */
export interface IPluginSyncCheck {
    /**
     * The current high-level sync status of the plugin.
     *
     * @example
     * ```typescript
     * console.log(`Current status: ${check.status}`);
     * ```
     */
    readonly status: PluginSyncStatus;

    /**
     * The height of the last block the plugin has fully processed.
     *
     * @example
     * ```typescript
     * console.log(`Last synced block: ${check.lastSyncedBlock}`);
     * ```
     */
    readonly lastSyncedBlock: bigint;

    /**
     * The current height of the blockchain's most recent block as known by the
     * node.
     *
     * @example
     * ```typescript
     * console.log(`Chain tip: ${check.chainTip}`);
     * ```
     */
    readonly chainTip: bigint;

    /**
     * The number of blocks between the plugin's last-synced block and the
     * chain tip. Computed as `chainTip - lastSyncedBlock`. A value of `0n`
     * means the plugin is fully caught up.
     *
     * @example
     * ```typescript
     * if (check.blocksBehind > 0n) {
     *     console.log(`Need to process ${check.blocksBehind} more block(s)`);
     * }
     * ```
     */
    readonly blocksBehind: bigint;

    /**
     * Whether the plugin must go through the sync pipeline before it can
     * participate in real-time block processing. When `true`, the host runtime
     * will invoke the `onSyncRequired` hook.
     *
     * @example
     * ```typescript
     * if (check.requiresSync) {
     *     console.log('Sync pipeline will be started');
     * }
     * ```
     */
    readonly requiresSync: boolean;

    /**
     * If the node is in reindex mode, this field contains the result of
     * evaluating whether this plugin needs to take reindex-related actions
     * (purge data, re-sync, or both). `undefined` when no reindex is active.
     *
     * @example
     * ```typescript
     * if (check.reindexCheck) {
     *     console.log(`Reindex action: ${check.reindexCheck.action}`);
     *     if (check.reindexCheck.requiresPurge) {
     *         console.log(`Purge to block: ${check.reindexCheck.purgeToBlock}`);
     *     }
     * }
     * ```
     */
    readonly reindexCheck?: IReindexCheck;
}

/**
 * Enumeration of possible actions a plugin must take in response to a
 * node-level reindex operation. The host runtime determines the appropriate
 * action by comparing the plugin's last-synced block against the reindex
 * starting block.
 *
 * @example Handling reindex actions in a plugin
 * ```typescript
 * import { PluginBase, IReindexCheck, ReindexAction } from '@btc-vision/plugin-sdk';
 *
 * export default class MyPlugin extends PluginBase {
 *     async onReindexRequired(check: IReindexCheck): Promise<boolean> {
 *         switch (check.action) {
 *             case ReindexAction.NONE:
 *                 this.context.logger.info('No reindex action needed');
 *                 break;
 *             case ReindexAction.PURGE:
 *                 this.context.logger.info(`Purging data to block ${check.purgeToBlock}`);
 *                 await this.purgeDataTo(check.purgeToBlock!);
 *                 break;
 *             case ReindexAction.SYNC:
 *                 this.context.logger.info(`Will re-sync from block ${check.syncFromBlock}`);
 *                 break;
 *             case ReindexAction.RESET:
 *                 this.context.logger.info('Full reset: purge + re-sync');
 *                 await this.purgeDataTo(check.purgeToBlock!);
 *                 break;
 *         }
 *         return true;
 *     }
 * }
 * ```
 *
 * @example Mapping actions to human-readable descriptions
 * ```typescript
 * import { ReindexAction } from '@btc-vision/plugin-sdk';
 *
 * const ACTION_LABELS: Record<ReindexAction, string> = {
 *     [ReindexAction.NONE]:  'No action required',
 *     [ReindexAction.PURGE]: 'Data purge required',
 *     [ReindexAction.SYNC]:  'Re-sync required',
 *     [ReindexAction.RESET]: 'Full reset (purge + re-sync)',
 * };
 * ```
 */
export enum ReindexAction {
    /**
     * No action is required from the plugin. The plugin's data is already
     * compatible with the reindex range -- typically because the plugin's
     * last-synced block is at or before the reindex starting block.
     *
     * @example
     * ```typescript
     * if (check.action === ReindexAction.NONE) {
     *     console.log('Plugin data is already consistent');
     * }
     * ```
     */
    NONE = 'none',

    /**
     * The plugin must delete (purge) all data it has stored for blocks beyond
     * the reindex starting point. After purging, the node will re-deliver those
     * blocks through the sync pipeline.
     *
     * @example
     * ```typescript
     * if (check.action === ReindexAction.PURGE) {
     *     await db.deleteBlocksAfter(check.purgeToBlock!);
     * }
     * ```
     */
    PURGE = 'purge',

    /**
     * The plugin needs to sync (re-process) blocks starting from the reindex
     * block. No purge is necessary because the plugin has not yet processed
     * those blocks.
     *
     * @example
     * ```typescript
     * if (check.action === ReindexAction.SYNC) {
     *     console.log(`Will sync from ${check.syncFromBlock} to ${check.syncToBlock}`);
     * }
     * ```
     */
    SYNC = 'sync',

    /**
     * The plugin needs a full reset: first purge all data back to the reindex
     * block, then sync forward from that point. This is the most disruptive
     * action and typically happens when the plugin has data spanning both sides
     * of the reindex boundary.
     *
     * @example
     * ```typescript
     * if (check.action === ReindexAction.RESET) {
     *     await db.dropAllCollections();
     *     console.log('Full reset -- will re-sync from scratch');
     * }
     * ```
     */
    RESET = 'reset',
}

/**
 * Detailed result of evaluating what actions a specific plugin must take in
 * response to a node-level reindex. The host runtime computes this by
 * comparing the plugin's {@link IPluginInstallState.lastSyncedBlock} against
 * the reindex starting block, and delivers it through the `onReindexRequired`
 * hook and {@link IPluginContext.getReindexCheck}.
 *
 * @example Handling a reindex check in a plugin
 * ```typescript
 * import { PluginBase, IReindexCheck, ReindexAction } from '@btc-vision/plugin-sdk';
 *
 * export default class MyPlugin extends PluginBase {
 *     async onReindexRequired(check: IReindexCheck): Promise<boolean> {
 *         if (!check.reindexEnabled) {
 *             return true; // Nothing to do
 *         }
 *
 *         this.context.logger.info(
 *             `Reindex from block ${check.reindexFromBlock}, ` +
 *             `plugin last at ${check.pluginLastSyncedBlock}, ` +
 *             `action: ${check.action}`,
 *         );
 *
 *         if (check.requiresPurge && check.purgeToBlock !== undefined) {
 *             await this.purgeCollectionsToBlock(check.purgeToBlock);
 *             await this.context.resetSyncStateToBlock(check.purgeToBlock);
 *         }
 *
 *         return true; // Signal that reindex was handled
 *     }
 * }
 * ```
 *
 * @example Logging a complete reindex check
 * ```typescript
 * import { IReindexCheck } from '@btc-vision/plugin-sdk';
 *
 * function logReindexCheck(check: IReindexCheck): void {
 *     console.log('=== Reindex Check ===');
 *     console.log(`  Enabled:         ${check.reindexEnabled}`);
 *     console.log(`  From block:      ${check.reindexFromBlock}`);
 *     console.log(`  Plugin last at:  ${check.pluginLastSyncedBlock}`);
 *     console.log(`  Action:          ${check.action}`);
 *     console.log(`  Requires purge:  ${check.requiresPurge}`);
 *     console.log(`  Purge to block:  ${check.purgeToBlock ?? 'N/A'}`);
 *     console.log(`  Requires sync:   ${check.requiresSync}`);
 *     console.log(`  Sync from block: ${check.syncFromBlock ?? 'N/A'}`);
 *     console.log(`  Sync to block:   ${check.syncToBlock ?? 'N/A'}`);
 * }
 * ```
 */
export interface IReindexCheck {
    /**
     * Whether the node-level reindex mode is currently enabled. When `false`,
     * the rest of the check is informational and no action is needed.
     *
     * @example
     * ```typescript
     * if (!check.reindexEnabled) {
     *     console.log('Reindex not active, nothing to do');
     *     return;
     * }
     * ```
     */
    readonly reindexEnabled: boolean;

    /**
     * The block height from which the node is reindexing. All plugin data for
     * blocks at or after this height may need to be purged and re-processed.
     *
     * @example
     * ```typescript
     * console.log(`Node reindexing from block ${check.reindexFromBlock}`);
     * ```
     */
    readonly reindexFromBlock: bigint;

    /**
     * The height of the last block the plugin had processed before the reindex
     * check was performed. Used in conjunction with {@link reindexFromBlock} to
     * determine the required action.
     *
     * @example
     * ```typescript
     * if (check.pluginLastSyncedBlock > check.reindexFromBlock) {
     *     console.log('Plugin has data that needs to be purged');
     * }
     * ```
     */
    readonly pluginLastSyncedBlock: bigint;

    /**
     * The computed action the plugin must take. See {@link ReindexAction} for
     * the possible values and their meanings.
     *
     * @example
     * ```typescript
     * console.log(`Required action: ${check.action}`);
     * // => "Required action: purge"
     * ```
     */
    readonly action: ReindexAction;

    /**
     * Whether the plugin's persisted data must be purged (deleted) for blocks
     * beyond the reindex boundary. When `true`, the plugin should delete all
     * data for blocks after {@link purgeToBlock}.
     *
     * @example
     * ```typescript
     * if (check.requiresPurge) {
     *     await db.deleteDocuments('events', {
     *         blockHeight: { $gt: check.purgeToBlock! },
     *     });
     * }
     * ```
     */
    readonly requiresPurge: boolean;

    /**
     * The block height to which data should be purged (inclusive). All plugin
     * data for blocks **after** this height should be deleted. Only meaningful
     * when {@link requiresPurge} is `true`.
     *
     * @example
     * ```typescript
     * if (check.requiresPurge && check.purgeToBlock !== undefined) {
     *     console.log(`Deleting all data after block ${check.purgeToBlock}`);
     * }
     * ```
     */
    readonly purgeToBlock?: bigint;

    /**
     * Whether the plugin needs to re-sync (re-process blocks) after the
     * reindex purge is complete. When `true`, the sync pipeline will deliver
     * blocks from {@link syncFromBlock} to {@link syncToBlock}.
     *
     * @example
     * ```typescript
     * if (check.requiresSync) {
     *     console.log(
     *         `Will re-sync blocks ${check.syncFromBlock} to ${check.syncToBlock}`,
     *     );
     * }
     * ```
     */
    readonly requiresSync: boolean;

    /**
     * The block height from which the plugin should begin re-syncing. Only
     * meaningful when {@link requiresSync} is `true`.
     *
     * @example
     * ```typescript
     * if (check.requiresSync && check.syncFromBlock !== undefined) {
     *     console.log(`Sync will start at block ${check.syncFromBlock}`);
     * }
     * ```
     */
    readonly syncFromBlock?: bigint;

    /**
     * The target block height the re-sync should reach. Typically this equals
     * the reindex target block or the current chain tip. Only meaningful when
     * {@link requiresSync} is `true`.
     *
     * @example
     * ```typescript
     * if (check.requiresSync && check.syncToBlock !== undefined) {
     *     const blocksToSync = check.syncToBlock - (check.syncFromBlock ?? 0n);
     *     console.log(`Need to re-sync ${blocksToSync} block(s)`);
     * }
     * ```
     */
    readonly syncToBlock?: bigint;
}
