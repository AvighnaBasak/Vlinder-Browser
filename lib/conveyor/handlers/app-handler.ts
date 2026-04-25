import { type App, BrowserWindow } from 'electron'
import { handle } from '@/lib/main/shared'
import { isDefaultBrowser, setDefaultBrowser } from '@/lib/main/modules/default-browser'

export const registerAppHandlers = (app: App, _mainWindow?: BrowserWindow) => {
  // App operations
  handle('version', () => app.getVersion())

  // External link handling
  handle('open-external-link', async (url: string) => {
    return { success: true, url }
  })

  // Webview title updates — broadcast to all windows so each renderer can update its own state
  handle('webview-title-updated', async (platformId: string, title: string) => {
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
        win.webContents.send('webview-title-updated', { platformId, title })
      }
    }
  })

  // Default browser functionality
  handle('is-default-browser', async () => {
    return isDefaultBrowser()
  })

  handle('set-default-browser', async () => {
    try {
      const success = await setDefaultBrowser()
      return { success, error: null }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Track background URLs (must be accessible from web-contents-created handler)
  // We'll store this in a module-level variable
  if (!(global as any).__backgroundUrls) {
    ;(global as any).__backgroundUrls = new Set<string>()
  }

  handle('mark-background-url', (url: string) => {
    ;(global as any).__backgroundUrls.add(url)
    // Clean up after 5 seconds
    setTimeout(() => {
      ;(global as any).__backgroundUrls.delete(url)
    }, 5000)
    return
  })
}
