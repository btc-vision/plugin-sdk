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
 * Abstract base class for plugins
 * Provides no-op default implementations for all hooks
 * Plugin authors can extend this and override only the hooks they need
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
     * Plugin context - available after onLoad is called
     */
    protected context!: IPluginContext;

    /**
     * Called when the plugin is loaded
     * Override this to initialize resources
     * Always call super.onLoad(context) first
     */
    onLoad(context: IPluginContext): Promise<void> {
        this.context = context;
        return Promise.resolve();
    }

    /**
     * Called when the plugin is being unloaded
     * Override this to clean up resources
     */
    async onUnload(): Promise<void> {
        // No-op default
    }

    /**
     * Called when the plugin is enabled
     */
    async onEnable(): Promise<void> {
        // No-op default
    }

    /**
     * Called when the plugin is disabled
     */
    async onDisable(): Promise<void> {
        // No-op default
    }

    /**
     * Called when the plugin is installed for the first time
     */
    async onFirstInstall(_networkInfo: INetworkInfo): Promise<void> {
        // No-op default
    }

    /**
     * Called on every plugin load with network information
     */
    async onNetworkInit(_networkInfo: INetworkInfo): Promise<void> {
        // No-op default
    }

    /**
     * Called when the plugin needs to sync/catch-up
     * Default returns true to let the system handle sync
     */
    onSyncRequired(_syncCheck: IPluginSyncCheck): Promise<boolean> {
        return Promise.resolve(true);
    }

    /**
     * Called for each block during sync
     */
    async onSyncBlock(_block: ISyncBlockData, _progress: ISyncProgress): Promise<void> {
        // No-op default
    }

    /**
     * Called when sync is complete
     */
    async onSyncComplete(_finalBlock: bigint): Promise<void> {
        // No-op default
    }

    /**
     * Called before a block is processed (raw Bitcoin data)
     */
    async onBlockPreProcess(_block: IBlockData): Promise<void> {
        // No-op default
    }

    /**
     * Called after a block is processed (OPNet data)
     */
    async onBlockPostProcess(_block: IBlockProcessedData): Promise<void> {
        // No-op default
    }

    /**
     * Called when a new block is confirmed
     */
    async onBlockChange(_block: IBlockProcessedData): Promise<void> {
        // No-op default
    }

    /**
     * Called when the epoch changes
     */
    async onEpochChange(_epoch: IEpochData): Promise<void> {
        // No-op default
    }

    /**
     * Called when an epoch is finalized
     */
    async onEpochFinalized(_epoch: IEpochData): Promise<void> {
        // No-op default
    }

    /**
     * Called when a transaction enters the mempool
     */
    async onMempoolTransaction(_tx: IMempoolTransaction): Promise<void> {
        // No-op default
    }

    /**
     * Called when a reorg occurs - MUST be overridden if plugin stores block data
     * Default implementation logs a warning
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
     * Called when reindex is required
     * Default returns true (handled successfully)
     */
    onReindexRequired(_reindexCheck: IReindexCheck): Promise<boolean> {
        return Promise.resolve(true);
    }

    /**
     * Called to purge blocks during reindex or reorg
     */
    async onPurgeBlocks(_fromBlock: bigint, _toBlock?: bigint): Promise<void> {
        // No-op default
    }

    /**
     * Called to register HTTP routes
     */
    registerRoutes(_router: IPluginRouter): void {
        // No-op default
    }

    /**
     * Called to register WebSocket handlers
     */
    registerWebSocketHandlers(_ws: IPluginWebSocket): void {
        // No-op default
    }
}
