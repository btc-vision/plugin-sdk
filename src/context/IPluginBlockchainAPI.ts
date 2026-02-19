/**
 * Plugin blockchain query API for accessing historical chain data.
 *
 * Provides read-only access to the OPNet node's blockchain database,
 * allowing plugins to query blocks, transactions, contracts, and UTXOs.
 * Available via `context.blockchain` when the appropriate blockchain
 * permissions are granted.
 *
 * @remarks
 * - Requires `blockchain.*` permissions for each data type.
 * - All queries are read-only - plugins cannot modify blockchain state.
 * - `context.blockchain` is `undefined` if no blockchain permissions are granted.
 * - Block heights and values use `bigint` for precision.
 *
 * @example
 * ```typescript
 * import { PluginBase, IPluginContext, IBlockProcessedData } from '@btc-vision/plugin-sdk';
 *
 * export default class ChainAnalyzer extends PluginBase {
 *     async onBlockPostProcess(block: IBlockProcessedData): Promise<void> {
 *         const blockchain = this.context.blockchain!;
 *
 *         // Query block header
 *         const header = await blockchain.getBlock(block.blockNumber);
 *         if (header) {
 *             this.context.logger.info(`Block ${header.height}: ${header.hash}`);
 *         }
 *
 *         // Query transactions
 *         const txs = await blockchain.getTransactionsByBlock(block.blockNumber);
 *         this.context.logger.info(`${txs.length} transactions in block`);
 *
 *         // Query contract events
 *         const events = await blockchain.getContractEvents(
 *             'bc1q...token-contract',
 *             block.blockNumber,
 *             block.blockNumber,
 *         );
 *         this.context.logger.info(`${events.length} contract events`);
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

import { ITransactionInput, ITransactionOutput } from '../types/TransactionTypes.js';
import { IContractEvent, IContractInfo, ITransactionReceipt } from '../types/ContractTypes.js';
import { IUTXO } from '../types/UTXOTypes.js';

/**
 * Block header information from the OPNet database.
 *
 * Contains both Bitcoin block header fields and OPNet-specific state roots.
 * Retrieved via {@link IPluginBlockchainAPI.getBlock} and
 * {@link IPluginBlockchainAPI.getBlockByHash}.
 *
 * @example
 * ```typescript
 * import type { IBlockHeader, IPluginBlockchainAPI } from '@btc-vision/plugin-sdk';
 *
 * async function getLatestBlocks(
 *     blockchain: IPluginBlockchainAPI,
 *     count: number,
 * ): Promise<IBlockHeader[]> {
 *     const tip = await blockchain.getChainTip();
 *     const fromHeight = tip - BigInt(count - 1);
 *     const blocks = await blockchain.getBlockRange(fromHeight, tip);
 *     return [...blocks]; // Convert readonly array
 * }
 * ```
 */
export interface IBlockHeader {
    /**
     * Block height (0-indexed from genesis).
     *
     * @example `850000n`
     */
    readonly height: bigint;

    /**
     * Block hash (hex-encoded, reversed byte order).
     *
     * @example `"00000000000000000002a7c4c1e48d76c5a37902165a270156b7a8d72f8804c6"`
     */
    readonly hash: string;

    /**
     * Hash of the previous block.
     *
     * @example `"0000000000000000000168d2da9b51cfe99ad7e98b3f5d3a28cbcf6bf75dc92c"`
     */
    readonly previousHash: string;

    /**
     * Bitcoin merkle root of all transactions in the block.
     *
     * @example `"4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"`
     */
    readonly merkleRoot: string;

    /**
     * Block timestamp as Unix epoch seconds.
     *
     * @example `1700000000`
     */
    readonly timestamp: number;

    /**
     * OPNet receipt root (merkle root of transaction receipts).
     */
    readonly receiptRoot: string;

    /**
     * OPNet storage root (merkle root of contract storage state).
     */
    readonly storageRoot: string;

    /**
     * OPNet checksum hash (this block's epoch contribution).
     */
    readonly checksumHash: string;
}

