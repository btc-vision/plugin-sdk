/**
 * OPNet Plugin System constants.
 *
 * Centralized re-exports of all constants used throughout the plugin SDK,
 * plus additional system-level constants for file extensions, directories,
 * and resource limits.
 *
 * @example
 * ```typescript
 * import {
 *     PLUGIN_FILE_EXTENSION,
 *     PLUGIN_MANIFEST_FILENAME,
 *     DEFAULT_PLUGIN_DIRECTORY,
 *     CHECKSUM_SIZE,
 *     DEFAULT_HOOK_TIMEOUT_MS,
 *     MAX_PLUGIN_WORKERS,
 * } from '@btc-vision/plugin-sdk';
 * ```
 *
 * @packageDocumentation
 */

// Re-export from IPluginFile for convenience
export {
    PLUGIN_MAGIC_BYTES,
    PLUGIN_FORMAT_VERSION,
    MLDSALevel,
    MLDSA_PUBLIC_KEY_SIZES,
    MLDSA_SIGNATURE_SIZES,
    MIN_PLUGIN_FILE_SIZE,
    MAX_METADATA_SIZE,
    MAX_BYTECODE_SIZE,
    MAX_PROTO_SIZE,
    calculateHeaderSize,
} from '../interfaces/IPluginFile.js';

// Re-export from IPluginMetadata for convenience
export {
    PLUGIN_NAME_REGEX,
    MAX_PLUGIN_NAME_LENGTH,
    MAX_DESCRIPTION_LENGTH,
    DEFAULT_RESOURCES,
    DEFAULT_LIFECYCLE,
} from '../interfaces/IPluginMetadata.js';

// Re-export from IPluginPermissions for convenience
export { DEFAULT_PERMISSIONS } from '../interfaces/IPluginPermissions.js';

/**
 * File extension for compiled OPNet plugin packages.
 *
 * Plugin packages are distributed as `.opnet` files containing
 * the signed metadata, bytecode, and optional protobuf schema.
 *
 * @example
 * ```typescript
 * import { PLUGIN_FILE_EXTENSION } from '@btc-vision/plugin-sdk';
 *
 * function isPluginFile(filename: string): boolean {
 *     return filename.endsWith(PLUGIN_FILE_EXTENSION); // '.opnet'
 * }
 * ```
 */
export const PLUGIN_FILE_EXTENSION = '.opnet';

/**
 * Standard filename for the plugin manifest within the plugin package.
 *
 * @example
 * ```typescript
 * import { PLUGIN_MANIFEST_FILENAME } from '@btc-vision/plugin-sdk';
 *
 * const manifestPath = `${pluginDir}/${PLUGIN_MANIFEST_FILENAME}`; // 'plugin.json'
 * ```
 */
export const PLUGIN_MANIFEST_FILENAME = 'plugin.json';

/**
 * File extension for disabled plugins.
 *
 * Renaming a `.opnet` file to `.opnet.disabled` prevents it from
 * being loaded by the node without deleting the file.
 *
 * @example
 * ```typescript
 * import { PLUGIN_DISABLED_EXTENSION } from '@btc-vision/plugin-sdk';
 *
 * function disablePlugin(pluginPath: string): string {
 *     return pluginPath + '.disabled'; // e.g., 'my-plugin.opnet.disabled'
 * }
 * ```
 */
export const PLUGIN_DISABLED_EXTENSION = '.opnet.disabled';

/**
 * Default directory name where the node looks for plugin files.
 *
 * Relative to the node's data directory.
 *
 * @example
 * ```typescript
 * import { DEFAULT_PLUGIN_DIRECTORY } from '@btc-vision/plugin-sdk';
 *
 * const pluginsPath = `${nodeDataDir}/${DEFAULT_PLUGIN_DIRECTORY}`; // 'plugins'
 * ```
 */
export const DEFAULT_PLUGIN_DIRECTORY = 'plugins';

