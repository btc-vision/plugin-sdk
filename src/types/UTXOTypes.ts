/**
 * Unspent transaction output
 */
export interface IUTXO {
    /** Transaction ID containing this output */
    readonly txid: string;

    /** Output index within the transaction */
    readonly vout: number;

    /** Output value in satoshis */
    readonly value: bigint;

    /** Script pubkey hex */
    readonly scriptPubKey: string;

    /** Script type (p2pkh, p2sh, p2wpkh, p2wsh, p2tr, etc.) */
    readonly scriptType?: string;

    /** Bitcoin address (if derivable) */
    readonly address?: string;

    /** Block height where this UTXO was created */
    readonly blockHeight: bigint;

    /** Whether this UTXO is confirmed */
    readonly confirmed: boolean;

    /** Number of confirmations */
    readonly confirmations?: number;
}

/**
 * UTXO query options
 */
export interface IUTXOQueryOptions {
    /** Minimum value in satoshis */
    readonly minValue?: bigint;

    /** Maximum value in satoshis */
    readonly maxValue?: bigint;

    /** Minimum confirmations required */
    readonly minConfirmations?: number;

    /** Include unconfirmed UTXOs */
    readonly includeUnconfirmed?: boolean;

    /** Maximum number of UTXOs to return */
    readonly limit?: number;
}
