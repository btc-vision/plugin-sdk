/**
 * Plugin filesystem API interface
 * Provides sandboxed file system access for plugins
 */
export interface IPluginFilesystemAPI {
    /**
     * Read a file
     * @param path - Relative path within plugin data directory
     * @returns File contents as Buffer
     */
    readFile(path: string): Promise<Buffer>;

    /**
     * Write a file
     * @param path - Relative path within plugin data directory
     * @param data - Data to write
     */
    writeFile(path: string, data: Buffer | string): Promise<void>;

    /**
     * Check if a file or directory exists
     * @param path - Relative path within plugin data directory
     * @returns True if exists
     */
    exists(path: string): Promise<boolean>;

    /**
     * Create a directory
     * @param path - Relative path within plugin data directory
     */
    mkdir(path: string): Promise<void>;

    /**
     * Read directory contents
     * @param path - Relative path within plugin data directory
     * @returns Array of file/directory names
     */
    readdir(path: string): Promise<string[]>;

    /**
     * Delete a file
     * @param path - Relative path within plugin data directory
     */
    unlink(path: string): Promise<void>;

    /**
     * Get file or directory stats
     * @param path - Relative path within plugin data directory
     * @returns File stats
     */
    stat(path: string): Promise<{
        size: number;
        isDirectory: boolean;
        mtime: Date;
    }>;
}
