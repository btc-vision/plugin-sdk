/**
 * Binary format types for OPNet `.opnet` plugin files.
 *
 * An `.opnet` file is a compact binary container that bundles a plugin's
 * compiled bytecode, JSON metadata manifest, optional protobuf schema, an
 * ML-DSA (post-quantum) cryptographic signature, and a SHA-256 integrity
 * checksum into a single distributable artifact.
 *
 * ## Binary Layout
 *
 * ```text
 * ┌──────────────────────────────────────────────────────┐
 * │  Magic Bytes          8 bytes   "OPNETPLG" (ASCII)   │
 * │  Format Version       4 bytes   uint32 LE            │
 * │  MLDSA Level          1 byte    enum (0 | 1 | 2)     │
 * │  Public Key           variable  (1312 / 1952 / 2592) │
 * │  Signature            variable  (2420 / 3309 / 4627) │
 * ├──────────────────────────────────────────────────────┤
 * │  Metadata Length       4 bytes   uint32 LE            │
 * │  Metadata JSON         variable  UTF-8 string         │
 * │  Bytecode Length       4 bytes   uint32 LE            │
 * │  Bytecode (.jsc)       variable  raw bytes            │
 * │  Proto Length          4 bytes   uint32 LE (may be 0) │
 * │  Proto Schema          variable  raw bytes (optional)  │
 * ├──────────────────────────────────────────────────────┤
 * │  SHA-256 Checksum     32 bytes                        │
 * └──────────────────────────────────────────────────────┘
 * ```
 *
 * ## Quick Start
 *
 * ```typescript
 * import {
 *     PLUGIN_MAGIC_BYTES,
 *     PLUGIN_FORMAT_VERSION,
 *     MLDSALevel,
 *     calculateHeaderSize,
 *     MIN_PLUGIN_FILE_SIZE,
 * } from '@btc-vision/plugin-sdk';
 *
 * // Validate the first bytes of a file
 * const buf = fs.readFileSync('my-plugin.opnet');
 * const magic = buf.subarray(0, 8);
 *
 * if (magic.every((b, i) => b === PLUGIN_MAGIC_BYTES[i])) {
 *     console.log('Valid .opnet magic bytes');
 * }
 * ```
 *
 * @packageDocumentation
 */

import { IPluginMetadata } from './IPluginMetadata.js';

/**
 * Magic bytes that identify a valid `.opnet` plugin file.
 *
 * Every `.opnet` file starts with the 8-byte ASCII string `"OPNETPLG"`.
 * Parsers **must** check these bytes before attempting to read the rest
 * of the file. If the magic bytes do not match, the file is either
 * corrupt or not an OPNet plugin file.
 *
 * @remarks
 * The constant is produced at module load time via `TextEncoder` and
 * is immutable (`Uint8Array`). Its byte values are:
 * `[0x4F, 0x50, 0x4E, 0x45, 0x54, 0x50, 0x4C, 0x47]`.
 *
 * @example
 * ```typescript
 * import { PLUGIN_MAGIC_BYTES } from '@btc-vision/plugin-sdk';
 *
 * function hasValidMagic(data: Uint8Array): boolean {
 *     if (data.length < PLUGIN_MAGIC_BYTES.length) {
 *         return false;
 *     }
 *     return PLUGIN_MAGIC_BYTES.every((byte, i) => data[i] === byte);
 * }
 *
 * const file = fs.readFileSync('my-plugin.opnet');
 * console.log(hasValidMagic(new Uint8Array(file))); // true
 * ```
 */
export const PLUGIN_MAGIC_BYTES = new TextEncoder().encode('OPNETPLG');

/**
 * Current binary format version for `.opnet` plugin files.
 *
 * This version number is stored as a 4-byte little-endian `uint32` at
 * byte offset 8 (immediately after the magic bytes). It allows the parser
 * to detect and reject files produced by an incompatible future format.
 *
 * @remarks
 * When the binary layout changes in a backward-incompatible way, this
 * number is incremented. Parsers should refuse files whose version is
 * higher than the version they support.
 *
 * @example
 * ```typescript
 * import { PLUGIN_FORMAT_VERSION, PLUGIN_MAGIC_BYTES } from '@btc-vision/plugin-sdk';
 *
 * function readFormatVersion(data: DataView): number {
 *     // Version field starts right after the 8-byte magic
 *     return data.getUint32(PLUGIN_MAGIC_BYTES.length, true); // little-endian
 * }
 *
 * const buf = fs.readFileSync('my-plugin.opnet');
 * const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
 * const version = readFormatVersion(view);
 *
 * if (version !== PLUGIN_FORMAT_VERSION) {
 *     throw new Error(`Unsupported format version ${version}, expected ${PLUGIN_FORMAT_VERSION}`);
 * }
 * ```
 */
