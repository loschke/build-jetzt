/**
 * Token-Encryption für MCP-Credentials (OAuth-Tokens & BYOK-Secrets).
 *
 * AES-256-GCM mit einem plattformweiten Schlüssel aus `MCP_TOKEN_ENCRYPTION_KEY`.
 * Geteilte Util für die OAuth-Account-Auth und die BYOK-Static-Schwester-PRD.
 *
 * Sicherheits-Eigenschaften:
 * - **Fail-closed:** Fehlt/ungültig der Key, wird geworfen — niemals Klartext gespeichert.
 * - Der Schlüssel wird NICHT aus User-/Session-Kontext abgeleitet. Die Entschlüsselung
 *   muss server-seitig zur Chat-Zeit allein mit `userId` aus der DB möglich sein.
 * - Authenticated Encryption (GCM) → Manipulation am Ciphertext schlägt fehl statt
 *   Müll zu liefern.
 *
 * Format des Ciphertext-Strings: `mcpenc1:<base64(iv || authTag || ciphertext)>`
 * - iv: 12 Byte (GCM-Standard)
 * - authTag: 16 Byte
 * - ciphertext: variabel
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const VERSION_PREFIX = "mcpenc1:"
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Lädt + validiert den Encryption-Key aus der ENV.
 * Akzeptiert base64 (z. B. `openssl rand -base64 32`) oder hex (64 Zeichen).
 * Wirft, wenn der Key fehlt oder nicht 32 Byte ergibt (fail-closed).
 */
function getKey(): Buffer {
  const raw = process.env.MCP_TOKEN_ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      "MCP_TOKEN_ENCRYPTION_KEY ist nicht gesetzt — MCP-Token-Verschlüsselung nicht verfügbar."
    )
  }

  let key: Buffer
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex")
  } else {
    key = Buffer.from(raw, "base64")
  }

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `MCP_TOKEN_ENCRYPTION_KEY muss 32 Byte ergeben (base64 oder hex), ist aber ${key.length} Byte.`
    )
  }
  return key
}

/** True, wenn ein verwendbarer Encryption-Key konfiguriert ist (für Feature-Gating). */
export function isMcpTokenEncryptionConfigured(): boolean {
  try {
    getKey()
    return true
  } catch {
    return false
  }
}

/** Verschlüsselt einen Klartext-Secret. Wirft, wenn der Key fehlt/ungültig. */
export function encryptSecret(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  const packed = Buffer.concat([iv, authTag, ciphertext])
  return VERSION_PREFIX + packed.toString("base64")
}

/**
 * Entschlüsselt einen mit {@link encryptSecret} erzeugten String.
 * Wirft bei fehlendem/falschem Key, falschem Format oder manipuliertem Ciphertext.
 */
export function decryptSecret(ciphertext: string): string {
  if (!ciphertext.startsWith(VERSION_PREFIX)) {
    throw new Error("Ungültiges MCP-Ciphertext-Format (Versions-Prefix fehlt).")
  }
  const key = getKey()
  const packed = Buffer.from(ciphertext.slice(VERSION_PREFIX.length), "base64")
  if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Ungültiges MCP-Ciphertext-Format (zu kurz).")
  }

  const iv = packed.subarray(0, IV_LENGTH)
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const data = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()])
  return plaintext.toString("utf8")
}
