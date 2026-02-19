/**
 * Plugin metadata types for the `plugin.json` manifest schema.
 *
 * Every OPNet plugin is packaged with a `plugin.json` manifest that describes
 * the plugin's identity, author, permissions, resource limits, and configuration.
 * This module defines the TypeScript types for that manifest.
 *
 * @remarks
 * The manifest is validated at install time using {@link validateManifest}.
 * Invalid manifests will be rejected by the node.
 *
 * @example
 * ```json
 * {
 *     "name": "my-block-indexer",
 *     "version": "1.0.0",
 *     "opnetVersion": "^1.0.0",
 *     "main": "dist/index.jsc",
 *     "target": "bytenode",
 *     "type": "plugin",
 *     "pluginType": "standalone",
 *     "checksum": "sha256:abc123...",
 *     "description": "Indexes Bitcoin block data for custom queries",
 *     "author": {
 *         "name": "Alice",
 *         "email": "alice@example.com"
 *     },
 *     "permissions": {
 *         "database": { "enabled": true, "collections": ["my-block-indexer_blocks"] },
 *         "blocks": { "preProcess": true, "postProcess": true, "onChange": false }
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

import { IPluginPermissions } from './IPluginPermissions.js';

/**
 * Plugin author information.
 *
 * @example
 * ```typescript
 * import type { IPluginAuthor } from '@btc-vision/plugin-sdk';
 *
 * const author: IPluginAuthor = {
 *     name: 'Alice',
 *     email: 'alice@example.com',
 *     url: 'https://alice.dev',
 * };
 * ```
 */
export interface IPluginAuthor {
    /**
     * Author's display name (required).
     *
     * @example `"Alice"`
     */
    readonly name: string;

    /**
     * Author's contact email.
     *
     * @example `"alice@example.com"`
     */
    readonly email?: string;

    /**
     * Author's website or profile URL.
     *
     * @example `"https://alice.dev"`
     */
    readonly url?: string;
}

/**
 * Plugin source code repository information.
 *
 * @example
 * ```typescript
 * import type { IPluginRepository } from '@btc-vision/plugin-sdk';
 *
 * const repo: IPluginRepository = {
 *     type: 'git',
 *     url: 'https://github.com/alice/my-plugin.git',
 * };
 * ```
 */
export interface IPluginRepository {
    /**
     * Version control system type.
     *
     * @example `"git"`
     */
    readonly type: string;

    /**
     * Repository URL.
     *
     * @example `"https://github.com/alice/my-plugin.git"`
     */
    readonly url: string;
}

/**
 * Plugin cryptographic signature information.
 *
 * Plugins are signed using ML-DSA (Module-Lattice-based Digital Signature
 * Algorithm), a post-quantum signature scheme. The signature covers the
 * plugin's checksum (SHA-256 of metadata + bytecode + proto).
 *
 * @remarks
 * ECDSA is **deprecated** in OPNet. Only ML-DSA signatures are accepted.
 *
 * @example
 * ```typescript
 * import type { IPluginSignature } from '@btc-vision/plugin-sdk';
 *
 * const signature: IPluginSignature = {
 *     algorithm: 'MLDSA65',
 *     publicKeyHash: 'sha256:abc123def456...',
 * };
 * ```
 */
export interface IPluginSignature {
    /**
     * ML-DSA algorithm variant used for signing.
     *
     * - `'MLDSA44'` - NIST Security Level 2 (1312-byte public key)
     * - `'MLDSA65'` - NIST Security Level 3 (1952-byte public key)
     * - `'MLDSA87'` - NIST Security Level 5 (2592-byte public key)
     */
    readonly algorithm: 'MLDSA44' | 'MLDSA65' | 'MLDSA87';

    /**
     * SHA-256 hash of the ML-DSA public key.
     *
     * Used to identify the signer without embedding the full public key.
     *
     * @example `"sha256:abc123def456..."`
     */
    readonly publicKeyHash: string;
}

/**
 * Resource limits configuration for the plugin's execution environment.
 *
 * Constrains memory usage, CPU allocation, and operation timeouts
 * to prevent any single plugin from consuming excessive resources.
 *
 * @example
 * ```typescript
 * import type { IPluginResources } from '@btc-vision/plugin-sdk';
 *
 * const resources: IPluginResources = {
 *     memory: {
 *         maxHeapMB: 512,
 *         maxOldGenMB: 256,
 *         maxYoungGenMB: 128,
 *     },
 *     cpu: {
 *         maxThreads: 4,
 *         priority: 'normal',
 *     },
 *     timeout: {
 *         initMs: 30000,   // 30s to initialize
 *         hookMs: 5000,    // 5s per hook call
 *         shutdownMs: 10000, // 10s to shut down
 *     },
 * };
 * ```
 */