/**
 * Transaction document from the OPNet database.
 *
 * Contains a fully processed transaction with structured inputs, outputs,
 * gas usage, and OPNet execution receipt. Retrieved via
 * {@link IPluginBlockchainAPI.getTransaction}.
 *
 * @example
 * ```typescript
 * import type { ITransactionDocument, IPluginBlockchainAPI } from '@btc-vision/plugin-sdk';
 *
 * async function getTransactionDetails(
 *     blockchain: IPluginBlockchainAPI,
 *     txid: string,
 * ): Promise<void> {
 *     const tx = await blockchain.getTransaction(txid);
 *     if (!tx) {
 *         console.log('Transaction not found');
 *         return;
 *     }
 *
 *     console.log(`TX ${tx.txid} in block #${tx.blockHeight} (index ${tx.index})`);
 *     console.log(`Inputs: ${tx.inputs.length}, Outputs: ${tx.outputs.length}`);
 *
 *     if (tx.receipt) {
 *         console.log(`OPNet execution: ${tx.receipt.success ? 'SUCCESS' : 'REVERTED'}`);
 *         console.log(`Gas used: ${tx.receipt.gasUsed}`);
 *         console.log(`Events: ${tx.receipt.events.length}`);
 *     }
 * }
 * ```
 */
export interface ITransactionDocument {
    /**
     * Transaction ID (double SHA-256, reversed hex).
     *
     * @example `"7a1ae3e5c8b2d4f6a8c0e2d4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2"`
     */
    readonly txid: string;

    /**
     * Witness transaction hash.
     *
     * Identical to `txid` for non-SegWit transactions.
     */
    readonly hash: string;

    /**
     * Block height where this transaction was included.
     *
     * @example `850000n`
     */
    readonly blockHeight: bigint;

    /**
     * Position index within the block (0-based).
     *
     * The coinbase transaction is always at index 0.
     *
     * @example `42`
     */
    readonly index: number;

    /**
     * Transaction inputs (previous outputs being spent).
     */
    readonly inputs: readonly ITransactionInput[];

    /**
     * Transaction outputs (new UTXOs being created).
     */
    readonly outputs: readonly ITransactionOutput[];

    /**
     * Gas consumed by OPNet execution (if this was a contract interaction).
     *
     * `undefined` for pure Bitcoin transactions with no OPNet execution.
     *
     * @example `21000n`
     */
    readonly gasUsed?: bigint;

    /**
     * OPNet execution receipt (if this was a contract interaction).
     *
     * Contains success/failure status, events emitted, and return data.
     * `undefined` for pure Bitcoin transactions.
     */
    readonly receipt?: ITransactionReceipt;
}

/**
 * Block with all its transactions included.
 *
 * Extends {@link IBlockHeader} with a full list of processed transactions.
 * Retrieved via {@link IPluginBlockchainAPI.getBlockWithTransactions}.
 *
 * @example
 * ```typescript
 * import type { IBlockWithTransactions, IPluginBlockchainAPI } from '@btc-vision/plugin-sdk';
 *
 * async function analyzeBlock(
 *     blockchain: IPluginBlockchainAPI,
 *     height: bigint,
 * ): Promise<void> {
 *     const block = await blockchain.getBlockWithTransactions(height);
 *     if (!block) return;
 *
 *     const opnetTxs = block.transactions.filter((tx) => tx.receipt !== undefined);
 *     console.log(
 *         `Block #${block.height}: ${block.transactions.length} total txs, ` +
 *         `${opnetTxs.length} OPNet txs`
 *     );
 * }
 * ```
 */
export interface IBlockWithTransactions extends IBlockHeader {
    /**
     * All transactions in the block with full detail.
     */
    readonly transactions: readonly ITransactionDocument[];
}

