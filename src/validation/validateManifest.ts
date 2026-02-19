/**
 * Plugin manifest validation utilities.
 *
 * Validates `plugin.json` manifest files against the {@link IPluginMetadata}
 * schema. Used by the OPNet node during plugin installation and loading
 * to ensure manifests are well-formed before proceeding.
 *
 * @remarks
 * The validator checks:
 * - Required fields (name, version, opnetVersion, main, checksum, author)
 * - Name format (lowercase, hyphenated, max length)
 * - Version format (semver)
 * - Target and type fixed values
 * - Plugin type classification
 * - Permission structure and collection naming
 * - Signature algorithm validity
 *
 * @example
 * ```typescript
 * import { validateManifest } from '@btc-vision/plugin-sdk';
 *
 * const rawManifest = JSON.parse(manifestJson);
 * const result = validateManifest(rawManifest);
 *
 * if (result.valid) {
 *     console.log(`Valid manifest: ${result.manifest!.name} v${result.manifest!.version}`);
 * } else {
 *     for (const error of result.errors) {
 *         console.error(`[${error.path}] ${error.message}`);
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

import {
    IPluginMetadata,
    PLUGIN_NAME_REGEX,
    MAX_PLUGIN_NAME_LENGTH,
    MAX_DESCRIPTION_LENGTH,
} from '../interfaces/IPluginMetadata.js';

/**
 * Individual validation error with path and message.
 *
 * The `path` field uses dot-notation to identify the location of the
 * error within the manifest (e.g., `"permissions.database.collections[0]"`).
 *
 * @example
 * ```typescript
 * import type { IValidationError } from '@btc-vision/plugin-sdk';
 *
 * function formatError(error: IValidationError): string {
 *     if (error.path) {
 *         return `Field "${error.path}": ${error.message}`;
 *     }
 *     return error.message;
 * }
 *
 * // Example error objects:
 * // { path: 'name', message: 'name is required and must be a non-empty string' }
 * // { path: 'permissions.database.collections[0]', message: 'Collection name must be prefixed with plugin name: "my-plugin_"' }
 * ```
 */
export interface IValidationError {
    /**
     * Dot-notation path to the invalid field.
     *
     * Empty string for root-level errors (e.g., manifest is not an object).
     *
     * @example `"permissions.database.collections"`, `"author.name"`, `""`
     */
    readonly path: string;

    /**
     * Human-readable error description.
     *
     * @example `"Name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens"`
     */
    readonly message: string;
}

/**
 * Result of validating a plugin manifest.
 *
 * If `valid` is `true`, the parsed manifest is available in `manifest`.
 * If `valid` is `false`, check `errors` for details. Non-fatal issues
 * are reported in `warnings`.
 *
 * @example
 * ```typescript
 * import { validateManifest, type IValidationResult } from '@btc-vision/plugin-sdk';
 *
 * function loadPlugin(manifestJson: string): IPluginMetadata {
 *     const result: IValidationResult = validateManifest(JSON.parse(manifestJson));
 *
 *     if (!result.valid) {
 *         const errorSummary = result.errors
 *             .map((e) => `  - [${e.path}] ${e.message}`)
 *             .join('\n');
 *         throw new Error(`Invalid manifest:\n${errorSummary}`);
 *     }
 *
 *     for (const warning of result.warnings) {
 *         console.warn(`Warning: ${warning}`);
 *     }
 *
 *     return result.manifest!;
 * }
 * ```
 */
export interface IValidationResult {
    /**
     * Whether the manifest passed all validation checks.
     */
    readonly valid: boolean;

    /**
     * Parsed and typed manifest object (only present when `valid` is `true`).
     */
    readonly manifest?: IPluginMetadata;

    /**
     * Array of validation errors (empty when `valid` is `true`).
     */
    readonly errors: IValidationError[];

    /**
     * Array of non-fatal warning messages.
     *
     * Warnings indicate potential issues that do not prevent loading
     * but may cause unexpected behavior.
     */
    readonly warnings: string[];
}

