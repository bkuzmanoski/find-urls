import { describe, it } from "node:test";
import assert from "node:assert";

import extractUrls from "../src/index.ts";
import type { UrlMatch, ExtractUrlsOptions } from "../src/index.ts";

import * as internals from "../src/core.ts";

// =================================================================
// Test Helpers
// =================================================================

/** Get just the original URL strings from the result */
const getMatchedStrings = (text: string, options?: ExtractUrlsOptions): string[] => {
  return extractUrls(text, options).map((m) => m.raw);
};

/** Get the full UrlMatch objects from the result */
const getMatchedUrls = (text: string, options?: ExtractUrlsOptions): UrlMatch[] => {
  return extractUrls(text, options);
};

// =================================================================
// 1. Integration Tests for `extractUrls`
// =================================================================
describe("extractUrls (Integration Tests)", () => {
  describe("Core Functionality", () => {
    it("should extract a standard HTTPS URL", () => {
      assert.deepStrictEqual(getMatchedStrings("Visit https://example.com for more info"), ["https://example.com"]);
    });

    it("should extract a bare domain by default", () => {
      assert.deepStrictEqual(getMatchedStrings("Check out example.com"), ["example.com"]);
    });

    it("should extract multiple distinct URLs", () => {
      assert.deepStrictEqual(getMatchedStrings("Sites: one.com, two.org, and three.net."), [
        "one.com",
        "two.org",
        "three.net",
      ]);
    });

    it("should not extract domains from email addresses", () => {
      assert.deepStrictEqual(getMatchedStrings("My email is test@example.org"), []);
    });

    it("should not mistake a URL with auth info as an email", () => {
      const text = "Connect via https://user:pass@example.com";
      assert.deepStrictEqual(getMatchedStrings(text), ["https://user:pass@example.com"]);
    });

    it("should extract a protocol-relative URL", () => {
      assert.deepStrictEqual(getMatchedStrings("Load from //cdn.example.com/script.js"), [
        "//cdn.example.com/script.js",
      ]);
    });

    it("should extract an IPv4 address", () => {
      assert.deepStrictEqual(getMatchedStrings("Connect to 192.168.1.1"), ["192.168.1.1"]);
    });

    it("should extract localhost with a port", () => {
      assert.deepStrictEqual(getMatchedStrings("API is at localhost:3000"), ["localhost:3000"]);
    });

    it("should handle very short but valid domains", () => {
      assert.deepStrictEqual(getMatchedStrings("Visit b.co"), ["b.co"]);
    });
  });

  describe("Punctuation Handling", () => {
    const trailingPunctuationCases = [
      { input: "Visit example.com.", expected: "example.com" },
      { input: "Go to example.com!", expected: "example.com" },
      { input: "Search on example.com?", expected: "example.com" },
      { input: "Look at example.com,", expected: "example.com" },
      { input: "Here is example.com:", expected: "example.com" },
      { input: "There is example.com;", expected: "example.com" },
      { input: "Check example.com's site", expected: "example.com" },
    ];

    trailingPunctuationCases.forEach(({ input, expected }) => {
      it(`should remove trailing punctuation from "${input}"`, () => {
        assert.deepStrictEqual(getMatchedStrings(input), [expected]);
      });
    });

    const surroundingPunctuationCases = [
      { input: "The site (example.com) is great.", expected: "example.com" },
      { input: 'She said "example.com" is cool.', expected: "example.com" },
      { input: "He said ‘example.com’ is cool.", expected: "example.com" },
      { input: "She said “example.com” is cool.", expected: "example.com" },
      { input: "Check [example.com] for info.", expected: "example.com" },
      { input: "<example.com>", expected: "example.com" },
    ];

    surroundingPunctuationCases.forEach(({ input, expected }) => {
      it(`should remove surrounding punctuation from "${input}"`, () => {
        assert.deepStrictEqual(getMatchedStrings(input), [expected]);
      });
    });

    it("should preserve internal parentheses when they are balanced", () => {
      const url = "https://en.wikipedia.org/wiki/Stack_(data_structure)";
      assert.deepStrictEqual(getMatchedStrings(url), [url]);
    });

    it("should correctly handle internal parentheses when the whole URL is wrapped", () => {
      const url = "https://en.wikipedia.org/wiki/Stack_(data_structure)";
      assert.deepStrictEqual(getMatchedStrings(`(See ${url})`), [url]);
    });
  });

  describe("Unicode and IDN Support", () => {
    it("should extract internationalized domain names (IDNs)", () => {
      assert.deepStrictEqual(getMatchedStrings("Visit my blog at ürl.de"), ["ürl.de"]);
      assert.deepStrictEqual(getMatchedStrings("你好世界.com is a valid URL."), ["你好世界.com"]);
    });

    it("should handle unicode paths and query strings", () => {
      assert.deepStrictEqual(getMatchedStrings("Go to https://example.com/résumé.pdf"), [
        "https://example.com/résumé.pdf",
      ]);
      assert.deepStrictEqual(getMatchedStrings("Search at example.com?q=你好"), ["example.com?q=你好"]);
    });

    it("should correctly handle punycode domains and normalize them", () => {
      const matches = getMatchedUrls("Visit xn--rl-wka.de today.");
      assert.strictEqual(matches[0].raw, "xn--rl-wka.de");
      assert.strictEqual(matches[0].normalized, "https://xn--rl-wka.de/");
    });
  });

  describe("Configuration Options", () => {
    it("requireProtocol: should only find URLs with a protocol when true", () => {
      const text = "Visit example.com and https://google.com and //cdn.com";
      const options = { requireProtocol: true };
      assert.deepStrictEqual(getMatchedStrings(text, options), ["https://google.com", "//cdn.com"]);
    });

    it("allowedProtocols: should only find URLs with protocols from the allowlist", () => {
      const text = "Links: http://a.com, https://b.com, and ftp://c.com.";
      const options = { allowedProtocols: ["http", "https"] };
      assert.deepStrictEqual(getMatchedStrings(text, options), ["http://a.com", "https://b.com"]);
    });

    it("allowedProtocols: should find all protocols if list is null", () => {
      const text = "Links: http://a.com, custom://b.com, and ftp://c.com.";
      const options = { allowedProtocols: null };
      assert.deepStrictEqual(getMatchedStrings(text, options), ["http://a.com", "custom://b.com", "ftp://c.com"]);
    });

    it("defaultProtocol: should use a custom default protocol for normalization", () => {
      const matches = getMatchedUrls("bare.com", { defaultProtocol: "http" });
      assert.strictEqual(matches[0].normalized, "http://bare.com/");
    });

    it("extensionsRequiringProtocol: should ignore file-like domains by default", () => {
      assert.deepStrictEqual(getMatchedStrings("Check config.json, readme.txt, and image.png"), []);
    });

    it("extensionsRequiringProtocol: should extract file-like URLs when a path is present", () => {
      assert.deepStrictEqual(getMatchedStrings("site.com/config.json"), ["site.com/config.json"]);
    });

    it("extensionsRequiringProtocol: should use the provided list instead of the default", () => {
      const text = "Check file.abc and site.com";
      const options = { extensionsRequiringProtocol: ["xyz"] };
      assert.deepStrictEqual(getMatchedStrings(text, options), ["file.abc", "site.com"]);
    });

    it("allowedBareHostnames: should find custom TLD-less hostnames from the allowlist", () => {
      const text = "Connect to http://dev-server and localhost:8080";
      const options = { allowedBareHostnames: ["dev-server", "localhost"] };
      assert.deepStrictEqual(getMatchedStrings(text, options), ["http://dev-server", "localhost:8080"]);
    });

    it("allowedBareHostnames: should not find TLD-less hostnames if the list is empty", () => {
      const text = "Connect to http://dev-server, localhost:8080 and example.com";
      const options = { allowedBareHostnames: [] };
      assert.deepStrictEqual(getMatchedStrings(text, options), ["example.com"]);
    });

    it("deduplicate: should remove duplicate URLs when true", () => {
      const text = "Visit example.com and then go to https://example.com/. Also see http://google.com.";

      // Without deduplication (default)
      const allUrls = getMatchedStrings(text, { deduplicate: false });
      assert.deepStrictEqual(allUrls, ["example.com", "https://example.com/", "http://google.com"]);

      // With deduplication
      const uniqueUrls = getMatchedStrings(text, { deduplicate: true });
      assert.deepStrictEqual(uniqueUrls, ["example.com", "http://google.com"]);
    });
  });

  describe("Option Interactions and Edge Cases", () => {
    it("should ignore a bare domain if its default protocol is not in allowedProtocols", () => {
      const text = "This is a test of example.com with a link to http://google.com";
      const options: ExtractUrlsOptions = {
        defaultProtocol: "https",
        allowedProtocols: ["http"],
      };
      assert.deepStrictEqual(getMatchedStrings(text, options), ["http://google.com"]);
    });

    it("should correctly apply requireProtocol and allowedProtocols together", () => {
      const text = "Links: http://a.com, https://b.com, ftp://c.com, d.com";
      const options: ExtractUrlsOptions = { requireProtocol: true, allowedProtocols: ["http"] };
      assert.deepStrictEqual(getMatchedStrings(text, options), ["http://a.com"]);
    });

    it("should not find an excluded extension with trailing punctuation", () => {
      const text = "Check the file config.json.";
      const options = { extensionsRequiringProtocol: ["json"] };
      assert.deepStrictEqual(getMatchedStrings(text, options), []);
    });
  });
});

