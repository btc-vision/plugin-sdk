/**
 * Plugin lifecycle state management for OPNet node plugins.
 *
 * This module defines the finite state machine that governs plugin lifecycle
 * transitions within the OPNet node runtime. Every plugin progresses through
 * a well-defined sequence of states -- from initial discovery on disk, through
 * validation and loading, to an active (enabled) or inactive (disabled) state.
 * Error and crash states are also modeled to allow graceful recovery.
 *
 * The module exports:
 * - {@link PluginState} -- an enum of all possible lifecycle states.
 * - {@link IPluginError} -- a structured error descriptor attached to failed transitions.
 * - {@link IPluginStateChange} -- an event payload emitted on every state transition.
 * - {@link VALID_STATE_TRANSITIONS} -- the adjacency list defining legal transitions.
 * - {@link isValidStateTransition} -- a guard function for transition legality.
 * - {@link IPluginStats} -- runtime statistics for a loaded plugin.
 *
 * @example
 * ```typescript
 * import {
 *     PluginState,
 *     IPluginStateChange,
 *     isValidStateTransition,
 *     VALID_STATE_TRANSITIONS,
 *     IPluginError,
 *     IPluginStats,
 * } from '@btc-vision/plugin-sdk';
 *
 * // Check whether a transition is allowed before attempting it
 * if (isValidStateTransition(PluginState.LOADED, PluginState.ENABLED)) {
 *     console.log('Transition from LOADED -> ENABLED is permitted');
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Enumeration of every lifecycle state a plugin can occupy.
 *
 * Plugins move through these states in a deterministic order governed by
 * {@link VALID_STATE_TRANSITIONS}. The OPNet node runtime is responsible for
 * driving transitions; plugin authors can observe them via the
 * `onStateChange` hook or by subscribing to {@link IPluginStateChange} events.
 *
 * **Typical happy-path progression:**
 * ```
 * DISCOVERED -> VALIDATED -> LOADING -> LOADED -> SYNCING -> ENABLED
 * ```
 *
 * **Disable / re-enable cycle:**
 * ```
 * ENABLED -> DISABLED -> ENABLED
 * ```
 *
 * **Error recovery cycle:**
 * ```
 * ERROR -> DISCOVERED  (the plugin is re-scanned from disk)
 * ```
 *
 * @example
 * ```typescript
 * import { PluginState } from '@btc-vision/plugin-sdk';
 *
 * function renderStatusBadge(state: PluginState): string {
 *     switch (state) {
 *         case PluginState.ENABLED:
 *             return 'badge-green';
 *         case PluginState.DISABLED:
 *             return 'badge-grey';
 *         case PluginState.CRASHED:
 *         case PluginState.ERROR:
 *             return 'badge-red';
 *         case PluginState.LOADING:
 *         case PluginState.SYNCING:
 *         case PluginState.UNLOADING:
 *             return 'badge-yellow';
 *         default:
 *             return 'badge-default';
 *     }
 * }
 * ```
 */
export enum PluginState {
    /**
     * Plugin file discovered but not loaded.
     *
     * This is the initial state assigned to a plugin when its `.opnet` file is
     * found on disk during a directory scan. The runtime has not yet attempted
     * to parse or validate the plugin manifest.
     *
     * **Valid transitions from this state:**
     * - {@link PluginState.VALIDATED} -- manifest and signature checks passed.
     * - {@link PluginState.ERROR} -- the file is malformed or the signature is invalid.
     *
     * @example
     * ```typescript
     * import { PluginState } from '@btc-vision/plugin-sdk';
     *
     * const newPlugin = {
     *     id: 'my-analytics-plugin',
     *     state: PluginState.DISCOVERED,
     *     discoveredAt: Date.now(),
     * };
     * console.log(newPlugin.state); // 'discovered'
     * ```
     */
    DISCOVERED = 'discovered',

    /**
     * Plugin passed validation.
     *
     * The runtime has successfully verified the plugin manifest, checked the
     * MLDSA signature, and confirmed that all declared permissions are within
     * the node operator's policy. The plugin is now eligible for loading.
     *
     * **Valid transitions from this state:**
     * - {@link PluginState.LOADING} -- the runtime begins instantiating the worker.
     * - {@link PluginState.ERROR} -- a late validation failure (e.g. dependency conflict).
     *
     * @example
     * ```typescript
     * import { PluginState, isValidStateTransition } from '@btc-vision/plugin-sdk';
     *
     * // After validation succeeds, transition to LOADING
     * const canLoad = isValidStateTransition(PluginState.VALIDATED, PluginState.LOADING);
     * console.log(canLoad); // true
     * ```
     */
    VALIDATED = 'validated',

