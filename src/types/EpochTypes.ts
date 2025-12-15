/**
 * Epoch data passed to plugin hooks
 */
export interface IEpochData {
    /** Epoch number */
    readonly epochNumber: bigint;

    /** Start block of the epoch */
    readonly startBlock: bigint;

    /** End block of the epoch */
    readonly endBlock: bigint;

    /** Epoch checksum root (merkle root of all block checksums) */
    readonly checksumRoot?: string;
}
