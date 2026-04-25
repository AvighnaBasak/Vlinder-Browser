import { BrowserWindow, ipcMain } from 'electron'
import { shell } from 'electron'
import { handle } from '@/lib/main/shared'

function getCallerWindow(event?: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  if (event) {
    return BrowserWindow.fromWebContents(event.sender)
  }
  return BrowserWindow.getFocusedWindow()
}

export const registerWindowHandlers = (_fallbackWindow?: BrowserWindow) => {
  function getFocused(): BrowserWindow | null {
    return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows().find(w => !w.isDestroyed()) || null
  }

  handle('window-init', () => {
    const win = getFocused()
    if (!win) return { width: 1200, height: 700, minimizable: true, maximizable: true, platform: process.platform }
    const { width, height } = win.getBounds()
    return { width, height, minimizable: win.isMinimizable(), maximizable: win.isMaximizable(), platform: process.platform }
  })

  handle('window-is-minimizable', () => getFocused()?.isMinimizable() ?? true)
  handle('window-is-maximizable', () => getFocused()?.isMaximizable() ?? true)

  // For window operations, find the window that sent the message
  ipcMain.removeHandler('window-minimize')
  ipcMain.handle('window-minimize', (event) => {
    getCallerWindow(event)?.minimize()
  })
  ipcMain.removeHandler('window-maximize')
  ipcMain.handle('window-maximize', (event) => {
    getCallerWindow(event)?.maximize()
  })
  ipcMain.removeHandler('window-close')
  ipcMain.handle('window-close', (event) => {
    getCallerWindow(event)?.close()
  })
  ipcMain.removeHandler('window-maximize-toggle')
  ipcMain.handle('window-maximize-toggle', (event) => {
    const win = getCallerWindow(event)
    if (win) {
      win.isMaximized() ? win.unmaximize() : win.maximize()
    }
  })

  // Web content operations - operate on the focused window's webContents
  handle('web-undo', () => { getFocused()?.webContents?.undo() })
  handle('web-redo', () => { getFocused()?.webContents?.redo() })
  handle('web-cut', () => { getFocused()?.webContents?.cut() })
  handle('web-copy', () => { getFocused()?.webContents?.copy() })
  handle('web-paste', () => { getFocused()?.webContents?.paste() })
  handle('web-delete', () => { getFocused()?.webContents?.delete() })
  handle('web-select-all', () => { getFocused()?.webContents?.selectAll() })
  handle('web-reload', () => { getFocused()?.webContents?.reload() })
  handle('web-force-reload', () => { getFocused()?.webContents?.reloadIgnoringCache() })
  handle('web-toggle-devtools', () => { getFocused()?.webContents?.toggleDevTools() })
  handle('web-actual-size', () => { getFocused()?.webContents?.setZoomLevel(0) })
  handle('web-zoom-in', () => {
    const wc = getFocused()?.webContents
    if (wc) wc.setZoomLevel(wc.zoomLevel + 0.5)
  })
  handle('web-zoom-out', () => {
    const wc = getFocused()?.webContents
    if (wc) wc.setZoomLevel(wc.zoomLevel - 0.5)
  })

  ipcMain.removeHandler('web-toggle-fullscreen')
  ipcMain.handle('web-toggle-fullscreen', (event) => {
    const win = getCallerWindow(event)
    if (win) win.setFullScreen(!win.fullScreen)
  })

  handle('web-open-url', (url: string) => shell.openExternal(url))
}