    /**
     * Plugin is currently loading.
     *
     * The runtime is spawning a worker thread, compiling the plugin bytecode,
     * and injecting the sandboxed {@link IPluginContext}. This state is
     * transient and should resolve quickly to either {@link PluginState.LOADED}
     * or {@link PluginState.ERROR}.
     *
     * **Valid transitions from this state:**
     * - {@link PluginState.LOADED} -- the worker reports readiness.
     * - {@link PluginState.ERROR} -- the bytecode failed to compile or the worker timed out.
     *
     * @example
     * ```typescript
     * import { PluginState } from '@btc-vision/plugin-sdk';
     *
     * function isTransientState(state: PluginState): boolean {
     *     return state === PluginState.LOADING || state === PluginState.UNLOADING;
     * }
     * ```
     */
    LOADING = 'loading',

    /**
     * Plugin loaded in worker.
     *
     * The plugin bytecode has been compiled and the worker is alive, but the
     * plugin has not yet started processing blockchain data. From here the
     * runtime will typically initiate a sync or enable the plugin directly
     * (if no historical catch-up is required).
     *
     * **Valid transitions from this state:**
     * - {@link PluginState.SYNCING} -- the plugin needs to catch up with chain history.
     * - {@link PluginState.ENABLED} -- the plugin is already in sync and can begin immediately.
     * - {@link PluginState.DISABLED} -- the node operator chose to keep the plugin inactive.
     * - {@link PluginState.UNLOADING} -- an immediate teardown was requested.
     *
     * @example
     * ```typescript
     * import { PluginState, VALID_STATE_TRANSITIONS } from '@btc-vision/plugin-sdk';
     *
     * // Enumerate every state reachable from LOADED
     * const reachable = VALID_STATE_TRANSITIONS[PluginState.LOADED];
     * console.log(reachable);
     * // ['syncing', 'enabled', 'disabled', 'unloading']
     * ```
     */
    LOADED = 'loaded',

    /**
     * Plugin is syncing/catching up with chain (BLOCKING).
     *
     * The plugin is replaying historical blocks or transactions to build up
     * its internal state to the current chain tip. While in this state the
     * plugin **blocks** the node's processing pipeline for its registered hook
     * types -- other plugins are unaffected.
     *
     * **Valid transitions from this state:**
     * - {@link PluginState.ENABLED} -- sync completed successfully.
     * - {@link PluginState.ERROR} -- an unrecoverable error occurred during sync.
     * - {@link PluginState.CRASHED} -- the worker terminated unexpectedly.
     *
     * @example
     * ```typescript
     * import { PluginState, IPluginStateChange } from '@btc-vision/plugin-sdk';
     *
     * function handleStateChange(event: IPluginStateChange): void {
     *     if (
     *         event.previousState === PluginState.SYNCING &&
     *         event.newState === PluginState.ENABLED
     *     ) {
     *         console.log(
     *             `Plugin ${event.pluginId} finished syncing and is now enabled.`,
     *         );
     *     }
     * }
     * ```
     */
    SYNCING = 'syncing',

    /**
     * Plugin active and receiving hooks.
     *
     * This is the primary operational state. The plugin's registered hook
     * handlers are invoked by the runtime whenever matching blockchain events
     * occur (new blocks, transactions, epochs, etc.). The plugin can also
     * serve API routes and WebSocket connections if it has the corresponding
     * permissions.
     *
     * **Valid transitions from this state:**
     * - {@link PluginState.DISABLED} -- the node operator (or the plugin itself) requested deactivation.
     * - {@link PluginState.CRASHED} -- the worker terminated unexpectedly.
     * - {@link PluginState.UNLOADING} -- the plugin is being fully removed.
     *
     * @example
     * ```typescript
     * import { PluginState } from '@btc-vision/plugin-sdk';
     *
     * function isAcceptingHooks(state: PluginState): boolean {
     *     return state === PluginState.ENABLED;
     * }
     *
     * // Only dispatch hooks to plugins in the ENABLED state
     * const activePlugins = allPlugins.filter(
     *     (p) => isAcceptingHooks(p.state),
     * );
     * ```
     */
    ENABLED = 'enabled',

