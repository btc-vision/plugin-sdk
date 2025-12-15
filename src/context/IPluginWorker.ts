/**
 * Plugin worker interface for spawning sub-workers
 * Requires threading permission to be granted
 */
export interface IPluginWorker {
    /**
     * Post a message to the worker
     * @param message - Message to send
     */
    postMessage(message: unknown): void;

    /**
     * Subscribe to worker messages
     * @param event - Event type ('message')
     * @param handler - Message handler
     */
    on(event: 'message', handler: (message: unknown) => void): void;

    /**
     * Subscribe to worker errors
     * @param event - Event type ('error')
     * @param handler - Error handler
     */
    on(event: 'error', handler: (error: Error) => void): void;

    /**
     * Subscribe to worker exit
     * @param event - Event type ('exit')
     * @param handler - Exit handler with exit code
     */
    on(event: 'exit', handler: (code: number) => void): void;

    /**
     * Terminate the worker
     * @returns Exit code
     */
    terminate(): Promise<number>;
}

/**
 * Event handler type for inter-plugin communication
 */
export type EventHandler = (data: unknown) => void | Promise<void>;