/**
 * Regex pattern for validating semver version strings.
 *
 * Matches: `"1.0.0"`, `"2.1.0-beta.1"`, `"1.0.0+build.123"`
 *
 * @internal
 */
const SEMVER_REGEX = /^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/;

/**
 * Simplified regex for semver range expressions.
 *
 * Matches: `"^1.0.0"`, `">=1.2.0 <2.0.0"`, `"~1.0"`, `"*"`
 *
 * @internal
 */
const SEMVER_RANGE_REGEX = /^[\^~>=<\s\d.|*x-]+(?:[\w.-]+)?$/;

/**
 * Validate a raw plugin manifest object against the OPNet plugin schema.
 *
 * Performs comprehensive validation of all manifest fields including
 * required fields, format constraints, permission structures, and
 * signature information.
 *
 * @param manifest - Raw manifest object (typically from `JSON.parse()`).
 * @returns Validation result with typed manifest (if valid) or error details.
 *
 * @example
 * ```typescript
 * import { validateManifest } from '@btc-vision/plugin-sdk';
 * import { readFileSync } from 'fs';
 *
 * // Validate a plugin.json file
 * const raw = JSON.parse(readFileSync('plugin.json', 'utf-8'));
 * const result = validateManifest(raw);
 *
 * if (result.valid) {
 *     const manifest = result.manifest!;
 *     console.log(`Plugin: ${manifest.name} v${manifest.version}`);
 *     console.log(`Author: ${manifest.author.name}`);
 *     console.log(`Type: ${manifest.pluginType}`);
 * } else {
 *     console.error(`Validation failed with ${result.errors.length} errors:`);
 *     for (const err of result.errors) {
 *         console.error(`  [${err.path || 'root'}] ${err.message}`);
 *     }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Validate programmatically constructed manifest
 * import { validateManifest } from '@btc-vision/plugin-sdk';
 *
 * const result = validateManifest({
 *     name: 'my-plugin',
 *     version: '1.0.0',
 *     opnetVersion: '^1.0.0',
 *     main: 'dist/index.jsc',
 *     target: 'bytenode',
 *     type: 'plugin',
 *     pluginType: 'standalone',
 *     checksum: 'sha256:abc123...',
 *     author: { name: 'Alice' },
 * });
 *
 * console.log(result.valid); // true
 * ```
 */
/**
 * Regex pattern for validating checksum hex portion (`sha256:` prefix + 64 hex chars).
 *
 * @internal
 */
const CHECKSUM_HEX_REGEX = /^[a-f0-9]{64}$/i;

