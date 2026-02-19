/**
 * Bitcoin UTXO (Unspent Transaction Output) types.
 *
 * These types represent unspent outputs that can be used as inputs
 * in new transactions. They are used by {@link IPluginBlockchainAPI.getUTXOs}
 * to query UTXOs for a specific address.
 *
 * @remarks
 * Requires `blockchain.utxos` permission to be enabled in the plugin manifest.
 *
 * @example
 * ```typescript
 * import { PluginBase } from '@btc-vision/plugin-sdk';
 * import type { IUTXO, IUTXOQueryOptions } from '@btc-vision/plugin-sdk';
 *
 * export default class UTXOTracker extends PluginBase {
 *     async getAddressBalance(address: string): Promise<bigint> {
 *         const utxos = await this.context.blockchain!.getUTXOs(address);
 *         return utxos.reduce((sum, utxo) => sum + utxo.value, 0n);
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Unspent transaction output (UTXO).
 *
 * Represents a single Bitcoin output that has not been spent.
 * UTXOs are the fundamental building blocks of Bitcoin transactions -
 * to send Bitcoin, you must consume existing UTXOs as inputs.
 *
 * @example
 * ```typescript
 * import type { IUTXO } from '@btc-vision/plugin-sdk';
 *
 * function formatUTXO(utxo: IUTXO): string {
 *     const btcValue = Number(utxo.value) / 1e8;
 *     return `${utxo.txid}:${utxo.vout} = ${btcValue.toFixed(8)} BTC` +
 *         ` (${utxo.confirmed ? 'confirmed' : 'unconfirmed'})`;
 * }
 *
 * function selectUTXOs(utxos: readonly IUTXO[], targetSats: bigint): IUTXO[] {
 *     const sorted = [...utxos].sort((a, b) => Number(b.value - a.value));
 *     const selected: IUTXO[] = [];
 *     let total = 0n;
 *     for (const utxo of sorted) {
 *         selected.push(utxo);
 *         total += utxo.value;
 *         if (total >= targetSats) break;
 *     }
 *     return selected;
 * }
 * ```
 */
export interface IUTXO {
    /**
     * Transaction ID that created this output.
     *
     * @example `"7a1ae3e5c8b2d4f6a8c0e2d4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2"`
     */
    readonly txid: string;

    /**
     * Output index within the creating transaction.
     *
     * Together with `txid`, this uniquely identifies the UTXO
     * (known as an "outpoint").
     *
     * @example `0`
     */
    readonly vout: number;

    /**
     * Output value in satoshis.
     *
     * @example `50000000n` (0.5 BTC)
     */
    readonly value: bigint;

    /**
     * Raw hex-encoded locking script (scriptPubKey).
     *
     * @example `"0014751e76e8199196d454941c45d1b3a323f1433bd6"` (P2WPKH)
     */
    readonly scriptPubKey: string;

    /**
     * Script type classification for this UTXO.
     *
     * Common values: `"p2pkh"`, `"p2sh"`, `"p2wpkh"`, `"p2wsh"`, `"p2tr"`.
     *
     * @remarks Currently not populated by the node - always `undefined`.
     *
     * @example `"p2tr"` (Pay-to-Taproot)
     */
    readonly scriptType?: string;

    /**
     * Bitcoin address associated with this UTXO (if derivable from the script).
     *
     * @example `"bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"`
     */
    readonly address?: string;

    /**
     * Block height at which this UTXO was created.
     *
     * @remarks The node's UTXO repository does not currently track block
     * height per UTXO, so this value may be `0n`. Do not rely on this
     * field for accurate confirmation tracking.
     *
     * @example `850000n`
     */
    readonly blockHeight: bigint;

    /**
     * Whether this UTXO is in a confirmed block.
     *
     * @remarks Currently always `true` in the node implementation.
     * Mempool UTXO tracking is not yet supported.
     */
    readonly confirmed: boolean;

    /**
     * Number of confirmations for this UTXO.
     *
     * @remarks Derived from `blockHeight`, which may not be accurate.
     * See {@link blockHeight} remarks.
     *
     * @example `6`
     */
    readonly confirmations?: number;
}

/**
 * Options for filtering UTXO queries.
 *
 * @remarks
 * **Not yet implemented** - {@link IPluginBlockchainAPI.getUTXOs} currently
 * accepts only an address string with no filtering options. This type is
 * reserved for future use when filtering support is added to the node.
 *
 * @experimental
 */
export interface IUTXOQueryOptions {
    /**
     * Minimum UTXO value in satoshis (inclusive).
     *
     * UTXOs below this value are excluded from results.
     * Useful for filtering out dust outputs.
     *
     * @example `1000n` (filter out outputs below 1000 sats)
     */
    readonly minValue?: bigint;

    /**
     * Maximum UTXO value in satoshis (inclusive).
     *
     * @example `100_000_000n` (max 1 BTC per UTXO)
     */
    readonly maxValue?: bigint;

    /**
     * Minimum number of confirmations required.
     *
     * UTXOs with fewer confirmations are excluded.
     *
     * @example `6`
     */
    readonly minConfirmations?: number;

    /**
     * Whether to include unconfirmed (mempool) UTXOs.
     *
     * @defaultValue `true`
     */
    readonly includeUnconfirmed?: boolean;

    /**
     * Maximum number of UTXOs to return.
     *
     * @example `100`
     */
    readonly limit?: number;
}