export interface IPluginResources {
    /**
     * Memory limits for the V8 heap.
     */
    readonly memory?: {
        /** Maximum total heap size in MB. @example `256` */
        readonly maxHeapMB?: number;
        /** Maximum old generation (long-lived objects) heap size in MB. @example `128` */
        readonly maxOldGenMB?: number;
        /** Maximum young generation (short-lived objects) heap size in MB. @example `64` */
        readonly maxYoungGenMB?: number;
    };

    /**
     * CPU allocation limits.
     */
    readonly cpu?: {
        /** Maximum worker threads the plugin can spawn. @example `2` */
        readonly maxThreads?: number;
        /** CPU scheduling priority. @example `"normal"` */
        readonly priority?: 'low' | 'normal' | 'high';
    };

    /**
     * Operation timeout limits in milliseconds.
     */
    readonly timeout?: {
        /** Maximum time for plugin initialization (onLoad). @example `30000` */
        readonly initMs?: number;
        /** Maximum time per hook execution. @example `5000` */
        readonly hookMs?: number;
        /** Maximum time for graceful shutdown (onUnload). @example `10000` */
        readonly shutdownMs?: number;
    };
}

/**
 * Plugin lifecycle configuration.
 *
 * Controls how the plugin is loaded and managed by the node.
 *
 * @example
 * ```typescript
 * import type { IPluginLifecycle } from '@btc-vision/plugin-sdk';
 *
 * const lifecycle: IPluginLifecycle = {
 *     loadPriority: 50,          // Load before default priority (100)
 *     enabledByDefault: true,     // Auto-enable on install
 *     requiresRestart: false,     // Can be hot-reloaded
 * };
 * ```
 */
export interface IPluginLifecycle {
    /**
     * Load order priority (lower numbers load first).
     *
     * Use values below 100 to load before other plugins (e.g., for
     * library plugins that other plugins depend on).
     *
     * @defaultValue `100`
     * @example `50`
     */
    readonly loadPriority?: number;

    /**
     * Whether the plugin is enabled automatically after installation.
     *
     * @defaultValue `true`
     */
    readonly enabledByDefault?: boolean;

    /**
     * Whether the node must restart for changes to this plugin to take effect.
     *
     * @defaultValue `false`
     */
    readonly requiresRestart?: boolean;
}

/**
 * Hook method name mapping (for advanced customization).
 *
 * Allows remapping the default hook method names to custom method names
 * on the plugin class. Rarely needed - most plugins use the standard
 * hook method names.
 *
 * @example
 * ```typescript
 * import type { IPluginHooksConfig } from '@btc-vision/plugin-sdk';
 *
 * const hooks: IPluginHooksConfig = {
 *     onLoad: 'initialize',    // Call plugin.initialize() instead of plugin.onLoad()
 *     onUnload: 'shutdown',    // Call plugin.shutdown() instead of plugin.onUnload()
 * };
 * ```
 */
export interface IPluginHooksConfig {
    /** Custom method name for the onLoad hook. */
    readonly onLoad?: string;
    /** Custom method name for the onUnload hook. */
    readonly onUnload?: string;
    /** Custom method name for the onEnable hook. */
    readonly onEnable?: string;
    /** Custom method name for the onDisable hook. */
    readonly onDisable?: string;
}

/**
 * Plugin configuration schema definition.
 *
 * Declares the expected configuration keys, types, and defaults
 * for the plugin. The node uses this schema to validate user-provided
 * configuration values.
 *
 * @example
 * ```typescript
 * import type { IPluginConfigSchema } from '@btc-vision/plugin-sdk';
 *
 * const configSchema: IPluginConfigSchema = {
 *     schema: {
 *         apiUrl: {
 *             type: 'string',
 *             required: true,
 *             default: 'https://api.example.com',
 *         },
 *         maxRetries: {
 *             type: 'number',
 *             required: false,
 *             default: 3,
 *         },
 *         verbose: {
 *             type: 'boolean',
 *             required: false,
 *             default: false,
 *         },
 *     },
 * };
 * ```
 */
export interface IPluginConfigSchema {
    /**
     * Configuration key definitions.
     *
     * Keys are config parameter names, values define the type,
     * whether it's required, and the default value.
     */
    readonly schema?: Record<
        string,
        {
            /** Data type of the configuration value. */
            readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
            /** Whether this configuration key is required. */
            readonly required?: boolean;
            /** Default value if not provided by the user. */
            readonly default?: unknown;
        }
    >;
}

