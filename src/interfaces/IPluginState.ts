/**
 * Plugin lifecycle states
 */
export enum PluginState {
    /** Plugin file discovered but not loaded */
    DISCOVERED = 'discovered',

    /** Plugin passed validation */
    VALIDATED = 'validated',

    /** Plugin is currently loading */
    LOADING = 'loading',

    /** Plugin loaded in worker */
    LOADED = 'loaded',

    /** Plugin is syncing/catching up with chain (BLOCKING) */
    SYNCING = 'syncing',

    /** Plugin active and receiving hooks */
    ENABLED = 'enabled',

    /** Plugin loaded but not receiving hooks */
    DISABLED = 'disabled',

    /** Plugin crashed, requires manual re-enable */
    CRASHED = 'crashed',

    /** Plugin failed validation or loading */
    ERROR = 'error',

    /** Plugin is currently unloading */
    UNLOADING = 'unloading',
}

/**
 * Plugin error information
 */
export interface IPluginError {
    readonly code: string;
    readonly message: string;
    readonly stack?: string;
    readonly timestamp: number;
}

/**
 * Plugin state change event
 */
export interface IPluginStateChange {
    readonly pluginId: string;
    readonly previousState: PluginState;
    readonly newState: PluginState;
    readonly timestamp: number;
    readonly error?: IPluginError;
}

/**
 * State transition validation
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
 * Check if a state transition is valid
 */
export function isValidStateTransition(from: PluginState, to: PluginState): boolean {
    return VALID_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Plugin statistics
 */
export interface IPluginStats {
    readonly pluginId: string;
    readonly hooksExecuted: number;
    readonly hooksFailed: number;
    readonly totalExecutionTimeMs: number;
    readonly averageExecutionTimeMs: number;
    readonly lastExecutionTimestamp?: number;
    readonly memoryUsageBytes?: number;
}
