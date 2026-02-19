/**
 * Plugin database API providing MongoDB-like document storage.
 *
 * Plugins can store and query structured data using a familiar MongoDB-style
 * API. Collections are sandboxed to the plugin's namespace - collection names
 * must be prefixed with the plugin name (e.g., `"my-plugin_events"`).
 *
 * @remarks
 * - Requires `database.enabled: true` permission.
 * - Collections must be declared in `database.collections` in the manifest.
 * - Indexes can be pre-declared in `database.indexes` or created at runtime.
 * - All query/update operations use MongoDB-compatible syntax.
 *
 * @example
 * ```typescript
 * import { PluginBase, IPluginContext, IBlockProcessedData } from '@btc-vision/plugin-sdk';
 *
 * export default class EventIndexer extends PluginBase {
 *     async onLoad(context: IPluginContext): Promise<void> {
 *         await super.onLoad(context);
 *
 *         // Create indexes for efficient queries
 *         const events = this.context.db!.collection('event-indexer_events');
 *         await events.createIndex({ blockHeight: -1 });
 *         await events.createIndex(
 *             { contractAddress: 1, eventType: 1 },
 *             { name: 'idx_contract_event' },
 *         );
 *     }
 *
 *     async onBlockPostProcess(block: IBlockProcessedData): Promise<void> {
 *         const events = this.context.db!.collection('event-indexer_events');
 *         await events.insertOne({
 *             blockNumber: block.blockNumber.toString(),
 *             txCount: block.txCount,
 *             storageRoot: block.storageRoot,
 *             processedAt: Date.now(),
 *         });
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Plugin database API for accessing MongoDB-style collections.
 *
 * Entry point for all database operations. Use `collection()` to get
 * a handle to a specific collection, then perform CRUD operations on it.
 *
 * @example
 * ```typescript
 * import type { IPluginDatabaseAPI } from '@btc-vision/plugin-sdk';
 *
 * async function databaseExample(db: IPluginDatabaseAPI): Promise<void> {
 *     // List available collections
 *     const collections = db.listCollections();
 *     console.log('Available collections:', collections);
 *
 *     // Get a collection handle
 *     const users = db.collection('my-plugin_users');
 *
 *     // Insert a document
 *     const { insertedId } = await users.insertOne({
 *         address: 'bc1q...abc',
 *         firstSeen: Date.now(),
 *     });
 *     console.log('Inserted:', insertedId);
 *
 *     // Query documents
 *     const user = await users.findOne({ address: 'bc1q...abc' });
 *     console.log('Found:', user);
 * }
 * ```
 */
export interface IPluginDatabaseAPI {
    /**
     * Get a collection handle by name.
     *
     * The name must match one of the collections declared in the manifest's
     * `permissions.database.collections` array. The node automatically
     * prefixes the collection name with `${pluginId}_` in the database,
     * so pass only the short name declared in the manifest.
     *
     * @param name - Collection name as declared in the manifest (e.g., `"events"`).
     * @returns Collection interface for performing CRUD operations.
     * @throws Error if the collection name is not in the declared list.
     *
     * @example
     * ```typescript
     * // If manifest declares collections: ["events", "stats"]
     * const events = db.collection('events');   // stored as "${pluginId}_events"
     * const stats = db.collection('stats');     // stored as "${pluginId}_stats"
     * ```
     */
    collection(name: string): IPluginCollection;

    /**
     * List all collection names available to this plugin.
     *
     * Returns only the collections declared in the plugin's permissions.
     *
     * @returns Array of collection name strings.
     *
     * @example
     * ```typescript
     * const names = db.listCollections();
     * // ["my-plugin_events", "my-plugin_stats"]
     * ```
     */
    listCollections(): string[];
}

/**
 * Plugin collection interface for document CRUD operations.
 *
 * Provides a subset of the MongoDB collection API with the most
 * commonly used operations. All query and update objects use
 * MongoDB-compatible syntax.
 *
 * @remarks
 * Since `bigint` values cannot be stored directly in MongoDB, convert
 * them to strings before inserting: `blockHeight: height.toString()`.
 * Convert back when reading: `BigInt(doc.blockHeight)`.
 *
 * @example
 * ```typescript
 * import type { IPluginCollection } from '@btc-vision/plugin-sdk';
 *
 * async function crudExample(collection: IPluginCollection): Promise<void> {
 *     // Insert
 *     await collection.insertOne({ txid: 'abc...', blockHeight: '850000', amount: 100 });
 *
 *     // Find one
 *     const doc = await collection.findOne({ txid: 'abc...' });
 *
 *     // Find many with cursor
 *     const docs = await collection.find({ blockHeight: '850000' })
 *         .sort({ amount: -1 })
 *         .limit(10)
 *         .toArray();
 *
 *     // Update
 *     await collection.updateOne(
 *         { txid: 'abc...' },
 *         { $set: { confirmed: true } },
 *     );
 *
 *     // Delete
 *     await collection.deleteMany({ blockHeight: { $lt: '800000' } });
 *
 *     // Count
 *     const count = await collection.countDocuments({ confirmed: true });
 * }
 * ```
 */
