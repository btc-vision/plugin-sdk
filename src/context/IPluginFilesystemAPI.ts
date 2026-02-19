/**
 * Plugin sandboxed filesystem API.
 *
 * Provides file system operations restricted to the plugin's data directory.
 * All paths are relative to the plugin's assigned data directory - attempting
 * to access paths outside this sandbox will be rejected.
 *
 * @remarks
 * - Requires `filesystem.configDir` or `filesystem.tempDir` permission.
 * - All binary data uses `Uint8Array` (not `Buffer`).
 * - Paths must be relative (no leading `/`). The plugin data directory
 *   is automatically prepended by the node.
 *
 * @example
 * ```typescript
 * import { PluginBase, IPluginContext } from '@btc-vision/plugin-sdk';
 *
 * export default class FilePlugin extends PluginBase {
 *     async onLoad(context: IPluginContext): Promise<void> {
 *         await super.onLoad(context);
 *
 *         // Create a directory and write a file
 *         await this.context.fs.mkdir('cache');
 *         await this.context.fs.writeFile('cache/state.json', JSON.stringify({ version: 1 }));
 *
 *         // Read it back
 *         const data = await this.context.fs.readFile('cache/state.json');
 *         const text = new TextDecoder().decode(data);
 *         const state = JSON.parse(text);
 *         this.context.logger.info(`Loaded state version: ${state.version}`);
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Sandboxed filesystem API for plugin data storage.
 *
 * All operations are confined to the plugin's data directory. The API
 * mirrors common Node.js `fs` operations with async/await semantics.
 *
 * @example
 * ```typescript
 * import type { IPluginFilesystemAPI } from '@btc-vision/plugin-sdk';
 *
 * async function saveAndLoad(fs: IPluginFilesystemAPI): Promise<void> {
 *     // Write binary data
 *     const encoder = new TextEncoder();
 *     await fs.writeFile('data.bin', encoder.encode('hello world'));
 *
 *     // Check existence
 *     if (await fs.exists('data.bin')) {
 *         const content = await fs.readFile('data.bin');
 *         console.log(`Read ${content.byteLength} bytes`);
 *     }
 *
 *     // List directory
 *     const files = await fs.readdir('.');
 *     console.log('Files:', files);
 *
 *     // Get file info
 *     const stats = await fs.stat('data.bin');
 *     console.log(`Size: ${stats.size}, Modified: ${stats.mtime}`);
 *
 *     // Clean up
 *     await fs.unlink('data.bin');
 * }
 * ```
 */
export interface IPluginFilesystemAPI {
    /**
     * Read a file's contents as raw bytes.
     *
     * @param path - Relative path within the plugin data directory.
     * @returns File contents as a `Uint8Array`.
     * @throws Error if the file does not exist or path is outside the sandbox.
     *
     * @example
     * ```typescript
     * // Read a text file
     * const bytes = await fs.readFile('config.json');
     * const text = new TextDecoder().decode(bytes);
     * const config = JSON.parse(text);
     *
     * // Read binary data
     * const imageData = await fs.readFile('cache/thumbnail.png');
     * console.log(`Image size: ${imageData.byteLength} bytes`);
     * ```
     */
    readFile(path: string): Promise<Uint8Array>;

    /**
     * Write data to a file, creating it if it doesn't exist.
     *
     * Overwrites the file if it already exists. Parent directories
     * are created automatically if they don't exist.
     *
     * @param path - Relative path within the plugin data directory.
     * @param data - Data to write. Strings are encoded as UTF-8.
     *
     * @example
     * ```typescript
     * // Write a string (auto-encoded as UTF-8)
     * await fs.writeFile('state.json', JSON.stringify({ lastBlock: 850000 }));
     *
     * // Write binary data
     * const buffer = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
     * await fs.writeFile('data.bin', buffer);
     * ```
     */
    writeFile(path: string, data: Uint8Array | string): Promise<void>;

    /**
     * Check if a file or directory exists.
     *
     * @param path - Relative path within the plugin data directory.
     * @returns `true` if the path exists (file or directory).
     *
     * @example
     * ```typescript
     * if (await fs.exists('cache/index.json')) {
     *     const data = await fs.readFile('cache/index.json');
     *     // Use cached data...
     * } else {
     *     // Build cache from scratch...
     *     await fs.mkdir('cache');
     * }
     * ```
     */
    exists(path: string): Promise<boolean>;

    /**
     * Create a directory.
     *
     * Creates the directory at the specified path. Parent directories
     * are created automatically if they don't exist (recursive).
     *
     * @param path - Relative path for the new directory.
     *
     * @example
     * ```typescript
     * // Creates both 'cache' and 'cache/blocks' in one call
     * await fs.mkdir('cache/blocks');
     * await fs.writeFile('cache/blocks/850000.json', blockData);
     * ```
     */
    mkdir(path: string): Promise<void>;

    /**
     * Read the contents of a directory.
     *
     * @param path - Relative path to the directory.
     * @returns Array of file and directory names (not full paths).
     *
     * @example
     * ```typescript
     * const entries = await fs.readdir('cache');
     * console.log(`Cache contains ${entries.length} items:`, entries);
     * // Output: Cache contains 3 items: ["blocks", "state.json", "index.db"]
     * ```
     */
    readdir(path: string): Promise<string[]>;

    /**
     * Delete a file.
     *
     * @param path - Relative path to the file to delete.
     * @throws Error if the path is a directory (use `readdir` + `unlink` to clear).
     *
     * @example
     * ```typescript
     * await fs.unlink('cache/old-data.json');
     * ```
     */
    unlink(path: string): Promise<void>;

    /**
     * Get file or directory metadata.
     *
     * @param path - Relative path within the plugin data directory.
     * @returns Object with size, type, and modification time.
     *
     * @example
     * ```typescript
     * const stats = await fs.stat('data.json');
     *
     * if (stats.isDirectory) {
     *     console.log('Path is a directory');
     * } else {
     *     console.log(`File size: ${stats.size} bytes`);
     *     console.log(`Last modified: ${stats.mtime.toISOString()}`);
     * }
     *
     * // Check if cache is stale (older than 1 hour)
     * const ageMs = Date.now() - stats.mtime.getTime();
     * if (ageMs > 3600_000) {
     *     console.log('Cache is stale, rebuilding...');
     * }
     * ```
     */
    stat(path: string): Promise<{
        /** File size in bytes (0 for directories). */
        size: number;
        /** Whether the path is a directory. */
        isDirectory: boolean;
        /** Last modification time. */
        mtime: Date;
    }>;
}