    /**
     * Plugin loaded but not receiving hooks.
     *
     * The plugin's worker is still alive and its state is preserved in memory,
     * but the runtime will not dispatch any hook events to it. This state is
     * useful for temporarily pausing a plugin without losing its in-memory
     * caches or database connections.
     *
     * **Valid transitions from this state:**
     * - {@link PluginState.ENABLED} -- the plugin is re-activated.
     * - {@link PluginState.SYNCING} -- the plugin needs to catch up on blocks missed while disabled.
     * - {@link PluginState.UNLOADING} -- the plugin is being fully removed.
     *
     * @example
     * ```typescript
     * import { PluginState, isValidStateTransition } from '@btc-vision/plugin-sdk';
     *
     * // A disabled plugin can be re-enabled or may need to sync first
     * console.log(isValidStateTransition(PluginState.DISABLED, PluginState.ENABLED));  // true
     * console.log(isValidStateTransition(PluginState.DISABLED, PluginState.SYNCING));  // true
     * console.log(isValidStateTransition(PluginState.DISABLED, PluginState.LOADING));  // false
     * ```
     */
    DISABLED = 'disabled',

    /**
     * Plugin crashed, requires manual re-enable.
     *
     * The plugin's worker thread terminated unexpectedly (e.g. out-of-memory,
     * unhandled exception, segfault in native code). The runtime will **not**
     * automatically restart the plugin; the node operator must explicitly
     * re-enable or re-sync it.
     *
     * **Valid transitions from this state:**
     * - {@link PluginState.ENABLED} -- operator manually re-enables (skipping sync).
     * - {@link PluginState.SYNCING} -- operator triggers a full re-sync.
     * - {@link PluginState.UNLOADING} -- the plugin is removed entirely.
     *
     * @example
     * ```typescript
     * import { PluginState, IPluginStateChange } from '@btc-vision/plugin-sdk';
     *
     * function logCrash(event: IPluginStateChange): void {
     *     if (event.newState === PluginState.CRASHED) {
     *         console.error(
     *             `Plugin ${event.pluginId} CRASHED at ${new Date(event.timestamp).toISOString()}`,
     *         );
     *         if (event.error) {
     *             console.error(`  Reason: [${event.error.code}] ${event.error.message}`);
     *         }
     *     }
     * }
     * ```
     */
    CRASHED = 'crashed',

    /**
     * Plugin failed validation or loading.
     *
     * An unrecoverable error prevented the plugin from reaching an operational
     * state. Common causes include invalid manifests, signature verification
     * failures, bytecode compilation errors, or permission policy violations.
     *
     * The only way out of this state is to return to {@link PluginState.DISCOVERED},
     * which occurs when the node operator fixes the underlying issue and
     * triggers a re-scan of the plugin directory.
     *
     * **Valid transitions from this state:**
     * - {@link PluginState.DISCOVERED} -- the plugin file is re-scanned after a fix.
     *
     * @example
     * ```typescript
     * import { PluginState, IPluginError, IPluginStateChange } from '@btc-vision/plugin-sdk';
     *
     * function buildErrorReport(event: IPluginStateChange): string {
     *     if (event.newState !== PluginState.ERROR || !event.error) {
     *         return '';
     *     }
     *     const { code, message, stack, timestamp } = event.error;
     *     return [
     *         `Plugin:    ${event.pluginId}`,
     *         `Error:     [${code}] ${message}`,
     *         `Occurred:  ${new Date(timestamp).toISOString()}`,
     *         stack ? `Stack:\n${stack}` : '',
     *     ].filter(Boolean).join('\n');
     * }
     * ```
     */
    ERROR = 'error',

    /**
     * Plugin is currently unloading.
     *
     * The runtime is gracefully shutting down the plugin's worker thread,
     * flushing pending writes, and releasing resources. This state is
     * transient; once teardown completes the plugin returns to
     * {@link PluginState.DISCOVERED} so it can be reloaded if needed.
     *
     * **Valid transitions from this state:**
     * - {@link PluginState.DISCOVERED} -- teardown completed; the plugin can be re-loaded.
     *
     * @example
     * ```typescript
     * import { PluginState } from '@btc-vision/plugin-sdk';
     *
     * async function waitForUnload(
     *     getState: () => PluginState,
     *     intervalMs: number = 100,
     *     timeoutMs: number = 10_000,
     * ): Promise<boolean> {
     *     const deadline = Date.now() + timeoutMs;
     *     while (getState() === PluginState.UNLOADING) {
     *         if (Date.now() > deadline) return false;
     *         await new Promise((r) => setTimeout(r, intervalMs));
     *     }
     *     return true;
     * }
     * ```
     */
    UNLOADING = 'unloading',
}

