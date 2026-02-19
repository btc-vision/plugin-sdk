/**
 * Plugin permission types for the OPNet security sandbox.
 *
 * Every plugin declares its required permissions in the `plugin.json` manifest.
 * The node enforces these permissions - hooks and APIs that require permissions
 * will not be called or available unless explicitly granted.
 *
 * @remarks
 * OPNet follows a principle of least privilege. Use {@link DEFAULT_PERMISSIONS}
 * as a starting point and only enable what your plugin actually needs.
 *
 * @example
 * ```json
 * // plugin.json permissions section
 * {
 *     "permissions": {
 *         "database": {
 *             "enabled": true,
 *             "collections": ["my-plugin_events", "my-plugin_state"]
 *         },
 *         "blocks": {
 *             "preProcess": false,
 *             "postProcess": true,
 *             "onChange": true
 *         },
 *         "blockchain": {
 *             "blocks": true,
 *             "transactions": true,
 *             "contracts": true,
 *             "utxos": false
 *         }
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Database permission configuration.
 *
 * Controls whether the plugin can access the MongoDB database and
 * which collections it is allowed to create and use. Collection names
 * must be prefixed with the plugin name to prevent collisions.
 *
 * @example
 * ```typescript
 * import type { IDatabasePermissions } from '@btc-vision/plugin-sdk';
 *
 * const dbPerms: IDatabasePermissions = {
 *     enabled: true,
 *     collections: ['my-plugin_blocks', 'my-plugin_events'],
 *     indexes: {
 *         'my-plugin_events': [
 *             { keys: { blockHeight: -1 }, options: { name: 'idx_blockHeight' } },
 *             { keys: { contractAddress: 1, eventType: 1 }, options: { unique: false } },
 *         ],
 *     },
 * };
 * ```
 */
export interface IDatabasePermissions {
    /**
     * Whether database access is enabled for this plugin.
     *
     * If `false`, `context.db` will be `undefined`.
     */
    readonly enabled: boolean;

    /**
     * List of collection names the plugin is allowed to use.
     *
     * Each collection name **must** be prefixed with the plugin name
     * followed by an underscore (e.g., `"my-plugin_users"`).
     *
     * @example `["my-plugin_events", "my-plugin_state"]`
     */
    readonly collections: readonly string[];

    /**
     * Pre-defined indexes to create on plugin collections.
     *
     * Keys are collection names, values are arrays of index definitions.
     * These indexes are created automatically when the plugin is installed.
     */
    readonly indexes?: Record<string, readonly IIndexDefinition[]>;
}

/**
 * MongoDB index definition for plugin collections.
 *
 * Supports all standard MongoDB index types and options.
 *
 * @example
 * ```typescript
 * import type { IIndexDefinition } from '@btc-vision/plugin-sdk';
 *
 * // Compound index on address + block height (descending)
 * const addressIndex: IIndexDefinition = {
 *     keys: { address: 1, blockHeight: -1 },
 *     options: { name: 'idx_address_block' },
 * };
 *
 * // Unique index
 * const uniqueIndex: IIndexDefinition = {
 *     keys: { txid: 1 },
 *     options: { unique: true },
 * };
 *
 * // Text search index
 * const textIndex: IIndexDefinition = {
 *     keys: { description: 'text' },
 *     options: { default_language: 'english' },
 * };
 *
 * // TTL index (auto-delete after 24 hours)
 * const ttlIndex: IIndexDefinition = {
 *     keys: { createdAt: 1 },
 *     options: { expireAfterSeconds: 86400 },
 * };
 * ```
 */
export interface IIndexDefinition {
    /**
     * Index key specification.
     *
     * Each key is a field name and value is the index type:
     * - `1` - Ascending
     * - `-1` - Descending
     * - `'text'` - Text search index
     * - `'2dsphere'` - Geospatial (sphere)
     * - `'2d'` - Geospatial (flat)
     * - `'hashed'` - Hashed index
     */
    readonly keys: Record<string, 1 | -1 | 'text' | '2dsphere' | '2d' | 'hashed'>;

    /**
     * Index options (all optional).
     */
    readonly options?: {
        /** Custom index name. Auto-generated if not specified. */
        readonly name?: string;
        /** If `true`, reject inserts with duplicate key values. */
        readonly unique?: boolean;
        /** If `true`, only index documents that have the indexed field. */
        readonly sparse?: boolean;
        /** TTL: automatically delete documents after this many seconds. */
        readonly expireAfterSeconds?: number;
        /** Field weights for text search indexes. */
        readonly weights?: Record<string, number>;
        /** Default language for text search. */
        readonly default_language?: string;
        /** Partial index filter expression. */
        readonly partialFilterExpression?: Record<string, unknown>;
        /** Additional MongoDB index options. */
        readonly [key: string]: unknown;
    };
}

