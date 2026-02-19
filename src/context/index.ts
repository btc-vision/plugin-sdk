/**
 * Plugin context interfaces providing the runtime API surface.
 *
 * Exports the main {@link IPluginContext} and all sub-APIs: database
 * storage, blockchain queries, sandboxed filesystem, logging,
 * configuration, and worker thread management.
 *
 * @packageDocumentation
 */

// Context interfaces
export { IPluginContext } from './IPluginContext.js';
export { IPluginDatabaseAPI, IPluginCollection, IPluginCursor } from './IPluginDatabaseAPI.js';
export { IPluginFilesystemAPI } from './IPluginFilesystemAPI.js';
export { IPluginLogger } from './IPluginLogger.js';
export { IPluginConfig } from './IPluginConfig.js';
export { IPluginWorker, EventHandler } from './IPluginWorker.js';
export {
    IPluginBlockchainAPI,
    IBlockHeader,
    IBlockWithTransactions,
    ITransactionDocument,
} from './IPluginBlockchainAPI.js';
