/**
 * Transaction input
 */
export interface ITransactionInput {
    /** Previous transaction ID */
    readonly txid: string;

    /** Previous output index */
    readonly vout: number;

    /** Script signature */
    readonly scriptSig?: {
        readonly asm: string;
        readonly hex: string;
    };

    /** Witness data (for segwit) */
    readonly txinwitness?: readonly string[];

    /** Sequence number */
    readonly sequence: number;
}

/**
 * Transaction output
 */
export interface ITransactionOutput {
    /** Output value in satoshis */
    readonly value: bigint;

    /** Output index */
    readonly n: number;

    /** Script pubkey */
    readonly scriptPubKey: {
        readonly asm: string;
        readonly hex: string;
        readonly type: string;
        readonly address?: string;
        readonly addresses?: readonly string[];
    };
}

/**
 * Full transaction data
 */
export interface ITransaction {
    /** Transaction ID */
    readonly txid: string;

    /** Transaction hash (witness hash for segwit) */
    readonly hash: string;

    /** Transaction version */
    readonly version: number;

    /** Transaction size in bytes */
    readonly size: number;

    /** Virtual size */
    readonly vsize: number;

    /** Transaction weight */
    readonly weight: number;

    /** Lock time */
    readonly locktime: number;

    /** Transaction inputs */
    readonly vin: readonly ITransactionInput[];

    /** Transaction outputs */
    readonly vout: readonly ITransactionOutput[];

    /** Raw transaction hex */
    readonly hex?: string;

    /** Block hash (if confirmed) */
    readonly blockhash?: string;

    /** Number of confirmations */
    readonly confirmations?: number;

    /** Block time */
    readonly blocktime?: number;

    /** Time received */
    readonly time?: number;
}
