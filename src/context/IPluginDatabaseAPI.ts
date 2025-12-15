/**
 * Plugin database API interface
 * Provides MongoDB-like database access for plugins
 */
export interface IPluginDatabaseAPI {
    /**
     * Get a collection by name
     * Collection names must be prefixed with plugin name (e.g., "my-plugin_users")
     * @param name - Collection name
     * @returns Collection interface
     */
    collection(name: string): IPluginCollection;

    /**
     * List all collections available to this plugin
     * @returns Array of collection names
     */
    listCollections(): string[];
}

/**
 * Plugin collection interface (subset of MongoDB collection)
 */
export interface IPluginCollection {
    /**
     * Find documents matching a query
     * @param query - MongoDB-style query
     * @returns Cursor for iteration
     */
    find(query: Record<string, unknown>): IPluginCursor;

    /**
     * Find a single document
     * @param query - MongoDB-style query
     * @returns Document or null
     */
    findOne(query: Record<string, unknown>): Promise<Record<string, unknown> | null>;

    /**
     * Insert a single document
     * @param doc - Document to insert
     * @returns Inserted document ID
     */
    insertOne(doc: Record<string, unknown>): Promise<{ insertedId: string }>;

    /**
     * Insert multiple documents
     * @param docs - Documents to insert
     * @returns Inserted document IDs
     */
    insertMany(docs: Record<string, unknown>[]): Promise<{ insertedIds: string[] }>;

    /**
     * Update a single document
     * @param query - MongoDB-style query
     * @param update - Update operations
     * @returns Number of modified documents
     */
    updateOne(
        query: Record<string, unknown>,
        update: Record<string, unknown>,
    ): Promise<{ modifiedCount: number }>;

    /**
     * Update multiple documents
     * @param query - MongoDB-style query
     * @param update - Update operations
     * @returns Number of modified documents
     */
    updateMany(
        query: Record<string, unknown>,
        update: Record<string, unknown>,
    ): Promise<{ modifiedCount: number }>;

    /**
     * Delete a single document
     * @param query - MongoDB-style query
     * @returns Number of deleted documents
     */
    deleteOne(query: Record<string, unknown>): Promise<{ deletedCount: number }>;

    /**
     * Delete multiple documents
     * @param query - MongoDB-style query
     * @returns Number of deleted documents
     */
    deleteMany(query: Record<string, unknown>): Promise<{ deletedCount: number }>;

    /**
     * Count documents matching a query
     * @param query - MongoDB-style query (optional)
     * @returns Document count
     */
    countDocuments(query?: Record<string, unknown>): Promise<number>;

    /**
     * Create an index on the collection
     * @param keys - Index keys (1 for ascending, -1 for descending)
     * @param options - Index options
     * @returns Index name
     */
    createIndex(
        keys: Record<string, 1 | -1>,
        options?: { name?: string; unique?: boolean; sparse?: boolean },
    ): Promise<string>;
}

/**
 * Plugin cursor interface for iterating query results
 */
export interface IPluginCursor {
    /**
     * Convert cursor to array of documents
     * @returns Array of documents
     */
    toArray(): Promise<Record<string, unknown>[]>;

    /**
     * Limit the number of results
     * @param count - Maximum number of documents
     * @returns Cursor for chaining
     */
    limit(count: number): IPluginCursor;

    /**
     * Skip a number of documents
     * @param count - Number of documents to skip
     * @returns Cursor for chaining
     */
    skip(count: number): IPluginCursor;

    /**
     * Sort the results
     * @param spec - Sort specification (1 for ascending, -1 for descending)
     * @returns Cursor for chaining
     */
    sort(spec: Record<string, 1 | -1>): IPluginCursor;
}
