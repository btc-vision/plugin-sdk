/**
 * Plugin logger interface
 * Provides logging functionality with automatic plugin name prefix
 */
export interface IPluginLogger {
    /**
     * Log a debug message
     * @param message - Message to log
     * @param args - Additional arguments
     */
    debug(message: string, ...args: unknown[]): void;

    /**
     * Log an info message
     * @param message - Message to log
     * @param args - Additional arguments
     */
    info(message: string, ...args: unknown[]): void;

    /**
     * Log a warning message
     * @param message - Message to log
     * @param args - Additional arguments
     */
    warn(message: string, ...args: unknown[]): void;

    /**
     * Log an error message
     * @param message - Message to log
     * @param args - Additional arguments
     */
    error(message: string, ...args: unknown[]): void;
}