/**
 * Complete plugin metadata structure (`plugin.json` manifest schema).
 *
 * This is the top-level interface for the plugin manifest file. It contains
 * all information needed to validate, load, and run an OPNet plugin.
 *
 * @example
 * ```typescript
 * import type { IPluginMetadata } from '@btc-vision/plugin-sdk';
 *
 * const manifest: IPluginMetadata = {
 *     name: 'my-block-indexer',
 *     version: '1.0.0',
 *     opnetVersion: '^1.0.0',
 *     main: 'dist/index.jsc',
 *     target: 'bytenode',
 *     type: 'plugin',
 *     pluginType: 'standalone',
 *     checksum: 'sha256:abc123...',
 *     author: { name: 'Alice' },
 *     description: 'Indexes Bitcoin block data for custom queries',
 *     permissions: {
 *         database: { enabled: true, collections: ['my-block-indexer_blocks'] },
 *         blocks: { preProcess: true, postProcess: true, onChange: false },
 *     },
 * };
 * ```
 */
export interface IPluginMetadata {
    // ── Required Fields ───────────────────────────────────────────────

    /**
     * Plugin name (unique identifier).
     *
     * Must start with a lowercase letter and contain only lowercase letters,
     * numbers, and hyphens. Maximum {@link MAX_PLUGIN_NAME_LENGTH} characters.
     * Validated against {@link PLUGIN_NAME_REGEX}.
     *
     * @example `"my-block-indexer"`
     */
    readonly name: string;

    /**
     * Plugin version (semver format).
     *
     * @example `"1.0.0"`, `"2.1.0-beta.1"`
     */
    readonly version: string;

    /**
     * Compatible OPNet node version range (semver range).
     *
     * @example `"^1.0.0"`, `">=1.2.0 <2.0.0"`
     */
    readonly opnetVersion: string;

    /**
     * Path to the compiled bytecode entry point.
     *
     * @example `"dist/index.jsc"`
     */
    readonly main: string;

    /**
     * Compilation target. Must be `"bytenode"` (V8 bytecode).
     */
    readonly target: 'bytenode';

    /**
     * Package type. Must be `"plugin"`.
     */
    readonly type: 'plugin';

    /**
     * SHA-256 checksum of the compiled bytecode for integrity verification.
     *
     * @example `"sha256:abc123def456..."`
     */
    readonly checksum: string;

    // ── Author Info ───────────────────────────────────────────────────

    /**
     * Plugin author information (required).
     */
    readonly author: IPluginAuthor;

    /**
     * Additional contributors.
     */
    readonly contributors?: readonly IPluginAuthor[];

    // ── Repository Info ───────────────────────────────────────────────

    /**
     * Source code repository.
     */
    readonly repository?: IPluginRepository;

    /**
     * Plugin homepage URL.
     *
     * @example `"https://github.com/alice/my-plugin#readme"`
     */
    readonly homepage?: string;

    /**
     * Bug tracker URL.
     */
    readonly bugs?: { readonly url: string };

    // ── Licensing ─────────────────────────────────────────────────────

    /**
     * SPDX license identifier.
     *
     * @example `"MIT"`, `"Apache-2.0"`, `"UNLICENSED"`
     */
    readonly license?: string;

    /**
     * Whether this plugin is private (not published to registry).
     */
    readonly private?: boolean;

    // ── Description ───────────────────────────────────────────────────

    /**
     * Human-readable plugin description.
     *
     * Maximum {@link MAX_DESCRIPTION_LENGTH} characters.
     *
     * @example `"Indexes Bitcoin block data for custom queries"`
     */
    readonly description?: string;

    /**
     * Search keywords for plugin discovery.
     *
     * @example `["bitcoin", "indexer", "blocks"]`
     */
    readonly keywords?: readonly string[];

    // ── Dependencies ──────────────────────────────────────────────────

    /**
     * Required plugin dependencies (other OPNet plugins, NOT npm packages).
     *
     * Keys are plugin names, values are semver ranges.
     *
     * @example `{ "my-library-plugin": "^1.0.0" }`
     */
    readonly dependencies?: Record<string, string>;

    /**
     * Optional plugin dependencies that enhance functionality if present.
     */
    readonly optionalDependencies?: Record<string, string>;

    /**
     * Peer plugin dependencies that must be installed by the node operator.
     */
    readonly peerDependencies?: Record<string, string>;

    // ── Signature ─────────────────────────────────────────────────────

    /**
     * ML-DSA cryptographic signature information.
     */
    readonly signature?: IPluginSignature;

    // ── Plugin Type ───────────────────────────────────────────────────

    /**
     * Plugin classification.
     *
     * - `"standalone"` - Independent plugin with its own hooks and logic.
     * - `"library"` - Shared library plugin that other plugins can import via
     *   `context.getPlugin()`.
     */
    readonly pluginType: 'standalone' | 'library';

