/**
 * # `@btc-vision/plugin-sdk`
 *
 * TypeScript SDK for developing OPNet node plugins. Provides type definitions,
 * interfaces, base classes, and validation utilities for building plugins that
 * extend OPNet node functionality.
 *
 * ## Quick Start
 *
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
 *         this.context.logger.info(`Block #${block.blockNumber}: ${block.txCount} txs`);
 *         await this.context.updateLastSyncedBlock(block.blockNumber);
 *     }
 *
 *     async onReorg(reorg: IReorgData): Promise<void> {
 *         const collection = this.context.db!.collection('my-plugin_data');
 *         await collection.deleteMany({
 *             blockHeight: { $gte: reorg.fromBlock.toString() },
 *         });
 *         await this.context.resetSyncStateToBlock(reorg.fromBlock - 1n);
 *     }
 * }
 * ```
 *
 * ## Architecture
 *
 * Plugins run in isolated worker threads (bytenode-compiled V8 bytecode).
 * The node communicates with plugins via JSON-serialized messages across
 * the worker thread boundary. Hook payloads are serialized with
 * `JSON.stringify()` and deserialized with `JSON.parse()`.
 *
 * ## Module Organization
 *
 * - **Core Interfaces** - {@link IPlugin}, {@link IPluginPermissions}, {@link IPluginMetadata}
 * - **Context APIs** - {@link IPluginContext}, {@link IPluginDatabaseAPI}, {@link IPluginBlockchainAPI}
 * - **Block/Transaction Types** - {@link IBlockData}, {@link IBlockProcessedData}, {@link ITransactionData}
 * - **Hook System** - {@link HookType}, {@link HookPayload}, {@link HOOK_CONFIGS}
 * - **Base Class** - {@link PluginBase} (recommended starting point)
 * - **Validation** - {@link validateManifest}
 * - **Constants** - {@link PLUGIN_FILE_EXTENSION}, {@link DEFAULT_PERMISSIONS}, etc.
 *
 * @packageDocumentation
 */

// ============================================================================
// Core Interfaces
// ============================================================================

// Main plugin interface
export { IPlugin, PluginConstructor, IPluginModule } from './interfaces/IPlugin.js';

// Permission interfaces
export {
    IPluginPermissions,
    IDatabasePermissions,
    IIndexDefinition,
    IBlockPermissions,
    IEpochPermissions,
    IMempoolPermissions,
    IApiPermissions,
    IPluginRouteDefinition,
    IPluginWebSocketHandler,
    IWebSocketPermissions,
    IThreadingPermissions,
    IFilesystemPermissions,
    IBlockchainPermissions,
    DEFAULT_PERMISSIONS,
} from './interfaces/IPluginPermissions.js';

// Metadata interfaces
export {
    IPluginMetadata,
    IPluginAuthor,
    IPluginRepository,
    IPluginSignature,
    IPluginResources,
    IPluginLifecycle,
    IPluginHooksConfig,
    IPluginConfigSchema,
    DEFAULT_RESOURCES,
    DEFAULT_LIFECYCLE,
    PLUGIN_NAME_REGEX,
    MAX_PLUGIN_NAME_LENGTH,
    MAX_DESCRIPTION_LENGTH,
} from './interfaces/IPluginMetadata.js';

// Install state interfaces
export {
    IPluginInstallState,
    INetworkInfo,
    IReindexInfo,
    ISyncBlockData,
    ISyncTransactionData,
    ISyncProgress,
    ISyncOptions,
    PluginSyncStatus,
    IPluginSyncCheck,
    ReindexAction,
    IReindexCheck,
} from './interfaces/IPluginInstallState.js';

// Plugin state interfaces
export {
    PluginState,
    IPluginError,
    IPluginStateChange,
    VALID_STATE_TRANSITIONS,
    isValidStateTransition,
    IPluginStats,
} from './interfaces/IPluginState.js';

// Plugin file interfaces
export {
    PLUGIN_MAGIC_BYTES,
    PLUGIN_FORMAT_VERSION,
    MLDSALevel,
    MLDSA_PUBLIC_KEY_SIZES,
    MLDSA_SIGNATURE_SIZES,
    IParsedPluginFile,
    IPluginFileHeader,
    IPluginFileOffsets,
    calculateHeaderSize,
    MIN_PLUGIN_FILE_SIZE,
    MAX_METADATA_SIZE,
    MAX_BYTECODE_SIZE,
    MAX_PROTO_SIZE,
} from './interfaces/IPluginFile.js';

// Hook interfaces
export {
    HookExecutionMode,
    HookType,
    IHookConfig,
    IHookResult,
    IHookDispatchOptions,
    IPurgeBlocksPayload,
    HookPayload,
    HOOK_CONFIGS,
} from './interfaces/IPluginHooks.js';

// ============================================================================
// Context Interfaces
// ============================================================================

export { IPluginContext } from './context/IPluginContext.js';
export { IPluginDatabaseAPI, IPluginCollection, IPluginCursor } from './context/IPluginDatabaseAPI.js';
export { IPluginFilesystemAPI } from './context/IPluginFilesystemAPI.js';
export { IPluginLogger } from './context/IPluginLogger.js';
export { IPluginConfig } from './context/IPluginConfig.js';
export { IPluginWorker, EventHandler } from './context/IPluginWorker.js';
export {
    IPluginBlockchainAPI,
    IBlockHeader,
    IBlockWithTransactions,
    ITransactionDocument,
} from './context/IPluginBlockchainAPI.js';

// ============================================================================
// Types
// ============================================================================

// Block types
export {
    IBlockData,
    IBlockProcessedData,
    ITransactionData,
    IChecksumProof,
    IScriptSig,
    IScriptPubKey,
    IVIn,
    IVOut,
} from './types/BlockTypes.js';

// Epoch types
export { IEpochData } from './types/EpochTypes.js';

// Transaction types
export { ITransaction, ITransactionInput, ITransactionOutput } from './types/TransactionTypes.js';

// Mempool types
export { IMempoolTransaction } from './types/MempoolTypes.js';

// Reorg types
export { IReorgData } from './types/ReorgTypes.js';

// Router types
export { IPluginRouter, IPluginWebSocket, IPluginHttpRequest } from './types/RouterTypes.js';

// Contract types
export {
    IContractEvent,
    ITransactionReceipt,
    IContractInfo,
    IContractStorageEntry,
} from './types/ContractTypes.js';

// UTXO types
export { IUTXO, IUTXOQueryOptions } from './types/UTXOTypes.js';

// ============================================================================
// Base Class
// ============================================================================

export { PluginBase } from './base/PluginBase.js';

// ============================================================================
// Validation
// ============================================================================

export { validateManifest, IValidationError, IValidationResult } from './validation/validateManifest.js';

// ============================================================================
// Constants
// ============================================================================

export {
    PLUGIN_FILE_EXTENSION,
    PLUGIN_MANIFEST_FILENAME,
    PLUGIN_DISABLED_EXTENSION,
    DEFAULT_PLUGIN_DIRECTORY,
    PLUGIN_DATA_DIRECTORY,
    CHECKSUM_SIZE,
    DEFAULT_HOOK_TIMEOUT_MS,
    MAX_PLUGIN_WORKERS,
    MAX_WEBSOCKET_OPCODES,
    MAX_BLOCK_RANGE,
    DEFAULT_WORKER_MEMORY_MB,
} from './constants/index.js';