export const PLUGIN_FORMAT_VERSION = 1;

/**
 * ML-DSA (Module-Lattice-based Digital Signature Algorithm) security levels.
 *
 * ML-DSA is a post-quantum digital signature scheme standardized by NIST
 * (FIPS 204). OPNet uses ML-DSA to sign plugin files so that their
 * authenticity can be verified even by quantum-capable adversaries.
 *
 * Each level trades key/signature size for a higher security margin:
 *
 * | Level       | NIST Category | Public Key | Signature |
 * |-------------|---------------|------------|-----------|
 * | `MLDSA44`   | 2             | 1 312 B    | 2 420 B   |
 * | `MLDSA65`   | 3             | 1 952 B    | 3 309 B   |
 * | `MLDSA87`   | 5             | 2 592 B    | 4 627 B   |
 *
 * The level is stored as a single byte at offset 12 in the `.opnet` file
 * header (immediately after the 4-byte format version).
 *
 * @example
 * ```typescript
 * import { MLDSALevel, MLDSA_PUBLIC_KEY_SIZES, MLDSA_SIGNATURE_SIZES } from '@btc-vision/plugin-sdk';
 *
 * // Determine key and signature sizes for a given level
 * const level = MLDSALevel.MLDSA65;
 * console.log(`Public key: ${MLDSA_PUBLIC_KEY_SIZES[level]} bytes`); // 1952
 * console.log(`Signature:  ${MLDSA_SIGNATURE_SIZES[level]} bytes`);  // 3309
 * ```
 *
 * @example
 * ```typescript
 * import { MLDSALevel } from '@btc-vision/plugin-sdk';
 *
 * // Parse the MLDSA level byte from a file header
 * function parseLevel(levelByte: number): MLDSALevel {
 *     if (!(levelByte in MLDSALevel)) {
 *         throw new Error(`Unknown MLDSA level: ${levelByte}`);
 *     }
 *     return levelByte as MLDSALevel;
 * }
 *
 * const level = parseLevel(1); // MLDSALevel.MLDSA65
 * ```
 */
export enum MLDSALevel {
    /**
     * ML-DSA-44 -- NIST Security Level 2.
     *
     * The most compact option. Suitable for general-purpose plugin signing
     * where minimizing file size is a priority.
     *
     * - Public key size: 1 312 bytes
     * - Signature size:  2 420 bytes
     */
    MLDSA44 = 0,

    /**
     * ML-DSA-65 -- NIST Security Level 3.
     *
     * A balanced choice offering a stronger security margin than Level 2
     * without significantly increasing sizes. **Recommended default.**
     *
     * - Public key size: 1 952 bytes
     * - Signature size:  3 309 bytes
     */
    MLDSA65 = 1,

    /**
     * ML-DSA-87 -- NIST Security Level 5.
     *
     * The highest security level. Use when maximum post-quantum resistance
     * is required and the additional key/signature overhead is acceptable.
     *
     * - Public key size: 2 592 bytes
     * - Signature size:  4 627 bytes
     */
    MLDSA87 = 2,
}

/**
 * Mapping from {@link MLDSALevel} to the corresponding ML-DSA public key
 * size in bytes.
 *
 * These sizes are defined by the NIST FIPS 204 standard and are fixed for
 * each security level. The parser uses this map to know how many bytes to
 * read for the public key field after the 1-byte level indicator.
 *
 * @example
 * ```typescript
 * import { MLDSALevel, MLDSA_PUBLIC_KEY_SIZES } from '@btc-vision/plugin-sdk';
 *
 * // Read the public key from a DataView given a known level
 * function readPublicKey(data: Uint8Array, offset: number, level: MLDSALevel): Uint8Array {
 *     const size = MLDSA_PUBLIC_KEY_SIZES[level];
 *     return data.subarray(offset, offset + size);
 * }
 *
 * const level = MLDSALevel.MLDSA65;
 * console.log(MLDSA_PUBLIC_KEY_SIZES[level]); // 1952
 * ```
 */
export const MLDSA_PUBLIC_KEY_SIZES: Record<MLDSALevel, number> = {
    [MLDSALevel.MLDSA44]: 1312,
    [MLDSALevel.MLDSA65]: 1952,
    [MLDSALevel.MLDSA87]: 2592,
};

