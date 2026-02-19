/**
 * Plugin HTTP and WebSocket API extension types.
 *
 * These types allow plugins to extend the OPNet node's API with
 * custom HTTP endpoints and WebSocket handlers. Routes are automatically
 * namespaced under the plugin's configured base path.
 *
 * @remarks
 * - HTTP routes require `api.addEndpoints` permission.
 * - WebSocket handlers require `api.addWebsocket` permission.
 * - Route handlers are method names on the plugin class (as strings),
 *   not direct function references, since plugins run in worker threads.
 *
 * @example
 * ```typescript
 * import {
 *     PluginBase, IPluginRouter, IPluginWebSocket, IPluginContext,
 * } from '@btc-vision/plugin-sdk';
 *
 * export default class ApiPlugin extends PluginBase {
 *     async onLoad(context: IPluginContext): Promise<void> {
 *         await super.onLoad(context);
 *     }
 *
 *     registerRoutes(router: IPluginRouter): void {
 *         router.get('/stats', 'handleGetStats');
 *         router.post('/query', 'handlePostQuery');
 *     }
 *
 *     registerWebSocketHandlers(ws: IPluginWebSocket): void {
 *         ws.registerHandler('subscribe_blocks', 'handleBlockSubscription');
 *     }
 *
 *     // These methods are called by the router (names match handler strings)
 *     async handleGetStats(): Promise<{ totalBlocks: number }> {
 *         return { totalBlocks: 850000 };
 *     }
 *
 *     async handlePostQuery(body: unknown): Promise<unknown> {
 *         return { result: 'ok' };
 *     }
 *
 *     async handleBlockSubscription(clientId: string, data: unknown): Promise<void> {
 *         // Handle block subscription
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * HTTP request object passed to plugin route handlers.
 *
 * When a registered HTTP route is invoked, the node constructs this
 * request object and passes it to the plugin's handler method.
 *
 * @example
 * ```typescript
 * import type { IPluginHttpRequest } from '@btc-vision/plugin-sdk';
 *
 * // In your plugin class:
 * async handleGetItem(request: IPluginHttpRequest): Promise<unknown> {
 *     const itemId = request.params.id;
 *     const format = request.query.format;
 *     return { id: itemId, format };
 * }
 * ```
 */
export interface IPluginHttpRequest {
    /** HTTP method (GET, POST, PUT, DELETE, PATCH). */
    readonly method: string;

    /** Request path (relative to plugin base path). */
    readonly path: string;

    /** Query string parameters as key-value pairs. */
    readonly query: Record<string, string>;

    /** Path parameters extracted from route pattern (e.g., `:id`). */
    readonly params: Record<string, string>;

    /** Parsed request body (for POST/PUT/PATCH). `undefined` for GET/DELETE. */
    readonly body?: unknown;

    /** Request headers as key-value pairs (lowercased keys). */
    readonly headers: Record<string, string>;
}

/**
 * Plugin HTTP router interface for registering REST API endpoints.
 *
 * All route paths are relative to the plugin's configured base path
 * (set in `permissions.api.basePath`). For example, if the base path
 * is `/plugins/my-plugin`, a route registered as `/stats` will be
 * accessible at `/plugins/my-plugin/stats`.
 *
 * @remarks
 * Handler strings must correspond to method names on the plugin class.
 * The node will call these methods via the worker thread messaging system
 * when HTTP requests are received.
 *
 * @example
 * ```typescript
 * import type { IPluginRouter } from '@btc-vision/plugin-sdk';
 *
 * function registerCrudRoutes(router: IPluginRouter): void {
 *     router.get('/items', 'handleListItems');
 *     router.get('/items/:id', 'handleGetItem');
 *     router.post('/items', 'handleCreateItem');
 *     router.put('/items/:id', 'handleUpdateItem');
 *     router.delete('/items/:id', 'handleDeleteItem');
 *     router.patch('/items/:id', 'handlePatchItem');
 * }
 * ```
 */
export interface IPluginRouter {
    /**
     * Register a GET endpoint.
     *
     * @param path - Route path relative to plugin base path. Supports
     *   Express-style route parameters (e.g., `"/items/:id"`).
     * @param handler - Name of the method on the plugin class to invoke.
     *
     * @example
     * ```typescript
     * router.get('/health', 'handleHealthCheck');
     * ```
     */
    get(path: string, handler: string): void;

