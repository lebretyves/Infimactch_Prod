import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
export function encrypt(data: Buffer, key: Buffer, context: string): Buffer {
  if (key.length !== 32) throw new Error("INVALID_KEY");
  const nonce = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([
    Buffer.from("IFM1"),
    nonce,
    cipher.getAuthTag(),
    encrypted,
  ]);
}
export function decrypt(data: Buffer, key: Buffer, context: string): Buffer {
  if (
    key.length !== 32 ||
    data.length < 32 ||
    data.subarray(0, 4).toString() !== "IFM1"
  )
    throw new Error("INVALID_ENVELOPE");
  const cipher = createDecipheriv("aes-256-gcm", key, data.subarray(4, 16));
  cipher.setAAD(Buffer.from(context));
  cipher.setAuthTag(data.subarray(16, 32));
  // Return nothing until authentication succeeds.
  return Buffer.concat([cipher.update(data.subarray(32)), cipher.final()]);
}
export function fileMime(data: Buffer): string | null {
  if (data.subarray(0, 5).equals(Buffer.from("%PDF-")))
    return "application/pdf";
  if (
    data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (data.subarray(0, 3).equals(Buffer.from([255, 216, 255])))
    return "image/jpeg";
  return null;
}