/**
 * Block processing hook permissions.
 *
 * Controls which block-related hooks the plugin receives.
 * Each permission corresponds to a specific hook method on {@link IPlugin}.
 *
 * @example
 * ```typescript
 * import type { IBlockPermissions } from '@btc-vision/plugin-sdk';
 *
 * const blockPerms: IBlockPermissions = {
 *     preProcess: false,   // Don't need raw Bitcoin data
 *     postProcess: true,   // Need OPNet processed data
 *     onChange: true,       // Need block confirmation notifications
 * };
 * ```
 */
export interface IBlockPermissions {
    /**
     * Enable `onBlockPreProcess` hook (raw Bitcoin block data).
     *
     * @see {@link IPlugin.onBlockPreProcess}
     */
    readonly preProcess: boolean;

    /**
     * Enable `onBlockPostProcess` hook (OPNet processed data).
     *
     * @see {@link IPlugin.onBlockPostProcess}
     */
    readonly postProcess: boolean;

    /**
     * Enable `onBlockChange` hook (block confirmation).
     *
     * @see {@link IPlugin.onBlockChange}
     */
    readonly onChange: boolean;
}

/**
 * Epoch event permissions.
 *
 * Controls which epoch-related hooks the plugin receives.
 *
 * @example
 * ```typescript
 * import type { IEpochPermissions } from '@btc-vision/plugin-sdk';
 *
 * const epochPerms: IEpochPermissions = {
 *     onChange: true,       // Notified when new epochs start
 *     onFinalized: true,    // Notified when epochs are finalized
 * };
 * ```
 */
export interface IEpochPermissions {
    /**
     * Enable `onEpochChange` hook.
     *
     * @see {@link IPlugin.onEpochChange}
     */
    readonly onChange: boolean;

    /**
     * Enable `onEpochFinalized` hook.
     *
     * @see {@link IPlugin.onEpochFinalized}
     */
    readonly onFinalized: boolean;
}

/**
 * Mempool access permissions.
 *
 * Controls mempool-related capabilities.
 *
 * @example
 * ```typescript
 * import type { IMempoolPermissions } from '@btc-vision/plugin-sdk';
 *
 * const mempoolPerms: IMempoolPermissions = {
 *     txFeed: true,     // Receive mempool transaction notifications
 *     txSubmit: false,  // Don't need to submit transactions
 * };
 * ```
 */
export interface IMempoolPermissions {
    /**
     * Enable `onMempoolTransaction` hook to receive new mempool transactions.
     *
     * @see {@link IPlugin.onMempoolTransaction}
     */
    readonly txFeed: boolean;

    /**
     * Allow the plugin to submit transactions to the mempool.
     */
    readonly txSubmit: boolean;
}

/**
 * HTTP route definition for the plugin manifest.
 *
 * Declares an API endpoint that the plugin will register. Used in
 * the `permissions.api.routes` array of the plugin manifest.
 *
 * @example
 * ```typescript
 * import type { IPluginRouteDefinition } from '@btc-vision/plugin-sdk';
 *
 * const statsRoute: IPluginRouteDefinition = {
 *     path: '/stats',
 *     method: 'GET',
 *     handler: 'handleGetStats',
 *     rateLimit: 60,  // 60 requests per minute
 * };
 * ```
 */
export interface IPluginRouteDefinition {
    /**
     * Route path relative to the plugin's base path.
     *
     * @example `"/stats"`, `"/blocks/:height"`, `"/query"`
     */
    readonly path: string;

    /**
     * HTTP method for this route.
     */
    readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

    /**
     * Name of the handler method on the plugin class.
     *
     * @example `"handleGetStats"`
     */
    readonly handler: string;

    /**
     * Rate limit in requests per minute for this endpoint.
     *
     * If not specified, the node's default rate limit applies.
     *
     * @example `60`
     */
    readonly rateLimit?: number;
}

/**
 * WebSocket handler definition for the plugin manifest.
 *
 * Declares a WebSocket opcode handler with its request/response types
 * (for protobuf serialization).
 *
 * @example
 * ```typescript
 * import type { IPluginWebSocketHandler } from '@btc-vision/plugin-sdk';
 *
 * const handler: IPluginWebSocketHandler = {
 *     opcode: 'subscribe_events',
 *     requestType: 'SubscribeRequest',
 *     responseType: 'SubscribeResponse',
 *     handler: 'handleSubscribe',
 *     pushType: 'EventNotification',
 * };
 * ```
 */
export interface IPluginWebSocketHandler {
    /**
     * Opcode string identifying the message type.
     *
     * @example `"subscribe_events"`
     */
    readonly opcode: string;

