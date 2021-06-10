import { BinaryDecoder, BinaryEncoder } from "./mod.mjs";
if (!("BinaryDecoder" in globalThis)) globalThis.BinaryDecoder = BinaryDecoder;
if (!("BinaryEncoder" in globalThis)) globalThis.BinaryEncoder = BinaryEncoder;
