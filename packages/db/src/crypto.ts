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

const key = (name: string): Buffer => {
  const raw = Buffer.from(required(name), "base64");
  if (raw.length !== 32) {
    throw new Error(`${name} must be 32 bytes, base64 encoded. Generate: openssl rand -base64 32`);
  }
  return raw;
};

function seal(plaintext: string, name: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(name), iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}

function open(payload: string, name: string): string {
  const [version, ivPart, tagPart, bodyPart] = payload.split(".");
  if (version !== VERSION || !ivPart || !tagPart || !bodyPart) {
    throw new Error("Unrecognised encrypted payload.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key(name), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(bodyPart, "base64url")), decipher.final()]).toString("utf8");
}

export const encryptNote = (plaintext: string): string => seal(plaintext, "NOTE_ENCRYPTION_KEY");
export const decryptNote = (payload: string): string => open(payload, "NOTE_ENCRYPTION_KEY");

/**
 * HRT-123, R21.15. A church's own provider credential, sealed.
 *
 * Same envelope as a confidential note and a different key, so a leak of one
 * is not a leak of the other. The sealed value is what sits in the column; it
 * is opened in the worker and nowhere else, and no read path selects it.
 *
 * `credentialKeyId` travels with the row so a key can be rotated by resealing
 * rather than by reading every secret out and putting it back.
 */
export const CREDENTIAL_KEY_ID = "v1";

export const sealCredential = (plaintext: string): string =>
  seal(plaintext, "PROVIDER_CREDENTIAL_KEY");

export const openCredential = (payload: string): string =>
  open(payload, "PROVIDER_CREDENTIAL_KEY");

/**
 * What a credential may be written down as, anywhere a human or a log will
 * see it. Never the value, and never a prefix of it either: the first eight
 * characters of a Twilio SID identify the account.
 */
export const maskCredential = (value: string | null | undefined): string =>
  value?.trim() ? "set" : "not set";
