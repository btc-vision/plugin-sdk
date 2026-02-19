/**
 * Bitcoin block and transaction types matching Bitcoin Core RPC format.
 *
 * These types represent raw Bitcoin blockchain data as returned by
 * Bitcoin Core's `getblock` RPC with `verbosity=2`. They are used
 * in the {@link IBlockData} hook payload for `onBlockPreProcess`.
 *
 * The data is serialized via `JSON.stringify()` across the worker thread
 * boundary, so all values are JSON-safe primitives (no `BigInt` or `Buffer`).
 *
 * @remarks
 * For OPNet-processed block data (with merkle roots, checksums, etc.),
 * see {@link IBlockProcessedData} which is used by `onBlockPostProcess`
 * and `onBlockChange` hooks.
 *
 * @example
 * ```typescript
 * import { PluginBase, IBlockData, ITransactionData } from '@btc-vision/plugin-sdk';
 *
 * export default class BlockAnalyzer extends PluginBase {
 *     async onBlockPreProcess(block: IBlockData): Promise<void> {
 *         this.context.logger.info(`Block ${block.height}: ${block.tx.length} transactions`);
 *
 *         for (const tx of block.tx) {
 *             const totalOutput = tx.vout.reduce((sum, out) => sum + out.value, 0);
 *             this.context.logger.debug(`TX ${tx.txid}: ${totalOutput} BTC output`);
 *         }
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Script signature (scriptSig) in a transaction input.
 *
 * Contains the unlocking script that satisfies the conditions
 * set by the previous output's scriptPubKey. For SegWit inputs,
 * this is typically empty with witness data provided separately.
 *
 * @example
 * ```typescript
 * function inspectInput(scriptSig: IScriptSig): void {
 *     // Human-readable disassembly
 *     console.log('ASM:', scriptSig.asm);
 *     // Raw hex-encoded script bytes
 *     console.log('Hex:', scriptSig.hex);
 * }
 * ```
 */
export interface IScriptSig {
    /**
     * Human-readable script disassembly (opcodes and data pushes).
     *
     * @example `"304402207f5a...0121 03ab12...ef56"`
     */
    readonly asm: string;

    /**
     * Raw hex-encoded script bytes.
     *
     * @example `"483045022100...0121032a..."`
     */
    readonly hex: string;
}

/**
 * Script public key (scriptPubKey) in a transaction output.
 *
 * Contains the locking script that defines the conditions under which
 * the output can be spent. Includes optional address derivation for
 * standard script types.
 *
 * @example
 * ```typescript
 * function getOutputAddress(spk: IScriptPubKey): string | undefined {
 *     // Prefer single address field (SegWit and newer)
 *     if (spk.address) return spk.address;
 *     // Fall back to addresses array (legacy multi-sig)
 *     if (spk.addresses?.length) return spk.addresses[0];
 *     return undefined;
 * }
 * ```
 */
export interface IScriptPubKey {
    /**
     * Human-readable script disassembly.
     *
     * May be absent for non-standard script types.
     *
     * @example `"OP_DUP OP_HASH160 ab12...ef56 OP_EQUALVERIFY OP_CHECKSIG"`
     * @example `"0 a914...b8ac"` (P2WPKH)
     */
    readonly asm?: string;

    /**
     * Raw hex-encoded script bytes. Always present.
     *
     * @example `"76a914ab12...ef5688ac"`
     */
    readonly hex: string;

    /**
     * Number of required signatures for multi-sig outputs.
     *
     * @deprecated This field is deprecated in newer Bitcoin Core versions.
     * @example `2` (for a 2-of-3 multi-sig)
     */
    readonly reqSigs?: number;

    /**
     * Script type classification.
     *
     * Common values: `"pubkeyhash"`, `"scripthash"`, `"witness_v0_keyhash"`,
     * `"witness_v0_scripthash"`, `"witness_v1_taproot"`, `"multisig"`,
     * `"nulldata"`, `"nonstandard"`.
     *
     * @example `"witness_v1_taproot"`
     */
    readonly type?: string;

    /**
     * Array of Bitcoin addresses associated with this output.
     *
     * @deprecated Use {@link address} instead. This field is deprecated
     * in newer Bitcoin Core versions but may still appear for legacy outputs.
     */
    readonly addresses?: string[];

    /**
     * Bitcoin address derived from the script (for standard types).
     *
     * Present for P2PKH, P2SH, P2WPKH, P2WSH, and P2TR outputs.
     * Not present for `OP_RETURN` or non-standard scripts.
     *
     * @example `"bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"`
     */
    readonly address?: string;
}

