/**
 * OPNet epoch types for the checksum epoch system.
 *
 * OPNet organizes blocks into epochs. Each epoch has a merkle tree
 * built from the checksum hashes of all blocks within it. When an
 * epoch is finalized, the root of this merkle tree becomes the
 * authoritative epoch checksum for consensus verification.
 *
 * @remarks
 * Epoch transitions trigger the `onEpochChange` hook, and finalization
 * triggers `onEpochFinalized`. Both require the corresponding epoch
 * permissions to be enabled in the plugin manifest.
 *
 * @example
 * ```typescript
 * import { PluginBase, IEpochData } from '@btc-vision/plugin-sdk';
 *
 * export default class EpochMonitor extends PluginBase {
 *     async onEpochChange(epoch: IEpochData): Promise<void> {
 *         this.context.logger.info(
 *             `New epoch #${epoch.epochNumber}: ` +
 *             `blocks ${epoch.startBlock}-${epoch.endBlock}`
 *         );
 *     }
 *
 *     async onEpochFinalized(epoch: IEpochData): Promise<void> {
 *         this.context.logger.info(
 *             `Epoch #${epoch.epochNumber} finalized! ` +
 *             `Checksum root: ${epoch.checksumRoot}`
 *         );
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Epoch data passed to `onEpochChange` and `onEpochFinalized` hooks.
 *
 * Contains information about an OPNet epoch including its block range
 * and (when finalized) its checksum merkle root.
 *
 * @example
 * ```typescript
 * import type { IEpochData } from '@btc-vision/plugin-sdk';
 *
 * function epochBlockCount(epoch: IEpochData): bigint {
 *     return epoch.endBlock - epoch.startBlock + 1n;
 * }
 *
 * function isFinalized(epoch: IEpochData): boolean {
 *     return epoch.checksumRoot !== undefined;
 * }
 * ```
 */
export interface IEpochData {
    /**
     * Epoch number (0-indexed, monotonically increasing).
     *
     * @example `42n`
     */
    readonly epochNumber: bigint;

    /**
     * First block height included in this epoch (inclusive).
     *
     * @example `840000n`
     */
    readonly startBlock: bigint;

    /**
     * Last block height included in this epoch (inclusive).
     *
     * @example `840999n`
     */
    readonly endBlock: bigint;

    /**
     * Epoch checksum root (merkle root of all block checksums in the epoch).
     *
     * Only present once the epoch has been finalized. During `onEpochChange`
     * this may be `undefined` since the epoch is still in progress.
     * During `onEpochFinalized` this is always set.
     *
     * @example `"a1b2c3d4e5f6..."`
     */
    readonly checksumRoot?: string;
}