    /**
     * Protobuf message type name for the request payload.
     *
     * Must match a message definition in the plugin's `.proto` file.
     *
     * @example `"SubscribeRequest"`
     */
    readonly requestType: string;

    /**
     * Protobuf message type name for the response payload.
     *
     * @example `"SubscribeResponse"`
     */
    readonly responseType: string;

    /**
     * Name of the handler method on the plugin class.
     *
     * @example `"handleSubscribe"`
     */
    readonly handler: string;

    /**
     * Protobuf message type for push notifications (if applicable).
     *
     * @example `"EventNotification"`
     */
    readonly pushType?: string;
}

/**
 * WebSocket permission configuration.
 *
 * Defines the protobuf schema and handlers for the plugin's
 * WebSocket API.
 *
 * @example
 * ```typescript
 * import type { IWebSocketPermissions } from '@btc-vision/plugin-sdk';
 *
 * const wsPerms: IWebSocketPermissions = {
 *     protoFile: 'api.proto',
 *     namespace: 'my_plugin',
 *     handlers: [
 *         {
 *             opcode: 'get_stats',
 *             requestType: 'StatsRequest',
 *             responseType: 'StatsResponse',
 *             handler: 'handleGetStats',
 *         },
 *     ],
 * };
 * ```
 */
export interface IWebSocketPermissions {
    /**
     * Path to the protobuf `.proto` file (relative to the plugin root).
     *
     * Defines the message types used for WebSocket communication.
     *
     * @example `"api.proto"`
     */
    readonly protoFile?: string;

    /**
     * Protobuf namespace for the plugin's messages.
     *
     * @example `"my_plugin"`
     */
    readonly namespace?: string;

    /**
     * Array of WebSocket handler definitions.
     */
    readonly handlers?: readonly IPluginWebSocketHandler[];
}

/**
 * API permissions controlling HTTP and WebSocket endpoint registration.
 *
 * @example
 * ```typescript
 * import type { IApiPermissions } from '@btc-vision/plugin-sdk';
 *
 * const apiPerms: IApiPermissions = {
 *     addEndpoints: true,
 *     addWebsocket: false,
 *     basePath: '/plugins/my-plugin',
 *     routes: [
 *         { path: '/stats', method: 'GET', handler: 'handleGetStats' },
 *     ],
 * };
 * ```
 */
export interface IApiPermissions {
    /**
     * Allow the plugin to register HTTP endpoints.
     *
     * If `true`, the `registerRoutes` method on the plugin will be called.
     */
    readonly addEndpoints: boolean;

    /**
     * Allow the plugin to register WebSocket handlers.
     *
     * If `true`, the `registerWebSocketHandlers` method on the plugin will be called.
     */
    readonly addWebsocket: boolean;

    /**
     * Base URL path for all plugin routes.
     *
     * All registered routes are prefixed with this path.
     *
     * @example `"/plugins/my-plugin"`
     */
    readonly basePath?: string;

    /**
     * Pre-declared HTTP routes (for manifest validation).
     */
    readonly routes?: readonly IPluginRouteDefinition[];

    /**
     * WebSocket configuration.
     */
    readonly websocket?: IWebSocketPermissions;
}

/**
 * Threading permissions for spawning sub-worker threads.
 *
 * Controls how many worker threads the plugin can create and
 * how much memory they can use.
 *
 * @example
 * ```typescript
 * import type { IThreadingPermissions } from '@btc-vision/plugin-sdk';
 *
 * const threadPerms: IThreadingPermissions = {
 *     maxWorkers: 2,       // Up to 2 sub-worker threads
 *     maxMemoryMB: 512,    // 512 MB memory per worker
 * };
 * ```
 */
export interface IThreadingPermissions {
    /**
     * Maximum number of sub-worker threads this plugin can spawn.
     *
     * @example `2`
     */
    readonly maxWorkers: number;

    /**
     * Maximum memory per worker thread in megabytes.
     *
     * @example `256`
     */
    readonly maxMemoryMB: number;
}

/**
 * Filesystem permissions for sandboxed file access.
 *
 * Plugins can only access files within their designated data directories.
 *
 * @example
 * ```typescript
 * import type { IFilesystemPermissions } from '@btc-vision/plugin-sdk';
 *
 * const fsPerms: IFilesystemPermissions = {
 *     configDir: true,  // Read/write to plugin config directory
 *     tempDir: true,    // Read/write to plugin temp directory
 * };
 * ```
 */
export interface IFilesystemPermissions {
    /**
     * Allow access to the plugin's persistent configuration directory.
     *
     * Files in this directory persist across plugin restarts and updates.
     */
    readonly configDir: boolean;