/**
 * Transaction input (vin) from Bitcoin Core RPC.
 *
 * References a previous transaction output being spent, along with
 * the unlocking script or witness data that satisfies the spending conditions.
 *
 * @remarks
 * Coinbase transactions have a single input with no `txid`/`vout` reference
 * and instead contain a `coinbase` field with arbitrary data.
 *
 * @example
 * ```typescript
 * function isCoinbase(input: IVIn): boolean {
 *     return input.coinbase !== undefined;
 * }
 *
 * function hasSegwitWitness(input: IVIn): boolean {
 *     return (input.txinwitness?.length ?? 0) > 0;
 * }
 * ```
 */
export interface IVIn {
    /**
     * Transaction ID of the output being spent.
     *
     * For coinbase transactions, this is `"0000...0000"` (all zeros).
     *
     * @example `"7a1ae3e5c8b2d4f6a8c0e2d4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2"`
     */
    readonly txid: string;

    /**
     * Index of the output being spent in the referenced transaction.
     *
     * For coinbase transactions, this is `4294967295` (`0xFFFFFFFF`).
     *
     * @example `0`
     */
    readonly vout: number;

    /**
     * Unlocking script (scriptSig) for this input.
     *
     * For SegWit inputs, this is typically `{ asm: "", hex: "" }` with
     * the actual witness data in {@link txinwitness}.
     */
    readonly scriptSig: IScriptSig;

    /**
     * Sequence number for this input.
     *
     * Used for relative timelocks (BIP 68) and opt-in replace-by-fee (BIP 125).
     * A value of `0xFFFFFFFE` signals opt-in to RBF.
     * A value of `0xFFFFFFFF` disables both nLocktime and RBF.
     *
     * @example `4294967294` (RBF enabled)
     */
    readonly sequence: number;

    /**
     * Segregated Witness data stack for this input.
     *
     * Present only for SegWit (v0 and v1/Taproot) inputs.
     * Each element is a hex-encoded stack item.
     *
     * @example `["304402207f5a...01", "03ab12...ef56"]` (P2WPKH witness)
     */
    readonly txinwitness?: string[];

    /**
     * Coinbase data (hex-encoded).
     *
     * Only present for the sole input of a coinbase transaction (block reward).
     * Contains the block height (BIP 34) and arbitrary miner data.
     *
     * @example `"03a5b102..."`
     */
    readonly coinbase?: string;
}

/**
 * Transaction output (vout) from Bitcoin Core RPC.
 *
 * Represents a single output in a Bitcoin transaction, containing
 * the value and locking script.
 *
 * @remarks
 * The `value` is a floating-point BTC amount (not satoshis), matching
 * the Bitcoin Core RPC format. To convert to satoshis:
 * `Math.round(vout.value * 1e8)`.
 *
 * @example
 * ```typescript
 * function toSatoshis(output: IVOut): bigint {
 *     return BigInt(Math.round(output.value * 1e8));
 * }
 *
 * function isOpReturn(output: IVOut): boolean {
 *     return output.scriptPubKey.type === 'nulldata';
 * }
 * ```
 */
export interface IVOut {
    /**
     * Output value in BTC (floating-point).
     *
     * @remarks This is BTC, **not** satoshis. Multiply by `1e8` to get satoshis.
     * @example `0.5` (0.5 BTC = 50,000,000 satoshis)
     */
    readonly value: number;

    /**
     * Zero-based index of this output within the transaction.
     *
     * @example `0`
     */
    readonly n: number;

    /**
     * Locking script (scriptPubKey) defining spend conditions.
     */
    readonly scriptPubKey: IScriptPubKey;
}

/**
 * Raw Bitcoin transaction data from Bitcoin Core RPC.
 *
 * Matches the transaction format returned by `getblock` with `verbosity=2`.
 * All field names use the Bitcoin Core naming convention (snake_case).
 *
 * @remarks
 * This data crosses the worker thread boundary via JSON serialization,
 * so all values are JSON-safe primitives. `BigInt` values are not used here.
 *
 * @example
 * ```typescript
 * import { PluginBase, IBlockData, ITransactionData } from '@btc-vision/plugin-sdk';
 *
 * export default class TxMonitor extends PluginBase {
 *     async onBlockPreProcess(block: IBlockData): Promise<void> {
 *         for (const tx of block.tx) {
 *             if (this.isLargeTransaction(tx)) {
 *                 this.context.logger.info(
 *                     `Large TX: ${tx.txid} (${tx.vsize} vbytes, ${tx.vin.length} inputs)`
 *                 );
 *             }
 *         }
 *     }
 *
 *     private isLargeTransaction(tx: ITransactionData): boolean {
 *         return tx.vsize > 10_000;
 *     }
 * }
 * ```
 */
