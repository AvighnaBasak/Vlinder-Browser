import { getAllModifiedShortcuts } from './shortcuts-storage'
import { ShortcutAction } from '@/app/types/shortcuts'

const typedShortcuts = [
  // Navigation
  {
    id: 'navigation.goBack',
    name: 'Go Back',
    shortcut: 'CommandOrControl+Left',
    category: 'Navigation',
  },
  {
    id: 'navigation.goForward',
    name: 'Go Forward',
    shortcut: 'CommandOrControl+Right',
    category: 'Navigation',
  },

  // Platform/Tab
  {
    id: 'platform.reload',
    name: 'Reload Platform',
    shortcut: 'CommandOrControl+R',
    category: 'Platform',
  },
  {
    id: 'platform.forceReload',
    name: 'Force Reload Platform',
    shortcut: 'Shift+CommandOrControl+R',
    category: 'Platform',
  },
  {
    id: 'platform.close',
    name: 'Close Platform',
    shortcut: 'CommandOrControl+W',
    category: 'Platform',
  },
  {
    id: 'platform.toggleDevTools',
    name: 'Toggle DevTools',
    shortcut: 'F12',
    category: 'Platform',
  },

  // Browser
  {
    id: 'browser.openSettings',
    name: 'Open Settings',
    shortcut: 'CommandOrControl+,',
    category: 'Browser',
  },
  {
    id: 'browser.openDownloads',
    name: 'Open Downloads',
    shortcut: 'CommandOrControl+J',
    category: 'Browser',
  },
  {
    id: 'browser.toggleSidebar',
    name: 'Toggle Sidebar',
    shortcut: 'CommandOrControl+S',
    category: 'Browser',
  },
  {
    id: 'browser.toggleCommandPalette',
    name: 'Toggle Command Palette',
    shortcut: 'CommandOrControl+T',
    category: 'Browser',
  },
  {
    id: 'browser.nextTab',
    name: 'Next Tab',
    shortcut: 'CommandOrControl+Tab',
    category: 'Browser',
  },
  {
    id: 'browser.reopenClosedTab',
    name: 'Reopen Closed Tab',
    shortcut: 'Shift+CommandOrControl+T',
    category: 'Browser',
  },
] as const satisfies ShortcutAction[]

type ShortcutId = (typeof typedShortcuts)[number]['id']

const shortcuts: ShortcutAction[] = typedShortcuts

export function getShortcuts() {
  const modifiedShortcutsData = getAllModifiedShortcuts()

  const updatedShortcuts = shortcuts.map((shortcut) => {
    const modifiedShortcutData = modifiedShortcutsData.find(({ id }) => id === shortcut.id)
    return {
      ...shortcut,
      originalShortcut: shortcut.shortcut,
      shortcut: modifiedShortcutData?.newShortcut || shortcut.shortcut,
    }
  })

  return updatedShortcuts
}

export function getShortcut(id: string) {
  return getShortcuts().find((shortcut) => shortcut.id === id)
}

export function getShortcutByTypedId(id: ShortcutId) {
  return getShortcut(id)
}

export function getCurrentShortcut(id: ShortcutId) {
  const shortcut = getShortcutByTypedId(id)
  if (!shortcut) return undefined
  return shortcut.shortcut
}