/**
 * Directory name where plugin runtime data is stored.
 *
 * Each plugin gets a subdirectory within this directory for
 * its filesystem operations.
 *
 * @example
 * ```typescript
 * import { PLUGIN_DATA_DIRECTORY } from '@btc-vision/plugin-sdk';
 *
 * const dataPath = `${nodeDataDir}/${PLUGIN_DATA_DIRECTORY}/${pluginName}`;
 * // e.g., '/opt/opnet/plugin-data/my-plugin'
 * ```
 */
export const PLUGIN_DATA_DIRECTORY = 'plugin-data';

/**
 * SHA-256 checksum size in bytes (256 bits = 32 bytes).
 *
 * Used for integrity verification of the plugin bytecode.
 *
 * @example
 * ```typescript
 * import { CHECKSUM_SIZE } from '@btc-vision/plugin-sdk';
 *
 * function extractChecksum(fileData: Uint8Array): Uint8Array {
 *     return fileData.slice(fileData.byteLength - CHECKSUM_SIZE); // last 32 bytes
 * }
 * ```
 */
export const CHECKSUM_SIZE = 32;

/**
 * Default timeout for hook execution in milliseconds (5 seconds).
 *
 * This is the default for most parallel hooks. Note that specific hooks
 * have different timeouts enforced by the node:
 * - `onLoad`: 30,000ms
 * - `onUnload`: 10,000ms
 * - `onMempoolTransaction`: 2,000ms
 * - `onReorg`: 300,000ms (5 minutes)
 * - `onReindexRequired` / `onPurgeBlocks`: 600,000ms (10 minutes)
 *
 * See {@link HOOK_CONFIGS} for the authoritative per-hook timeout values.
 *
 * @example
 * ```typescript
 * import { DEFAULT_HOOK_TIMEOUT_MS } from '@btc-vision/plugin-sdk';
 *
 * console.log(`Default hook timeout: ${DEFAULT_HOOK_TIMEOUT_MS}ms`); // 5000ms
 * ```
 */
export const DEFAULT_HOOK_TIMEOUT_MS = 5000;

/**
 * Maximum number of worker threads a single plugin may request.
 *
 * The node warns when `permissions.threading.maxWorkers` exceeds 16.
 * The actual worker pool size is determined by the node's configuration
 * and available CPU cores (default: `Math.floor(cpus / 2)`).
 *
 * @example
 * ```typescript
 * import { MAX_PLUGIN_WORKERS } from '@btc-vision/plugin-sdk';
 *
 * console.log(`Max plugin workers: ${MAX_PLUGIN_WORKERS}`); // 16
 * ```
 */
export const MAX_PLUGIN_WORKERS = 16;

/**
 * Maximum number of WebSocket opcodes a single plugin can register.
 *
 * The node allocates a fixed opcode range per plugin. Attempting to
 * register more handlers than this limit will fail.
 *
 * @example
 * ```typescript
 * import { MAX_WEBSOCKET_OPCODES } from '@btc-vision/plugin-sdk';
 *
 * console.log(`Max WS opcodes per plugin: ${MAX_WEBSOCKET_OPCODES}`); // 8
 * ```
 */
export const MAX_WEBSOCKET_OPCODES = 8;

/**
 * Maximum block range for {@link IPluginBlockchainAPI.getBlockRange}.
 *
 * The node silently caps the range to this value.
 */
export const MAX_BLOCK_RANGE = 100;

/**
 * Default memory limit per worker thread in megabytes.
 *
 * Applied when the plugin doesn't specify a custom memory limit
 * in its resource configuration.
 *
 * @example
 * ```typescript
 * import { DEFAULT_WORKER_MEMORY_MB } from '@btc-vision/plugin-sdk';
 *
 * console.log(`Default worker memory: ${DEFAULT_WORKER_MEMORY_MB}MB`); // 256MB
 * ```
 */
export const DEFAULT_WORKER_MEMORY_MB = 256;