    // ── Permissions ───────────────────────────────────────────────────

    /**
     * Permission declarations for the security sandbox.
     *
     * Defaults to {@link DEFAULT_PERMISSIONS} (most restrictive) if omitted.
     */
    readonly permissions?: IPluginPermissions;

    // ── Resources ─────────────────────────────────────────────────────

    /**
     * Resource limit configuration.
     *
     * Defaults to {@link DEFAULT_RESOURCES} if omitted.
     */
    readonly resources?: IPluginResources;

    // ── Lifecycle ─────────────────────────────────────────────────────

    /**
     * Lifecycle configuration (load priority, auto-enable, etc.).
     *
     * Defaults to {@link DEFAULT_LIFECYCLE} if omitted.
     */
    readonly lifecycle?: IPluginLifecycle;

    // ── Hooks ─────────────────────────────────────────────────────────

    /**
     * Custom hook method name mappings.
     */
    readonly hooks?: IPluginHooksConfig;

    // ── Config ────────────────────────────────────────────────────────

    /**
     * Configuration schema for user-provided settings.
     */
    readonly config?: IPluginConfigSchema;
}

/**
 * Default resource limits applied when a plugin doesn't specify its own.
 *
 * @example
 * ```typescript
 * import { DEFAULT_RESOURCES } from '@btc-vision/plugin-sdk';
 *
 * console.log(DEFAULT_RESOURCES.memory.maxHeapMB);   // 256
 * console.log(DEFAULT_RESOURCES.cpu.maxThreads);      // 2
 * console.log(DEFAULT_RESOURCES.timeout.hookMs);      // 5000
 * ```
 */
export const DEFAULT_RESOURCES: Required<IPluginResources> = {
    memory: {
        maxHeapMB: 256,
        maxOldGenMB: 128,
        maxYoungGenMB: 64,
    },
    cpu: {
        maxThreads: 2,
        priority: 'normal',
    },
    timeout: {
        initMs: 30000,
        hookMs: 5000,
        shutdownMs: 10000,
    },
};

/**
 * Default lifecycle configuration applied when a plugin doesn't specify its own.
 *
 * @example
 * ```typescript
 * import { DEFAULT_LIFECYCLE } from '@btc-vision/plugin-sdk';
 *
 * console.log(DEFAULT_LIFECYCLE.loadPriority);     // 100
 * console.log(DEFAULT_LIFECYCLE.enabledByDefault);  // true
 * console.log(DEFAULT_LIFECYCLE.requiresRestart);   // false
 * ```
 */
export const DEFAULT_LIFECYCLE: Required<IPluginLifecycle> = {
    loadPriority: 100,
    enabledByDefault: true,
    requiresRestart: false,
};

/**
 * Regex pattern for validating plugin names.
 *
 * Plugin names must start with a lowercase letter and contain only
 * lowercase letters, numbers, and hyphens.
 *
 * @example
 * ```typescript
 * import { PLUGIN_NAME_REGEX } from '@btc-vision/plugin-sdk';
 *
 * PLUGIN_NAME_REGEX.test('my-plugin');     // true
 * PLUGIN_NAME_REGEX.test('my-plugin-v2');  // true
 * PLUGIN_NAME_REGEX.test('MyPlugin');      // false (uppercase)
 * PLUGIN_NAME_REGEX.test('123-plugin');    // false (starts with number)
 * PLUGIN_NAME_REGEX.test('my_plugin');     // false (underscore)
 * ```
 */
export const PLUGIN_NAME_REGEX = /^[a-z][a-z0-9-]*$/;

/**
 * Maximum allowed length for plugin names.
 *
 * @example
 * ```typescript
 * import { MAX_PLUGIN_NAME_LENGTH } from '@btc-vision/plugin-sdk';
 *
 * if (pluginName.length > MAX_PLUGIN_NAME_LENGTH) {
 *     throw new Error(`Plugin name exceeds ${MAX_PLUGIN_NAME_LENGTH} characters`);
 * }
 * ```
 */
export const MAX_PLUGIN_NAME_LENGTH = 64;

/**
 * Maximum allowed length for plugin descriptions.
 *
 * @example
 * ```typescript
 * import { MAX_DESCRIPTION_LENGTH } from '@btc-vision/plugin-sdk';
 *
 * if (description.length > MAX_DESCRIPTION_LENGTH) {
 *     throw new Error(`Description exceeds ${MAX_DESCRIPTION_LENGTH} characters`);
 * }
 * ```
 */
export const MAX_DESCRIPTION_LENGTH = 500;
