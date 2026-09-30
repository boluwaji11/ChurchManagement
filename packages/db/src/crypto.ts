import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { required } from "./env";

/**
 * Application-level encryption for confidential pastoral notes (R21.3).
 *
 * The database never sees the key, so a confidential note row can be listed
 * without its content being readable. That is what makes R6.2 structural rather
 * than a filter someone can forget to apply.
 *
 * AES-256-GCM. Payload is v1.<iv>.<tag>.<ciphertext>, all base64url.
 */
const VERSION = "v1";

const key = (): Buffer => {
  const raw = Buffer.from(required("NOTE_ENCRYPTION_KEY"), "base64");
  if (raw.length !== 32) {
    throw new Error("NOTE_ENCRYPTION_KEY must be 32 bytes, base64 encoded. Generate: openssl rand -base64 32");
  }
  return raw;
};

export function encryptNote(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

export function decryptNote(payload: string): string {
  const [version, ivPart, tagPart, bodyPart] = payload.split(".");
  if (version !== VERSION || !ivPart || !tagPart || !bodyPart) {
    throw new Error("Unrecognised confidential note payload.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(bodyPart, "base64url")), decipher.final()]).toString("utf8");
}