/**
 * Structured error descriptor attached to a plugin when it enters an error
 * or crash state.
 *
 * Every time a plugin transitions to {@link PluginState.ERROR} or
 * {@link PluginState.CRASHED}, an `IPluginError` instance is created and
 * attached to the corresponding {@link IPluginStateChange} event. This gives
 * node operators and monitoring systems a machine-readable error code
 * alongside the human-readable message and optional stack trace.
 *
 * @example
 * ```typescript
 * import { IPluginError } from '@btc-vision/plugin-sdk';
 *
 * const validationError: IPluginError = {
 *     code: 'MANIFEST_INVALID',
 *     message: 'The "hooks" field in the manifest references an unknown hook type "onFoo".',
 *     stack: undefined,
 *     timestamp: Date.now(),
 * };
 *
 * console.log(`[${validationError.code}] ${validationError.message}`);
 * // [MANIFEST_INVALID] The "hooks" field in the manifest references an unknown hook type "onFoo".
 * ```
 *
 * @example
 * ```typescript
 * import { IPluginError } from '@btc-vision/plugin-sdk';
 *
 * // Creating an error from a caught exception
 * function toPluginError(err: unknown): IPluginError {
 *     if (err instanceof Error) {
 *         return {
 *             code: err.name,
 *             message: err.message,
 *             stack: err.stack,
 *             timestamp: Date.now(),
 *         };
 *     }
 *     return {
 *         code: 'UNKNOWN',
 *         message: String(err),
 *         timestamp: Date.now(),
 *     };
 * }
 * ```
 */
export interface IPluginError {
    /**
     * A short, machine-readable error code (e.g. `"MANIFEST_INVALID"`,
     * `"WORKER_OOM"`, `"SIGNATURE_MISMATCH"`).
     *
     * Error codes are upper-snake-case strings without spaces. They are
     * intended for programmatic matching in monitoring dashboards and
     * automated recovery scripts.
     *
     * @example
     * ```typescript
     * import { IPluginError } from '@btc-vision/plugin-sdk';
     *
     * function isRecoverable(error: IPluginError): boolean {
     *     const transientCodes = new Set(['WORKER_OOM', 'TIMEOUT', 'NETWORK_ERROR']);
     *     return transientCodes.has(error.code);
     * }
     * ```
     */
    readonly code: string;

    /**
     * A human-readable description of what went wrong.
     *
     * This string is intended for log output and operator-facing UIs. It
     * should provide enough context for a developer to understand the failure
     * without needing to inspect the stack trace.
     *
     * @example
     * ```typescript
     * import { IPluginError } from '@btc-vision/plugin-sdk';
     *
     * function formatForLog(error: IPluginError): string {
     *     return `[${new Date(error.timestamp).toISOString()}] ${error.code}: ${error.message}`;
     * }
     * ```
     */
    readonly message: string;

    /**
     * Optional JavaScript stack trace captured at the point of failure.
     *
     * This field is populated when the error originates from a thrown
     * `Error` object inside the plugin worker. It may be `undefined` for
     * errors that are detected by the runtime rather than thrown by
     * user code (e.g. signature verification failures).
     *
     * @example
     * ```typescript
     * import { IPluginError } from '@btc-vision/plugin-sdk';
     *
     * function printDiagnostics(error: IPluginError): void {
     *     console.error(`Error: ${error.message}`);
     *     if (error.stack) {
     *         console.error('Stack trace:');
     *         console.error(error.stack);
     *     } else {
     *         console.error('(no stack trace available)');
     *     }
     * }
     * ```
     */
    readonly stack?: string;

    /**
     * Unix epoch timestamp (in milliseconds) of when the error occurred.
     *
     * This value is produced by `Date.now()` at the moment the error is
     * captured. It can be compared against {@link IPluginStateChange.timestamp}
     * and {@link IPluginStats.lastExecutionTimestamp} for timeline correlation.
     *
     * @example
     * ```typescript
     * import { IPluginError } from '@btc-vision/plugin-sdk';
     *
     * function errorAge(error: IPluginError): string {
     *     const ageMs = Date.now() - error.timestamp;
     *     const ageSec = Math.floor(ageMs / 1000);
     *     return `${ageSec}s ago`;
     * }
     * ```
     */
    readonly timestamp: number;
}