export interface IPluginCollection {
    /**
     * Find documents matching a MongoDB-style query.
     *
     * Returns a cursor that can be chained with `sort()`, `limit()`,
     * `skip()`, and then materialized with `toArray()`.
     *
     * @param query - MongoDB query filter object.
     * @returns Chainable cursor for the query results.
     *
     * @example
     * ```typescript
     * // Find all events for a contract, sorted by block height descending
     * const events = await collection.find({ contractAddress: 'bc1q...' })
     *     .sort({ blockHeight: -1 })
     *     .limit(100)
     *     .toArray();
     *
     * // Find with comparison operators
     * const recent = await collection.find({
     *     blockHeight: { $gte: '849000', $lte: '850000' },
     * }).toArray();
     *
     * // Find all documents (empty query)
     * const all = await collection.find({}).toArray();
     * ```
     */
    find(query: Record<string, unknown>): IPluginCursor;

    /**
     * Find a single document matching a query.
     *
     * Returns the first document that matches, or `null` if no match.
     *
     * @param query - MongoDB query filter object.
     * @returns Matching document or `null`.
     *
     * @example
     * ```typescript
     * const user = await collection.findOne({ address: 'bc1q...abc' });
     * if (user) {
     *     console.log(`User found: last seen at block ${user.lastBlock}`);
     * }
     * ```
     */
    findOne(query: Record<string, unknown>): Promise<Record<string, unknown> | null>;

    /**
     * Insert a single document.
     *
     * @param doc - Document to insert.
     * @returns Object containing the generated document ID.
     *
     * @example
     * ```typescript
     * const { insertedId } = await collection.insertOne({
     *     txid: '7a1ae3e5...',
     *     blockHeight: '850000',
     *     eventType: 'Transfer',
     *     timestamp: Date.now(),
     * });
     * console.log(`Inserted document: ${insertedId}`);
     * ```
     */
    insertOne(doc: Record<string, unknown>): Promise<{ insertedId: string }>;

    /**
     * Insert multiple documents in a single operation.
     *
     * More efficient than calling `insertOne` in a loop for bulk inserts.
     *
     * @param docs - Array of documents to insert.
     * @returns Object containing the generated document IDs.
     *
     * @example
     * ```typescript
     * const docs = transactions.map((tx) => ({
     *     txid: tx.txid,
     *     blockHeight: height.toString(),
     *     size: tx.size,
     * }));
     *
     * const { insertedIds } = await collection.insertMany(docs);
     * console.log(`Inserted ${insertedIds.length} documents`);
     * ```
     */
    insertMany(docs: Record<string, unknown>[]): Promise<{ insertedIds: string[] }>;

    /**
     * Update a single document matching a query.
     *
     * Uses MongoDB update operators (`$set`, `$inc`, `$unset`, etc.).
     *
     * @param query - MongoDB query filter to find the document.
     * @param update - Update operations to apply.
     * @returns Object with the count of modified documents (0 or 1).
     *
     * @example
     * ```typescript
     * // Set a field
     * await collection.updateOne(
     *     { txid: '7a1ae3e5...' },
     *     { $set: { confirmed: true, confirmations: 6 } },
     * );
     *
     * // Increment a counter
     * await collection.updateOne(
     *     { address: 'bc1q...' },
     *     { $inc: { txCount: 1 } },
     * );
     * ```
     */
    updateOne(
        query: Record<string, unknown>,
        update: Record<string, unknown>,
    ): Promise<{ modifiedCount: number }>;

    /**
     * Update all documents matching a query.
     *
     * @param query - MongoDB query filter.
     * @param update - Update operations to apply to all matching documents.
     * @returns Object with the count of modified documents.
     *
     * @example
     * ```typescript
     * // Mark all events in a block as confirmed
     * const { modifiedCount } = await collection.updateMany(
     *     { blockHeight: '850000' },
     *     { $set: { confirmed: true } },
     * );
     * console.log(`Updated ${modifiedCount} documents`);
     * ```
     */
    updateMany(
        query: Record<string, unknown>,
        update: Record<string, unknown>,
    ): Promise<{ modifiedCount: number }>;

    /**
     * Delete a single document matching a query.
     *
     * @param query - MongoDB query filter.
     * @returns Object with the count of deleted documents (0 or 1).
     *
     * @example
     * ```typescript
     * const { deletedCount } = await collection.deleteOne({ txid: '7a1ae3e5...' });
     * if (deletedCount === 0) {
     *     console.log('Document not found');
     * }
     * ```
     */
    deleteOne(query: Record<string, unknown>): Promise<{ deletedCount: number }>;

