/**
 * OPNet-processed transaction types for the blockchain query API.
 *
 * These types represent transactions as stored in the OPNet node's
 * database, with structured inputs and outputs. They are used by
 * {@link IPluginBlockchainAPI} methods like `getTransaction` and
 * `getBlockWithTransactions`.
 *
 * @remarks
 * These are distinct from {@link ITransactionData} in `BlockTypes.ts`,
 * which represents raw Bitcoin Core RPC data. These types are the
 * OPNet-processed versions with `bigint` values and structured fields.
 *
 * @example
 * ```typescript
 * import { PluginBase, IPluginContext } from '@btc-vision/plugin-sdk';
 * import type { ITransaction, ITransactionInput, ITransactionOutput } from '@btc-vision/plugin-sdk';
 *
 * export default class TxAnalyzer extends PluginBase {
 *     async analyzeTransaction(txid: string): Promise<void> {
 *         const tx = await this.context.blockchain!.getTransaction(txid);
 *         if (!tx) return;
 *
 *         this.context.logger.info(
 *             `TX ${tx.txid}: ${tx.inputs.length} inputs, ${tx.outputs.length} outputs`
 *         );
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Transaction input referencing a previous output.
 *
 * Used in {@link ITransactionDocument} to represent inputs in
 * OPNet-processed transactions stored in the database.
 *
 * @example
 * ```typescript
 * import type { ITransactionInput } from '@btc-vision/plugin-sdk';
 *
 * function formatInput(input: ITransactionInput): string {
 *     return `${input.txid}:${input.vout}`;
 * }
 * ```
 */
export interface ITransactionInput {
    /**
     * Transaction ID of the output being spent.
     *
     * @example `"7a1ae3e5c8b2d4f6a8c0e2d4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2"`
     */
    readonly txid: string;

    /**
     * Index of the output being spent in the referenced transaction.
     *
     * @example `0`
     */
    readonly vout: number;

    /**
     * Script signature (unlocking script) for this input.
     *
     * May be absent for SegWit-only inputs where the witness
     * data provides the unlocking proof.
     *
     * @remarks Currently not populated by the node — always `undefined`.
     */
    readonly scriptSig?: {
        /** Human-readable disassembly */
        readonly asm: string;
        /** Raw hex-encoded script bytes */
        readonly hex: string;
    };

    /**
     * Segregated Witness data stack.
     *
     * Present only for SegWit inputs. Each element is a
     * hex-encoded witness stack item.
     *
     * @remarks Currently not populated by the node — always `undefined`.
     *
     * @example `["304402207f5a...01", "03ab12...ef56"]`
     */
    readonly txinwitness?: readonly string[];

    /**
     * Input sequence number.
     *
     * Used for relative timelocks (BIP 68) and replace-by-fee (BIP 125).
     *
     * @example `4294967294` (RBF opt-in)
     */
    readonly sequence: number;
}

/**
 * Transaction output defining value and spending conditions.
 *
 * Used in {@link ITransactionDocument} to represent outputs in
 * OPNet-processed transactions stored in the database.
 *
 * @remarks
 * Note that {@link value} here is in satoshis as `bigint`, unlike
 * {@link IVOut.value} in `BlockTypes.ts` which is BTC as `number`.
 *
 * @example
 * ```typescript
 * import type { ITransactionOutput } from '@btc-vision/plugin-sdk';
 *
 * function isTaprootOutput(output: ITransactionOutput): boolean {
 *     return output.scriptPubKey.type === 'p2tr';
 * }
 *
 * function formatBTC(output: ITransactionOutput): string {
 *     const btc = Number(output.value) / 1e8;
 *     return `${btc.toFixed(8)} BTC`;
 * }
 * ```
 */
export interface ITransactionOutput {
    /**
     * Output value in satoshis.
     *
     * @example `50000000n` (0.5 BTC)
     */
    readonly value: bigint;

    /**
     * Zero-based index of this output within the transaction.
     *
     * @example `0`
     */
    readonly n: number;

