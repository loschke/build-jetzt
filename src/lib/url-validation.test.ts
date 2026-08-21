import { describe, it } from "node:test";
import assert from "node:assert";
import { isAllowedUrl } from "./url-validation";

describe("isAllowedUrl", () => {
  it("allows valid external URLs", () => {
    assert.strictEqual(isAllowedUrl("https://example.com"), true);
    assert.strictEqual(isAllowedUrl("http://8.8.8.8"), true);
  });

  it("blocks localhost and basic loopback", () => {
    assert.strictEqual(isAllowedUrl("http://localhost"), false);
    assert.strictEqual(isAllowedUrl("http://127.0.0.1"), false);
  });

  it("blocks alternative loopback addresses (127.x.x.x)", () => {
    assert.strictEqual(isAllowedUrl("http://127.0.0.2"), false);
    assert.strictEqual(isAllowedUrl("http://127.1.2.3"), false);
    assert.strictEqual(isAllowedUrl("http://127.127.127.127"), false);
  });

  it("blocks private IPs", () => {
    assert.strictEqual(isAllowedUrl("http://10.0.0.1"), false);
    assert.strictEqual(isAllowedUrl("http://172.16.0.1"), false);
    assert.strictEqual(isAllowedUrl("http://192.168.1.1"), false);
  });

  it("blocks AWS metadata", () => {
    assert.strictEqual(isAllowedUrl("http://169.254.169.254"), false);
  });

  it("blocks octal/hex IP encodings", () => {
    assert.strictEqual(isAllowedUrl("http://0177.0.0.1"), false);
    assert.strictEqual(isAllowedUrl("http://0x7f.0.0.1"), false);
    assert.strictEqual(isAllowedUrl("http://0x7f000001"), false);
    assert.strictEqual(isAllowedUrl("http://2130706433"), false);
  });

  it("blocks trailing dot bypasses", () => {
    assert.strictEqual(isAllowedUrl("http://localhost."), false);
    assert.strictEqual(isAllowedUrl("http://127.0.0.1."), false);
    assert.strictEqual(isAllowedUrl("http://metadata.google.internal."), false);
  });

  it("blocks alternative IPv6 encodings", () => {
    assert.strictEqual(isAllowedUrl("http://[::]"), false);
    assert.strictEqual(isAllowedUrl("http://[0000::1]"), false);
    assert.strictEqual(isAllowedUrl("http://[::ffff:127.0.0.1]"), false);
  });
});

describe("MCP_LOCAL_URL_ALLOWLIST (local-dev loopback exception)", () => {
  it("keeps loopback blocked when the env var is unset", () => {
    delete process.env.MCP_LOCAL_URL_ALLOWLIST;
    assert.strictEqual(isAllowedUrl("http://127.0.0.1:4700/mcp"), false);
  });

  it("allows exactly the allow-listed origin, nothing else", () => {
    process.env.MCP_LOCAL_URL_ALLOWLIST = "http://127.0.0.1:4700";
    try {
      assert.strictEqual(isAllowedUrl("http://127.0.0.1:4700/mcp"), true);
      // Same host, different port: still blocked.
      assert.strictEqual(isAllowedUrl("http://127.0.0.1:9999/mcp"), false);
      // Different hostname resolving to the same place: still blocked (exact origin match).
      assert.strictEqual(isAllowedUrl("http://localhost:4700/mcp"), false);
      // External URLs unaffected.
      assert.strictEqual(isAllowedUrl("https://example.com"), true);
      assert.strictEqual(isAllowedUrl("http://10.0.0.1"), false);
    } finally {
      delete process.env.MCP_LOCAL_URL_ALLOWLIST;
    }
  });

  it("supports multiple comma-separated origins and trims trailing slashes", () => {
    process.env.MCP_LOCAL_URL_ALLOWLIST = "http://127.0.0.1:4700/, http://localhost:5555";
    try {
      assert.strictEqual(isAllowedUrl("http://127.0.0.1:4700/mcp"), true);
      assert.strictEqual(isAllowedUrl("http://localhost:5555/api"), true);
      assert.strictEqual(isAllowedUrl("http://localhost:4700/mcp"), false);
    } finally {
      delete process.env.MCP_LOCAL_URL_ALLOWLIST;
    }
  });

  it("never bypasses the protocol check", () => {
    process.env.MCP_LOCAL_URL_ALLOWLIST = "ftp://127.0.0.1:21";
    try {
      assert.strictEqual(isAllowedUrl("ftp://127.0.0.1:21/x"), false);
    } finally {
      delete process.env.MCP_LOCAL_URL_ALLOWLIST;
    }
  });
});
