export interface ShortcutAction {
  id: string // e.g., "navigation.goBack", "platform.reload"
  name: string // e.g., "Go Back", "Reload Platform"
  shortcut: string // e.g., "CommandOrControl+Left", "CommandOrControl+R"
  category: string // e.g., "Navigation", "Platform"
  originalShortcut?: string // To store the initial default shortcut
}

export const SHORTCUT_CATEGORIES = {
  NAVIGATION: 'Navigation',
  PLATFORM: 'Platform',
  BROWSER: 'Browser',
} as const

export type ShortcutCategory = (typeof SHORTCUT_CATEGORIES)[keyof typeof SHORTCUT_CATEGORIES]