/**
 * Event payload emitted whenever a plugin transitions from one
 * {@link PluginState} to another.
 *
 * The OPNet node runtime emits an `IPluginStateChange` object on every
 * successful state transition. Consumers (dashboards, alerting systems,
 * other plugins with the appropriate permissions) can subscribe to these
 * events to monitor plugin health in real time.
 *
 * If the transition leads to an error or crash state, the optional
 * {@link IPluginStateChange.error} field will contain an {@link IPluginError}
 * with details about the failure.
 *
 * @example
 * ```typescript
 * import {
 *     IPluginStateChange,
 *     PluginState,
 * } from '@btc-vision/plugin-sdk';
 *
 * // Example: a state change event when a plugin finishes loading
 * const event: IPluginStateChange = {
 *     pluginId: 'analytics-plugin-v2',
 *     previousState: PluginState.LOADING,
 *     newState: PluginState.LOADED,
 *     timestamp: Date.now(),
 * };
 *
 * console.log(
 *     `${event.pluginId}: ${event.previousState} -> ${event.newState}`,
 * );
 * // analytics-plugin-v2: loading -> loaded
 * ```
 *
 * @example
 * ```typescript
 * import {
 *     IPluginStateChange,
 *     PluginState,
 *     IPluginError,
 * } from '@btc-vision/plugin-sdk';
 *
 * // Example: a state change event with an error
 * const crashEvent: IPluginStateChange = {
 *     pluginId: 'price-oracle',
 *     previousState: PluginState.ENABLED,
 *     newState: PluginState.CRASHED,
 *     timestamp: Date.now(),
 *     error: {
 *         code: 'WORKER_OOM',
 *         message: 'Worker exceeded 512 MB memory limit',
 *         timestamp: Date.now(),
 *     },
 * };
 * ```
 */
export interface IPluginStateChange {
    /**
     * The unique identifier of the plugin whose state changed.
     *
     * This corresponds to the `name` field in the plugin's
     * {@link IPluginMetadata} manifest and is guaranteed to be unique
     * within a single OPNet node instance.
     *
     * @example
     * ```typescript
     * import { IPluginStateChange } from '@btc-vision/plugin-sdk';
     *
     * function filterByPlugin(
     *     events: IPluginStateChange[],
     *     pluginId: string,
     * ): IPluginStateChange[] {
     *     return events.filter((e) => e.pluginId === pluginId);
     * }
     * ```
     */
    readonly pluginId: string;

    /**
     * The {@link PluginState} the plugin was in immediately before this
     * transition.
     *
     * Together with {@link newState}, this forms a directed edge in the
     * state machine graph. The pair must be present in
     * {@link VALID_STATE_TRANSITIONS} for the transition to be legal.
     *
     * @example
     * ```typescript
     * import { IPluginStateChange, PluginState } from '@btc-vision/plugin-sdk';
     *
     * function wasLoadingPhase(event: IPluginStateChange): boolean {
     *     return (
     *         event.previousState === PluginState.LOADING ||
     *         event.previousState === PluginState.SYNCING
     *     );
     * }
     * ```
     */
    readonly previousState: PluginState;

    /**
     * The {@link PluginState} the plugin has entered as a result of this
     * transition.
     *
     * @example
     * ```typescript
     * import { IPluginStateChange, PluginState } from '@btc-vision/plugin-sdk';
     *
     * function isNowOperational(event: IPluginStateChange): boolean {
     *     return event.newState === PluginState.ENABLED;
     * }
     * ```
     */
    readonly newState: PluginState;

    /**
     * Unix epoch timestamp (in milliseconds) of when the transition occurred.
     *
     * This is set by the runtime at the moment the transition is committed,
     * which may differ slightly from {@link IPluginError.timestamp} if an
     * error was detected asynchronously.
     *
     * @example
     * ```typescript
     * import { IPluginStateChange } from '@btc-vision/plugin-sdk';
     *
     * function transitionDuration(
     *     earlier: IPluginStateChange,
     *     later: IPluginStateChange,
     * ): number {
     *     return later.timestamp - earlier.timestamp;
     * }
     * ```
     */
    readonly timestamp: number;

