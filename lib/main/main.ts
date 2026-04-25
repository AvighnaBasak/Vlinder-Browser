import { app, BrowserWindow, ipcMain, dialog, net } from 'electron'
import { autoUpdater } from 'electron-updater'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createAppWindow, createIncognitoWindow } from './app'
import { registerShortcutsHandlers } from '@/lib/main/modules/shortcuts-handler'
import { registerPasswordsHandlers } from '@/lib/main/modules/passwords'
import { downloadManager } from '@/lib/main/modules/download-manager'

// Global reference to main window for protocol handling
let mainWindow: BrowserWindow | null = null
let shouldQuit = false

// Function to check if URL is valid for opening
function isValidOpenerUrl(url: string): boolean {
  try {
    const urlObject = new URL(url)
    const VALID_PROTOCOLS = ['http:', 'https:']
    return VALID_PROTOCOLS.includes(urlObject.protocol)
  } catch {
    return false
  }
}

// Handle opening URLs from command line or protocol
const handleOpenUrl = async (url: string) => {
  if (!mainWindow) {
    // If no window exists, create one
    mainWindow = await createAppWindow()
  }

  // Focus the window
  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }
  mainWindow.focus()

  // Send URL to renderer to create temporary tab
  mainWindow.webContents.send('external-link-navigation', {
    url: url,
    currentUrl: '',
    title: '',
  })
}

// Initialize app with single instance lock
function initializeApp() {
  const gotTheLock = app.requestSingleInstanceLock()

  if (!gotTheLock) {
    app.quit()
    return false
  }

  // Handle second instance (when another instance tries to launch)
  app.on('second-instance', (event, commandLine) => {
    // Focus existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
    }

    // Check for URL in command line arguments
    const url = commandLine.find((arg) => isValidOpenerUrl(arg))
    if (url) {
      handleOpenUrl(url)
    }
  })

  // Handle protocol URLs (macOS)
  app.on('open-url', async (event, url) => {
    event.preventDefault()
    if (isValidOpenerUrl(url)) {
      await handleOpenUrl(url)
    }
  })

  return true
}

// Initialize the app
if (!initializeApp()) {
  process.exit(0)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app name and user model id for windows
  app.setName('Vlinder')
  // Align AppUserModelID with electron-builder appId to ensure correct name/icon and associations on Windows
  electronApp.setAppUserModelId('com.avighnabasak.vlinder')

  // Register shortcuts handlers
  registerShortcutsHandlers()
  // Register passwords handlers
  registerPasswordsHandlers()

  // Create app window and store reference
  mainWindow = await createAppWindow()

  // IPC handler: open a new window (Ctrl+N or "Open in New Window")
  ipcMain.on('new-window', (_event, url?: string) => {
    createAppWindow(url || undefined)
  })

  // IPC handler: open incognito window (Ctrl+Shift+N)
  ipcMain.on('new-incognito-window', () => {
    createIncognitoWindow()
  })

  // Handle startup URL if app was launched with a URL
  const startupUrl = process.argv.slice(1).find((arg) => isValidOpenerUrl(arg))
  if (startupUrl) {
    // Wait for window to be ready before sending URL
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => handleOpenUrl(startupUrl), 500)
    })
  }

  // ================= Auto Updater Setup =================
  try {
    autoUpdater.logger = console as any
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    // Feed provider is configured via electron-builder (github)

    autoUpdater.on('checking-for-update', () => {
      mainWindow?.webContents.send('updater:checking')
    })

    autoUpdater.on('update-available', (info) => {
      mainWindow?.webContents.send('updater:available', info)
    })

    autoUpdater.on('update-not-available', (info) => {
      mainWindow?.webContents.send('updater:not-available', info)
    })

    autoUpdater.on('error', (err) => {
      console.error('[UPDATER] Error:', err)
      mainWindow?.webContents.send('updater:error', String(err))
    })

    autoUpdater.on('download-progress', (progress) => {
      mainWindow?.webContents.send('updater:download-progress', progress)
    })

    autoUpdater.on('update-downloaded', (info) => {
      mainWindow?.webContents.send('updater:downloaded', info)
    })

    // IPC handlers
    ipcMain.handle('updater:getVersion', () => app.getVersion())
    ipcMain.handle('updater:check', async () => {
      const res = await autoUpdater.checkForUpdates()
      return res?.updateInfo ?? null
    })

    // Search suggestions handler (bypasses CORS in main process)
    ipcMain.handle('search:getSuggestions', async (_event, query: string) => {
      try {
        const url = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`
        const response = await net.fetch(url)
        if (!response.ok) return []
        const data = await response.json()
        // Google returns [query, [suggestions...], ...]
        if (Array.isArray(data) && data[1] && Array.isArray(data[1])) {
          return data[1]
        }
        return []
      } catch (error) {
        console.error('Failed to fetch search suggestions:', error)
        return []
      }
    })
    ipcMain.handle('updater:quitAndInstall', () => {
      autoUpdater.quitAndInstall()
    })

    // Optionally perform a silent check on startup
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((e) => console.error('[UPDATER] Startup check failed:', e))
    }, 3000)
  } catch (e) {
    console.error('[UPDATER] Setup failed:', e)
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createAppWindow()
    }
  })

  // Handle app quit with active downloads check
  app.on('before-quit', (event) => {
    if (shouldQuit) {
      return // Allow quit
    }

    if (downloadManager.hasActiveDownloads()) {
      event.preventDefault()
      const activeCount = downloadManager.getActiveDownloadCount()
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
        try {
          mainWindow.webContents.send('download-warning-show', activeCount)
        } catch {
          // Window might be destroyed, ignore
        }
      }
    }
  })

  // IPC handlers for download warning dialog
  ipcMain.on('open-downloads-page', () => {
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
      try {
        mainWindow.webContents.send('navigate-to-downloads')
        mainWindow.webContents.send('download-warning-hide')
      } catch {
        // Window might be destroyed, ignore
      }
    }
  })

  ipcMain.on('confirm-quit-with-downloads', () => {
    shouldQuit = true
    ;(global as any).__shouldQuitWithDownloads = true
    if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
      try {
        mainWindow.webContents.send('download-warning-hide')
        // Close the window after a brief delay to ensure dialog is hidden
        setTimeout(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.close()
          }
        }, 100)
      } catch {
        // Window might be destroyed, try to quit anyway
        app.quit()
      }
    } else {
      app.quit()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file, you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
