import { describe, it } from "node:test";
import assert from "node:assert";

import type { ExtractUrlsOptions } from "./types.js";
import { extractUrls, resolveProtocol, removePunctuation, DEFAULT_OPTIONS } from "./core.js";

const getRawMatches = (text: string, options?: ExtractUrlsOptions): string[] =>
  extractUrls(text, options).map((m) => m.raw);

const getNormalizedMatches = (text: string, options?: ExtractUrlsOptions): string[] =>
  extractUrls(text, options).map((m) => m.normalized);

void describe("Core (Integration Tests)", () => {
  void void describe("String Matching", () => {
    void it("should match a standard HTTPS URL", () => {
      assert.deepStrictEqual(getRawMatches("Visit https://example.com for more info"), ["https://example.com"]);
    });

    void it("should match a bare domain by default", () => {
      assert.deepStrictEqual(getRawMatches("Check out example.com"), ["example.com"]);
    });

    void it("should match multiple distinct URLs", () => {
      assert.deepStrictEqual(getRawMatches("Sites: one.com, two.org, and three.net."), [
        "one.com",
        "two.org",
        "three.net",
      ]);
    });

    void it("should not match domains from email addresses", () => {
      assert.deepStrictEqual(getRawMatches("My email is test@example.org"), []);
    });

    void it("should match a URL with auth info", () => {
      assert.deepStrictEqual(getRawMatches("Connect via https://user:pass@example.com"), [
        "https://user:pass@example.com",
      ]);
    });

    void it("should match a protocol-relative URL", () => {
      assert.deepStrictEqual(getRawMatches("Load from //cdn.example.com/script.js"), ["//cdn.example.com/script.js"]);
    });

    void it("should match an IPv4 address", () => {
      assert.deepStrictEqual(getRawMatches("Connect to 192.168.1.1"), ["192.168.1.1"]);
    });

    void it("should match localhost with a port", () => {
      assert.deepStrictEqual(getRawMatches("API is at localhost:3000"), ["localhost:3000"]);
    });

    void it("should match very short but valid domains", () => {
      assert.deepStrictEqual(getRawMatches("Visit b.co"), ["b.co"]);
    });
  });

  void describe("Punctuation Handling", () => {
    [
      { input: "Visit example.com.", expected: "example.com" },
      { input: "Go to example.com!", expected: "example.com" },
      { input: "Search on example.com?", expected: "example.com" },
      { input: "Look at example.com,", expected: "example.com" },
      { input: "Here is example.com:", expected: "example.com" },
      { input: "There is example.com;", expected: "example.com" },
      { input: "Check example.com's site", expected: "example.com" },
    ].forEach(({ input, expected }) => {
      void it(`should remove trailing punctuation from "${input}"`, () => {
        assert.deepStrictEqual(getRawMatches(input), [expected]);
      });
    });

    [
      { input: "The site (example.com) is great.", expected: "example.com" },
      { input: 'She said "example.com" is cool.', expected: "example.com" },
      { input: "He said ‘example.com’ is cool.", expected: "example.com" },
      { input: "She said “example.com” is cool.", expected: "example.com" },
      { input: "Check [example.com] for info.", expected: "example.com" },
      { input: "<example.com>", expected: "example.com" },
    ].forEach(({ input, expected }) => {
      void it(`should remove surrounding punctuation from "${input}"`, () => {
        assert.deepStrictEqual(getRawMatches(input), [expected]);
      });
    });

    void it("should preserve internal parentheses when they are balanced", () => {
      const url = "https://en.wikipedia.org/wiki/Stack_(data_structure)";
      assert.deepStrictEqual(getRawMatches(url), [url]);
    });

    void it("should preserve internal parentheses when the whole URL is wrapped", () => {
      const url = "https://en.wikipedia.org/wiki/Stack_(data_structure)";
      assert.deepStrictEqual(getRawMatches(`(See ${url})`), [url]);
    });
  });

  void describe("Unicode and IDN Support", () => {
    void it("should handle internationalized domain names (IDNs)", () => {
      assert.deepStrictEqual(getRawMatches("Visit my blog at ürl.de"), ["ürl.de"]);
      assert.deepStrictEqual(getRawMatches("你好世界.com is a valid URL."), ["你好世界.com"]);
    });

    void it("should handle unicode paths and query strings", () => {
      assert.deepStrictEqual(getRawMatches("Go to https://example.com/résumé.pdf"), ["https://example.com/résumé.pdf"]);
      assert.deepStrictEqual(getRawMatches("Search at example.com?q=你好"), ["example.com?q=你好"]);
    });

    void it("should handle punycode domains and normalize them", () => {
      const matches = extractUrls("Visit xn--rl-wka.de today.");
      assert.strictEqual(matches[0].raw, "xn--rl-wka.de");
      assert.strictEqual(matches[0].normalized, "https://xn--rl-wka.de/");
    });
  });

  void describe("Configuration Options", () => {
    void it("requireProtocol: should only find URLs with a protocol when true", () => {
      assert.deepStrictEqual(
        getRawMatches("Visit example.com and https://google.com and //cdn.com", { requireProtocol: true }),
        ["https://google.com", "//cdn.com"]
      );
    });

    void it("defaultProtocol: should use provided default protocol for normalization", () => {
      assert.deepStrictEqual(getNormalizedMatches("bare.com", { defaultProtocol: "http" }), ["http://bare.com/"]);
    });

    void it("allowedProtocols: should only match URLs with protocols in the allowlist", () => {
      assert.deepStrictEqual(
        getRawMatches("Links: http://a.com, https://b.com, and ftp://c.com.", { allowedProtocols: ["http", "https"] }),
        ["http://a.com", "https://b.com"]
      );
    });

    void it("allowedProtocols: should match all protocols if null", () => {
      assert.deepStrictEqual(
        getRawMatches("Links: http://a.com, custom://b.com, and ftp://c.com.", { allowedProtocols: null }),
        ["http://a.com", "custom://b.com", "ftp://c.com"]
      );
    });

    void it("extensionsRequiringProtocol: should not match file-like domains", () => {
      assert.deepStrictEqual(getRawMatches("Check config.json, readme.txt, and image.png"), []);
    });

    void it("extensionsRequiringProtocol: should match file-like URLs when a path is present", () => {
      assert.deepStrictEqual(getRawMatches("site.com/config.json"), ["site.com/config.json"]);
    });

    void it("extensionsRequiringProtocol: should use provided list instead of the default", () => {
      assert.deepStrictEqual(
        getRawMatches("Check config.xyz, readme.txt, and image.png", { extensionsRequiringProtocol: ["xyz"] }),
        ["readme.txt", "image.png"]
      );
    });

    void it("allowedBareHostnames: should match provided bare hostnames", () => {
      assert.deepStrictEqual(
        getRawMatches("Connect to http://dev-server and localhost:8080", {
          allowedBareHostnames: ["dev-server", "localhost"],
        }),
        ["http://dev-server", "localhost:8080"]
      );
    });

    void it("allowedBareHostnames: should not match bare hostnames if the list is empty", () => {
      assert.deepStrictEqual(
        getRawMatches("Connect to http://dev-server, localhost:8080 and example.com", { allowedBareHostnames: [] }),
        ["example.com"]
      );
    });

    void it("deduplicate: should not return duplicate matches when true", () => {
      const text = "Visit example.com and then go to https://example.com/. Also see http://google.com.";
      assert.deepStrictEqual(getRawMatches(text, { deduplicate: false }), [
        "example.com",
        "https://example.com/",
        "http://google.com",
      ]);
      assert.deepStrictEqual(getRawMatches(text, { deduplicate: true }), ["example.com", "http://google.com"]);
    });
  });

  void describe("Option Interactions and Edge Cases", () => {
    void it("should not match bare domains if the specified default protocol is not in allowedProtocols", () => {
      const text = "This is a test of example.com with a link to http://google.com";
      const options: ExtractUrlsOptions = {
        defaultProtocol: "https",
        allowedProtocols: ["http"],
      };
      assert.deepStrictEqual(getRawMatches(text, options), ["http://google.com"]);
    });

    void it("should correctly apply requireProtocol and allowedProtocols together", () => {
      const text = "Links: http://a.com, https://b.com, ftp://c.com, d.com";
      const options: ExtractUrlsOptions = { requireProtocol: true, allowedProtocols: ["http"] };
      assert.deepStrictEqual(getRawMatches(text, options), ["http://a.com"]);
    });
  });
});