    /**
     * Optional error information present when the plugin transitions to
     * {@link PluginState.ERROR} or {@link PluginState.CRASHED}.
     *
     * When the transition is a normal, healthy one (e.g. `LOADED -> ENABLED`),
     * this field is `undefined`.
     *
     * @example
     * ```typescript
     * import { IPluginStateChange, PluginState } from '@btc-vision/plugin-sdk';
     *
     * function alertOnError(event: IPluginStateChange): void {
     *     if (event.error) {
     *         console.error(
     *             `ALERT: Plugin ${event.pluginId} entered ${event.newState} ` +
     *             `with error [${event.error.code}]: ${event.error.message}`,
     *         );
     *     }
     * }
     * ```
     */
    readonly error?: IPluginError;
}

/**
 * Adjacency list defining every legal state transition in the plugin
 * lifecycle state machine.
 *
 * Each key is a {@link PluginState} and the corresponding value is a
 * read-only array of states that the plugin is allowed to move into from
 * that key state. Any transition not listed here is considered **illegal**
 * and will be rejected by the runtime.
 *
 * Use {@link isValidStateTransition} for a convenient boolean check rather
 * than querying this map directly.
 *
 * **State machine diagram (simplified):**
 * ```
 *  DISCOVERED --> VALIDATED --> LOADING --> LOADED --+--> SYNCING --> ENABLED
 *       ^                                  |   |    |        |          |
 *       |                                  |   |    |        v          v
 *       +---- ERROR <--- (any error) ------+   |    +--- DISABLED    CRASHED
 *       |                                      |    |       |    |      |
 *       +---------- UNLOADING <----------------+----+-------+    +------+
 *                       |                                        |
 *                       +-----> DISCOVERED (re-scan) <-----------+
 * ```
 *
 * @example
 * ```typescript
 * import { VALID_STATE_TRANSITIONS, PluginState } from '@btc-vision/plugin-sdk';
 *
 * // List every state reachable from ENABLED
 * const fromEnabled = VALID_STATE_TRANSITIONS[PluginState.ENABLED];
 * console.log(fromEnabled);
 * // [PluginState.DISABLED, PluginState.CRASHED, PluginState.UNLOADING]
 * ```
 *
 * @example
 * ```typescript
 * import { VALID_STATE_TRANSITIONS, PluginState } from '@btc-vision/plugin-sdk';
 *
 * // Build a reverse map: for each state, which states can transition INTO it?
 * const incomingTransitions: Record<string, PluginState[]> = {};
 * for (const [from, targets] of Object.entries(VALID_STATE_TRANSITIONS)) {
 *     for (const to of targets) {
 *         (incomingTransitions[to] ??= []).push(from as PluginState);
 *     }
 * }
 * console.log(incomingTransitions[PluginState.ENABLED]);
 * // ['loaded', 'syncing', 'disabled', 'crashed']
 * ```
 */
export const VALID_STATE_TRANSITIONS: Record<PluginState, readonly PluginState[]> = {
    [PluginState.DISCOVERED]: [PluginState.VALIDATED, PluginState.ERROR],
    [PluginState.VALIDATED]: [PluginState.LOADING, PluginState.ERROR],
    [PluginState.LOADING]: [PluginState.LOADED, PluginState.ERROR],
    [PluginState.LOADED]: [
        PluginState.SYNCING,
        PluginState.ENABLED,
        PluginState.DISABLED,
        PluginState.UNLOADING,
    ],
    [PluginState.SYNCING]: [PluginState.ENABLED, PluginState.ERROR, PluginState.CRASHED],
    [PluginState.ENABLED]: [PluginState.DISABLED, PluginState.CRASHED, PluginState.UNLOADING],
    [PluginState.DISABLED]: [PluginState.ENABLED, PluginState.SYNCING, PluginState.UNLOADING],
    [PluginState.CRASHED]: [PluginState.ENABLED, PluginState.SYNCING, PluginState.UNLOADING],
    [PluginState.ERROR]: [PluginState.DISCOVERED],
    [PluginState.UNLOADING]: [PluginState.DISCOVERED],
};