/**
 * Mapping from {@link MLDSALevel} to the corresponding ML-DSA signature
 * size in bytes.
 *
 * Like public key sizes, signature sizes are fixed per security level as
 * specified by NIST FIPS 204. The parser uses this map to know how many
 * bytes to read for the signature field after the public key.
 *
 * @example
 * ```typescript
 * import { MLDSALevel, MLDSA_SIGNATURE_SIZES } from '@btc-vision/plugin-sdk';
 *
 * // Verify that a signature buffer has the expected length
 * function validateSignatureLength(sig: Uint8Array, level: MLDSALevel): boolean {
 *     return sig.length === MLDSA_SIGNATURE_SIZES[level];
 * }
 *
 * const level = MLDSALevel.MLDSA87;
 * console.log(MLDSA_SIGNATURE_SIZES[level]); // 4627
 * ```
 */
export const MLDSA_SIGNATURE_SIZES: Record<MLDSALevel, number> = {
    [MLDSALevel.MLDSA44]: 2420,
    [MLDSALevel.MLDSA65]: 3309,
    [MLDSALevel.MLDSA87]: 4627,
};

/**
 * Fully parsed representation of an `.opnet` plugin file.
 *
 * This is the result of successfully parsing and validating an `.opnet`
 * binary. It contains all the information needed to install, verify, and
 * execute a plugin: the ML-DSA public key and signature for authenticity,
 * the decoded JSON metadata manifest, the compiled V8 bytecode, an
 * optional protobuf schema, and the SHA-256 integrity checksum.
 *
 * @remarks
 * The `checksum` field covers `metadata + bytecode + proto`. After parsing,
 * consumers should recompute the SHA-256 digest and compare it against
 * `checksum` to verify integrity, then use the ML-DSA `publicKey` and
 * `signature` to verify authenticity.
 *
 * @example
 * ```typescript
 * import type { IParsedPluginFile } from '@btc-vision/plugin-sdk';
 * import { MLDSALevel } from '@btc-vision/plugin-sdk';
 *
 * async function loadPlugin(filePath: string): Promise<IParsedPluginFile> {
 *     const raw = fs.readFileSync(filePath);
 *     // ... parsing logic ...
 *     const parsed: IParsedPluginFile = {
 *         formatVersion: 1,
 *         mldsaLevel: MLDSALevel.MLDSA65,
 *         publicKey: new Uint8Array(1952),
 *         signature: new Uint8Array(3309),
 *         metadata: JSON.parse(rawMetadataStr),
 *         rawMetadata: rawMetadataStr,
 *         bytecode: bytecodeBytes,
 *         proto: protoBytes.length > 0 ? protoBytes : undefined,
 *         checksum: checksumBytes,
 *     };
 *     return parsed;
 * }
 * ```
 *
 * @example
 * ```typescript
 * import type { IParsedPluginFile } from '@btc-vision/plugin-sdk';
 *
 * // Inspect a parsed plugin
 * function inspect(plugin: IParsedPluginFile): void {
 *     console.log(`Plugin: ${plugin.metadata.name} v${plugin.metadata.version}`);
 *     console.log(`MLDSA Level: ${plugin.mldsaLevel}`);
 *     console.log(`Bytecode size: ${plugin.bytecode.length} bytes`);
 *     console.log(`Has proto schema: ${plugin.proto !== undefined}`);
 *     console.log(`Checksum (hex): ${Buffer.from(plugin.checksum).toString('hex')}`);
 * }
 * ```
 */
export interface IParsedPluginFile {
    /**
     * Binary format version of the `.opnet` file that was parsed.
     *
     * This corresponds to {@link PLUGIN_FORMAT_VERSION} at the time the
     * file was produced. A parser should reject files whose version exceeds
     * the version it supports.
     *
     * @example
     * ```typescript
     * if (parsed.formatVersion !== PLUGIN_FORMAT_VERSION) {
     *     throw new Error(`Unsupported plugin format v${parsed.formatVersion}`);
     * }
     * ```
     */
    readonly formatVersion: number;

    /**
     * ML-DSA security level used to sign this plugin file.
     *
     * Determines the sizes of the {@link publicKey} and {@link signature}
     * fields via {@link MLDSA_PUBLIC_KEY_SIZES} and {@link MLDSA_SIGNATURE_SIZES}.
     *
     * @see {@link MLDSALevel}
     *
     * @example
     * ```typescript
     * import { MLDSALevel, MLDSA_PUBLIC_KEY_SIZES } from '@btc-vision/plugin-sdk';
     *
     * if (parsed.mldsaLevel === MLDSALevel.MLDSA87) {
     *     console.log('Maximum post-quantum security');
     * }
     * ```
     */
    readonly mldsaLevel: MLDSALevel;

