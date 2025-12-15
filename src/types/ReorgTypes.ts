/**
 * Reorg data passed to plugin hooks
 * IMPORTANT: Plugins MUST handle reorgs to maintain data consistency
 */
export interface IReorgData {
    /** Block height where reorg started (inclusive) */
    readonly fromBlock: bigint;

    /** Block height where reorg ended (inclusive) */
    readonly toBlock: bigint;

    /** Reason for the reorg */
    readonly reason: string;
}
