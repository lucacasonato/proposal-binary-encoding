# proposal-binary-encoding

A proposal to add modern, easy to use binary encoders to the web platform.

## Problem

Many protocols, APIs, and algorithms require that some binary data (byte array)
is serialized into a string that represents that binary data losslessly. Common
formats for this are for example base64 encoding and hex encoding. Often the
reverse - so deserializing the string back into the original data - is required
too.

Here are some (common) usecases that require base64 or hex encoding / decoding
some binary data:

- Encoding a png image into a data URL (base64 encoding the png)
- Creating a hex string from a cryptographic digest (hash)
- Generating a random ID from `crypto.getRandomValues` (hex encoding a random
  byte array)
- Send binary data over transports that only supports string values (base64
  {de/en}coding)
- Parsing PEM files (binary data is stored as base64 encoded strings)

The web platform does not provide a fast an easy approach to base64 / hex encode
and decode. These are currently the most common ways to do hex encoding and
decoding:

```js
/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function base64Encode(bytes) {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return globalThis.btoa(binary);
}

/**
 * @param {string} str
 * @returns {Uint8Array}
 */
function base64Decode(str) {
  var binaryStr = globalThis.atob(str);
  var bytes = new Uint8Array(binaryStr.length);
  for (var i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function hexEncode(bytes) {
  return [...bytes].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/**
 * @param {string} str
 * @returns {Uint8Array}
 */
function hexDecode(str) {
  var bytes = new Uint8Array(str.length);
  for (var i = 0; i < str.length; i += 2) {
    bytes[i] = parseInt(hex.substr(n, 2), 16);
  }
  return bytes;
}
```

All of the above decoders don't handle errors correctly, don't validate the
input, and the encoders do a lot of string concatenations (`join("")` is also
concatenation). These are the first implementations that users will see when
looking up "arraybuffer to base64 javascript" or "arraybuffer to hex javascript"
on Google:

Top search result for "arraybuffer to base64 javascript" on StackOverflow has
252 upvotes and is very inefficient due to the excessive string concat:
https://stackoverflow.com/questions/9267899/arraybuffer-to-base64-encoded-string

Top search result for "arraybuffer to hex javascript" on StackOverflow has 76
upvotes and is pretty inefficient due to an excessive amount of function calls
and string `join` which is incredibly slow in V8:
https://stackoverflow.com/questions/40031688/javascript-arraybuffer-to-hex

These many suboptimal custom implementations lead to a bunch of extranious code
that is shipped to clients for trivial encodings that are already present in
browser binaries. This is especially bad when users use Node's `Buffer` for the
sole purpose of hex and base64 encoding / decoding and then bundle that for the
browser which pulls in a large browserify polyfill.

