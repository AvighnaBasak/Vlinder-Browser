import { handle } from '@/lib/main/shared'
import { getShortcuts } from './shortcuts'
import { resetModifiedShortcut, shortcutsEmitter, updateModifiedShortcut } from './shortcuts-storage'

export const registerShortcutsHandlers = () => {
  handle('shortcuts:get-all', async () => {
    const shortcuts = getShortcuts()
    return shortcuts
  })

  handle('shortcuts:set', async (actionId: string, shortcut: string) => {
    const success = await updateModifiedShortcut(actionId, {
      newShortcut: shortcut,
    })
    return success
  })

  handle('shortcuts:reset', async (actionId: string) => {
    const success = await resetModifiedShortcut(actionId)
    return success
  })

  // Send shortcuts updates to renderer
  shortcutsEmitter.on('shortcuts-changed', () => {
    const shortcuts = getShortcuts()
    // Send to all renderer processes
    const { BrowserWindow } = require('electron')
    BrowserWindow.getAllWindows().forEach((window: any) => {
      window.webContents.send('shortcuts:on-changed', shortcuts)
    })
  })
}
