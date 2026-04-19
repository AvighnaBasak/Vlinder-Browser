import { type App, type BrowserWindow } from 'electron'
import { handle } from '@/lib/main/shared'
import { isDefaultBrowser, setDefaultBrowser } from '@/lib/main/modules/default-browser'

export const registerAppHandlers = (app: App, mainWindow: BrowserWindow) => {
  // App operations
  handle('version', () => app.getVersion())

  // External link handling
  handle('open-external-link', async (url: string) => {
    // This handler is called from the renderer when an external link should be opened
    // The actual navigation interception happens in app.ts via will-navigate event
    return { success: true, url }
  })

  // Webview title updates
  handle('webview-title-updated', async (platformId: string, title: string) => {
    // Send title update to renderer process
    mainWindow.webContents.send('webview-title-updated', { platformId, title })
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
