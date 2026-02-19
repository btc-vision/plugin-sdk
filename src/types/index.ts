/**
 * Bitcoin and OPNet blockchain data types.
 *
 * Exports all type definitions used throughout the plugin SDK:
 * raw Bitcoin block/transaction structures, OPNet-processed block data,
 * smart contract types, epoch/reorg/mempool types, UTXO queries,
 * and HTTP/WebSocket router interfaces.
 *
 * @packageDocumentation
 */

// Block types
export {
    IBlockData,
    IBlockProcessedData,
    ITransactionData,
    IChecksumProof,
    IScriptSig,
    IScriptPubKey,
    IVIn,
    IVOut,
} from './BlockTypes.js';

// Epoch types
export { IEpochData } from './EpochTypes.js';

// Transaction types
export { ITransaction, ITransactionInput, ITransactionOutput } from './TransactionTypes.js';

// Mempool types
export { IMempoolTransaction } from './MempoolTypes.js';

// Reorg types
export { IReorgData } from './ReorgTypes.js';

// Router types
export { IPluginRouter, IPluginWebSocket, IPluginHttpRequest } from './RouterTypes.js';

// Contract types
export {
    IContractEvent,
    ITransactionReceipt,
    IContractInfo,
    IContractStorageEntry,
} from './ContractTypes.js';

// UTXO types
export { IUTXO, IUTXOQueryOptions } from './UTXOTypes.js';
