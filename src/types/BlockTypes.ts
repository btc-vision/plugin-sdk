/**
 * Transaction data in a raw block
 */
export interface ITransactionData {
    /** Transaction ID */
    readonly txid: string;

    /** Transaction hash (witness hash for segwit) */
    readonly hash: string;

    /** Transaction size in bytes */
    readonly size: number;

    /** Virtual size (for fee calculation) */
    readonly vsize?: number;

    /** Transaction weight */
    readonly weight?: number;

    /** Raw transaction hex */
    readonly hex?: string;
}

/**
 * Raw Bitcoin block data
 * Used for onBlockPreProcess hook
 */
export interface IBlockData {
    /** Block height */
    readonly height: bigint;

    /** Block hash */
    readonly hash: string;

    /** Previous block hash */
    readonly previousHash: string;

    /** Block timestamp (unix epoch seconds) */
    readonly timestamp: number;

    /** Merkle root */
    readonly merkleRoot: string;

    /** Block nonce */
    readonly nonce?: number;

    /** Block bits (difficulty target) */
    readonly bits?: string;

    /** Block version */
    readonly version?: number;

    /** Transactions in the block */
    readonly transactions: readonly ITransactionData[];
}

/**
 * Checksum proof for epoch merkle tree
 */
export interface IChecksumProof {
    /** Merkle proof path */
    readonly proof: string[];
}

/**
 * OPNet processed block data
 * Used for onBlockPostProcess and onBlockChange hooks
 */
export interface IBlockProcessedData {
    /** Block height */
    readonly blockNumber: bigint;

    /** Block hash */
    readonly blockHash: string;

    /** Previous block hash */
    readonly previousBlockHash?: string;

    /** Bitcoin merkle root */
    readonly merkleRoot: string;

    /** OPNet receipt root (merkle root of transaction receipts) */
    readonly receiptRoot: string;

    /** OPNet storage root (merkle root of contract storage) */
    readonly storageRoot: string;

    /** OPNet checksum hash (epoch checksum contribution) */
    readonly checksumHash: string;

    /** Checksum proofs for epoch merkle tree */
    readonly checksumProofs: IChecksumProof[];

    /** Previous block's checksum hash */
    readonly previousBlockChecksum: string;

    /** Number of transactions in block */
    readonly txCount: number;
}
