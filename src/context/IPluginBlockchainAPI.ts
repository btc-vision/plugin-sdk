import { ITransactionInput, ITransactionOutput } from '../types/TransactionTypes.js';
import { IContractEvent, IContractInfo, ITransactionReceipt } from '../types/ContractTypes.js';
import { IUTXO } from '../types/UTXOTypes.js';

/**
 * Block header information
 */
export interface IBlockHeader {
    /** Block height */
    readonly height: bigint;

    /** Block hash */
    readonly hash: string;

    /** Previous block hash */
    readonly previousHash: string;

    /** Bitcoin merkle root */
    readonly merkleRoot: string;

    /** Block timestamp (unix epoch seconds) */
    readonly timestamp: number;

    /** OPNet receipt root (merkle root of transaction receipts) */
    readonly receiptRoot: string;

    /** OPNet storage root (merkle root of contract storage) */
    readonly storageRoot: string;

    /** OPNet checksum hash (epoch checksum contribution) */
    readonly checksumHash: string;
}

/**
 * Transaction document from database
 */
export interface ITransactionDocument {
    /** Transaction ID */
    readonly txid: string;

    /** Transaction hash (witness hash for segwit) */
    readonly hash: string;

    /** Block height where transaction was included */
    readonly blockHeight: bigint;

    /** Index within the block */
    readonly index: number;

    /** Transaction inputs */
    readonly inputs: readonly ITransactionInput[];

    /** Transaction outputs */
    readonly outputs: readonly ITransactionOutput[];

    /** Gas used by OPNet execution (if applicable) */
    readonly gasUsed?: bigint;

    /** OPNet transaction receipt (if applicable) */
    readonly receipt?: ITransactionReceipt;
}

/**
 * Block with full transaction data
 */
export interface IBlockWithTransactions extends IBlockHeader {
    /** Transactions in the block */
    readonly transactions: readonly ITransactionDocument[];
}

/**
 * Blockchain query API for plugins
 * Allows plugins to query historical blockchain data
 */
export interface IPluginBlockchainAPI {
    /**
     * Get a block header by height
     * @param height - Block height
     * @returns Block header or null if not found
     */
    getBlock(height: bigint): Promise<IBlockHeader | null>;

    /**
     * Get a block header by hash
     * @param hash - Block hash
     * @returns Block header or null if not found
     */
    getBlockByHash(hash: string): Promise<IBlockHeader | null>;

    /**
     * Get a block with all its transactions
     * @param height - Block height
     * @returns Block with transactions or null if not found
     */
    getBlockWithTransactions(height: bigint): Promise<IBlockWithTransactions | null>;

    /**
     * Get a transaction by its ID
     * @param txid - Transaction ID
     * @returns Transaction document or null if not found
     */
    getTransaction(txid: string): Promise<ITransactionDocument | null>;

    /**
     * Get all transactions in a specific block
     * @param height - Block height
     * @returns Array of transactions in the block
     */
    getTransactionsByBlock(height: bigint): Promise<readonly ITransactionDocument[]>;

    /**
     * Get contract information by address
     * @param address - Contract address
     * @returns Contract info or null if not found
     */
    getContract(address: string): Promise<IContractInfo | null>;

    /**
     * Get contract storage value at a specific pointer
     * @param address - Contract address
     * @param pointer - Storage pointer
     * @returns Storage value as Buffer or null if not found
     */
    getContractStorage(address: string, pointer: bigint): Promise<Buffer | null>;

    /**
     * Get all contract events for a specific address within a block range
     * @param address - Contract address
     * @param fromBlock - Start block height (inclusive)
     * @param toBlock - End block height (inclusive)
     * @returns Array of contract events
     */
    getContractEvents(
        address: string,
        fromBlock: bigint,
        toBlock: bigint,
    ): Promise<readonly IContractEvent[]>;

    /**
     * Get UTXOs for an address
     * @param address - Bitcoin address
     * @returns Array of unspent transaction outputs
     */
    getUTXOs(address: string): Promise<readonly IUTXO[]>;

    /**
     * Get the current chain tip (highest block height)
     * @returns Current block height
     */
    getChainTip(): Promise<bigint>;

    /**
     * Get multiple blocks by height range
     * @param fromHeight - Start height (inclusive)
     * @param toHeight - End height (inclusive)
     * @returns Array of block headers
     */
    getBlockRange(fromHeight: bigint, toHeight: bigint): Promise<readonly IBlockHeader[]>;

    /**
     * Check if a block exists at the given height
     * @param height - Block height
     * @returns True if block exists
     */
    hasBlock(height: bigint): Promise<boolean>;
}