    /**
     * Register a POST endpoint.
     *
     * @param path - Route path relative to plugin base path.
     * @param handler - Name of the method on the plugin class to invoke.
     *
     * @example
     * ```typescript
     * router.post('/webhook', 'handleWebhook');
     * ```
     */
    post(path: string, handler: string): void;

    /**
     * Register a PUT endpoint.
     *
     * @param path - Route path relative to plugin base path.
     * @param handler - Name of the method on the plugin class to invoke.
     *
     * @example
     * ```typescript
     * router.put('/config', 'handleUpdateConfig');
     * ```
     */
    put(path: string, handler: string): void;

    /**
     * Register a DELETE endpoint.
     *
     * @param path - Route path relative to plugin base path.
     * @param handler - Name of the method on the plugin class to invoke.
     *
     * @example
     * ```typescript
     * router.delete('/cache', 'handleClearCache');
     * ```
     */
    delete(path: string, handler: string): void;

    /**
     * Register a PATCH endpoint.
     *
     * @param path - Route path relative to plugin base path.
     * @param handler - Name of the method on the plugin class to invoke.
     *
     * @example
     * ```typescript
     * router.patch('/settings', 'handlePatchSettings');
     * ```
     */
    patch(path: string, handler: string): void;
}

/**
 * Plugin WebSocket interface for registering real-time handlers.
 *
 * Allows plugins to handle WebSocket messages identified by opcodes
 * and push notifications to subscribed clients.
 *
 * @remarks
 * WebSocket communication uses a binary protocol (protobuf) if a
 * `.proto` file is specified in the WebSocket permissions. Handler
 * strings must correspond to method names on the plugin class.
 *
 * **Opcode limit:** Each plugin is allocated a maximum of 8 WebSocket
 * opcodes. Attempting to register more than 8 handlers will fail.
 *
 * @example
 * ```typescript
 * import type { IPluginWebSocket } from '@btc-vision/plugin-sdk';
 *
 * function setupWebSocket(ws: IPluginWebSocket): void {
 *     // Register handlers for specific opcodes
 *     ws.registerHandler('subscribe_events', 'handleSubscribeEvents');
 *     ws.registerHandler('unsubscribe_events', 'handleUnsubscribeEvents');
 * }
 *
 * // In the plugin class:
 * async function handleSubscribeEvents(
 *     this: MyPlugin,
 *     clientId: string,
 *     data: unknown,
 *     ws: IPluginWebSocket,
 * ): Promise<void> {
 *     const subId = ws.createSubscription(clientId);
 *     // Store subId for later pushes
 *
 *     // Later, push notifications:
 *     ws.pushNotification(clientId, subId, { event: 'new_block', height: 850000 });
 *
 *     // When done:
 *     ws.closeSubscription(subId);
 * }
 * ```
 */
export interface IPluginWebSocket {
    /**
     * Register a handler for a WebSocket opcode.
     *
     * When a client sends a message with the given opcode, the named
     * method on the plugin class will be invoked.
     *
     * @param opcode - Opcode string identifying the message type.
     * @param handler - Name of the method on the plugin class to invoke.
     *
     * @example
     * ```typescript
     * ws.registerHandler('get_price', 'handleGetPrice');
     * ```
     */
    registerHandler(opcode: string, handler: string): void;

    /**
     * Create a subscription for a connected client.
     *
     * Returns a subscription ID that can be used with
     * {@link pushNotification} to send real-time updates to the client.
     *
     * @param clientId - Unique identifier for the connected client.
     * @returns Numeric subscription ID.
     *
     * @example
     * ```typescript
     * const subId = ws.createSubscription('client-abc-123');
     * // Store subId to push updates later
     * ```
     */
    createSubscription(clientId: string): number;

    /**
     * Push a real-time notification to a subscribed client.
     *
     * The data will be serialized and sent to the client over
     * the WebSocket connection.
     *
     * @param clientId - Client identifier.
     * @param subscriptionId - Subscription ID from {@link createSubscription}.
     * @param data - Notification payload to send.
     *
     * @example
     * ```typescript
     * ws.pushNotification('client-abc-123', subId, {
     *     type: 'new_block',
     *     height: 850000,
     *     hash: '0000000000000000000...',
     * });
     * ```
     */
    pushNotification(clientId: string, subscriptionId: number, data: unknown): void;

    /**
     * Close a subscription and stop sending notifications.
     *
     * Should be called when the client unsubscribes or disconnects.
     *
     * @param subscriptionId - Subscription ID to close.
     *
     * @example
     * ```typescript
     * ws.closeSubscription(subId);
     * ```
     */
    closeSubscription(subscriptionId: number): void;
}
