/**
 * @btc-vision/plugin-sdk
 *
 * TypeScript SDK for developing OPNet node plugins.
 * Provides type definitions, interfaces, and base classes for plugin development.
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

// ============================================================================
// Types
// ============================================================================

// Block types
export { IBlockData, IBlockProcessedData, ITransactionData, IChecksumProof } from './types/BlockTypes.js';

// Epoch types
export { IEpochData } from './types/EpochTypes.js';

// Transaction types
export { ITransaction, ITransactionInput, ITransactionOutput } from './types/TransactionTypes.js';

// Mempool types
export { IMempoolTransaction } from './types/MempoolTypes.js';

// Reorg types
export { IReorgData } from './types/ReorgTypes.js';

// Router types
export { IPluginRouter, IPluginWebSocket } from './types/RouterTypes.js';

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
    DEFAULT_WORKER_MEMORY_MB,
} from './constants/index.js';