// =================================================================
// 2. Unit Tests for Internal Helper Functions
// =================================================================
describe("Internal Utilities (Unit Tests)", () => {
  describe("removePunctuation", () => {
    const cases = [
      { input: "example.com.", expected: "example.com" },
      { input: "(example.com)", expected: "example.com" },
      { input: "((example.com))", expected: "example.com" },
      { input: "[example.com].", expected: "example.com" },
      { input: "<https://example.com/>", expected: "https://example.com/" },
      {
        input: "https://en.wikipedia.org/wiki/Stack_(data_structure)",
        expected: "https://en.wikipedia.org/wiki/Stack_(data_structure)",
      },
      { input: "example.com/path_(foo)", expected: "example.com/path_(foo)" },
      { input: "example.com)", expected: "example.com" },
      { input: "(example.com", expected: "example.com" },
    ];

    cases.forEach(({ input, expected }) => {
      it(`should correctly process "${input}" to "${expected}"`, () => {
        assert.strictEqual(internals.removePunctuation(input), expected);
      });
    });
  });

  describe("resolveProtocol", () => {
    const config: internals.CompleteOptions = internals.DEFAULTS;

    it("should identify a full protocol", () => {
      const result = internals.resolveProtocol("http://a.com", config);
      assert.deepStrictEqual(result, { urlHasProtocol: true, resolvedProtocol: "http", isDefaultProtocol: false });
    });

    it("should identify a protocol-relative URL", () => {
      const result = internals.resolveProtocol("//a.com", config);
      assert.deepStrictEqual(result, { urlHasProtocol: true, resolvedProtocol: "https", isDefaultProtocol: false });
    });

    it("should apply default protocol for a bare domain", () => {
      const result = internals.resolveProtocol("a.com", config);
      assert.deepStrictEqual(result, { urlHasProtocol: false, resolvedProtocol: "https", isDefaultProtocol: true });
    });

    it("should return no protocol if requireProtocol is true and URL is bare", () => {
      const result = internals.resolveProtocol("a.com", { ...config, requireProtocol: true });
      assert.deepStrictEqual(result, { urlHasProtocol: false, resolvedProtocol: undefined, isDefaultProtocol: false });
    });
  });

  describe("isValidHostname", () => {
    const allowed = ["localhost"];
    it("should return true for a valid FQDN", () =>
      assert.strictEqual(internals.isValidHostname("example.com", allowed), true));
    it("should return true for an IPv4 address", () =>
      assert.strictEqual(internals.isValidHostname("8.8.8.8", allowed), true));
    it("should return true for a domain in the allowlist", () =>
      assert.strictEqual(internals.isValidHostname("localhost", allowed), true));
    it("should return false for a bare name not in the allowlist", () =>
      assert.strictEqual(internals.isValidHostname("server", allowed), false));
    it("should return true for a subdomain", () =>
      assert.strictEqual(internals.isValidHostname("test.example.com", allowed), true));
  });
});