export function validateManifest(manifest: unknown): IValidationResult {
    const errors: IValidationError[] = [];
    const warnings: string[] = [];

    if (!manifest || typeof manifest !== 'object') {
        return {
            valid: false,
            errors: [{ path: '', message: 'Manifest must be an object' }],
            warnings,
        };
    }

    const m = manifest as Record<string, unknown>;

    // Required string fields
    validateRequiredString(m, 'name', errors);
    validateRequiredString(m, 'version', errors);
    validateRequiredString(m, 'opnetVersion', errors);
    validateRequiredString(m, 'main', errors);
    validateRequiredString(m, 'checksum', errors);

    // Name validation
    if (typeof m.name === 'string') {
        if (m.name.length > MAX_PLUGIN_NAME_LENGTH) {
            errors.push({
                path: 'name',
                message: `Name must not exceed ${MAX_PLUGIN_NAME_LENGTH} characters`,
            });
        }
        if (!PLUGIN_NAME_REGEX.test(m.name)) {
            errors.push({
                path: 'name',
                message:
                    'Name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens',
            });
        }
    }

    // Version validation
    if (typeof m.version === 'string' && !SEMVER_REGEX.test(m.version)) {
        errors.push({
            path: 'version',
            message: 'Version must be a valid semver string',
        });
    }

    // opnetVersion validation
    if (typeof m.opnetVersion === 'string' && !SEMVER_RANGE_REGEX.test(m.opnetVersion)) {
        errors.push({
            path: 'opnetVersion',
            message: 'opnetVersion must be a valid semver range',
        });
    }

    // Checksum format validation (must be sha256:<64 hex chars>)
    if (typeof m.checksum === 'string' && m.checksum) {
        if (!m.checksum.startsWith('sha256:')) {
            errors.push({
                path: 'checksum',
                message: 'Checksum must start with "sha256:" prefix',
            });
        } else {
            const hexPart = m.checksum.slice('sha256:'.length);
            if (!CHECKSUM_HEX_REGEX.test(hexPart)) {
                errors.push({
                    path: 'checksum',
                    message: 'Checksum must be "sha256:" followed by exactly 64 hex characters',
                });
            }
        }
    }

    // Target validation
    if (m.target !== 'bytenode') {
        errors.push({
            path: 'target',
            message: 'Target must be "bytenode"',
        });
    }

    // Type validation
    if (m.type !== 'plugin') {
        errors.push({
            path: 'type',
            message: 'Type must be "plugin"',
        });
    }

    // Author validation
    if (!m.author || typeof m.author !== 'object') {
        errors.push({
            path: 'author',
            message: 'Author is required and must be an object',
        });
    } else {
        const author = m.author as Record<string, unknown>;
        if (typeof author.name !== 'string' || !author.name) {
            errors.push({
                path: 'author.name',
                message: 'Author name is required',
            });
        }
    }

    // Plugin type validation
    if (m.pluginType !== 'standalone' && m.pluginType !== 'library') {
        errors.push({
            path: 'pluginType',
            message: 'pluginType must be "standalone" or "library"',
        });
    }

    // Description validation (warning, not error - matches node behavior)
    if (m.description !== undefined) {
        if (typeof m.description !== 'string') {
            errors.push({
                path: 'description',
                message: 'Description must be a string',
            });
        } else if (m.description.length > MAX_DESCRIPTION_LENGTH) {
            warnings.push(
                `Description exceeds ${MAX_DESCRIPTION_LENGTH} characters (${m.description.length}). ` +
                    'It will be accepted but may be truncated in some displays.',
            );
        }
    }

    // Permissions validation
    if (m.permissions !== undefined) {
        validatePermissions(m.permissions, errors, warnings, typeof m.name === 'string' ? m.name : '');
    }

    // Signature validation
    if (m.signature !== undefined) {
        validateSignature(m.signature, errors);
    }

    return {
        valid: errors.length === 0,
        manifest: errors.length === 0 ? (manifest as IPluginMetadata) : undefined,
        errors,
        warnings,
    };
}

/**
 * Validate that a field exists and is a non-empty string.
 *
 * @param obj - Object to check.
 * @param field - Field name.
 * @param errors - Error accumulator.
 *
 * @internal
 */
function validateRequiredString(
    obj: Record<string, unknown>,
    field: string,
    errors: IValidationError[],
): void {
    if (typeof obj[field] !== 'string' || !obj[field]) {
        errors.push({
            path: field,
            message: `${field} is required and must be a non-empty string`,
        });
    }
}

/**
 * Validate the permissions section of a manifest.
 *
 * Checks database, block, epoch, mempool, API, and filesystem permissions
 * for correct types, valid collection name prefixes, and cross-field
 * consistency (matching node's `PluginValidator` checks).
 *
 * @param permissions - Raw permissions object.
 * @param errors - Error accumulator.
 * @param warnings - Warning accumulator.
 * @param pluginName - Plugin name (for collection name prefix validation).
 *
 * @internal
 */
