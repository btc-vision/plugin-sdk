/**
 * OPNet smart contract types for events, receipts, and contract metadata.
 *
 * These types are used when querying historical contract data via the
 * {@link IPluginBlockchainAPI} (available through `context.blockchain`).
 * They represent OPNet's processed contract execution results stored
 * in the node's database.
 *
 * @remarks
 * All binary data fields use `Uint8Array` (not `Buffer`). If you need
 * to convert to hex strings, use a utility like:
 * ```typescript
 * const hex = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
 * ```
 *
 * @example
 * ```typescript
 * import { PluginBase, IBlockProcessedData } from '@btc-vision/plugin-sdk';
 *
 * export default class EventTracker extends PluginBase {
 *     async onBlockPostProcess(block: IBlockProcessedData): Promise<void> {
 *         const events = await this.context.blockchain!.getContractEvents(
 *             'bc1q...contract-address',
 *             block.blockNumber,
 *             block.blockNumber,
 *         );
 *
 *         for (const event of events) {
 *             this.context.logger.info(
 *                 `Event: ${event.eventType} from ${event.contractAddress} ` +
 *                 `(${event.data.byteLength} bytes)`
 *             );
 *         }
 *     }
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * OPNet smart contract event emitted during transaction execution.
 *
 * Contract events are emitted by OPNet smart contracts during execution
 * and stored in the node's database. They can be queried via
 * {@link IPluginBlockchainAPI.getContractEvents}.
 *
 * @example
 * ```typescript
 * import type { IContractEvent } from '@btc-vision/plugin-sdk';
 *
 * async function processTransferEvents(events: readonly IContractEvent[]): Promise<void> {
 *     for (const event of events) {
 *         if (event.eventType === 'Transfer') {
 *             // Decode the event data based on the contract's ABI
 *             console.log(`Transfer event in TX ${event.txid} at block ${event.blockHeight}`);
 *             console.log(`Data bytes: ${event.data.byteLength}`);
 *             console.log(`Event index: ${event.eventIndex}`);
 *         }
 *     }
 * }
 * ```
 */
export interface IContractEvent {
    /**
     * OPNet contract address that emitted this event.
     *
     * @example `"bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"`
     */
    readonly contractAddress: string;

    /**
     * Event type identifier as defined by the contract.
     *
     * Common OPNet event types include `"Transfer"`, `"Approval"`,
     * `"Mint"`, `"Burn"`, etc.
     *
     * @example `"Transfer"`
     */
    readonly eventType: string;

    /**
     * ABI-encoded event data as raw bytes.
     *
     * The encoding format depends on the contract's ABI definition.
     * Use the contract's ABI to decode this data into meaningful fields.
     */
    readonly data: Uint8Array;

    /**
     * Block height where this event was emitted.
     *
     * @example `850000n`
     */
    readonly blockHeight: bigint;

    /**
     * Transaction ID of the transaction that triggered this event.
     *
     * @example `"7a1ae3e5c8b2d4f6a8c0e2d4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2"`
     */
    readonly txid: string;

    /**
     * Zero-based index of this event within the transaction's event list.
     *
     * A single transaction can emit multiple events; this index
     * identifies the order in which they were emitted.
     *
     * @example `0`
     */
    readonly eventIndex: number;
}

/**
 * OPNet transaction receipt containing execution results.
 *
 * Every OPNet contract interaction produces a receipt that records
 * whether execution succeeded, how much gas was consumed, and
 * any events that were emitted.
 *
 * @example
 * ```typescript
 * import type { ITransactionReceipt } from '@btc-vision/plugin-sdk';
 *
 * function analyzeReceipt(receipt: ITransactionReceipt): void {
 *     if (receipt.success) {
 *         console.log(`Success! Gas used: ${receipt.gasUsed}`);
 *         console.log(`Events emitted: ${receipt.events.length}`);
 *         if (receipt.returnData) {
 *             console.log(`Return data: ${receipt.returnData.byteLength} bytes`);
 *         }
 *     } else {
 *         console.log(`Reverted: ${receipt.revertReason ?? 'unknown reason'}`);
 *     }
 * }
 * ```
 */
export interface ITransactionReceipt {
    /**
     * Whether the contract execution completed successfully.
     *
     * If `false`, the execution was reverted and {@link revertReason}
     * may contain details about the failure.
     */
    readonly success: boolean;

