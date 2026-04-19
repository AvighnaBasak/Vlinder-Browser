import { EventEmitter } from 'events'
import { z } from 'zod'

// Modified Shortcut Data //
const ModifiedShortcutData = z.object({
  newShortcut: z.string(),
})
type ModifiedShortcutData = z.infer<typeof ModifiedShortcutData>

// Events //
type ShortcutsEvents = {
  'shortcuts-changed': []
}
export const shortcutsEmitter = new EventEmitter() as EventEmitter & {
  on<K extends keyof ShortcutsEvents>(event: K, listener: (...args: ShortcutsEvents[K]) => void): EventEmitter
  emit<K extends keyof ShortcutsEvents>(event: K, ...args: ShortcutsEvents[K]): boolean
}

// Internal Variables //
const modifiedShortcuts: Map<string, ModifiedShortcutData> = new Map()

// Data Store //
let ShortcutsDataStore: any = null

// Initialize store
async function initStore() {
  if (!ShortcutsDataStore) {
    const Store = (await import('electron-store')).default
    ShortcutsDataStore = new Store({ name: 'shortcuts' })
  }
  return ShortcutsDataStore
}

// Load Modified Shortcuts //
async function loadShortcuts() {
  const store = await initStore()
  const rawModifiedShortcuts = store.store as Record<string, unknown>

  let hasChanged = false

  for (const key of Object.keys(rawModifiedShortcuts)) {
    const rawModifiedShortcutData = rawModifiedShortcuts[key]

    // Handle legacy flat string format: { "browser.toggleSidebar": "Ctrl+S" }
    if (typeof rawModifiedShortcutData === 'string') {
      const modifiedShortcutData = { newShortcut: rawModifiedShortcutData }
      modifiedShortcuts.set(key, modifiedShortcutData)
      hasChanged = true
      // Migrate to new object format in store
      try {
        store.set(key, modifiedShortcutData)
      } catch {
        /* ignore migration write errors */
      }
      continue
    }

    // Handle legacy grouped format: { "browser": { "toggleSidebar": "Ctrl+S" } }
    if (
      rawModifiedShortcutData &&
      typeof rawModifiedShortcutData === 'object' &&
      !('newShortcut' in (rawModifiedShortcutData as any))
    ) {
      const groupObject = rawModifiedShortcutData as Record<string, unknown>
      let migratedAny = false
      for (const subKey of Object.keys(groupObject)) {
        const value = groupObject[subKey]
        if (typeof value === 'string') {
          const id = `${key}.${subKey}`
          const modifiedShortcutData = { newShortcut: value }
          modifiedShortcuts.set(id, modifiedShortcutData)
          try {
            store.set(id, modifiedShortcutData)
            migratedAny = true
          } catch {
            /* ignore per-entry migration errors */
          }
          hasChanged = true
        } else if (value && typeof value === 'object') {
          // Handle grouped object values like { "toggleSidebar": { newShortcut: "Ctrl+S" } }
          const parsed = ModifiedShortcutData.safeParse(value)
          if (parsed.success) {
            const id = `${key}.${subKey}`
            const modifiedShortcutData = parsed.data
            modifiedShortcuts.set(id, modifiedShortcutData)
            try {
              store.set(id, modifiedShortcutData)
              migratedAny = true
            } catch {
              /* ignore per-entry migration errors */
            }
            hasChanged = true
          }
        }
      }
      // Remove legacy group key after migrating
      if (migratedAny) {
        try {
          store.delete(key)
        } catch {
          /* ignore delete errors */
        }
      } else {
        console.error(`Invalid shortcut data for ${key}: expected legacy group with string values`)
      }
      continue
    }

    // Current format validation
    const parseResult = ModifiedShortcutData.safeParse(rawModifiedShortcutData)
    if (!parseResult.success) {
      console.error(`Invalid shortcut data for ${key}:`, parseResult.error)
      continue
    }

    const modifiedShortcutData = parseResult.data
    modifiedShortcuts.set(key, modifiedShortcutData)
    hasChanged = true
  }

  if (hasChanged) {
    shortcutsEmitter.emit('shortcuts-changed')
  }
}

// Initialize on module load
loadShortcuts()

// Update Modified Shortcuts //
export async function updateModifiedShortcut(id: string, rawModifiedShortcutData: ModifiedShortcutData | unknown) {
  const parseResult = ModifiedShortcutData.safeParse(rawModifiedShortcutData)
  if (!parseResult.success) {
    return false
  }

  const modifiedShortcutData = parseResult.data

  try {
    const store = await initStore()
    store.set(id, modifiedShortcutData)

    modifiedShortcuts.set(id, modifiedShortcutData)
    shortcutsEmitter.emit('shortcuts-changed')
    return true
  } catch (error) {
    console.error('Failed to save shortcut:', error)
    return false
  }
}

// Reset Modified Shortcut //
export async function resetModifiedShortcut(id: string) {
  if (!modifiedShortcuts.has(id)) {
    return false
  }

  try {
    const store = await initStore()
    store.delete(id)

    modifiedShortcuts.delete(id)
    shortcutsEmitter.emit('shortcuts-changed')
    return true
  } catch (error) {
    console.error('Failed to reset shortcut:', error)
    return false
  }
}

// Reset All Modified Shortcuts //
export async function resetAllModifiedShortcuts() {
  try {
    const store = await initStore()
    store.clear()

    modifiedShortcuts.clear()
    shortcutsEmitter.emit('shortcuts-changed')
    return true
  } catch (error) {
    console.error('Failed to reset all shortcuts:', error)
    return false
  }
}

// Get Modified Shortcut //
export function getModifiedShortcut(id: string) {
  return modifiedShortcuts.get(id)
}

// Get All Modified Shortcuts //
export function getAllModifiedShortcuts() {
  return Array.from(modifiedShortcuts.entries()).map(([id, modifiedShortcutData]) => ({
    id,
    ...modifiedShortcutData,
  }))
}
