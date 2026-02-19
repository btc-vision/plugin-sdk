/**
 * Blockchain reorganization (reorg) types.
 *
 * Reorgs occur when the Bitcoin network produces a longer competing chain,
 * causing blocks to be reverted. This is a **critical** event that plugins
 * storing block-indexed data **must** handle to maintain data consistency.
 *
 * @remarks
 * The `onReorg` hook is **BLOCKING** - the indexer halts until all plugins
 * complete their reorg handling. Plugins that store any data indexed by
 * block height must delete or revert all data for blocks in the reorg range.
 *
 * @example
 * ```typescript
 * import { PluginBase, IReorgData } from '@btc-vision/plugin-sdk';
 *
 * export default class DataPlugin extends PluginBase {
 *     async onReorg(reorg: IReorgData): Promise<void> {
 *         this.context.logger.warn(
 *             `REORG: reverting blocks ${reorg.fromBlock}-${reorg.toBlock} ` +
 *             `(reason: ${reorg.reason})`
 *         );
 *
 *         // Delete all data for reverted blocks
 *         const collection = this.context.db!.collection('my-plugin_events');
 *         await collection.deleteMany({
 *             blockHeight: { $gte: reorg.fromBlock.toString() },
 *         });
 *
 *         // Reset sync state to before the reorg
 *         await this.context.resetSyncStateToBlock(reorg.fromBlock - 1n);
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Reorg data passed to the `onReorg` hook.
 *
 * Contains the block range affected by the reorganization. All blocks
 * from {@link fromBlock} to {@link toBlock} (inclusive) have been
 * invalidated and replaced by a competing chain.
 *
 * @remarks
 * **IMPORTANT:** Plugins MUST handle reorgs to maintain data consistency.
 * Any data stored for blocks in the range `[fromBlock, toBlock]` must be
 * deleted or reverted. Failure to do so will result in stale or incorrect
 * data persisting after the reorg.
 *
 * @example
 * ```typescript
 * import type { IReorgData } from '@btc-vision/plugin-sdk';
 *
 * function reorgDepth(reorg: IReorgData): bigint {
 *     return reorg.toBlock - reorg.fromBlock + 1n;
 * }
 * ```
 */
export interface IReorgData {
    /**
     * First block height affected by the reorg (inclusive).
     *
     * All blocks at this height and above have been reverted.
     *
     * @example `850000n`
     */
    readonly fromBlock: bigint;

    /**
     * Last block height affected by the reorg (inclusive).
     *
     * Typically this is the previous chain tip before the reorg.
     *
     * @example `850002n`
     */
    readonly toBlock: bigint;

    /**
     * Human-readable reason for the reorg.
     *
     * @example `"Competing chain with more proof-of-work found"`
     */
    readonly reason: string;
}