    /**
     * Allow access to the plugin's temporary directory.
     *
     * Files in this directory may be cleaned up on node restart.
     */
    readonly tempDir: boolean;
}

/**
 * Blockchain query permissions.
 *
 * Controls what historical data the plugin can query via
 * `context.blockchain`. Each permission enables a set of
 * query methods on {@link IPluginBlockchainAPI}.
 *
 * @example
 * ```typescript
 * import type { IBlockchainPermissions } from '@btc-vision/plugin-sdk';
 *
 * const chainPerms: IBlockchainPermissions = {
 *     blocks: true,         // getBlock, getBlockByHash, getBlockRange
 *     transactions: true,   // getTransaction, getTransactionsByBlock
 *     contracts: true,      // getContract, getContractStorage, getContractEvents
 *     utxos: false,         // getUTXOs (not needed)
 * };
 * ```
 */
export interface IBlockchainPermissions {
    /**
     * Allow querying block headers and data.
     *
     * Enables: `getBlock()`, `getBlockByHash()`, `getBlockWithTransactions()`,
     * `getBlockRange()`, `hasBlock()`, `getChainTip()`.
     */
    readonly blocks: boolean;

    /**
     * Allow querying transactions.
     *
     * Enables: `getTransaction()`, `getTransactionsByBlock()`.
     */
    readonly transactions: boolean;

    /**
     * Allow querying contract state and events.
     *
     * Enables: `getContract()`, `getContractStorage()`, `getContractEvents()`.
     */
    readonly contracts: boolean;

    /**
     * Allow querying UTXOs.
     *
     * Enables: `getUTXOs()`.
     */
    readonly utxos: boolean;
}

/**
 * Complete plugin permissions configuration.
 *
 * Top-level permissions object for the `plugin.json` manifest. Each
 * section controls a different aspect of the plugin's capabilities.
 * All sections are optional - omitted sections use the most restrictive
 * defaults from {@link DEFAULT_PERMISSIONS}.
 *
 * @example
 * ```typescript
 * import type { IPluginPermissions } from '@btc-vision/plugin-sdk';
 *
 * const permissions: IPluginPermissions = {
 *     database: {
 *         enabled: true,
 *         collections: ['my-plugin_events', 'my-plugin_state'],
 *     },
 *     blocks: {
 *         preProcess: false,
 *         postProcess: true,
 *         onChange: true,
 *     },
 *     blockchain: {
 *         blocks: true,
 *         transactions: true,
 *         contracts: true,
 *         utxos: false,
 *     },
 *     filesystem: {
 *         configDir: true,
 *         tempDir: false,
 *     },
 * };
 * ```
 */
export interface IPluginPermissions {
    /** Database access permissions. */
    readonly database?: IDatabasePermissions;
    /** Block processing hook permissions. */
    readonly blocks?: IBlockPermissions;
    /** Epoch hook permissions. */
    readonly epochs?: IEpochPermissions;
    /** Mempool access permissions. */
    readonly mempool?: IMempoolPermissions;
    /** HTTP/WebSocket API permissions. */
    readonly api?: IApiPermissions;
    /** Worker thread permissions. */
    readonly threading?: IThreadingPermissions;
    /** Filesystem access permissions. */
    readonly filesystem?: IFilesystemPermissions;
    /** Blockchain query permissions. */
    readonly blockchain?: IBlockchainPermissions;
}

/**
 * Default permissions - most restrictive configuration.
 *
 * All capabilities disabled, minimal resource limits. Use this as a
 * starting point and selectively enable what your plugin needs.
 *
 * @example
 * ```typescript
 * import { DEFAULT_PERMISSIONS } from '@btc-vision/plugin-sdk';
 *
 * // Start with defaults and override specific sections
 * const myPermissions = {
 *     ...DEFAULT_PERMISSIONS,
 *     database: {
 *         enabled: true,
 *         collections: ['my-plugin_data'],
 *     },
 *     blocks: {
 *         ...DEFAULT_PERMISSIONS.blocks,
 *         postProcess: true,
 *     },
 * };
 * ```
 */
export const DEFAULT_PERMISSIONS: IPluginPermissions = {
    database: {
        enabled: false,
        collections: [],
    },
    blocks: {
        preProcess: false,
        postProcess: false,
        onChange: false,
    },
    epochs: {
        onChange: false,
        onFinalized: false,
    },
    mempool: {
        txFeed: false,
        txSubmit: false,
    },
    api: {
        addEndpoints: false,
        addWebsocket: false,
    },
    threading: {
        maxWorkers: 1,
        maxMemoryMB: 256,
    },
    filesystem: {
        configDir: false,
        tempDir: false,
    },
    blockchain: {
        blocks: false,
        transactions: false,
        contracts: false,
        utxos: false,
    },
};
