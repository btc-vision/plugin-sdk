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
 * Main plugin interface that all plugins must implement
 */
export interface IPlugin {
    /**
     * Called when the plugin is loaded
     * Use this to initialize resources, connect to databases, etc.
     * @param context - Plugin context with APIs and configuration
     */
    onLoad?(context: IPluginContext): Promise<void>;

    /**
     * Called when the plugin is being unloaded
     * Use this to clean up resources, close connections, etc.
     */
    onUnload?(): Promise<void>;

    /**
     * Called when the plugin is enabled
     * Plugin may be loaded but disabled, this is called when it becomes active
     */
    onEnable?(): Promise<void>;

    /**
     * Called when the plugin is disabled
     * Plugin remains loaded but stops receiving hooks
     */
    onDisable?(): Promise<void>;

    /**
     * Called when the plugin is installed for the first time on this node
     * Use this for one-time setup like creating indexes, initial state, etc.
     * This is called BEFORE onLoad on first installation
     *
     * @param networkInfo - Network and chain information
     */
    onFirstInstall?(networkInfo: INetworkInfo): Promise<void>;

    /**
     * Called on every plugin load with network information
     * Use this to verify the plugin is running on the expected network
     * and to initialize network-specific configuration
     *
     * @param networkInfo - Network and chain information
     */
    onNetworkInit?(networkInfo: INetworkInfo): Promise<void>;

    /**
     * Called when the plugin needs to sync/catch-up with the chain
     * This is a BLOCKING hook - the indexer will not start until sync completes
     * Return true to perform sync, false to skip (if plugin handles its own sync)
     *
     * @param syncCheck - Sync status and block information
     * @returns Whether the plugin wants the system to perform sync
     */
    onSyncRequired?(syncCheck: IPluginSyncCheck): Promise<boolean>;

    /**
     * Called for each block during sync/catch-up
     * Plugins should process the block data and update their state
     * This is called sequentially from enabledAtBlock to current tip
     *
     * @param block - Block data with transactions
     * @param progress - Current sync progress
     */
    onSyncBlock?(block: ISyncBlockData, progress: ISyncProgress): Promise<void>;

    /**
     * Called when sync is complete
     * Use this to finalize any sync-related state
     *
     * @param finalBlock - The final block that was synced
     */
    onSyncComplete?(finalBlock: bigint): Promise<void>;

    /**
     * Called before a block is processed with raw Bitcoin block data
     * Receives full block data including all transactions from Bitcoin RPC
     * Requires blocks.preProcess permission
     *
     * @param block - Raw Bitcoin block data
     */
    onBlockPreProcess?(block: IBlockData): Promise<void>;

    /**
     * Called after a block is processed with OPNet processed data
     * Receives block data with checksums, merkle roots, and OPNet state
     * Requires blocks.postProcess permission
     *
     * @param block - Processed block data with OPNet information
     */
    onBlockPostProcess?(block: IBlockProcessedData): Promise<void>;

    /**
     * Called when a new block is confirmed with OPNet processed data
     * Requires blocks.onChange permission
     *
     * @param block - Processed block data
     */
    onBlockChange?(block: IBlockProcessedData): Promise<void>;

    /**
     * Called when the epoch number changes
     * Requires epochs.onChange permission
     *
     * @param epoch - Epoch data
     */
    onEpochChange?(epoch: IEpochData): Promise<void>;

    /**
     * Called when an epoch is finalized (merkle tree complete)
     * Requires epochs.onFinalized permission
     *
     * @param epoch - Finalized epoch data
     */
    onEpochFinalized?(epoch: IEpochData): Promise<void>;

    /**
     * Called when a new transaction enters the mempool
     * Requires mempool.txFeed permission
     *
     * @param tx - Mempool transaction data
     */
    onMempoolTransaction?(tx: IMempoolTransaction): Promise<void>;

    /**
     * Called when the blockchain reorgs (CRITICAL - BLOCKING)
     * Plugins MUST revert any state they have stored for blocks >= fromBlock
     * This hook is called synchronously and blocks the indexer until all plugins complete
     * Failure to properly handle reorgs will result in data inconsistency
     *
     * @param reorg - Reorg information including affected block range
     */
    onReorg?(reorg: IReorgData): Promise<void>;

    /**
     * Called when a reindex is required (CRITICAL - BLOCKING)
     * This is called at startup when:
     * - Config has REINDEX=true
     * - Plugin's lastSyncedBlock > reindexFromBlock (data must be purged)
     * - Plugin's lastSyncedBlock < reindexFromBlock (sync required)
     *
     * The plugin MUST handle this to maintain data consistency:
     * - If requiresPurge is true: Delete all data for blocks > reindexFromBlock
     * - After purge (or if not needed): Plugin will sync from reindexFromBlock
     *
     * This hook blocks the indexer until all plugins complete their reindex handling.
     * Return true if the plugin handled the reindex successfully.
     * Return false to abort startup (plugin cannot handle reindex).
     *
     * @param reindexCheck - Reindex requirements and actions
     * @returns True if handled successfully, false to abort
     */
    onReindexRequired?(reindexCheck: IReindexCheck): Promise<boolean>;

    /**
     * Called to purge plugin data for a block range (during reindex or reorg)
     * Plugins should delete all data stored for blocks in the range [fromBlock, toBlock]
     * This is called before sync to ensure clean state
     *
     * @param fromBlock - Start block to purge (inclusive)
     * @param toBlock - End block to purge (inclusive, or undefined for all blocks >= fromBlock)
     */
    onPurgeBlocks?(fromBlock: bigint, toBlock?: bigint): Promise<void>;

    /**
     * Called to register HTTP routes
     * Requires api.addEndpoints permission
     *
     * @param router - Router interface for registering routes
     */
    registerRoutes?(router: IPluginRouter): void;

    /**
     * Called to register WebSocket handlers
     * Requires api.addWebsocket permission
     *
     * @param ws - WebSocket interface for registering handlers
     */
    registerWebSocketHandlers?(ws: IPluginWebSocket): void;
}

/**
 * Plugin constructor type
 */
export type PluginConstructor = new () => IPlugin;

/**
 * Plugin module export structure
 */
export interface IPluginModule {
    default: PluginConstructor;
}