    /**
     * Locking script (scriptPubKey) defining spending conditions.
     */
    readonly scriptPubKey: {
        /**
         * Human-readable script disassembly.
         *
         * @remarks Currently not populated by the node — always an empty string.
         */
        readonly asm: string;
        /** Raw hex-encoded script bytes */
        readonly hex: string;
        /**
         * Script type classification.
         *
         * Values: `"p2pkh"`, `"p2sh"`, `"p2wpkh"`, `"p2wsh"`, `"p2tr"`,
         * `"op_return"`, `"unknown"`.
         *
         * @example `"p2tr"`, `"p2wpkh"`, `"p2pkh"`
         */
        readonly type: string;
        /**
         * Derived Bitcoin address (for standard script types).
         *
         * @example `"bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"`
         */
        readonly address?: string;
        /**
         * Array of addresses (for legacy multi-sig outputs).
         *
         * @deprecated Use `address` instead for single-address outputs.
         */
        readonly addresses?: readonly string[];
    };
}

/**
 * Full Bitcoin transaction with structured inputs and outputs.
 *
 * This is the OPNet-processed transaction format used by the blockchain
 * query API. It mirrors the Bitcoin Core `getrawtransaction` response
 * with typed fields.
 *
 * @example
 * ```typescript
 * import type { ITransaction } from '@btc-vision/plugin-sdk';
 *
 * function totalOutputValue(tx: ITransaction): bigint {
 *     return tx.vout.reduce((sum, out) => sum + out.value, 0n);
 * }
 *
 * function isConfirmed(tx: ITransaction): boolean {
 *     return (tx.confirmations ?? 0) > 0;
 * }
 * ```
 */
export interface ITransaction {
    /**
     * Transaction ID (double SHA-256, reversed hex).
     *
     * @example `"7a1ae3e5c8b2d4f6a8c0e2d4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2"`
     */
    readonly txid: string;

    /**
     * Witness transaction hash (includes witness data in hash).
     *
     * Identical to {@link txid} for non-SegWit transactions.
     */
    readonly hash: string;

    /**
     * Transaction format version.
     *
     * @example `2` (enables relative timelocks via BIP 68)
     */
    readonly version: number;

    /**
     * Total transaction size in bytes (including witness data).
     *
     * @example `225`
     */
    readonly size: number;

    /**
     * Virtual size in virtual bytes (vbytes).
     *
     * Used for fee calculation. Always `<= size`.
     *
     * @example `141`
     */
    readonly vsize: number;

    /**
     * Transaction weight in weight units (WU).
     *
     * @example `561`
     */
    readonly weight: number;

    /**
     * Transaction lock time.
     *
     * If `< 500_000_000`, interpreted as block height.
     * If `>= 500_000_000`, interpreted as Unix timestamp.
     *
     * @example `0` (immediately final)
     */
    readonly locktime: number;

    /**
     * Transaction inputs (spending previous outputs).
     */
    readonly vin: readonly ITransactionInput[];

    /**
     * Transaction outputs (creating new UTXOs).
     */
    readonly vout: readonly ITransactionOutput[];

    /**
     * Raw transaction hex (full serialization with witness).
     *
     * May not be included in all queries for efficiency.
     */
    readonly hex?: string;

    /**
     * Block hash containing this transaction.
     *
     * Only present for confirmed transactions.
     *
     * @example `"00000000000000000002a7c4c1e48d76c5a37902165a270156b7a8d72f8804c6"`
     */
    readonly blockhash?: string;

    /**
     * Number of confirmations.
     *
     * `undefined` or `0` for unconfirmed transactions.
     *
     * @example `6`
     */
    readonly confirmations?: number;

    /**
     * Block time as Unix timestamp (seconds).
     *
     * Only present for confirmed transactions.
     */
    readonly blocktime?: number;

    /**
     * Transaction time as Unix timestamp (seconds).
     *
     * Same as `blocktime` for confirmed transactions.
     */
    readonly time?: number;
}