    /**
     * ML-DSA public key of the plugin author.
     *
     * The size of this array depends on {@link mldsaLevel}:
     * - `MLDSA44`: 1 312 bytes
     * - `MLDSA65`: 1 952 bytes
     * - `MLDSA87`: 2 592 bytes
     *
     * Used together with {@link signature} to verify authenticity.
     *
     * @example
     * ```typescript
     * console.log(`Public key length: ${parsed.publicKey.length} bytes`);
     * // e.g., 1952 for MLDSA65
     * ```
     */
    readonly publicKey: Uint8Array;

    /**
     * ML-DSA signature over the {@link checksum} digest.
     *
     * The size of this array depends on {@link mldsaLevel}:
     * - `MLDSA44`: 2 420 bytes
     * - `MLDSA65`: 3 309 bytes
     * - `MLDSA87`: 4 627 bytes
     *
     * To verify: recompute the SHA-256 checksum of
     * `metadata + bytecode + proto`, then call `mldsa.verify(checksum,
     * signature, publicKey)`.
     *
     * @example
     * ```typescript
     * import { MLDSA_SIGNATURE_SIZES } from '@btc-vision/plugin-sdk';
     *
     * // Confirm the signature length matches expectations
     * const expectedSize = MLDSA_SIGNATURE_SIZES[parsed.mldsaLevel];
     * if (parsed.signature.length !== expectedSize) {
     *     throw new Error('Signature length mismatch');
     * }
     * ```
     */
    readonly signature: Uint8Array;

    /**
     * Parsed metadata manifest (`plugin.json`) as a typed object.
     *
     * Contains the plugin's name, version, permissions, resource limits,
     * and all other manifest fields. See {@link IPluginMetadata} for full
     * documentation.
     *
     * @example
     * ```typescript
     * console.log(`Installing: ${parsed.metadata.name}@${parsed.metadata.version}`);
     * console.log(`Author: ${parsed.metadata.author.name}`);
     *
     * if (parsed.metadata.permissions?.network?.outbound) {
     *     console.log('Plugin requests outbound network access');
     * }
     * ```
     */
    readonly metadata: IPluginMetadata;

    /**
     * Raw metadata JSON string as stored in the `.opnet` file.
     *
     * This is the exact UTF-8 string that was read from the metadata
     * section. It is included so that consumers can recompute the SHA-256
     * checksum without re-serializing the parsed object (which could
     * change key ordering or whitespace).
     *
     * @example
     * ```typescript
     * // Recompute the checksum using the raw metadata string
     * const encoder = new TextEncoder();
     * const metadataBytes = encoder.encode(parsed.rawMetadata);
     *
     * const hashInput = new Uint8Array([
     *     ...metadataBytes,
     *     ...parsed.bytecode,
     *     ...(parsed.proto ?? []),
     * ]);
     * const recomputed = await crypto.subtle.digest('SHA-256', hashInput);
     * ```
     */
    readonly rawMetadata: string;

    /**
     * Compiled V8 bytecode (`.jsc` format, produced by Bytenode).
     *
     * This is the executable payload of the plugin. The OPNet node loads
     * it into an isolated V8 context via Bytenode at runtime.
     *
     * @remarks
     * Maximum allowed size is {@link MAX_BYTECODE_SIZE} (100 MB).
     *
     * @example
     * ```typescript
     * import { MAX_BYTECODE_SIZE } from '@btc-vision/plugin-sdk';
     *
     * console.log(`Bytecode: ${parsed.bytecode.length} bytes`);
     *
     * if (parsed.bytecode.length > MAX_BYTECODE_SIZE) {
     *     throw new Error('Bytecode exceeds maximum allowed size');
     * }
     * ```
     */
    readonly bytecode: Uint8Array;

    /**
     * Optional protobuf schema for the plugin's WebSocket API.
     *
     * When present, this contains a compiled `.proto` schema that
     * describes the message types the plugin exposes over its WebSocket
     * interface. If the plugin does not expose a WebSocket API, this
     * field is `undefined`.
     *
     * @remarks
     * Maximum allowed size is {@link MAX_PROTO_SIZE} (1 MB).
     *
     * @example
     * ```typescript
     * if (parsed.proto) {
     *     console.log(`Proto schema: ${parsed.proto.length} bytes`);
     *     // Load the schema with protobufjs, etc.
     * } else {
     *     console.log('No WebSocket proto schema bundled');
     * }
     * ```
     */
    readonly proto?: Uint8Array;

