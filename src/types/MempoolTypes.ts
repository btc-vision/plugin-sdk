/**
 * Mempool transaction data
 * Passed to onMempoolTransaction hook
 */
export interface IMempoolTransaction {
    /** Transaction ID */
    readonly txid: string;

    /** Transaction hash (witness hash for segwit) */
    readonly hash: string;

    /** Transaction size in bytes */
    readonly size: number;

    /** Transaction fee in satoshis */
    readonly fee: bigint;

    /** Timestamp when transaction entered mempool */
    readonly timestamp: number;

    /** Virtual size (for fee calculation) */
    readonly vsize?: number;

    /** Fee rate in sat/vB */
    readonly feeRate?: number;

    /** Raw transaction hex */
    readonly hex?: string;
}
