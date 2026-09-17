import { test } from "node:test";
import { expect } from "expect";
import { documentQuotaBytes, parseTrustProxy } from "../../src/config";

test("development does not trust forwarded headers by default", () => {
  expect(parseTrustProxy(undefined, "development")).toBe(false);
});

test("production requires an explicit trusted proxy", () => {
  expect(() => parseTrustProxy(undefined, "production")).toThrow(
    "TRUST_PROXY required in production",
  );
  expect(() => parseTrustProxy("true", "production")).toThrow();
});

test("trusted proxy accepts bounded hops and explicit network ranges", () => {
  expect(parseTrustProxy("1", "production")).toBe(1);
  expect(
    parseTrustProxy("loopback, 172.18.0.0/16, 2001:db8::/32", "production"),
  ).toEqual(["loopback", "172.18.0.0/16", "2001:db8::/32"]);
  expect(() => parseTrustProxy("0", "production")).toThrow();
  expect(() => parseTrustProxy("172.18.0.0/99", "production")).toThrow();
});

test("document storage quota is bounded and deterministic", () => {
  expect(documentQuotaBytes(undefined)).toBe(25 * 1024 * 1024);
  expect(documentQuotaBytes(String(10 * 1024 * 1024))).toBe(10 * 1024 * 1024);
  expect(() => documentQuotaBytes("1048576")).toThrow();
  expect(() => documentQuotaBytes("not-a-number")).toThrow();
});
