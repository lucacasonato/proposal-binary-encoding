import "./polyfill.mjs";

import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.98.0/testing/asserts.ts";

Deno.test("BinaryDecoder no args", () => {
  assertThrows(() => new BinaryDecoder());
});

Deno.test("BinaryEncoder no args", () => {
  assertThrows(() => new BinaryEncoder());
});

const invalidEncodings = [
  "foo",
  "heex",
  "he x",
  "base-64",
  "base42",
  42,
  {},
];

for (const encoding of invalidEncodings) {
  Deno.test(`BinaryDecoder invalid encoding ${JSON.stringify(encoding)}`, () => {
    assertThrows(() => new BinaryDecoder(encoding));
  });

  Deno.test(`BinaryEncoder invalid encoding ${JSON.stringify(encoding)}`, () => {
    assertThrows(() => new BinaryEncoder(encoding));
  });
}

const validEncodings = {
  "base64": "base64",
  "base64url": "base64url",
  "hex": "hex",
  "base64 ": "base64",
  "  base64 ": "base64",
};
for (const encoding in validEncodings) {
  const expected = validEncodings[encoding];
  Deno.test(`BinaryDecoder valid encoding ${JSON.stringify(encoding)}`, () => {
    const decoder = new BinaryDecoder(encoding);
    assertEquals(decoder.encoding, expected);
  });

  Deno.test(`BinaryEncoder valid encoding ${JSON.stringify(encoding)}`, () => {
    const encoder = new BinaryEncoder(encoding);
    assertEquals(encoder.encoding, expected);
  });
}

const validEncodeTests = [
  ["base64", "", ""],
  [
    "base64",
    new Uint8Array([0x14, 0xfb, 0x9c, 0x03, 0xd9, 0x7e]),
    "FPucA9l+",
  ],
  ["base64", new Uint8Array([0x14, 0xfb, 0x9c, 0x03, 0xd9]), "FPucA9k="],
  ["base64", new Uint8Array([0x14, 0xfb, 0x9c, 0x03]), "FPucAw=="],
  ["base64", "", ""],
  ["base64", "f", "Zg=="],
  ["base64", "fo", "Zm8="],
  ["base64", "foo", "Zm9v"],
  ["base64", "<<???>>", "PDw/Pz8+Pg=="],
  [
    "base64url",
    new Uint8Array([0x14, 0xfb, 0x9c, 0x03, 0xd9, 0x7e]),
    "FPucA9l-",
  ],
  ["base64url", "<<???>>", "PDw_Pz8-Pg"],
  ["hex", "abc", "616263"],
  ["hex", new Uint8Array([1, 2, 3]), "010203"],
  ["hex", new Uint8Array([255, 0, 128]), "ff0080"],
];

for (const [encoding, input, output] of validEncodeTests) {
  Deno.test(`BinaryDecoder decode ${encoding} ${JSON.stringify(output)}`, () => {
    const decoder = new BinaryDecoder(encoding);
    assertEquals(
      decoder.decode(output),
      typeof input === "string" ? new TextEncoder().encode(input) : input,
    );
  });

  Deno.test(`BinaryEncoder encode ${encoding} ${JSON.stringify(output)}`, () => {
    const encoder = new BinaryEncoder(encoding);
    assertEquals(
      encoder.encode(
        typeof input === "string" ? new TextEncoder().encode(input) : input,
      ),
      output,
    );
  });
}

// TODO(lucacasonato) add invalid decode tests
