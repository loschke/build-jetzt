import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isAllowedUrl } from "./url-validation";

describe("isAllowedUrl", () => {
  test("should block loopback IPs", () => {
    assert.equal(isAllowedUrl("http://127.0.0.1"), false);
    assert.equal(isAllowedUrl("http://127.0.0.2"), false);
    assert.equal(isAllowedUrl("http://127.1"), false);
    assert.equal(isAllowedUrl("http://0x7f.0.0.1"), false);
    assert.equal(isAllowedUrl("http://2130706433"), false);
  });
});