void describe("Core (Unit Tests)", () => {
  void describe("removePunctuation", () => {
    [
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
    ].forEach(({ input, expected }) => {
      void it(`should correctly process "${input}" to "${expected}"`, () => {
        assert.strictEqual(removePunctuation(input), expected);
      });
    });
  });

  void describe("resolveProtocol", () => {
    void it("should identify a full protocol", () => {
      assert.deepStrictEqual(resolveProtocol("http://a.com", DEFAULT_OPTIONS), {
        urlHasProtocol: true,
        resolvedProtocol: "http",
        isDefaultProtocol: false,
      });
    });

    void it("should identify relative protocol", () => {
      assert.deepStrictEqual(resolveProtocol("//a.com", DEFAULT_OPTIONS), {
        urlHasProtocol: true,
        resolvedProtocol: "https",
        isDefaultProtocol: false,
      });
    });

    void it("should apply default protocol to a bare domain", () => {
      assert.deepStrictEqual(resolveProtocol("a.com", DEFAULT_OPTIONS), {
        urlHasProtocol: false,
        resolvedProtocol: "https",
        isDefaultProtocol: true,
      });
    });

    void it("should return no protocol if requireProtocol is true and URL is bare", () => {
      assert.deepStrictEqual(resolveProtocol("a.com", { ...DEFAULT_OPTIONS, requireProtocol: true }), {
        urlHasProtocol: false,
        resolvedProtocol: undefined,
        isDefaultProtocol: false,
      });
    });
  });
});
