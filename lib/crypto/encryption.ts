// End-to-End Encryption using Web Crypto API

const ALGORITHM = "AES-GCM"
const KEY_LENGTH = 256

export interface EncryptedMessage {
  encryptedPayload: string
  iv: string
}

// Generate a new AES-GCM key
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
export async function initializeEncryption(): Promise<CryptoKey> {
  let key = await getEncryptionKey()
  if (!key) {
    key = await generateEncryptionKey()
    await storeEncryptionKey(key)
  }
  return key
}