    /**
     * SHA-256 checksum covering `metadata + bytecode + proto`.
     *
     * This 32-byte digest is the message that the ML-DSA {@link signature}
     * is computed over. After parsing, consumers should:
     *
     * 1. Recompute SHA-256 over the concatenation of raw metadata bytes,
     *    bytecode bytes, and (if present) proto bytes.
     * 2. Compare the result to this field (constant-time comparison).
     * 3. Verify the ML-DSA signature over this checksum.
     *
     * @example
     * ```typescript
     * import { createHash } from 'node:crypto';
     *
     * const hash = createHash('sha256');
     * hash.update(Buffer.from(parsed.rawMetadata, 'utf-8'));
     * hash.update(parsed.bytecode);
     * if (parsed.proto) {
     *     hash.update(parsed.proto);
     * }
     * const recomputed = new Uint8Array(hash.digest());
     *
     * const isValid = recomputed.every((b, i) => b === parsed.checksum[i]);
     * if (!isValid) {
     *     throw new Error('Checksum verification failed -- file may be corrupt');
     * }
     * ```
     */
    readonly checksum: Uint8Array;
}

/**
 * Deserialized header of an `.opnet` plugin file.
 *
 * The header occupies the first portion of the binary and contains
 * the magic bytes, format version, ML-DSA security level, and the
 * variable-length public key and signature. Its total size can be
 * computed with {@link calculateHeaderSize}.
 *
 * @remarks
 * The header is always read first. If any header field is invalid
 * (wrong magic, unsupported version, unknown MLDSA level), parsing
 * must be aborted before touching the payload sections.
 *
 * @example
 * ```typescript
 * import type { IPluginFileHeader } from '@btc-vision/plugin-sdk';
 * import {
 *     PLUGIN_MAGIC_BYTES,
 *     PLUGIN_FORMAT_VERSION,
 *     MLDSALevel,
 *     MLDSA_PUBLIC_KEY_SIZES,
 *     MLDSA_SIGNATURE_SIZES,
 * } from '@btc-vision/plugin-sdk';
 *
 * function parseHeader(data: Uint8Array): IPluginFileHeader {
 *     const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
 *     let offset = 0;
 *
 *     const magic = data.subarray(offset, offset + 8);
 *     offset += 8;
 *
 *     const version = view.getUint32(offset, true);
 *     offset += 4;
 *
 *     const mldsaLevel = data[offset] as MLDSALevel;
 *     offset += 1;
 *
 *     const pkSize = MLDSA_PUBLIC_KEY_SIZES[mldsaLevel];
 *     const publicKey = data.subarray(offset, offset + pkSize);
 *     offset += pkSize;
 *
 *     const sigSize = MLDSA_SIGNATURE_SIZES[mldsaLevel];
 *     const signature = data.subarray(offset, offset + sigSize);
 *
 *     return { magic, version, mldsaLevel, publicKey, signature };
 * }
 * ```
 */
export interface IPluginFileHeader {
    /**
     * Magic bytes identifying the file as an `.opnet` plugin.
     *
     * Always 8 bytes, expected to equal {@link PLUGIN_MAGIC_BYTES}
     * (`"OPNETPLG"` in ASCII).
     *
     * @example
     * ```typescript
     * const isValid = header.magic.every((b, i) => b === PLUGIN_MAGIC_BYTES[i]);
     * ```
     */
    readonly magic: Uint8Array;

    /**
     * Binary format version, read as a little-endian `uint32`.
     *
     * Should equal {@link PLUGIN_FORMAT_VERSION} for the current SDK.
     * Stored at byte offset 8 (4 bytes).
     *
     * @example
     * ```typescript
     * if (header.version > PLUGIN_FORMAT_VERSION) {
     *     throw new Error('Plugin was built with a newer SDK version');
     * }
     * ```
     */
    readonly version: number;

    /**
     * ML-DSA security level indicator (1 byte at offset 12).
     *
     * Determines the sizes of the subsequent {@link publicKey} and
     * {@link signature} fields via {@link MLDSA_PUBLIC_KEY_SIZES} and
     * {@link MLDSA_SIGNATURE_SIZES}.
     *
     * @see {@link MLDSALevel}
     *
     * @example
     * ```typescript
     * const levelName = MLDSALevel[header.mldsaLevel]; // e.g., "MLDSA65"
     * console.log(`Security level: ${levelName}`);
     * ```
     */
    readonly mldsaLevel: MLDSALevel;

    /**
     * ML-DSA public key of the plugin signer.
     *
     * The length is determined by {@link mldsaLevel}:
     * - `MLDSA44` => 1 312 bytes
     * - `MLDSA65` => 1 952 bytes
     * - `MLDSA87` => 2 592 bytes
     *
     * Starts at byte offset 13 (immediately after the level byte).
     *
     * @example
     * ```typescript
     * import { MLDSA_PUBLIC_KEY_SIZES } from '@btc-vision/plugin-sdk';
     *
     * const expected = MLDSA_PUBLIC_KEY_SIZES[header.mldsaLevel];
     * console.log(`Public key: ${header.publicKey.length} / ${expected} bytes`);
     * ```
     */
    readonly publicKey: Uint8Array;

