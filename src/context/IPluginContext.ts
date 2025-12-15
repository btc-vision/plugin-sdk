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

/**
 * Plugin context interface
 * This is the main API surface available to plugins
 */
export interface IPluginContext {
    /** Plugin name */
    readonly name: string;

    /** Plugin version */
    readonly version: string;

    /** Plugin data directory */
    readonly dataDir: string;

    /** Plugin permissions */
    readonly permissions: IPluginPermissions;

    /** Network information */
    readonly network: INetworkInfo;

    /** Database API (if permitted) */
    readonly db?: IPluginDatabaseAPI;

    /** Filesystem API */
    readonly fs: IPluginFilesystemAPI;

    /** Logger */
    readonly logger: IPluginLogger;

    /** Configuration */
    readonly config: IPluginConfig;

    /** Whether this is the first installation of this plugin */
    readonly isFirstInstall: boolean;

    /** Block height when plugin was enabled (0 = from genesis) */
    readonly enabledAtBlock: bigint;

    /**
     * Get another plugin instance for inter-plugin communication
     * Only works for library plugins that the current plugin depends on
     * @param name - Plugin name
     * @returns Plugin instance or undefined
     */
    getPlugin<T extends IPlugin>(name: string): T | undefined;

    /**
     * Emit an event to other plugins
     * @param event - Event name
     * @param data - Event data
     */
    emit(event: string, data: unknown): void;

    /**
     * Subscribe to events from other plugins
     * @param event - Event name
     * @param handler - Event handler
     */
    on(event: string, handler: EventHandler): void;

    /**
     * Unsubscribe from events
     * @param event - Event name
     * @param handler - Event handler to remove
     */
    off(event: string, handler: EventHandler): void;

    /**
     * Create a worker thread (if threading permission granted)
     * @param script - Worker script path
     * @returns Worker instance
     * @throws Error if threading permission not granted
     */
    createWorker(script: string): IPluginWorker;

    /**
     * Get the current chain block height
     * @returns Current block height
     */
    getCurrentBlockHeight(): bigint;

    /**
     * Get the plugin's sync state
     * @returns Sync state or undefined if not installed
     */
    getSyncState(): IPluginInstallState | undefined;

    /**
     * Get the last block the plugin processed
     * @returns Last synced block height
     */
    getLastSyncedBlock(): bigint;

    /**
     * Check if the plugin is synced with the chain
     * @returns True if synced
     */
    isSynced(): boolean;

    /**
     * Get sync status information
     * @returns Sync check result
     */
    getSyncStatus(): IPluginSyncCheck;

    /**
     * Update the last synced block
     * Call this after processing a block to track sync progress
     * @param blockHeight - Block height that was processed
     */
    updateLastSyncedBlock(blockHeight: bigint): Promise<void>;

    /**
     * Mark sync as completed
     */
    markSyncCompleted(): Promise<void>;

    /**
     * Check if reindex mode is enabled
     * @returns True if reindex mode is enabled
     */
    isReindexEnabled(): boolean;

    /**
     * Get reindex information (if enabled)
     * @returns Reindex info or undefined
     */
    getReindexInfo(): IReindexInfo | undefined;

    /**
     * Get the reindex target block (block to reindex from)
     * @returns Reindex from block or undefined if not enabled
     */
    getReindexFromBlock(): bigint | undefined;

    /**
     * Check what reindex action is required for this plugin
     * This determines whether the plugin needs to purge data, sync, or both
     * @returns Reindex check result or undefined if reindex not enabled
     */
    getReindexCheck(): IReindexCheck | undefined;

    /**
     * Check if the plugin requires reindex handling before startup
     * @returns True if reindex handling required
     */
    requiresReindexHandling(): boolean;

    /**
     * Reset the plugin's sync state after a purge
     * This should be called after onPurgeBlocks to update the last synced block
     * @param blockHeight - Block height to reset to
     */
    resetSyncStateToBlock(blockHeight: bigint): Promise<void>;
}
