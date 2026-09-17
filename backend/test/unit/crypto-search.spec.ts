import { test } from "node:test";
import { expect } from "expect";
import { randomBytes } from "node:crypto";
import { encrypt, decrypt, fileMime } from "../../src/documents/crypto";
import { searchSql } from "../../src/listings/search";
test("authenticated encryption rejects tampering and swapped documents", () => {
  const key = randomBytes(32),
    plain = Buffer.from("%PDF-1.7 FICTIONAL"),
    encrypted = encrypt(plain, key, "document-A");
  expect(encrypted.includes(plain)).toBe(false);
  expect(decrypt(encrypted, key, "document-A")).toEqual(plain);
  expect(() => decrypt(encrypted, key, "document-B")).toThrow();
  encrypted[encrypted.length - 1] = encrypted[encrypted.length - 1]! ^ 1;
  expect(() => decrypt(encrypted, key, "document-A")).toThrow();
});
test("encryption uses independent nonces", () => {
  const key = randomBytes(32);
  expect(encrypt(Buffer.from("a"), key, "x")).not.toEqual(
    encrypt(Buffer.from("a"), key, "x"),
  );
});
test("HTML is not accepted as PDF", () =>
  expect(fileMime(Buffer.from("<html>fake.pdf"))).toBe(null));
test("IDE OR IADE filters stay in their branch and all values are bound", () => {
  const q = searchSql({
    qualifications: ["IDE", "IADE"],
    ideServices: ["URGENCES"],
    iadePopulation: ["ADULT"],
    radiusKm: 30,
    latitude: 48,
    longitude: 2,
  });
  expect(q.sql).toContain(" OR ");
  expect(q.sql).not.toContain("URGENCES");
  expect(q.values).toContainEqual(["URGENCES"]);
  expect(q.sql).toContain("ST_DWithin");
});
test("unselected branch filter rejected", () =>
  expect(() =>
    searchSql({ qualifications: ["IDE"], ibodePopulation: ["ADULT"] }),
  ).toThrow());
test("incomplete location rejected", () =>
  expect(() => searchSql({ qualifications: ["IDE"], radiusKm: 10 })).toThrow());
