import {
    IPluginMetadata,
    PLUGIN_NAME_REGEX,
    MAX_PLUGIN_NAME_LENGTH,
    MAX_DESCRIPTION_LENGTH,
} from '../interfaces/IPluginMetadata.js';

/**
 * Validation error details
 */
export interface IValidationError {
    /** Path to the invalid field (e.g., "permissions.database.collections") */
    readonly path: string;
    /** Error message */
    readonly message: string;
}

/**
 * Validation result
 */
export interface IValidationResult {
    /** Whether the manifest is valid */
    readonly valid: boolean;
    /** Parsed manifest (if valid) */
    readonly manifest?: IPluginMetadata;
    /** Validation errors */
    readonly errors: IValidationError[];
}

/**
 * Semver regex pattern
 */
const SEMVER_REGEX = /^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$/;

/**
 * Semver range regex pattern (simplified)
 */
const SEMVER_RANGE_REGEX = /^[\^~>=<\s\d.|*x-]+(?:[\w.-]+)?$/;

/**
 * Validate a plugin manifest
 * @param manifest - Raw manifest object to validate
 * @returns Validation result
 */
export function validateManifest(manifest: unknown): IValidationResult {
    const errors: IValidationError[] = [];

    if (!manifest || typeof manifest !== 'object') {
        return {
            valid: false,
            errors: [{ path: '', message: 'Manifest must be an object' }],
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

    // Description validation
    if (m.description !== undefined) {
        if (typeof m.description !== 'string') {
            errors.push({
                path: 'description',
                message: 'Description must be a string',
            });
        } else if (m.description.length > MAX_DESCRIPTION_LENGTH) {
            errors.push({
                path: 'description',
                message: `Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`,
            });
        }
    }

    // Permissions validation
    if (m.permissions !== undefined) {
        validatePermissions(m.permissions, errors, typeof m.name === 'string' ? m.name : '');
    }

    // Signature validation
    if (m.signature !== undefined) {
        validateSignature(m.signature, errors);
    }

    return {
        valid: errors.length === 0,
        manifest: errors.length === 0 ? (manifest as IPluginMetadata) : undefined,
        errors,
    };
}

/**
 * Validate a required string field
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
 * Validate permissions
 */
function validatePermissions(
    permissions: unknown,
    errors: IValidationError[],
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
                // Validate collection names are prefixed with plugin name
                const collections = db.collections as unknown[];
                for (let i = 0; i < collections.length; i++) {
                    const col = collections[i];
                    if (typeof col !== 'string') {
                        errors.push({
                            path: `permissions.database.collections[${i}]`,
                            message: 'Collection name must be a string',
                        });
                    } else if (pluginName && !col.startsWith(`${pluginName}_`)) {
                        errors.push({
                            path: `permissions.database.collections[${i}]`,
                            message: `Collection name must be prefixed with plugin name: "${pluginName}_"`,
                        });
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
}

/**
 * Validate a boolean field if present
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
 * Validate signature
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
