/**
 * Bitcoin mempool transaction types.
 *
 * These types represent unconfirmed transactions currently in the
 * node's mempool. They are passed to the `onMempoolTransaction` hook
 * which fires for each new transaction entering the mempool.
 *
 * @remarks
 * Requires `mempool.txFeed` permission to be enabled in the plugin manifest.
 * Mempool transactions may never be confirmed (e.g., if replaced by RBF
 * or if they become invalid). Always treat mempool data as tentative.
 *
 * @example
 * ```typescript
 * import { PluginBase, IMempoolTransaction } from '@btc-vision/plugin-sdk';
 *
 * export default class MempoolWatcher extends PluginBase {
 *     async onMempoolTransaction(tx: IMempoolTransaction): Promise<void> {
 *         const feeRate = Number(tx.fee) / tx.size;
 *         this.context.logger.info(
 *             `New mempool TX: ${tx.txid} ` +
 *             `(${tx.size} bytes, ${feeRate.toFixed(1)} sat/byte)`
 *         );
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Mempool transaction data passed to the `onMempoolTransaction` hook.
 *
 * Contains basic information about an unconfirmed transaction that
 * has just entered the Bitcoin mempool.
 *
 * @example
 * ```typescript
 * import type { IMempoolTransaction } from '@btc-vision/plugin-sdk';
 *
 * function estimateFeeRate(tx: IMempoolTransaction): number {
 *     // Fee rate in satoshis per byte
 *     return Number(tx.fee) / tx.size;
 * }
 *
 * function isHighFee(tx: IMempoolTransaction, thresholdSatPerByte: number): boolean {
 *     return estimateFeeRate(tx) > thresholdSatPerByte;
 * }
 * ```
 */
export interface IMempoolTransaction {
    /**
     * Transaction ID (double SHA-256, reversed hex).
     *
     * @example `"7a1ae3e5c8b2d4f6a8c0e2d4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2"`
     */
    readonly txid: string;

    /**
     * Witness transaction hash (includes witness data in hash).
     *
     * For non-SegWit transactions, this is identical to {@link txid}.
     *
     * @example `"3b2ce5d8f7a6b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3"`
     */
    readonly hash: string;

    /**
     * Total transaction size in bytes (including witness data).
     *
     * @example `225`
     */
    readonly size: number;

    /**
     * Transaction fee in satoshis.
     *
     * This is the difference between total input value and total output value.
     *
     * @example `5000n`
     */
    readonly fee: bigint;

    /**
     * Unix timestamp (seconds) when this transaction entered the mempool.
     *
     * @example `1700000000`
     */
    readonly timestamp: number;
}
