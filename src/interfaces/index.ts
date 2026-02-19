/**
 * Core plugin interface definitions for the OPNet Plugin SDK.
 *
 * Exports all fundamental interfaces governing plugin metadata, lifecycle,
 * permissions, hooks, state management, binary file format, and
 * synchronization. These define the contract between the OPNet node
 * runtime and individual plugins.
 *
 * @packageDocumentation
 */

// Main plugin interface
export { IPlugin, PluginConstructor, IPluginModule } from './IPlugin.js';

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
} from './IPluginPermissions.js';

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
} from './IPluginMetadata.js';

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
} from './IPluginInstallState.js';

// Plugin state interfaces
export {
    PluginState,
    IPluginError,
    IPluginStateChange,
    VALID_STATE_TRANSITIONS,
    isValidStateTransition,
    IPluginStats,
} from './IPluginState.js';

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
} from './IPluginFile.js';

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
} from './IPluginHooks.js';
