/**
 * Plugin router for HTTP API extensions
 */
export interface IPluginRouter {
    /**
     * Register a GET route
     * @param path - Route path (relative to plugin base path)
     * @param handler - Handler method name on the plugin
     */
    get(path: string, handler: string): void;

    /**
     * Register a POST route
     * @param path - Route path (relative to plugin base path)
     * @param handler - Handler method name on the plugin
     */
    post(path: string, handler: string): void;

    /**
     * Register a PUT route
     * @param path - Route path (relative to plugin base path)
     * @param handler - Handler method name on the plugin
     */
    put(path: string, handler: string): void;

    /**
     * Register a DELETE route
     * @param path - Route path (relative to plugin base path)
     * @param handler - Handler method name on the plugin
     */
    delete(path: string, handler: string): void;

    /**
     * Register a PATCH route
     * @param path - Route path (relative to plugin base path)
     * @param handler - Handler method name on the plugin
     */
    patch(path: string, handler: string): void;
}

/**
 * Plugin WebSocket interface for WS API extensions
 */
export interface IPluginWebSocket {
    /**
     * Register a WebSocket handler for an opcode
     * @param opcode - Opcode string to handle
     * @param handler - Handler method name on the plugin
     */
    registerHandler(opcode: string, handler: string): void;

    /**
     * Create a subscription for a client
     * @param clientId - Client identifier
     * @returns Subscription ID
     */
    createSubscription(clientId: string): number;

    /**
     * Push a notification to a client subscription
     * @param clientId - Client identifier
     * @param subscriptionId - Subscription ID
     * @param data - Data to push
     */
    pushNotification(clientId: string, subscriptionId: number, data: unknown): void;

    /**
     * Close a subscription
     * @param subscriptionId - Subscription ID to close
     */
    closeSubscription(subscriptionId: number): void;
}