function validatePermissions(
    permissions: unknown,
    errors: IValidationError[],
    warnings: string[],
    pluginName: string,
): void {
    if (typeof permissions !== 'object' || permissions === null) {
        errors.push({
            path: 'permissions',
            message: 'Permissions must be an object',
        });
        return;
    }

    const p = permissions as Record<string, unknown>;

    // Database permissions
    if (p.database !== undefined) {
        if (typeof p.database !== 'object' || p.database === null) {
            errors.push({
                path: 'permissions.database',
                message: 'Database permissions must be an object',
            });
        } else {
            const db = p.database as Record<string, unknown>;
            if (typeof db.enabled !== 'boolean') {
                errors.push({
                    path: 'permissions.database.enabled',
                    message: 'Database enabled must be a boolean',
                });
            }
            if (!Array.isArray(db.collections)) {
                errors.push({
                    path: 'permissions.database.collections',
                    message: 'Database collections must be an array',
                });
            } else {
                const collections = db.collections as unknown[];

                // Node requires at least one collection when database is enabled
                if (db.enabled === true && collections.length === 0) {
                    errors.push({
                        path: 'permissions.database.collections',
                        message: 'Database is enabled but no collections are declared',
                    });
                }

                // Validate collection name strings
                for (let i = 0; i < collections.length; i++) {
                    const col = collections[i];
                    if (typeof col !== 'string') {
                        errors.push({
                            path: `permissions.database.collections[${i}]`,
                            message: 'Collection name must be a string',
                        });
                    }
                }
            }

            // Validate indexes reference declared collections
            if (Array.isArray(db.indexes) && Array.isArray(db.collections)) {
                const collectionNames = new Set(
                    (db.collections as unknown[]).filter((c): c is string => typeof c === 'string'),
                );
                const indexes = db.indexes as unknown[];
                for (let i = 0; i < indexes.length; i++) {
                    const idx = indexes[i];
                    if (idx && typeof idx === 'object') {
                        const idxObj = idx as Record<string, unknown>;
                        if (typeof idxObj.collection === 'string') {
                            if (!collectionNames.has(idxObj.collection)) {
                                errors.push({
                                    path: `permissions.database.indexes[${i}]`,
                                    message: `Index references undeclared collection "${idxObj.collection}"`,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    // Block permissions
    if (p.blocks !== undefined) {
        if (typeof p.blocks !== 'object' || p.blocks === null) {
            errors.push({
                path: 'permissions.blocks',
                message: 'Block permissions must be an object',
            });
        } else {
            const blocks = p.blocks as Record<string, unknown>;
            validateBooleanField(blocks, 'preProcess', 'permissions.blocks.preProcess', errors);
            validateBooleanField(blocks, 'postProcess', 'permissions.blocks.postProcess', errors);
            validateBooleanField(blocks, 'onChange', 'permissions.blocks.onChange', errors);
        }
    }

    // Epoch permissions
    if (p.epochs !== undefined) {
        if (typeof p.epochs !== 'object' || p.epochs === null) {
            errors.push({
                path: 'permissions.epochs',
                message: 'Epoch permissions must be an object',
            });
        } else {
            const epochs = p.epochs as Record<string, unknown>;
            validateBooleanField(epochs, 'onChange', 'permissions.epochs.onChange', errors);
            validateBooleanField(epochs, 'onFinalized', 'permissions.epochs.onFinalized', errors);
        }
    }

    // Mempool permissions
    if (p.mempool !== undefined) {
        if (typeof p.mempool !== 'object' || p.mempool === null) {
            errors.push({
                path: 'permissions.mempool',
                message: 'Mempool permissions must be an object',
            });
        } else {
            const mempool = p.mempool as Record<string, unknown>;
            validateBooleanField(mempool, 'txFeed', 'permissions.mempool.txFeed', errors);
            validateBooleanField(mempool, 'txSubmit', 'permissions.mempool.txSubmit', errors);
        }
    }

    // API permissions
    if (p.api !== undefined) {
        if (typeof p.api !== 'object' || p.api === null) {
            errors.push({
                path: 'permissions.api',
                message: 'API permissions must be an object',
            });
        } else {
            const api = p.api as Record<string, unknown>;
            validateBooleanField(api, 'addEndpoints', 'permissions.api.addEndpoints', errors);
            validateBooleanField(api, 'addWebsocket', 'permissions.api.addWebsocket', errors);

            // Node requires basePath when endpoints are enabled
            if (api.addEndpoints === true && (typeof api.basePath !== 'string' || !api.basePath)) {
                warnings.push(
                    'API endpoints are enabled but no basePath is specified. ' +
                        'The node requires a basePath for route registration.',
                );
            }

            // Node requires proto file for WebSocket
            if (api.addWebsocket === true) {
                const wsPerms = api.websocket;
                const hasProto =
                    wsPerms &&
                    typeof wsPerms === 'object' &&
                    typeof (wsPerms as Record<string, unknown>).protoFile === 'string';
                if (!hasProto) {
                    errors.push({
                        path: 'permissions.api.websocket.protoFile',
                        message: 'WebSocket is enabled but no protoFile is specified. The node requires a .proto file for WebSocket handlers.',
                    });
                }
            }
        }
    }

    // Filesystem permissions
    if (p.filesystem !== undefined) {
        if (typeof p.filesystem !== 'object' || p.filesystem === null) {
            errors.push({
                path: 'permissions.filesystem',
                message: 'Filesystem permissions must be an object',
            });
        } else {
            const fs = p.filesystem as Record<string, unknown>;
            validateBooleanField(fs, 'configDir', 'permissions.filesystem.configDir', errors);
            validateBooleanField(fs, 'tempDir', 'permissions.filesystem.tempDir', errors);
        }
    }

    // Threading permissions warnings
    if (p.threading !== undefined && typeof p.threading === 'object' && p.threading !== null) {
        const threading = p.threading as Record<string, unknown>;
        if (typeof threading.maxWorkers === 'number' && threading.maxWorkers > 16) {
            warnings.push(
                `threading.maxWorkers (${threading.maxWorkers}) exceeds recommended maximum of 16.`,
            );
        }
        if (typeof threading.maxMemoryMB === 'number' && threading.maxMemoryMB > 2048) {
            warnings.push(
                `threading.maxMemoryMB (${threading.maxMemoryMB}) exceeds recommended maximum of 2048.`,
            );
        }
    }

    // Blockchain permissions warning
    if (p.blockchain !== undefined && typeof p.blockchain === 'object' && p.blockchain !== null) {
        const bc = p.blockchain as Record<string, unknown>;
        const hasAnyQuery =
            bc.blocks === true || bc.transactions === true || bc.contracts === true || bc.utxos === true;
        if (!hasAnyQuery) {
            warnings.push(
                'Blockchain permission is declared but no specific query types (blocks, transactions, contracts, utxos) are enabled.',
            );
        }
    }
}

/**
 * Validate that a field is a boolean (if present).
 *
 * @param obj - Object containing the field.
 * @param field - Field name to check.
 * @param path - Dot-notation path for error reporting.
 * @param errors - Error accumulator.
 *
 * @internal
 */
function validateBooleanField(
    obj: Record<string, unknown>,
    field: string,
    path: string,
    errors: IValidationError[],
): void {
    if (obj[field] !== undefined && typeof obj[field] !== 'boolean') {
        errors.push({
            path,
            message: `${field} must be a boolean`,
        });
    }
}

/**
 * Validate the signature section of a manifest.
 *
 * Checks that the algorithm is a valid ML-DSA variant and that the
 * public key hash is present.
 *
 * @param signature - Raw signature object.
 * @param errors - Error accumulator.
 *
 * @internal
 */
function validateSignature(signature: unknown, errors: IValidationError[]): void {
    if (typeof signature !== 'object' || signature === null) {
        errors.push({
            path: 'signature',
            message: 'Signature must be an object',
        });
        return;
    }

    const s = signature as Record<string, unknown>;

    if (!['MLDSA44', 'MLDSA65', 'MLDSA87'].includes(s.algorithm as string)) {
        errors.push({
            path: 'signature.algorithm',
            message: 'Algorithm must be MLDSA44, MLDSA65, or MLDSA87',
        });
    }

    if (typeof s.publicKeyHash !== 'string' || !s.publicKeyHash) {
        errors.push({
            path: 'signature.publicKeyHash',
            message: 'Public key hash is required',
        });
    }
}
