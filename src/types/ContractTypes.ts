/**
 * Contract event emitted during execution
 */
export interface IContractEvent {
    /** Contract address that emitted the event */
    readonly contractAddress: string;

    /** Event type/name */
    readonly eventType: string;

    /** Event data */
    readonly data: Buffer;

    /** Block height where event was emitted */
    readonly blockHeight: bigint;

    /** Transaction ID that triggered the event */
    readonly txid: string;

    /** Event index within the transaction */
    readonly eventIndex: number;
}

/**
 * Transaction receipt from OPNet execution
 */
export interface ITransactionReceipt {
    /** Whether execution was successful */
    readonly success: boolean;

    /** Gas used by execution */
    readonly gasUsed: bigint;

    /** Events emitted during execution */
    readonly events: readonly IContractEvent[];

    /** Revert reason if execution failed */
    readonly revertReason?: string;

    /** Return data from execution */
    readonly returnData?: Buffer;
}

/**
 * Deployed contract information
 */
export interface IContractInfo {
    /** Contract address */
    readonly address: string;

    /** Block height when contract was deployed */
    readonly deploymentHeight: bigint;

    /** Transaction ID of deployment */
    readonly deploymentTxid: string;

    /** Contract bytecode (if available) */
    readonly bytecode?: Buffer;

    /** Contract deployer address */
    readonly deployer?: string;

    /** Whether the contract is currently active */
    readonly isActive: boolean;
}

/**
 * Contract storage entry
 */
export interface IContractStorageEntry {
    /** Storage pointer */
    readonly pointer: bigint;

    /** Storage value */
    readonly value: Buffer;

    /** Block height when this value was set */
    readonly blockHeight: bigint;
}