export interface ITransactionData {
    /**
     * Whether this transaction is in the active chain.
     *
     * Always `true` for transactions in blocks retrieved from the active chain.
     * May be `false` for transactions queried by txid that are in orphaned blocks.
     */
    readonly in_active_chain: boolean;

    /**
     * Raw serialized transaction in hexadecimal.
     *
     * Contains the complete transaction bytes including witness data.
     *
     * @example `"0200000001..."`
     */
    readonly hex: string;

    /**
     * Transaction ID (double SHA-256 of non-witness serialization, reversed).
     *
     * This is the canonical transaction identifier used for referencing
     * transactions in inputs and block explorers.
     *
     * @example `"7a1ae3e5c8b2d4f6a8c0e2d4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2"`
     */
    readonly txid: string;

    /**
     * Witness transaction hash (double SHA-256 of full serialization with witness, reversed).
     *
     * For non-SegWit transactions, this is identical to {@link txid}.
     * For SegWit transactions, this includes the witness data in the hash.
     *
     * @example `"3b2ce5d8f7a6b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3"`
     */
    readonly hash: string;

    /**
     * Transaction size in bytes (full serialization including witness).
     *
     * @example `225`
     */
    readonly size: number;

    /**
     * Virtual size in virtual bytes (vbytes).
     *
     * Calculated as: `max(weight / 4, base_size)` where `base_size` is
     * the size without witness data. Used for fee calculation.
     *
     * @example `141`
     */
    readonly vsize: number;

    /**
     * Transaction weight in weight units (WU).
     *
     * Calculated as: `base_size * 3 + total_size`. Maximum block weight
     * is 4,000,000 WU.
     *
     * @example `561`
     */
    readonly weight: number;

    /**
     * Transaction format version.
     *
     * Version 1 is the original format. Version 2 enables relative
     * timelocks (BIP 68).
     *
     * @example `2`
     */
    readonly version: number;

    /**
     * Transaction lock time.
     *
     * If less than 500,000,000, interpreted as a block height.
     * If >= 500,000,000, interpreted as a Unix timestamp.
     * A value of 0 means the transaction is immediately final.
     *
     * @example `0`
     */
    readonly locktime: number;

    /**
     * Array of transaction inputs.
     *
     * Each input references and spends a previous transaction output.
     * Coinbase transactions have exactly one input with the coinbase field set.
     */
    readonly vin: readonly IVIn[];

    /**
     * Array of transaction outputs.
     *
     * Each output defines a value and spending conditions (scriptPubKey).
     */
    readonly vout: readonly IVOut[];

    /**
     * Hash of the block containing this transaction.
     *
     * @example `"00000000000000000002a7c4c1e48d76c5a37902165a270156b7a8d72f8804c6"`
     */
    readonly blockhash: string;

    /**
     * Number of confirmations for this transaction.
     *
     * Equal to `(current_height - block_height + 1)`. A value of 1 means
     * the transaction is in the latest block.
     *
     * @example `6`
     */
    readonly confirmations: number;

    /**
     * Block time as Unix timestamp (seconds since epoch).
     *
     * This is the `time` field from the block header.
     *
     * @example `1700000000`
     */
    readonly blocktime: number;

    /**
     * Transaction time as Unix timestamp (seconds since epoch).
     *
     * Same as {@link blocktime} for confirmed transactions.
     *
     * @example `1700000000`
     */
    readonly time: number;
}

/**
 * Raw Bitcoin block data with full transaction data.
 *
 * Matches the Bitcoin Core `getblock` RPC response with `verbosity=2`.
 * This is the payload passed to the `onBlockPreProcess` hook.
 *
 * @remarks
 * - Field names follow Bitcoin Core naming conventions (all lowercase, no camelCase).
 * - `height` is a `number` (not `bigint`) because this data crosses the JSON
 *   serialization boundary between the node's worker pool and plugin worker threads.
 * - For OPNet-processed block data, see {@link IBlockProcessedData}.
 *
 * @example
 * ```typescript
 * import { PluginBase, IBlockData } from '@btc-vision/plugin-sdk';
 *
 * export default class BlockIndexer extends PluginBase {
 *     async onBlockPreProcess(block: IBlockData): Promise<void> {
 *         const { height, hash, tx, time, difficulty } = block;
 *
 *         this.context.logger.info(
 *             `Processing block ${height} (${hash.slice(0, 16)}...) ` +
 *             `with ${tx.length} transactions at difficulty ${difficulty}`
 *         );
 *
 *         // Index all output addresses
 *         for (const transaction of tx) {
 *             for (const output of transaction.vout) {
 *                 const address = output.scriptPubKey.address;
 *                 if (address) {
 *                     await this.indexAddress(address, height, transaction.txid);
 *                 }
 *             }
 *         }
 *     }
 *
 *     private async indexAddress(
 *         address: string, height: number, txid: string
 *     ): Promise<void> {
 *         const collection = this.context.db!.collection('my-plugin_addresses');
 *         await collection.insertOne({ address, height, txid });
 *     }
 * }
 * ```
 */