    /**
     * ML-DSA signature over the file's SHA-256 checksum.
     *
     * The length is determined by {@link mldsaLevel}:
     * - `MLDSA44` => 2 420 bytes
     * - `MLDSA65` => 3 309 bytes
     * - `MLDSA87` => 4 627 bytes
     *
     * Starts immediately after the public key field.
     *
     * @example
     * ```typescript
     * import { MLDSA_SIGNATURE_SIZES } from '@btc-vision/plugin-sdk';
     *
     * const expected = MLDSA_SIGNATURE_SIZES[header.mldsaLevel];
     * if (header.signature.length !== expected) {
     *     throw new Error('Truncated signature');
     * }
     * ```
     */
    readonly signature: Uint8Array;
}

/**
 * Byte offsets for every section of an `.opnet` plugin file.
 *
 * After parsing the header (whose size depends on the MLDSA level), the
 * payload sections follow sequentially: metadata, bytecode, proto, and
 * checksum. Each section (except the checksum) is preceded by a 4-byte
 * little-endian `uint32` length prefix.
 *
 * Use {@link calculateHeaderSize} to compute the starting offset of the
 * metadata length field, then add section lengths to derive subsequent
 * offsets.
 *
 * @remarks
 * This interface is intended for low-level parser implementations. Most
 * consumers should work with {@link IParsedPluginFile} instead.
 *
 * @example
 * ```typescript
 * import type { IPluginFileOffsets } from '@btc-vision/plugin-sdk';
 * import { MLDSALevel, calculateHeaderSize } from '@btc-vision/plugin-sdk';
 *
 * function computeOffsets(
 *     level: MLDSALevel,
 *     metadataLen: number,
 *     bytecodeLen: number,
 *     protoLen: number,
 * ): IPluginFileOffsets {
 *     const headerSize = calculateHeaderSize(level);
 *
 *     const metadataLengthOffset = headerSize;
 *     const metadataOffset = metadataLengthOffset + 4;
 *
 *     const bytecodeLengthOffset = metadataOffset + metadataLen;
 *     const bytecodeOffset = bytecodeLengthOffset + 4;
 *
 *     const protoLengthOffset = bytecodeOffset + bytecodeLen;
 *     const protoOffset = protoLengthOffset + 4;
 *
 *     const checksumOffset = protoOffset + protoLen;
 *     const totalSize = checksumOffset + 32; // SHA-256 is 32 bytes
 *
 *     return {
 *         metadataLengthOffset,
 *         metadataOffset,
 *         bytecodeLengthOffset,
 *         bytecodeOffset,
 *         protoLengthOffset,
 *         protoOffset,
 *         checksumOffset,
 *         totalSize,
 *     };
 * }
 * ```
 */
export interface IPluginFileOffsets {
    /**
     * Byte offset of the metadata section's 4-byte length prefix.
     *
     * This is the first byte after the header. Read a `uint32 LE` here
     * to learn how many bytes of UTF-8 metadata JSON follow.
     *
     * @example
     * ```typescript
     * const metaLen = view.getUint32(offsets.metadataLengthOffset, true);
     * ```
     */
    readonly metadataLengthOffset: number;

    /**
     * Byte offset where the raw metadata JSON content begins.
     *
     * Equals {@link metadataLengthOffset} + 4.
     *
     * @example
     * ```typescript
     * const metaBytes = data.subarray(offsets.metadataOffset, offsets.metadataOffset + metaLen);
     * const metaJson = new TextDecoder().decode(metaBytes);
     * ```
     */
    readonly metadataOffset: number;

    /**
     * Byte offset of the bytecode section's 4-byte length prefix.
     *
     * Immediately follows the metadata content.
     *
     * @example
     * ```typescript
     * const bytecodeLen = view.getUint32(offsets.bytecodeLengthOffset, true);
     * ```
     */
    readonly bytecodeLengthOffset: number;

    /**
     * Byte offset where the compiled V8 bytecode (`.jsc`) begins.
     *
     * Equals {@link bytecodeLengthOffset} + 4.
     *
     * @example
     * ```typescript
     * const bytecode = data.subarray(offsets.bytecodeOffset, offsets.bytecodeOffset + bytecodeLen);
     * ```
     */
    readonly bytecodeOffset: number;

    /**
     * Byte offset of the protobuf schema section's 4-byte length prefix.
     *
     * If the length value at this offset is `0`, no protobuf schema is
     * bundled and the {@link protoOffset} points directly at the checksum.
     *
     * @example
     * ```typescript
     * const protoLen = view.getUint32(offsets.protoLengthOffset, true);
     * if (protoLen === 0) {
     *     console.log('No proto schema included');
     * }
     * ```
     */
    readonly protoLengthOffset: number;

