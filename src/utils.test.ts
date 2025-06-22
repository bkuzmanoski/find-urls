import { describe, it } from "node:test";
import assert from "node:assert";

import { isValidHostname } from "./utils.js";

void describe("Utils (Unit Tests)", () => {
  void describe("isValidHostname", () => {
    const allowedBareHostnames = ["localhost"];
    void it("should return true for a FQDN", () =>
      assert.strictEqual(isValidHostname("example.com", allowedBareHostnames), true));
    void it("should return true for a subdomain", () =>
      assert.strictEqual(isValidHostname("test.example.com", allowedBareHostnames), true));
    void it("should return true for an IPv4 address", () =>
      assert.strictEqual(isValidHostname("8.8.8.8", allowedBareHostnames), true));
    void it("should return true for a bare hostname in the allowlist", () =>
      assert.strictEqual(isValidHostname("localhost", allowedBareHostnames), true));
    void it("should return false for a bare hostname not in the allowlist", () =>
      assert.strictEqual(isValidHostname("server", allowedBareHostnames), false));
  });
});
