import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);
const HASH_PREFIX = "scrypt";
const KEY_LENGTH = 64;

function isLegacyBcryptHash(value: string): boolean {
  return value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$");
}

export async function hash(value: string, _rounds = 10): Promise<string> {
  const salt = randomBytes(16).toString("base64");
  const derived = (await scrypt(value, salt, KEY_LENGTH)) as Buffer;
  return `${HASH_PREFIX}$${salt}$${derived.toString("base64")}`;
}

export async function compare(value: string, digest: string): Promise<boolean> {
  if (digest.startsWith(`${HASH_PREFIX}$`)) {
    const [, salt, expectedKey] = digest.split("$");
    if (!salt || !expectedKey) {
      return false;
    }

    const derived = (await scrypt(value, salt, KEY_LENGTH)) as Buffer;
    const expected = Buffer.from(expectedKey, "base64");
    return expected.length === derived.length && timingSafeEqual(derived, expected);
  }

  if (isLegacyBcryptHash(digest)) {
    try {
      const bcrypt = await import("bcryptjs");
      return bcrypt.compare(value, digest);
    } catch {
      return false;
    }
  }

  return false;
}
