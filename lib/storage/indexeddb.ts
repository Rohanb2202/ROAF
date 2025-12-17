// IndexedDB for offline message storage

const DB_NAME = "roaf_offline_db"
const DB_VERSION = 1
const STORE_NAME = "pending_messages"

interface PendingMessage {
  id?: number
  chatId: string
  message: any
  timestamp: number
}

let db: IDBDatabase | null = null

export async function initDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true })
      }
    }
  })
}

export async function savePendingMessage(chatId: string, message: any): Promise<void> {
  const database = await initDB()
  const transaction = database.transaction([STORE_NAME], "readwrite")
  const store = transaction.objectStore(STORE_NAME)

  const pendingMessage: PendingMessage = {
    chatId,
    message,
    timestamp: Date.now(),
  }

  return new Promise((resolve, reject) => {
    const request = store.add(pendingMessage)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getPendingMessages(): Promise<PendingMessage[]> {
  const database = await initDB()
  const transaction = database.transaction([STORE_NAME], "readonly")
  const store = transaction.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function deletePendingMessage(id: number): Promise<void> {
  const database = await initDB()
  const transaction = database.transaction([STORE_NAME], "readwrite")
  const store = transaction.objectStore(STORE_NAME)

  return new Promise((resolve, reject) => {
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