    /**
     * Delete all documents matching a query.
     *
     * @param query - MongoDB query filter.
     * @returns Object with the count of deleted documents.
     *
     * @example
     * ```typescript
     * // Purge data for reverted blocks during reorg
     * const { deletedCount } = await collection.deleteMany({
     *     blockHeight: { $gte: fromBlock.toString() },
     * });
     * logger.info(`Purged ${deletedCount} documents`);
     *
     * // Delete all documents (use with caution!)
     * await collection.deleteMany({});
     * ```
     */
    deleteMany(query: Record<string, unknown>): Promise<{ deletedCount: number }>;

    /**
     * Count documents matching a query.
     *
     * @param query - MongoDB query filter. If omitted, counts all documents.
     * @returns Number of matching documents.
     *
     * @example
     * ```typescript
     * // Count all documents
     * const total = await collection.countDocuments();
     *
     * // Count with filter
     * const confirmed = await collection.countDocuments({ confirmed: true });
     * console.log(`${confirmed} of ${total} documents confirmed`);
     * ```
     */
    countDocuments(query?: Record<string, unknown>): Promise<number>;

    /**
     * Create an index on the collection for query optimization.
     *
     * @param keys - Index key specification. `1` for ascending, `-1` for descending.
     * @param options - Index options (name, unique constraint, sparse).
     * @returns The name of the created index.
     *
     * @example
     * ```typescript
     * // Single-field descending index
     * await collection.createIndex({ blockHeight: -1 });
     *
     * // Compound index
     * await collection.createIndex(
     *     { contractAddress: 1, blockHeight: -1 },
     *     { name: 'idx_contract_block' },
     * );
     *
     * // Unique index
     * await collection.createIndex(
     *     { txid: 1 },
     *     { unique: true, name: 'idx_txid_unique' },
     * );
     *
     * // Sparse index (only indexes documents that have the field)
     * await collection.createIndex(
     *     { optionalField: 1 },
     *     { sparse: true },
     * );
     * ```
     */
    createIndex(
        keys: Record<string, 1 | -1>,
        options?: { name?: string; unique?: boolean; sparse?: boolean },
    ): Promise<string>;
}

/**
 * Cursor interface for iterating over query results.
 *
 * Cursors are returned by `collection.find()` and support method chaining
 * for sorting, limiting, and skipping results before materializing
 * the results with `toArray()`.
 *
 * @example
 * ```typescript
 * import type { IPluginCursor } from '@btc-vision/plugin-sdk';
 *
 * // Chain operations for paginated, sorted results
 * const page2: Record<string, unknown>[] = await collection
 *     .find({ confirmed: true })
 *     .sort({ blockHeight: -1 })
 *     .skip(20)    // Skip first page
 *     .limit(20)   // Page size = 20
 *     .toArray();
 * ```
 */
export interface IPluginCursor {
    /**
     * Materialize the cursor results into an array.
     *
     * Executes the query and returns all matching documents.
     * Must be called to actually retrieve data.
     *
     * @returns Array of matching documents.
     *
     * @example
     * ```typescript
     * const results = await collection.find({ type: 'transfer' }).toArray();
     * for (const doc of results) {
     *     console.log(doc.txid, doc.amount);
     * }
     * ```
     */
    toArray(): Promise<Record<string, unknown>[]>;

    /**
     * Limit the number of results returned.
     *
     * @param count - Maximum number of documents to return.
     * @returns The cursor (for chaining).
     *
     * @example
     * ```typescript
     * // Get the 10 most recent events
     * const recent = await collection.find({})
     *     .sort({ timestamp: -1 })
     *     .limit(10)
     *     .toArray();
     * ```
     */
    limit(count: number): IPluginCursor;

    /**
     * Skip a number of documents in the result set.
     *
     * Commonly used with `limit()` for pagination.
     *
     * @param count - Number of documents to skip.
     * @returns The cursor (for chaining).
     *
     * @example
     * ```typescript
     * // Pagination: get page 3 (20 items per page)
     * const page3 = await collection.find({})
     *     .sort({ _id: 1 })
     *     .skip(40)
     *     .limit(20)
     *     .toArray();
     * ```
     */
    skip(count: number): IPluginCursor;

    /**
     * Sort the result set by one or more fields.
     *
     * @param spec - Sort specification. `1` for ascending, `-1` for descending.
     * @returns The cursor (for chaining).
     *
     * @example
     * ```typescript
     * // Sort by block height descending, then by event index ascending
     * const sorted = await collection.find({})
     *     .sort({ blockHeight: -1, eventIndex: 1 })
     *     .toArray();
     * ```
     */
    sort(spec: Record<string, 1 | -1>): IPluginCursor;
}