/**
 * Checks whether a state transition from one {@link PluginState} to another
 * is permitted by the lifecycle state machine.
 *
 * This is a pure, synchronous guard function with no side effects. It
 * consults {@link VALID_STATE_TRANSITIONS} and returns `true` if `to`
 * appears in the adjacency list for `from`, or `false` otherwise.
 *
 * Use this function before attempting to commit a state change in order to
 * fail fast with a clear error rather than corrupting the plugin lifecycle.
 *
 * @param from - The current {@link PluginState} of the plugin.
 * @param to   - The desired target {@link PluginState}.
 * @returns `true` if the transition from `from` to `to` is allowed;
 *          `false` otherwise.
 *
 * @example
 * ```typescript
 * import { isValidStateTransition, PluginState } from '@btc-vision/plugin-sdk';
 *
 * // Guard a transition attempt
 * function transitionPlugin(current: PluginState, next: PluginState): void {
 *     if (!isValidStateTransition(current, next)) {
 *         throw new Error(
 *             `Illegal state transition: ${current} -> ${next}`,
 *         );
 *     }
 *     // ... perform the transition
 * }
 *
 * transitionPlugin(PluginState.ENABLED, PluginState.DISABLED); // OK
 * transitionPlugin(PluginState.ERROR, PluginState.ENABLED);    // throws
 * ```
 *
 * @example
 * ```typescript
 * import { isValidStateTransition, PluginState } from '@btc-vision/plugin-sdk';
 *
 * // Compute all legal next states for a given current state
 * function legalNextStates(current: PluginState): PluginState[] {
 *     return Object.values(PluginState).filter((candidate) =>
 *         isValidStateTransition(current, candidate),
 *     );
 * }
 *
 * console.log(legalNextStates(PluginState.LOADED));
 * // [PluginState.SYNCING, PluginState.ENABLED, PluginState.DISABLED, PluginState.UNLOADING]
 * ```
 */