Through some analysis with sourcegraph, it looks that a large number of JS devs
use
[`Buffer.toString("hex")`](https://sourcegraph.com/search?q=context:global+%28lang:javascript+OR+lang:typescript%29+count:all+toString%28%22hex%22%29&patternType=literal)
or
[`Buffer.toString("base64")`](https://sourcegraph.com/search?q=context:global+%28lang:javascript+OR+lang:typescript%29+count:all+toString%28%22hex%22%29&patternType=literal)
for encoding / decoding base64 or hex: combined there are almost 10k uses in
366k public repos.

Additionally the NPM [`base-64`](https://www.npmjs.com/package/base-64) packages
which provides byte array -> base64 string encodings, has 600k weekly downloads.
Again wouldn't be needed if the platform shipped this primitive.

When thinking about implementing native binary encodeers, the question of which
alphabet to use is bound to come up. Whatever the final proposal, the most
common encoding alphabets should be supported. The standard base64 algorithm is
defined by RFC 4648 and is already available in
https://infra.spec.whatwg.org/#forgiving-base64. An alternative url safe base64
encoding is also specified by RFC 4648 and is often used in the context of web
applications. The only variation you get for hex encoding is upper vs lower
case, but this can easially be changed by the user using a `.toUpperCase` or
`.toLowerCase`. The default should be lower case to match existing
implementations in Node, Go, and `Number.toString(16)`.

## Implementations in other environments

### Node.js

In Node, base64 and hex encoding of byte slices can be done via the `Buffer`
primitive. Buffers have a `.toString` method that takes an optional argument
defining the type of encoding to use. For this proposal only `"hex"` and
`"base64"`, and `"base64url"` are relevant. Streaming is not supported.
Alternative alphabets are not supported. Disabling of padding is not supported.
Usage example:

```js
const buf = Buffer.from("hello world", "utf8");
buf.toString("hex");
buf.toString("base64");

const buf2 = Buffer.from("68656c6c6f20776f726c64", "hex");
buf2.toString("utf8");
```

### Deno standard library

Deno does not include a base64 or hex decoder in the runtime natively, but it
does include one in the standard library. It is capable of `base64`,
`base64url`, and `hex`. Streaming is not supported. Alternative alphabets are
not supported. Disabling of padding is not supported.

Usage example:

```js
import * as base64 from "https://deno.land/std@0.98.0/encoding/base64.ts";
import * as base64url from "https://deno.land/std@0.98.0/encoding/base64url.ts";
import * as hex from "https://deno.land/std@0.98.0/encoding/hex.ts";

const message = new TextEncoder.encode("hello world");

base64.encode(message); // takes uint8array
base64.decode("aGVsbG8gd29ybGQ="); // returns uin8array

base64url.encode(message); // takes uint8array
base64url.decode("aGVsbG8gd29ybGQ="); // returns uin8array

hex.encode(message); // takes uint8array
hex.decode("68656c6c6f20776f726c64"); // returns uin8array
```

### Dart

Dart supports base64 and base64url encoding via the standard library. Hex
encoding is not supported natively, instead the `hex` package on pub.dev is
recommended. Streaming is supported for base64. Alternative alphabets are not
supported. Disabling of padding is not supported.

Usage example;

```dart
import "dart:convert";
import "package:hex/hex.dart";

base64.encode([0x62, 0x6c, 0xc3, 0xa5, 0x62, 0xc3, 0xa6,
               0x72, 0x67, 0x72, 0xc3, 0xb8, 0x64]);
base64.decode("YmzDpWLDpnJncsO4ZAo=");

base64Url.encode([0x62, 0x6c, 0xc3, 0xa5, 0x62, 0xc3, 0xa6,
                  0x72, 0x67, 0x72, 0xc3, 0xb8, 0x64]);
base64Url.decode("YmzDpWLDpnJncsO4ZAo=");

HEX.encode([1, 2, 3]); // "010203"
HEX.decode("010203"); // [1, 2, 3]

// Streaming for base64 is supported via the Base64Encoder and Base64Decoder
// classes. These are stream combinators for the Dart native streams (we would
// call them transform streams).
```

### Go

In Go base64 is implemented with the Go native streaming API (`io.Reader` /
`io.Writer`). There are two functions, `base64.NewEncoder` and
`base64.NewDecoder` which can be used to create what we would call transform
streams. In Go all code is concurrent code (what we would call async), so this
API can be used with the same versatility as a synchronous encoder / decoder in
JS. The encoders and decoders take a `Encoding` parameter which specifies the
alphabet to use. Padding can be enabled and disabled for each encoding.

Usage example:

```go
// Open the input and output files (these are io.Reader and io.Writer streams)
in, _ := os.Open("in.txt")
out, _ := os.Open("out.txt")

// Create a new encoder that outputs to out with the standard base64 encoding
encoder := base64.NewEncoder(base64.StdEncoding, out)

// Copy the input data into the encoder
io.Copy(encoder, in)

// The decoder works the same, just with input and output reversed and
// `base64.NewDecoder` used instead.
```

## Proposal

This proposal introduces a new `BinaryEncoder` and `BinaryDecoder` API that can
be used to serialize byte arrays into base64 or hex strings, and deserialize
these strings back into byte arrays.

### Binary encodings

This proposal allows for encoding and decoding `base64`, `base64url`, and `hex`
data. It does not implement streaming support, as this could be later
implemented in a `BinaryEncoderStream` / `BinaryDecoderStream`, or using the
same synchronous API as text encoding, using a `stream: true` option on the
`encode` / `decode` methods. This proposal also does not allow disabling of
padding for base64, or alternative alphabets.

```webidl
enum BinaryEncoding {
  "base64",
  "base64url",
  "hex"
}
```

### `BinaryEncoder`

A second argument in the constructor can be used for an option bag if additional
fields for BinaryEncoder are required in the future.

```webidl
[Exposed=(Window,Worker)]
interface BinaryEncoder {
  constructor(BinaryEncoding encoding);
  
  readonly attribute BinaryEncoding encoding;
  readonly attribute boolean padding;

  USVString encode([AllowShared] BufferSource input);
};
```

A `BinaryEncoder` object has an associated **encoding**, which is a
`BinaryEncoding`.

The `new BinaryEncoder(encoding)` constructor steps are:

1. Set this's encoding to _encoding_.

The `encode(input)` method steps are:

1. Switch on this's encoding and run associated steps:
   - "base64": return the output of running **forgiving-base64 encode** on
     input. TODO: handle failure case (throw TypeError or DOMException?)
   - "base64url": return the output of running **forgiving-base64 encode** on
     input, with alternative base64 table from RFC 4648. NOTE: forgiving-base64
     encode does not have an argument for base64 table. TODO: handle failure
     case (throw TypeError or DOMException?)
   - "hex": return the output of running **hex encode** on input. TODO: handle
     failure case (throw TypeError or DOMException?)

To **hex encode** given a byte sequence data, run these steps:

1. TODO

### `BinaryDecoder`

A second argument in the constructor can be used for an option bag if additional
fields for BinaryDecoder are required in the future.

```webidl
[Exposed=(Window,Worker)]
interface BinaryDecoder {
  constructor(BinaryEncoding encoding);
  
  readonly attribute BinaryEncoding encoding;

  [NewObject] Uint8Array decode(DOMString input);
};
```

A `BinaryDecoder` object has an associated **encoding**, which is a
`BinaryEncoding`.

The `new BinaryDecoder(encoding)` constructor steps are:

1. Set this's encoding to _encoding_.

The `decode(input)` method steps are:

1. Switch on this's encoding and run associated steps:
   - "base64": return the output of running **forgiving-base64 decode** on
     input. TODO: handle failure case (throw TypeError or DOMException?)
   - "base64url": return the output of running **forgiving-base64 decode** on
     input, with alternative base64 table from RFC 4648. NOTE: forgiving-base64
     encode does not have an argument for base64 table. TODO: handle failure
     case (throw TypeError or DOMException?)
   - "hex": return the output of running **hex decode** on input. TODO: handle
     failure case (throw TypeError or DOMException?)

To **hex decode** given a string data, run these steps:

1. TODO

### Future extensions

This proposal leaves many extension points for future API additions. For example
the addition of a way to disable padding for the encoder, and support for base32
and base62 encoding.

### Examples

Some examples demonstrating how this API can be used.

#### Calculate a hex sha256 digest of a file

```js
const file = new Uint8Array([/** populated with some data */]);
const digestBytes = await crypto.subtle.digest("sha-256", file);
const digest = new BinaryEncoder("hex").encode(digestBytes);
console.log(digest);
```

#### Parse a PEM file

```js
const BEGIN_CERT = "-----BEGIN CERTIFICATE-----";
const END_CERT = "-----END CERTIFICATE-----";

const certificate = `
-----BEGIN CERTIFICATE-----
MIICGzCCAaGgAwIBAgIQQdKd0XLq7qeAwSxs6S+HUjAKBggqhkjOPQQDAzBPMQsw
CQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJuZXQgU2VjdXJpdHkgUmVzZWFyY2gg
R3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBYMjAeFw0yMDA5MDQwMDAwMDBaFw00
MDA5MTcxNjAwMDBaME8xCzAJBgNVBAYTAlVTMSkwJwYDVQQKEyBJbnRlcm5ldCBT
ZWN1cml0eSBSZXNlYXJjaCBHcm91cDEVMBMGA1UEAxMMSVNSRyBSb290IFgyMHYw
EAYHKoZIzj0CAQYFK4EEACIDYgAEzZvVn4CDCuwJSvMWSj5cz3es3mcFDR0HttwW
+1qLFNvicWDEukWVEYmO6gbf9yoWHKS5xcUy4APgHoIYOIvXRdgKam7mAHf7AlF9
ItgKbppbd9/w+kHsOdx1ymgHDB/qo0IwQDAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0T
AQH/BAUwAwEB/zAdBgNVHQ4EFgQUfEKWrt5LSDv6kviejM9ti6lyN5UwCgYIKoZI
zj0EAwMDaAAwZQIwe3lORlCEwkSHRhtFcP9Ymd70/aTSVaYgLXTWNLxBo1BfASdW
tL4ndQavEi51mI38AjEAi/V3bNTIZargCyzuFJ0nN6T5U6VR5CmD1/iQMVtCnwr1
/q4AaOeMSQ+2b1tbFfLn
-----END CERTIFICATE-----
`.trim();

if (!certificate.startsWith(BEGIN_CERT)) {
  throw new Error("certificate doesn't start with BEGIN CERTIFICATE");
}
if (!certificate.endsWith(END_CERT)) {
  throw new Error("certificate doesn't end with END CERTIFICATE");
}

const inner = certificate.substring(
  BEGIN_CERT.length,
  certificate.length - END_CERT.length,
).trim();

const der = new BinaryDecoder("base64").decode(inner);
```

## FAQ

### I want streams!

Streams are interesting, but the most common usecase is not streaming. This
proposal tries to get consensus for the least controversial and most common
usecase first, and can then be expanded to streaming later. This could be done
in a non breaking way in the same way as streaming support for text encoder:
`BinaryEncoderStream` / `BinaryDecoderStream`, or using the same synchronous API
as text encoding, using a `stream: true` option on the `encode` / `decode`
methods.

### Can this be combined into the TextEncoding / TextDecoding interfaces?

In theory yes, but in practice it doesn't make much sense. In text encoding the
binary representation is the "encoded" form, while in binary encoding the text
form is the "encoded" form. Because of this, encoding some binary data to a
base64 string would actually use the text decoder interface as it is the one
that translates **from** byte array **to** string.

### Why is X encoding not supported?

This is a first pass with just the 3 most common encodings. Support for
"base62", "base32", and various other encodings can be added after initial
consensus and implementation.

### Is this feature poly-fillable?

Yes! In fact there is a polyfill in this repo in the polyfill/ folder. The
polyfill is 1.3 kb gzipped.