/**
 * Blockchain query API for plugins.
 *
 * Provides read-only access to historical blockchain data including
 * blocks, transactions, contracts, and UTXOs. Each method requires
 * the corresponding blockchain permission to be enabled.
 *
 * @remarks
 * Available via `context.blockchain` when at least one blockchain
 * permission is granted. Individual methods throw if their specific
 * permission is not enabled.
 *
 * @example
 * ```typescript
 * import type { IPluginBlockchainAPI } from '@btc-vision/plugin-sdk';
 *
 * async function fullExample(blockchain: IPluginBlockchainAPI): Promise<void> {
 *     // Block queries (requires blockchain.blocks permission)
 *     const tip = await blockchain.getChainTip();
 *     const block = await blockchain.getBlock(tip);
 *     const exists = await blockchain.hasBlock(tip);
 *     const range = await blockchain.getBlockRange(tip - 10n, tip);
 *
 *     // Transaction queries (requires blockchain.transactions permission)
 *     const tx = await blockchain.getTransaction('7a1ae3e5...');
 *     const blockTxs = await blockchain.getTransactionsByBlock(tip);
 *
 *     // Contract queries (requires blockchain.contracts permission)
 *     const contract = await blockchain.getContract('bc1q...');
 *     const storage = await blockchain.getContractStorage('bc1q...', 0n);
 *     const events = await blockchain.getContractEvents('bc1q...', tip - 100n, tip);
 *
 *     // UTXO queries (requires blockchain.utxos permission)
 *     const utxos = await blockchain.getUTXOs('bc1q...');
 * }
 * ```
 */
export interface IPluginBlockchainAPI {
    /**
     * Get a block header by height.
     *
     * @param height - Block height to query.
     * @returns Block header or `null` if no block exists at that height.
     *
     * @remarks Requires `blockchain.blocks` permission.
     *
     * @example
     * ```typescript
     * const block = await blockchain.getBlock(850000n);
     * if (block) {
     *     console.log(`Block ${block.height}: hash=${block.hash.slice(0, 16)}...`);
     * }
     * ```
     */
    getBlock(height: bigint): Promise<IBlockHeader | null>;

    /**
     * Get a block header by its hash.
     *
     * @param hash - Block hash (hex-encoded).
     * @returns Block header or `null` if not found.
     *
     * @remarks Requires `blockchain.blocks` permission.
     *
     * @example
     * ```typescript
     * const block = await blockchain.getBlockByHash(
     *     '00000000000000000002a7c4c1e48d76c5a37902165a270156b7a8d72f8804c6'
     * );
     * ```
     */
    getBlockByHash(hash: string): Promise<IBlockHeader | null>;

    /**
     * Get a block with all its transactions.
     *
     * @param height - Block height to query.
     * @returns Block with transactions or `null` if not found.
     *
     * @remarks
     * Requires both `blockchain.blocks` and `blockchain.transactions` permissions.
     * This is a heavier query than `getBlock()` since it includes all transactions.
     *
     * @example
     * ```typescript
     * const block = await blockchain.getBlockWithTransactions(850000n);
     * if (block) {
     *     for (const tx of block.transactions) {
     *         if (tx.receipt?.success) {
     *             console.log(`OPNet TX: ${tx.txid}`);
     *         }
     *     }
     * }
     * ```
     */
    getBlockWithTransactions(height: bigint): Promise<IBlockWithTransactions | null>;

    /**
     * Get a transaction by its ID.
     *
     * @param txid - Transaction ID (hex-encoded).
     * @returns Transaction document or `null` if not found.
     *
     * @remarks Requires `blockchain.transactions` permission.
     *
     * @example
     * ```typescript
     * const tx = await blockchain.getTransaction('7a1ae3e5...');
     * if (tx) {
     *     console.log(`TX in block #${tx.blockHeight}, index ${tx.index}`);
     *     console.log(`${tx.inputs.length} inputs, ${tx.outputs.length} outputs`);
     * }
     * ```
     */
    getTransaction(txid: string): Promise<ITransactionDocument | null>;

    /**
     * Get all transactions in a specific block.
     *
     * @param height - Block height to query.
     * @returns Array of transaction documents (empty if block not found).
     *
     * @remarks Requires `blockchain.transactions` permission.
     *
     * @example
     * ```typescript
     * const txs = await blockchain.getTransactionsByBlock(850000n);
     * const opnetTxs = txs.filter((tx) => tx.receipt !== undefined);
     * console.log(`${opnetTxs.length} OPNet transactions in block`);
     * ```
     */
    getTransactionsByBlock(height: bigint): Promise<readonly ITransactionDocument[]>;