export function isValidStateTransition(from: PluginState, to: PluginState): boolean {
    return VALID_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Runtime statistics for a single loaded plugin.
 *
 * The OPNet node runtime maintains an `IPluginStats` record for every plugin
 * that has reached at least the {@link PluginState.LOADED} state. Statistics
 * are cumulative for the lifetime of the current node process and are reset
 * when the plugin is unloaded.
 *
 * These metrics are exposed through the node's admin API and can be used for
 * performance monitoring, alerting, and capacity planning.
 *
 * @example
 * ```typescript
 * import { IPluginStats } from '@btc-vision/plugin-sdk';
 *
 * function printStats(stats: IPluginStats): void {
 *     console.log(`Plugin:         ${stats.pluginId}`);
 *     console.log(`Hooks executed: ${stats.hooksExecuted}`);
 *     console.log(`Hooks failed:   ${stats.hooksFailed}`);
 *     console.log(`Avg exec time:  ${stats.averageExecutionTimeMs.toFixed(2)} ms`);
 *     if (stats.memoryUsageBytes !== undefined) {
 *         const mb = (stats.memoryUsageBytes / (1024 * 1024)).toFixed(1);
 *         console.log(`Memory usage:   ${mb} MB`);
 *     }
 * }
 * ```
 *
 * @example
 * ```typescript
 * import { IPluginStats } from '@btc-vision/plugin-sdk';
 *
 * // Compute a reliability percentage
 * function reliability(stats: IPluginStats): number {
 *     if (stats.hooksExecuted === 0) return 100;
 *     return ((stats.hooksExecuted - stats.hooksFailed) / stats.hooksExecuted) * 100;
 * }
 *
 * const stats: IPluginStats = {
 *     pluginId: 'dex-indexer',
 *     hooksExecuted: 15_230,
 *     hooksFailed: 3,
 *     totalExecutionTimeMs: 482_100,
 *     averageExecutionTimeMs: 31.66,
 *     lastExecutionTimestamp: Date.now(),
 *     memoryUsageBytes: 67_108_864, // 64 MB
 * };
 *
 * console.log(`Reliability: ${reliability(stats).toFixed(2)}%`);
 * // Reliability: 99.98%
 * ```
 */
export interface IPluginStats {
    /**
     * The unique identifier of the plugin these statistics belong to.
     *
     * Matches the `name` field from the plugin's {@link IPluginMetadata}
     * manifest and the `pluginId` field on {@link IPluginStateChange} events.
     *
     * @example
     * ```typescript
     * import { IPluginStats } from '@btc-vision/plugin-sdk';
     *
     * function getStatsForPlugin(
     *     allStats: IPluginStats[],
     *     pluginId: string,
     * ): IPluginStats | undefined {
     *     return allStats.find((s) => s.pluginId === pluginId);
     * }
     * ```
     */
    readonly pluginId: string;

    /**
     * Total number of hook invocations that have been dispatched to this
     * plugin since it was loaded.
     *
     * This counter includes both successful and failed executions. To get
     * the number of successful executions, subtract {@link hooksFailed}.
     *
     * @example
     * ```typescript
     * import { IPluginStats } from '@btc-vision/plugin-sdk';
     *
     * function successfulHooks(stats: IPluginStats): number {
     *     return stats.hooksExecuted - stats.hooksFailed;
     * }
     * ```
     */
    readonly hooksExecuted: number;

    /**
     * Total number of hook invocations that resulted in an error (thrown
     * exception or timeout) since the plugin was loaded.
     *
     * A high ratio of `hooksFailed / hooksExecuted` may indicate a buggy
     * plugin and could trigger automatic disabling by the runtime if the
     * node operator has configured such a policy.
     *
     * @example
     * ```typescript
     * import { IPluginStats } from '@btc-vision/plugin-sdk';
     *
     * function failureRate(stats: IPluginStats): number {
     *     if (stats.hooksExecuted === 0) return 0;
     *     return stats.hooksFailed / stats.hooksExecuted;
     * }
     *
     * // Alert if failure rate exceeds 5%
     * function checkHealth(stats: IPluginStats): void {
     *     if (failureRate(stats) > 0.05) {
     *         console.warn(`Plugin ${stats.pluginId} failure rate is above 5%!`);
     *     }
     * }
     * ```
     */
    readonly hooksFailed: number;

    /**
     * Cumulative wall-clock time (in milliseconds) spent executing hooks
     * for this plugin.
     *
     * This measures the total time from hook dispatch to hook completion
     * (or timeout) across all invocations. It does **not** include time
     * spent waiting in the dispatch queue.
     *
     * @example
     * ```typescript
     * import { IPluginStats } from '@btc-vision/plugin-sdk';
     *
     * function formattedTotalTime(stats: IPluginStats): string {
     *     const seconds = (stats.totalExecutionTimeMs / 1000).toFixed(1);
     *     return `${seconds}s total execution time`;
     * }
     * ```
     */
    readonly totalExecutionTimeMs: number;

    /**
     * Average wall-clock time (in milliseconds) per hook execution.
     *
     * Computed as `totalExecutionTimeMs / hooksExecuted`. If no hooks have
     * been executed yet, this value is `0`.
     *
     * @example
     * ```typescript
     * import { IPluginStats } from '@btc-vision/plugin-sdk';
     *
     * function isSlowPlugin(stats: IPluginStats, thresholdMs: number = 100): boolean {
     *     return stats.averageExecutionTimeMs > thresholdMs;
     * }
     * ```
     */
    readonly averageExecutionTimeMs: number;

    /**
     * Unix epoch timestamp (in milliseconds) of the most recent hook
     * execution, or `undefined` if no hooks have been executed yet.
     *
     * This can be used to detect stale plugins that are nominally
     * {@link PluginState.ENABLED} but have not processed any events recently.
     *
     * @example
     * ```typescript
     * import { IPluginStats } from '@btc-vision/plugin-sdk';
     *
     * function isStale(stats: IPluginStats, maxIdleMs: number = 60_000): boolean {
     *     if (stats.lastExecutionTimestamp === undefined) return false;
     *     return Date.now() - stats.lastExecutionTimestamp > maxIdleMs;
     * }
     * ```
     */
    readonly lastExecutionTimestamp?: number;

    /**
     * Approximate heap memory (in bytes) consumed by the plugin's worker
     * thread, or `undefined` if memory tracking is not available.
     *
     * This value is sampled periodically by the runtime (typically every
     * 10 seconds) and should be treated as an approximation rather than a
     * precise measurement.
     *
     * @example
     * ```typescript
     * import { IPluginStats } from '@btc-vision/plugin-sdk';
     *
     * function memoryUsageMB(stats: IPluginStats): string {
     *     if (stats.memoryUsageBytes === undefined) return 'N/A';
     *     return `${(stats.memoryUsageBytes / (1024 * 1024)).toFixed(1)} MB`;
     * }
     *
     * // Example: warn if a plugin exceeds 256 MB
     * function checkMemory(stats: IPluginStats, limitBytes: number = 256 * 1024 * 1024): void {
     *     if (stats.memoryUsageBytes !== undefined && stats.memoryUsageBytes > limitBytes) {
     *         console.warn(
     *             `Plugin ${stats.pluginId} is using ${memoryUsageMB(stats)} ` +
     *             `(limit: ${(limitBytes / (1024 * 1024)).toFixed(0)} MB)`,
     *         );
     *     }
     * }
     * ```
     */
    readonly memoryUsageBytes?: number;
}