export interface IBlockData {
    /**
     * Block hash (double SHA-256 of block header, reversed, hex-encoded).
     *
     * @example `"00000000000000000002a7c4c1e48d76c5a37902165a270156b7a8d72f8804c6"`
     */
    readonly hash: string;

    /**
     * Number of confirmations for this block.
     *
     * Equal to `(current_height - block_height + 1)`. The tip of the chain
     * always has 1 confirmation.
     *
     * @example `100`
     */
    readonly confirmations: number;

    /**
     * Total block size in bytes (including all transactions).
     *
     * @example `1500000`
     */
    readonly size: number;

    /**
     * Block size without witness data (stripped size).
     *
     * @example `800000`
     */
    readonly strippedsize: number;

    /**
     * Block weight in weight units (WU).
     *
     * Maximum allowed is 4,000,000 WU.
     * Calculated as: `stripped_size * 3 + total_size`.
     *
     * @example `3993120`
     */
    readonly weight: number;

    /**
     * Block height (0-indexed from genesis).
     *
     * @remarks This is a `number`, not `bigint`, because block data crosses the
     * JSON serialization boundary. For `bigint` block heights, see
     * {@link IBlockProcessedData.blockNumber}.
     *
     * @example `850000`
     */
    readonly height: number;

    /**
     * Block header version.
     *
     * Encodes BIP 9 version bits for soft fork signaling.
     *
     * @example `536870912` (0x20000000)
     */
    readonly version: number;

    /**
     * Block header version as hex string.
     *
     * @example `"20000000"`
     */
    readonly versionHex: string;

    /**
     * Merkle root of all transactions in the block.
     *
     * Hex-encoded, reversed byte order (Bitcoin standard display format).
     *
     * @example `"4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"`
     */
    readonly merkleroot: string;

    /**
     * Array of all transactions in the block with full data.
     *
     * The first transaction (`tx[0]`) is always the coinbase transaction.
     */
    readonly tx: readonly ITransactionData[];

    /**
     * Block timestamp as Unix epoch seconds.
     *
     * Set by the miner. Must be greater than the median of the last 11 blocks
     * and no more than 2 hours in the future.
     *
     * @example `1700000000`
     */
    readonly time: number;

    /**
     * Median time of the previous 11 blocks (Unix epoch seconds).
     *
     * Used for time-based lock validation (BIP 113). This value only
     * increases, unlike {@link time} which can decrease slightly.
     *
     * @example `1699999000`
     */
    readonly mediantime: number;

    /**
     * Block header nonce used in proof-of-work.
     *
     * @example `2083236893`
     */
    readonly nonce: number;

    /**
     * Compact representation of the difficulty target.
     *
     * @example `"17053894"`
     */
    readonly bits: string;

    /**
     * Mining difficulty relative to the minimum difficulty.
     *
     * @example `95672703408880.78`
     */
    readonly difficulty: number;

    /**
     * Cumulative proof-of-work in the chain up to and including this block.
     *
     * Hex-encoded 256-bit integer representing total expected hash attempts.
     *
     * @example `"00000000000000000000000000000000000000008a4a3c266bd0ed1c65b10faa"`
     */
    readonly chainwork: string;

    /**
     * Number of transactions in the block.
     *
     * Same as `tx.length`.
     *
     * @example `3500`
     */
    readonly nTx: number;

    /**
     * Hash of the previous block.
     *
     * Empty string for the genesis block (height 0).
     *
     * @example `"0000000000000000000168d2da9b51cfe99ad7e98b3f5d3a28cbcf6bf75dc92c"`
     */
    readonly previousblockhash: string;

    /**
     * Hash of the next block (if known).
     *
     * Empty string if this is the chain tip or the next block is unknown.
     *
     * @example `"000000000000000000014e2c17b3b9bce80aaff6a75ee06f76bbb819bb88bc14"`
     */
    readonly nextblockhash: string;
}

