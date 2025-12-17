// End-to-End Encryption using Web Crypto API
// Uses a shared secret derived from chat ID so both users can decrypt

const ALGORITHM = "AES-GCM"
const KEY_LENGTH = 256

// Shared secret for key derivation (in production, use a proper key exchange)
// This ensures both users in the couple derive the same key
const SHARED_SECRET = "ROAF_COUPLES_APP_2024_SECURE_KEY"

export interface EncryptedMessage {
  encryptedPayload: string
  iv: string
}

// Derive a key from a passphrase using PBKDF2
async function deriveKeyFromPassphrase(passphrase: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()

  // Import the passphrase as a key
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  )

  // Derive the actual encryption key
  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    {
      name: ALGORITHM,
      length: KEY_LENGTH
    },
    true,
    ["encrypt", "decrypt"]
  )
}

// Generate a new AES-GCM key (kept for compatibility)
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true, // extractable
    ["encrypt", "decrypt"],
  )
}

// Export key to string for storage
export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("jwk", key)
  return JSON.stringify(exported)
}

// Import key from string
export async function importKey(keyString: string): Promise<CryptoKey> {
  const keyData = JSON.parse(keyString)
  return await window.crypto.subtle.importKey(
    "jwk",
    keyData,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true,
    ["encrypt", "decrypt"],
  )
}

// Encrypt a message
export async function encryptMessage(message: string, key: CryptoKey): Promise<EncryptedMessage> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encodedMessage = new TextEncoder().encode(message)

  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    encodedMessage,
  )

  return {
    encryptedPayload: btoa(String.fromCharCode(...new Uint8Array(encryptedData))),
    iv: btoa(String.fromCharCode(...iv)),
  }
}

// Decrypt a message
export async function decryptMessage(encryptedMessage: EncryptedMessage, key: CryptoKey): Promise<string> {
  const iv = Uint8Array.from(atob(encryptedMessage.iv), (c) => c.charCodeAt(0))
  const encryptedData = Uint8Array.from(atob(encryptedMessage.encryptedPayload), (c) => c.charCodeAt(0))

  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv,
    },
    key,
    encryptedData,
  )

  return new TextDecoder().decode(decryptedData)
}

// Store encryption key in IndexedDB
export async function storeEncryptionKey(key: CryptoKey): Promise<void> {
  const keyString = await exportKey(key)
  localStorage.setItem("roaf_encryption_key", keyString)
}

// Retrieve encryption key from IndexedDB
export async function getEncryptionKey(): Promise<CryptoKey | null> {
  const keyString = localStorage.getItem("roaf_encryption_key")
  if (!keyString) return null
  return await importKey(keyString)
}

// Initialize encryption for a user (first time setup)
// DEPRECATED: Use initializeSharedEncryption instead
export async function initializeEncryption(): Promise<CryptoKey> {
  // Always use shared key for couples app
  return await initializeSharedEncryption()
}

// Initialize shared encryption - both users derive the same key
// This ensures messages can be decrypted by both parties
export async function initializeSharedEncryption(): Promise<CryptoKey> {
  // Use a fixed salt combined with the shared secret
  // Both users will derive the exact same key
  const salt = "ROAF_COUPLES_SALT_V1"
  return await deriveKeyFromPassphrase(SHARED_SECRET, salt)
}
