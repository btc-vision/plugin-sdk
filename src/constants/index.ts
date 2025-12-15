/**
 * OIP-0003 Plugin System Constants
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
 * Plugin file extension
 */
export const PLUGIN_FILE_EXTENSION = '.opnet';

/**
 * Plugin manifest filename
 */
export const PLUGIN_MANIFEST_FILENAME = 'plugin.json';

/**
 * Disabled plugin file extension
 */
export const PLUGIN_DISABLED_EXTENSION = '.opnet.disabled';

/**
 * Default plugin directory name
 */
export const DEFAULT_PLUGIN_DIRECTORY = 'plugins';

/**
 * Plugin data directory name
 */
export const PLUGIN_DATA_DIRECTORY = 'plugin-data';

/**
 * SHA-256 checksum size in bytes
 */
export const CHECKSUM_SIZE = 32;

/**
 * Default hook timeout in milliseconds
 */
export const DEFAULT_HOOK_TIMEOUT_MS = 5000;

/**
 * Maximum concurrent plugin workers
 */
export const MAX_PLUGIN_WORKERS = 8;

/**
 * Default worker memory limit in MB
 */
export const DEFAULT_WORKER_MEMORY_MB = 256;