/**
 * Checksum proof for an OPNet epoch merkle tree.
 *
 * Each block contributes a checksum hash to its epoch's merkle tree.
 * This proof allows verification that a block's checksum is included
 * in the epoch root.
 *
 * @example
 * ```typescript
 * function verifyBlockInEpoch(
 *     blockChecksum: string,
 *     proof: IChecksumProof,
 *     epochRoot: string
 * ): boolean {
 *     // Walk the merkle proof from leaf to root
 *     let current = blockChecksum;
 *     for (const sibling of proof.proof) {
 *         current = hashPair(current, sibling);
 *     }
 *     return current === epochRoot;
 * }
 * ```
 */
export interface IChecksumProof {
    /**
     * Merkle proof path from the block's checksum leaf to the epoch root.
     *
     * Each element is a hex-encoded hash of a sibling node in the tree.
     * The proof is ordered from leaf level to root level.
     */
    readonly proof: string[];
}

/**
 * OPNet processed block data with consensus-critical fields.
 *
 * This is the payload passed to `onBlockPostProcess` and `onBlockChange` hooks.
 * It contains OPNet-specific data computed during block processing, including
 * merkle roots for receipts, storage state, and epoch checksums.
 *
 * @remarks
 * Unlike {@link IBlockData} which uses raw Bitcoin Core field names and `number` types,
 * this interface uses OPNet naming conventions and `bigint` for block heights.
 * The `bigint` values survive JSON serialization because the OPNet node registers
 * a global BigInt JSON handler via `Globals.register()`.
 *
 * @example
 * ```typescript
 * import { PluginBase, IBlockProcessedData } from '@btc-vision/plugin-sdk';
 *
 * export default class StateTracker extends PluginBase {
 *     async onBlockPostProcess(block: IBlockProcessedData): Promise<void> {
 *         this.context.logger.info(
 *             `Block #${block.blockNumber}: ` +
 *             `${block.txCount} txs, ` +
 *             `storageRoot=${block.storageRoot.slice(0, 16)}...`
 *         );
 *
 *         // Track state root changes
 *         const collection = this.context.db!.collection('my-plugin_state-roots');
 *         await collection.insertOne({
 *             blockNumber: block.blockNumber.toString(),
 *             storageRoot: block.storageRoot,
 *             receiptRoot: block.receiptRoot,
 *             checksumHash: block.checksumHash,
 *         });
 *
 *         await this.context.updateLastSyncedBlock(block.blockNumber);
 *     }
 * }
 * ```
 */
export interface IBlockProcessedData {
    /**
     * Block height as a `bigint`.
     *
     * @example `850000n`
     */
    readonly blockNumber: bigint;

    /**
     * Block hash (hex-encoded, Bitcoin standard reversed byte order).
     *
     * @example `"00000000000000000002a7c4c1e48d76c5a37902165a270156b7a8d72f8804c6"`
     */
    readonly blockHash: string;

    /**
     * Previous block hash. May be absent for the genesis block.
     *
     * @example `"0000000000000000000168d2da9b51cfe99ad7e98b3f5d3a28cbcf6bf75dc92c"`
     */
    readonly previousBlockHash?: string;

    /**
     * Bitcoin merkle root of all transactions in the block.
     *
     * @example `"4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"`
     */
    readonly merkleRoot: string;

    /**
     * OPNet receipt root - merkle root of all OPNet transaction receipts in the block.
     *
     * Used for consensus verification of transaction execution results.
     */
    readonly receiptRoot: string;

    /**
     * OPNet storage root - merkle root of the global contract storage state after this block.
     *
     * Represents the cumulative state of all OPNet contract storage at this block height.
     */
    readonly storageRoot: string;

    /**
     * OPNet checksum hash - this block's contribution to the epoch merkle tree.
     *
     * Derived from the block's receipt root, storage root, and other
     * consensus-critical data. Used to build the epoch checksum tree.
     */
    readonly checksumHash: string;

    /**
     * Merkle proofs for verifying this block's checksum within its epoch.
     *
     * Contains one or more proof paths depending on the epoch structure.
     */
    readonly checksumProofs: IChecksumProof[];

    /**
     * Previous block's checksum hash for chain continuity verification.
     *
     * Allows verifying that checksum hashes form a continuous chain.
     */
    readonly previousBlockChecksum: string;

    /**
     * Number of transactions processed in this block.
     *
     * @example `3500`
     */
    readonly txCount: number;
}
