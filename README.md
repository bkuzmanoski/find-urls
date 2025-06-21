# find-urls

[![NPM version](https://img.shields.io/npm/v/find-urls.svg)](https://www.npmjs.com/package/find-urls)
[![License](https://img.shields.io/npm/l/find-urls.svg)](https://github.com/bkuzmanoski/find-urls/blob/main/LICENSE.txt)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/find-urls)](https://bundlephobia.com/result?p=find-urls)
[![Build status](https://github.com/bkuzmanoski/find-urls/actions/workflows/main.yaml/badge.svg)](https://github.com/bkuzmanoski/find-urls/actions/workflows/main.yaml)

An intelligent, zero-dependency utility to find and normalize URLs in text, with advanced punctuation and context handling.

Finding URLs in text is easy, but finding them in *messy, human-written text* can be hard. `find-urls` goes beyond simple regex matching by using a two-stage process: it first finds URL-like candidates, then uses a set of smart, context-aware heuristics to clean, validate, and normalize them into a ready-to-use list.

This means it can correctly handle URLs surrounded by punctuation (like `(example.com)` or even `...https://example.com/path-with-parentheses-(at-the-end-of-a-sentence).`), filter out email addresses and common filenames (like `notes.txt`), add a default protocol to bare domains and protocol-relative domains (like `example.com` → `https://example.com/`), and more.

## Features

- **Intelligent Punctuation Handling**: Correctly handles URLs wrapped in matching brackets (e.g., `(en.wikipedia.org/wiki/Stack_(data_structure))`) and strips trailing punctuation.
- **Zero Dependencies**: Lightweight, secure, and easy to audit.
- **Context-Aware Filtering**: Excludes email addresses and ignores common URL-like strings like file names if they don't have a protocol or path.
- **URL Normalization & Validation**: Adds a default protocol to bare domains and uses the native `URL` constructor for validation.
- **Fully Typed**: Written in TypeScript for type safety.
- **Isomorphic/Universal**: Works in Node.js and the browser.
- **Configurable**: Tailor the extraction logic with a set of options (see below).

## Installation

```bash
npm install find-urls
```

## Usage

The default export is a single function that takes a string of text and returns an array of `UrlMatch` objects.

```javascript
import findUrls from 'find-urls';

const text = `
  Check out my site (example.com) and this cool link:
  https://en.wikipedia.org/wiki/Stack_(data_structure)!
  My email is test@example.com.
`;

const urls = findUrls(text);

console.log(urls);
```

Output:

```json
[
  {
    "raw": "example.com",
    "normalized": "https://example.com/",
    "index": 29
  },
  {
    "raw": "https://en.wikipedia.org/wiki/Stack_(data_structure)",
    "normalized": "https://en.wikipedia.org/wiki/Stack_(data_structure)",
    "index": 67
  }
]
```

### Return Value: `UrlMatch`

Each item in the returned array is an object with the following properties:

- `raw`: The original URL string as it was found in the text (after removing surrounding punctuation).
- `normalized`: A fully qualified, normalized URL.
- `index`: The starting index of the match within the input string.

## API

### `findUrls(text, [options])`

#### `options`

An optional object to configure the extraction behavior.

- **`requireProtocol?: boolean`**
  - If `true`, only URLs that start with a protocol (e.g., `https://`) or are protocol-relative (`//`) will be extracted.
  - `@default false`

    ```javascript
    const text = 'https://a.com and b.com';
    findUrls(text, { requireProtocol: true }); // → Finds only 'https://a.com'
    ```

- **`defaultProtocol?: string`**
  - The protocol to prepend to URLs without one.
  - `@default "https"`

    ```javascript
    const urls = findUrls('example.com', { defaultProtocol: 'http' });
    // urls[0].normalized → 'http://example.com/'
    ```

- **`allowedProtocols?: string[] | null`**
  - An array of allowed protocol schemes. If `null`, any protocol is allowed.
  - `@default ["http", "https"]`

    ```javascript
    const text = 'http://a.com, ftp://b.com';
    findUrls(text, { allowedProtocols: ['http'] }); // → Finds only 'http://a.com'
    ```

- **`allowedBareHostnames?: string[]`**
  - An array of bare hostnames to allow if a potential URL does not have a TLD (e.g., `localhost`).
  - `@default ["localhost"]`

    ```javascript
    const text = 'Connect to dev-server:3000';
    findUrls(text, { allowedBareHostnames: ['dev-server'] }); // → Finds 'dev-server:3000'
    ```

- **`extensionsRequiringProtocol?: string[]`**
  - An array of file extensions that are considered part of a valid URL only if a protocol or path is present. This prevents treating a filename like `notes.txt` as a domain. This option **replaces** the default list.
  - `@default [ ... (a list of common file extensions)]` <!-- TODO: Add link to list -->

    ```javascript
    const text = 'This is a test.js file.';
    findUrls(text); // → Finds nothing
    findUrls(text, { extensionsRequiringProtocol: [] }); // → Finds 'test.js'
    ```

- **`deduplicate?: boolean`**
  - If `true`, URLs will be deduplicated based on their normalized form.
  - `@default false`

    ```javascript
    const text = 'example.com and https://example.com/';
    findUrls(text, { deduplicate: true }); // → Finds only the first instance
    ```

## See Also

- [**`get-urls`**](https://github.com/sindresorhus/get-urls): A high-level URL extractor that uses `url-regex-safe` for matching but adds normalization, extraction of URLs from query strings, and more.
- [**`url-regex-safe`**](https://github.com/spamscanner/url-regex-safe): A low-level regex generator whose primary focus is security (ReDoS protection via `re2`), accuracy (real TLDs), and configurability at the regex level. It returns a `RegExp` object, leaving post-processing to the user.

### Feature & Philosophy Comparison

| Feature / Aspect          | `find-urls` (This Package)                          | `get-urls`                                           | `url-regex-safe`                         |
|---------------------------|-----------------------------------------------------|------------------------------------------------------|------------------------------------------|
| **Core Method**           | 2-Stage: Regex + JS Post-Processing                 | Wraps `url-regex-safe` + `normalize-url`             | Regex                                    |
| **Punctuation Handling**  | ✅ Sophisticated (context-aware, balanced).         | ❌ Basic (inherits from `url-regex-safe`)            | ❌ Basic (character exclusion)           |
| **Context Filtering**     | ✅ Built-in (emails, filenames)                     | ❌ No                                                | ❌ No                                    |
| **Output**                | ✅ Structured objects `{ raw, normalized, index }`  | ✅ Set of normalized URL strings                     | ✅ A `RegExp` object                     |
| **Dependencies**          | ✅ Zero-dependency                                  | ❌ `url-regex-safe`, `super-regex`, `normalize-url`  | ❌ `tlds`, `ip-regex`, optionally `re2`  |
| **URL Normalization**     | ✅ Built-in                                         | ✅ Via `normalize-url` dependency                    | ❌ None                                  |
| **TLD Validation**        | ❌ Generic pattern                                  | ✅ TLD database                                      | ✅ TLD database                          |
| **IPv6 Support**          | ❌ No                                               | ✅ Yes                                               | ✅ Yes                                   |
| **ReDoS Security**        | ❌ Standard `RegExp`                                | ✅ Via `super-regex` dependency                      | ✅ Via optional `re2` engine             |

### When to Use Which

- **Use `find-urls` (this library) when:**
  - You are extracting URLs from messy, human-written text and need context-aware handling of surrounding punctuation.
  - You need to filter out things that look like URLs but aren't (e.g., `readme.md`, `test@example.com`).
  - You want a lightweight, zero-dependency solution.

- **Use `get-urls` or `url-regex-safe` when:**
  - You are handling simpler input cases or want more control over the extraction logic.
  - You need a highly configurable, security-hardened regex pattern as a building block.
  - You are concerned about optimizing for speed and preventing ReDoS attacks when processing untrusted input.

## Limitations

- **No IPv6 Support**: Does not match IPv6 addresses.
- **No TLD Validation**: Uses a generic pattern (`\p{L}{2,}`) to match TLDs—this is more flexible for new or internal TLDs it can result in false positives.
- **ReDoS Risk**: Uses `RegExp` for matching URLs and may be vulnerable to ReDoS if you are processing untrusted, malicious input.

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

## License

MIT
