export type StoredAsset = {
  id: string
  gameId: string
  name: string
  size: number
  type: string
  updatedAt: number
  blob: Blob
}

const DB_NAME = 'open-source-game-vault'
const DB_VERSION = 1
const STORE_NAME = 'assets'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('gameId', 'gameId', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function txStore(db: IDBDatabase, mode: IDBTransactionMode) {
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME)
}

export async function listAssets(): Promise<StoredAsset[]> {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const request = txStore(db, 'readonly').getAll()
    request.onsuccess = () => {
      db.close()
      resolve((request.result as StoredAsset[]).sort((a, b) => b.updatedAt - a.updatedAt))
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function saveAssets(gameId: string, files: File[]): Promise<void> {
  const db = await openDb()

  await Promise.all(
    files.map(
      (file) =>
        new Promise<void>((resolve, reject) => {
          const id = `${gameId}:${file.name}`
          const asset: StoredAsset = {
            id,
            gameId,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            updatedAt: Date.now(),
            blob: file,
          }
          const request = txStore(db, 'readwrite').put(asset)
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        }),
    ),
  )

  db.close()
}

export async function deleteAsset(id: string): Promise<void> {
  const db = await openDb()

  return new Promise((resolve, reject) => {
    const request = txStore(db, 'readwrite').delete(id)
    request.onsuccess = () => {
      db.close()
      resolve()
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  const units = ['KB', 'MB', 'GB']
  let value = size / 1024
  let unit = units.shift() ?? 'KB'

  while (value >= 1024 && units.length) {
    value /= 1024
    unit = units.shift() ?? unit
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`
}
