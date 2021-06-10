//! Copyright 2021 Luca Casonato. All rights reserved. BSD 3-Clause License.
//! Copyright 2018-2021 the Deno authors. All rights reserved. MIT license.
/*! Portions of the below code are ported from Go
    https://github.com/golang/go/blob/go1.12.5/src/encoding/hex/hex.go
    Copyright 2009 The Go Authors. All rights reserved.
    Use of this source code is governed by a BSD-style
    license that can be found in the LICENSE file. */

const encodings = ["base64", "base64url", "hex"];

const hexTable = new TextEncoder().encode("0123456789abcdef");

// deno-fmt-ignore
const base64abc = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", 
  "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "a", 
  "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", 
  "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "0", "1", "2", "3", "4", 
  "5", "6", "7", "8", "9", "+", "/"];

function base64encode(uint8) {
  const l = uint8.length;
  let result = "";
  let i;
  for (i = 2; i < l; i += 3) {
    result += base64abc[uint8[i - 2] >> 2] +
      base64abc[((uint8[i - 2] & 0x03) << 4) | (uint8[i - 1] >> 4)] +
      base64abc[((uint8[i - 1] & 0x0f) << 2) | (uint8[i] >> 6)] +
      base64abc[uint8[i] & 0x3f];
  }
  if (i === l + 1) {
    // 1 octet yet to write
    result += base64abc[uint8[i - 2] >> 2] +
      base64abc[(uint8[i - 2] & 0x03) << 4] + "==";
  }
  if (i === l) {
    // 2 octets yet to write
    result += base64abc[uint8[i - 2] >> 2] +
      base64abc[((uint8[i - 2] & 0x03) << 4) | (uint8[i - 1] >> 4)] +
      base64abc[(uint8[i - 1] & 0x0f) << 2] +
      "=";
  }
  return result;
}

class BinaryEncoder {
  _encoding;
  constructor(encoding) {
    if (arguments.length < 1) {
      throw TypeError("1 argument required, but only 0 present.");
    }
    this._encoding = String(encoding).trim();
    if (!encodings.includes(this._encoding)) {
      throw new RangeError("Invalid encoding " + this._encoding);
    }
  }
  get encoding() {
    return this._encoding;
  }
  encode(input) {
    if (arguments.length < 1) {
      throw TypeError("1 argument required, but only 0 present.");
    }
    if (input instanceof ArrayBuffer) {
      input = new Uint8Array(input);
    } else if (ArrayBuffer.isView(input)) {
      input = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    } else {
      throw TypeError("Argument 1 must be an array buffer, or a view on one.");
    }
    switch (this._encoding) {
      case "base64":
        return base64encode(input);
      case "base64url":
        return base64encode(input).replace(/=/g, "").replace(/\+/g, "-")
          .replace(/\//g, "_");
      case "hex":
        const dst = new Uint8Array(input.length * 2);
        for (let i = 0; i < dst.length; i++) {
          const v = input[i];
          dst[i * 2] = hexTable[v >> 4];
          dst[i * 2 + 1] = hexTable[v & 0x0f];
        }
        return new TextDecoder().decode(dst);
    }
  }
}

export function addPaddingToBase64url(base64url) {
  if (base64url.length % 4 === 2) return base64url + "==";
  if (base64url.length % 4 === 3) return base64url + "=";
  if (base64url.length % 4 === 1) {
    throw new TypeError("Illegal base64url string.");
  }
  return base64url;
}

function base64decode(input) {
  const data = atob(input);
  const bytes = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    bytes[i] = data.charCodeAt(i);
  }
  return bytes;
}

function fromHexChar(byte) {
  // '0' <= byte && byte <= '9'
  if (48 <= byte && byte <= 57) return byte - 48;
  // 'a' <= byte && byte <= 'f'
  if (97 <= byte && byte <= 102) return byte - 97 + 10;
  // 'A' <= byte && byte <= 'F'
  if (65 <= byte && byte <= 70) return byte - 65 + 10;
  throw new TypeError("Illegal hex string.");
}

class BinaryDecoder {
  _encoding;
  constructor(encoding) {
    if (arguments.length < 1) {
      throw TypeError("1 argument required, but only 0 present.");
    }
    this._encoding = String(encoding).trim();
    if (!encodings.includes(this._encoding)) {
      throw new RangeError("Invalid encoding " + this._encoding);
    }
  }
  get encoding() {
    return this._encoding;
  }
  decode(input) {
    if (arguments.length < 1) {
      throw TypeError("1 argument required, but only 0 present.");
    }
    input = String(input);
    switch (this._encoding) {
      case "base64":
        return base64decode(input);
      case "base64url":
        return base64decode(
          addPaddingToBase64url(input).replace(/\-/g, "+")
            .replace(/_/g, "/"),
        );
      case "hex":
        const dst = new Uint8Array(input.length >>> 1);
        for (let i = 0; i < dst.length; i++) {
          const a = fromHexChar(input[i * 2].charCodeAt(0));
          const b = fromHexChar(input[i * 2 + 1].charCodeAt(0));
          dst[i] = (a << 4) | b;
        }

        if (input.length % 2 == 1) {
          // Check for invalid char before reporting bad length,
          // since the invalid char (if present) is an earlier problem.
          fromHexChar(input[dst.length * 2].charCodeAt(0));
          throw new TypeError("Illegal hex string.");
        }

        return dst;
    }
  }
}

export { BinaryDecoder, BinaryEncoder };