    /**
     * Byte offset where the protobuf schema content begins.
     *
     * Equals {@link protoLengthOffset} + 4. If the proto length is `0`,
     * this offset coincides with {@link checksumOffset}.
     *
     * @example
     * ```typescript
     * if (protoLen > 0) {
     *     const proto = data.subarray(offsets.protoOffset, offsets.protoOffset + protoLen);
     * }
     * ```
     */
    readonly protoOffset: number;

    /**
     * Byte offset of the 32-byte SHA-256 checksum.
     *
     * The checksum is always the last 32 bytes of the file and covers
     * the concatenation of raw metadata bytes, bytecode bytes, and
     * (if present) proto bytes.
     *
     * @example
     * ```typescript
     * const checksum = data.subarray(offsets.checksumOffset, offsets.checksumOffset + 32);
     * console.log(`Checksum: ${Buffer.from(checksum).toString('hex')}`);
     * ```
     */
    readonly checksumOffset: number;

    /**
     * Total size of the `.opnet` file in bytes.
     *
     * Equals {@link checksumOffset} + 32. Use this to verify that the
     * file on disk has the expected length.
     *
     * @example
     * ```typescript
     * if (fileBuffer.length !== offsets.totalSize) {
     *     throw new Error(
     *         `File size mismatch: expected ${offsets.totalSize}, got ${fileBuffer.length}`,
     *     );
     * }
     * ```
     */
    readonly totalSize: number;
}

/**
 * Calculates the total header size in bytes for a given ML-DSA security level.
 *
 * The header layout is:
 *
 * | Field          | Size (bytes)                          |
 * |----------------|---------------------------------------|
 * | Magic bytes    | 8                                     |
 * | Format version | 4                                     |
 * | MLDSA level    | 1                                     |
 * | Public key     | {@link MLDSA_PUBLIC_KEY_SIZES}[level]  |
 * | Signature      | {@link MLDSA_SIGNATURE_SIZES}[level]   |
 *
 * The returned value is the byte offset where the payload (metadata
 * length prefix) begins.
 *
 * @param level - The ML-DSA security level to compute the header size for.
 * @returns The total header size in bytes.
 *
 * @example
 * ```typescript
 * import { MLDSALevel, calculateHeaderSize } from '@btc-vision/plugin-sdk';
 *
 * // MLDSA44: 8 + 4 + 1 + 1312 + 2420 = 3745
 * console.log(calculateHeaderSize(MLDSALevel.MLDSA44)); // 3745
 *
 * // MLDSA65: 8 + 4 + 1 + 1952 + 3309 = 5274
 * console.log(calculateHeaderSize(MLDSALevel.MLDSA65)); // 5274
 *
 * // MLDSA87: 8 + 4 + 1 + 2592 + 4627 = 7232
 * console.log(calculateHeaderSize(MLDSALevel.MLDSA87)); // 7232
 * ```
 *
 * @example
 * ```typescript
 * import { MLDSALevel, calculateHeaderSize } from '@btc-vision/plugin-sdk';
 *
 * // Use the header size to find where the metadata section starts
 * const level = MLDSALevel.MLDSA65;
 * const headerSize = calculateHeaderSize(level);
 * const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
 * const metadataLength = view.getUint32(headerSize, true); // first uint32 after header
 * ```
 */
export function calculateHeaderSize(level: MLDSALevel): number {
    return (
        8 + // Magic bytes
        4 + // Format version
        1 + // MLDSA level
        MLDSA_PUBLIC_KEY_SIZES[level] + // Public key
        MLDSA_SIGNATURE_SIZES[level] // Signature
    );
}

/**
 * Minimum valid size (in bytes) for an `.opnet` plugin file.
 *
 * This constant represents the smallest possible well-formed `.opnet`
 * file, using the most compact MLDSA level ({@link MLDSALevel.MLDSA44}),
 * the shortest valid metadata (`"{}"`), and a single byte of bytecode
 * with no protobuf schema.
 *
 * Parsers should reject any file smaller than this threshold before
 * attempting to read the header.
 *
 * Breakdown:
 * - Magic bytes: 8
 * - Format version: 4
 * - MLDSA level byte: 1
 * - Public key (MLDSA44): 1 312
 * - Signature (MLDSA44): 2 420
 * - Metadata length prefix: 4
 * - Minimum metadata `"{}"`: 2
 * - Bytecode length prefix: 4
 * - Minimum bytecode: 1
 * - Proto length prefix (value 0): 4
 * - SHA-256 checksum: 32
 *
 * @example
 * ```typescript
 * import { MIN_PLUGIN_FILE_SIZE } from '@btc-vision/plugin-sdk';
 *
 * function validateFileSize(data: Uint8Array): void {
 *     if (data.length < MIN_PLUGIN_FILE_SIZE) {
 *         throw new Error(
 *             `File too small: ${data.length} bytes, minimum is ${MIN_PLUGIN_FILE_SIZE}`,
 *         );
 *     }
 * }
 *
 * const file = fs.readFileSync('my-plugin.opnet');
 * validateFileSize(new Uint8Array(file));
 * ```
 */