    /**
     * Get contract information by address.
     *
     * @param address - OPNet contract address.
     * @returns Contract info or `null` if no contract exists at that address.
     *
     * @remarks Requires `blockchain.contracts` permission.
     *
     * @example
     * ```typescript
     * const info = await blockchain.getContract('bc1q...token');
     * if (info?.isActive) {
     *     console.log(`Contract deployed at block ${info.deploymentHeight}`);
     * }
     * ```
     */
    getContract(address: string): Promise<IContractInfo | null>;

    /**
     * Get a contract's storage value at a specific pointer.
     *
     * @param address - OPNet contract address.
     * @param pointer - Storage pointer (slot number).
     * @returns Raw storage value as `Uint8Array`, or `null` if not set.
     *
     * @remarks Requires `blockchain.contracts` permission.
     *
     * @example
     * ```typescript
     * // Read total supply from storage slot 0
     * const data = await blockchain.getContractStorage('bc1q...token', 0n);
     * if (data) {
     *     // Decode as big-endian uint256
     *     let totalSupply = 0n;
     *     for (const byte of data) {
     *         totalSupply = (totalSupply << 8n) | BigInt(byte);
     *     }
     *     console.log(`Total supply: ${totalSupply}`);
     * }
     * ```
     */
    getContractStorage(address: string, pointer: bigint): Promise<Uint8Array | null>;

    /**
     * Get contract events within a block range.
     *
     * @param address - OPNet contract address.
     * @param fromBlock - Start block height (inclusive).
     * @param toBlock - End block height (inclusive).
     * @returns Array of contract events in the range.
     *
     * @remarks
     * Requires `blockchain.contracts` permission.
     *
     * **Not yet implemented** - currently throws `PluginBlockchainError` with
     * code `BLOCKCHAIN_EVENTS_NOT_IMPLEMENTED`. This method is reserved for
     * future use.
     *
     * @experimental
     */
    getContractEvents(
        address: string,
        fromBlock: bigint,
        toBlock: bigint,
    ): Promise<readonly IContractEvent[]>;

    /**
     * Get unspent transaction outputs (UTXOs) for an address.
     *
     * @param address - Bitcoin address.
     * @returns Array of unspent outputs.
     *
     * @remarks Requires `blockchain.utxos` permission.
     *
     * @example
     * ```typescript
     * const utxos = await blockchain.getUTXOs('bc1q...address');
     * const balance = utxos.reduce((sum, u) => sum + u.value, 0n);
     * console.log(`Address balance: ${Number(balance) / 1e8} BTC`);
     * ```
     */
    getUTXOs(address: string): Promise<readonly IUTXO[]>;

    /**
     * Get the current chain tip (highest processed block height).
     *
     * @returns Current block height as `bigint`.
     *
     * @remarks No specific blockchain permission required - basic chain info.
     *
     * @example
     * ```typescript
     * const tip = await blockchain.getChainTip();
     * console.log(`Chain tip: block #${tip}`);
     * ```
     */
    getChainTip(): Promise<bigint>;

    /**
     * Get multiple block headers by height range.
     *
     * @param fromHeight - Start height (inclusive).
     * @param toHeight - End height (inclusive).
     * @returns Array of block headers in ascending height order.
     *
     * @remarks
     * Requires `blockchain.blocks` permission.
     * The range is capped to a maximum of 100 blocks. If the requested
     * range exceeds 100 blocks, only the first 100 are returned.
     *
     * @example
     * ```typescript
     * // Get the last 10 blocks
     * const tip = await blockchain.getChainTip();
     * const blocks = await blockchain.getBlockRange(tip - 9n, tip);
     * for (const block of blocks) {
     *     console.log(`#${block.height}: ${block.hash.slice(0, 16)}...`);
     * }
     * ```
     */
    getBlockRange(fromHeight: bigint, toHeight: bigint): Promise<readonly IBlockHeader[]>;

    /**
     * Check if a block exists at the given height.
     *
     * Lighter than `getBlock()` when you only need to know existence.
     *
     * @param height - Block height to check.
     * @returns `true` if a block exists at that height.
     *
     * @remarks Requires `blockchain.blocks` permission.
     *
     * @example
     * ```typescript
     * const exists = await blockchain.hasBlock(850000n);
     * if (!exists) {
     *     console.log('Block not yet processed');
     * }
     * ```
     */
    hasBlock(height: bigint): Promise<boolean>;
}