    /**
     * Total gas consumed by this transaction's OPNet execution.
     *
     * @example `21000n`
     */
    readonly gasUsed: bigint;

    /**
     * Events emitted during contract execution.
     *
     * Empty array if no events were emitted or if the transaction reverted.
     *
     * @remarks Currently always an empty array in the node implementation.
     * Event population in receipts is not yet supported. Use
     * {@link IPluginBlockchainAPI.getContractEvents} for event queries
     * (when implemented).
     */
    readonly events: readonly IContractEvent[];

    /**
     * Human-readable reason for execution revert.
     *
     * Only present when {@link success} is `false`. Contains the
     * revert message from the contract (e.g., `"Insufficient balance"`).
     *
     * @example `"ERC20: transfer amount exceeds balance"`
     */
    readonly revertReason?: string;

    /**
     * Raw return data from the contract execution.
     *
     * Contains the ABI-encoded return value of the called function.
     * Only present for successful executions that return data.
     *
     * @remarks Currently not populated by the node - always `undefined`.
     */
    readonly returnData?: Uint8Array;
}

/**
 * OPNet smart contract metadata and deployment information.
 *
 * Retrieved via {@link IPluginBlockchainAPI.getContract}. Contains
 * information about a deployed OPNet contract including its deployment
 * details and current status.
 *
 * @example
 * ```typescript
 * import type { IContractInfo, IPluginBlockchainAPI } from '@btc-vision/plugin-sdk';
 *
 * async function inspectContract(
 *     blockchain: IPluginBlockchainAPI,
 *     address: string,
 * ): Promise<void> {
 *     const info = await blockchain.getContract(address);
 *     if (!info) {
 *         console.log('Contract not found');
 *         return;
 *     }
 *
 *     console.log(`Contract: ${info.address}`);
 *     console.log(`Deployed at block: ${info.deploymentHeight}`);
 *     console.log(`Deployed by: ${info.deployer ?? 'unknown'}`);
 *     console.log(`Active: ${info.isActive}`);
 *
 *     if (info.bytecode) {
 *         console.log(`Bytecode size: ${info.bytecode.byteLength} bytes`);
 *     }
 * }
 * ```
 */
export interface IContractInfo {
    /**
     * OPNet contract address (Bitcoin address format).
     *
     * @example `"bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"`
     */
    readonly address: string;

    /**
     * Block height at which this contract was deployed.
     *
     * @example `840000n`
     */
    readonly deploymentHeight: bigint;

    /**
     * Transaction ID of the deployment transaction.
     *
     * @example `"7a1ae3e5c8b2d4f6a8c0e2d4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2"`
     */
    readonly deploymentTxid: string;

    /**
     * Contract WebAssembly bytecode.
     *
     * May not be included in all queries for efficiency.
     * Request specifically if you need to inspect the contract code.
     */
    readonly bytecode?: Uint8Array;

    /**
     * Address of the account that deployed this contract.
     *
     * @example `"bc1q...deployer-address"`
     */
    readonly deployer?: string;

    /**
     * Whether the contract is currently active and can receive calls.
     *
     * A contract may be deactivated if it self-destructs or is
     * administratively disabled.
     *
     * @remarks Currently always `true` in the node implementation.
     */
    readonly isActive: boolean;
}

/**
 * OPNet contract storage entry at a specific pointer.
 *
 * Represents a single key-value pair in a contract's storage trie.
 *
 * @remarks
 * **Not currently returned by any API method.** The
 * {@link IPluginBlockchainAPI.getContractStorage} method returns raw
 * `Uint8Array | null` rather than this structured type. This type
 * is reserved for future use when richer storage queries are supported.
 *
 * @experimental
 */
export interface IContractStorageEntry {
    /**
     * Storage pointer (key) identifying this slot in the contract's storage.
     *
     * Pointers are deterministic based on the contract's storage layout.
     *
     * @example `0n` (slot 0, often used for total supply in OP20 tokens)
     */
    readonly pointer: bigint;

    /**
     * Raw value stored at this pointer.
     *
     * The encoding depends on the data type stored by the contract.
     * Common encodings include big-endian uint256 for numbers and
     * UTF-8 for strings.
     */
    readonly value: Uint8Array;

    /**
     * Block height at which this storage entry was last modified.
     *
     * @example `850000n`
     */
    readonly blockHeight: bigint;
}