export const MIN_PLUGIN_FILE_SIZE =
    8 + // Magic
    4 + // Version
    1 + // MLDSA level
    MLDSA_PUBLIC_KEY_SIZES[MLDSALevel.MLDSA44] + // Min public key
    MLDSA_SIGNATURE_SIZES[MLDSALevel.MLDSA44] + // Min signature
    4 + // Metadata length
    2 + // Min metadata "{}"
    4 + // Bytecode length
    1 + // Min bytecode
    4 + // Proto length (0)
    32; // Checksum

/**
 * Maximum allowed size for the metadata JSON section (1 MB).
 *
 * Metadata is the UTF-8 encoded `plugin.json` manifest embedded in the
 * `.opnet` file. This limit prevents excessively large manifests from
 * consuming too much memory during parsing.
 *
 * @remarks
 * 1 MB is more than sufficient for any realistic plugin manifest.
 * A typical manifest is under 2 KB.
 *
 * @example
 * ```typescript
 * import { MAX_METADATA_SIZE } from '@btc-vision/plugin-sdk';
 *
 * function validateMetadataSize(metadataLength: number): void {
 *     if (metadataLength > MAX_METADATA_SIZE) {
 *         throw new Error(
 *             `Metadata section is ${metadataLength} bytes, ` +
 *             `exceeds maximum of ${MAX_METADATA_SIZE} (1 MB)`,
 *         );
 *     }
 * }
 *
 * // During parsing:
 * const metaLen = view.getUint32(offsets.metadataLengthOffset, true);
 * validateMetadataSize(metaLen);
 * ```
 */
export const MAX_METADATA_SIZE = 1024 * 1024;

/**
 * Maximum allowed size for the compiled bytecode section (100 MB).
 *
 * The bytecode is a V8 bytecode blob (`.jsc`) compiled by Bytenode.
 * This limit prevents unreasonably large plugins from being accepted.
 *
 * @remarks
 * 100 MB accommodates very large plugins. Most compiled plugins are
 * well under 10 MB.
 *
 * @example
 * ```typescript
 * import { MAX_BYTECODE_SIZE } from '@btc-vision/plugin-sdk';
 *
 * function validateBytecodeSize(bytecodeLength: number): void {
 *     if (bytecodeLength > MAX_BYTECODE_SIZE) {
 *         throw new Error(
 *             `Bytecode section is ${bytecodeLength} bytes, ` +
 *             `exceeds maximum of ${MAX_BYTECODE_SIZE} (100 MB)`,
 *         );
 *     }
 *     if (bytecodeLength === 0) {
 *         throw new Error('Bytecode section is empty');
 *     }
 * }
 *
 * // During parsing:
 * const bcLen = view.getUint32(offsets.bytecodeLengthOffset, true);
 * validateBytecodeSize(bcLen);
 * ```
 */
export const MAX_BYTECODE_SIZE = 100 * 1024 * 1024;

/**
 * Maximum allowed size for the optional protobuf schema section (1 MB).
 *
 * When a plugin exposes a WebSocket API, it can bundle a compiled
 * `.proto` schema describing its message types. This limit caps the
 * schema size to prevent abuse.
 *
 * @remarks
 * A value of `0` for the proto length field means no schema is bundled,
 * which is perfectly valid. Most plugins do not include a proto schema.
 *
 * @example
 * ```typescript
 * import { MAX_PROTO_SIZE } from '@btc-vision/plugin-sdk';
 *
 * function validateProtoSize(protoLength: number): void {
 *     if (protoLength > MAX_PROTO_SIZE) {
 *         throw new Error(
 *             `Proto section is ${protoLength} bytes, ` +
 *             `exceeds maximum of ${MAX_PROTO_SIZE} (1 MB)`,
 *         );
 *     }
 * }
 *
 * // During parsing:
 * const protoLen = view.getUint32(offsets.protoLengthOffset, true);
 * validateProtoSize(protoLen);
 * ```
 */
export const MAX_PROTO_SIZE = 1024 * 1024;
