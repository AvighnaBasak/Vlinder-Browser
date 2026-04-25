import { contextBridge, ipcRenderer } from 'electron'
import { conveyor } from '@/lib/conveyor/api'

// Use `contextBridge` APIs to expose APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('conveyor', conveyor)

    // Expose context menu event listener
    contextBridge.exposeInMainWorld('electronAPI', {
      onWebviewContextMenu: (callback: (data: any) => void) => {
        ipcRenderer.on('webview-context-menu', (_, data) => callback(data))
      },
      removeWebviewContextMenuListener: () => {
        ipcRenderer.removeAllListeners('webview-context-menu')
      },
      onWebviewTitleUpdated: (callback: (data: any) => void) => {
        ipcRenderer.on('webview-title-updated', (_, data) => callback(data))
      },
      removeWebviewTitleUpdatedListener: () => {
        ipcRenderer.removeAllListeners('webview-title-updated')
      },
      // Menu action listeners
      onNavigateToSettings: (callback: () => void) => {
        ipcRenderer.on('navigate-to-settings', callback)
      },
      onNavigateToDownloads: (callback: () => void) => {
        ipcRenderer.on('navigate-to-downloads', callback)
      },
      onNavigateToHistory: (callback: () => void) => {
        ipcRenderer.on('navigate-to-history', callback)
      },
      onToggleSidebar: (callback: () => void) => {
        ipcRenderer.on('toggle-sidebar', callback)
      },
      onReloadPlatform: (callback: () => void) => {
        ipcRenderer.on('reload-platform', callback)
      },
      onForceReloadPlatform: (callback: () => void) => {
        ipcRenderer.on('force-reload-platform', callback)
      },
      onGoBack: (callback: () => void) => {
        ipcRenderer.on('go-back', callback)
      },
      onGoForward: (callback: () => void) => {
        ipcRenderer.on('go-forward', callback)
      },
      onClosePlatform: (callback: () => void) => {
        ipcRenderer.on('close-platform', callback)
      },
      onToggleCommandPalette: (callback: () => void) => {
        ipcRenderer.on('toggle-command-palette', callback)
      },
      onNextTab: (callback: () => void) => {
        ipcRenderer.on('next-tab', callback)
      },
      onReopenClosedTab: (callback: () => void) => {
        ipcRenderer.on('reopen-closed-tab', callback)
      },
      removeMenuActionListeners: () => {
        ipcRenderer.removeAllListeners('navigate-to-settings')
        ipcRenderer.removeAllListeners('navigate-to-downloads')
        ipcRenderer.removeAllListeners('navigate-to-history')
        ipcRenderer.removeAllListeners('toggle-sidebar')
        ipcRenderer.removeAllListeners('toggle-command-palette')
        ipcRenderer.removeAllListeners('next-tab')
        ipcRenderer.removeAllListeners('reopen-closed-tab')
        ipcRenderer.removeAllListeners('reload-platform')
        ipcRenderer.removeAllListeners('force-reload-platform')
        ipcRenderer.removeAllListeners('go-back')
        ipcRenderer.removeAllListeners('go-forward')
        ipcRenderer.removeAllListeners('close-platform')
      },
      // Updater API
      getVersion: async () => ipcRenderer.invoke('updater:getVersion'),
      checkForUpdates: async () => ipcRenderer.invoke('updater:check'),
      quitAndInstall: async () => ipcRenderer.invoke('updater:quitAndInstall'),
      onUpdaterChecking: (cb: () => void) => ipcRenderer.on('updater:checking', cb),
      onUpdaterAvailable: (cb: (e: any, info: any) => void) => ipcRenderer.on('updater:available', cb),
      onUpdaterNotAvailable: (cb: (e: any, info: any) => void) => ipcRenderer.on('updater:not-available', cb),
      onUpdaterError: (cb: (e: any, err: string) => void) => ipcRenderer.on('updater:error', cb),
      onUpdaterProgress: (cb: (e: any, progress: any) => void) => ipcRenderer.on('updater:download-progress', cb),
      onUpdaterDownloaded: (cb: (e: any, info: any) => void) => ipcRenderer.on('updater:downloaded', cb),
      // Search suggestions
      getSearchSuggestions: async (query: string) => ipcRenderer.invoke('search:getSuggestions', query),
      // Fast one-way send for marking background URLs (bypasses validation for speed)
      markBackgroundUrl: (url: string) => ipcRenderer.send('mark-background-url-fast', url),
      // Open a new browser window (optionally with a URL)
      openNewWindow: (url?: string) => ipcRenderer.send('new-window', url),
      // Open an incognito window
      openIncognitoWindow: () => ipcRenderer.send('new-incognito-window'),
      // Listen for incognito mode signal
      onSetIncognito: (cb: (isIncognito: boolean, partition: string) => void) => {
        ipcRenderer.on('set-incognito', (_, isIncognito, partition) => cb(isIncognito, partition))
      },
      // Download event listeners
      onDownloadStarted: (callback: (data: any) => void) => {
        ipcRenderer.on('download-started', (_, data) => callback(data))
      },
      onDownloadUpdated: (callback: (data: any) => void) => {
        ipcRenderer.on('download-updated', (_, data) => callback(data))
      },
      onDownloadCompleted: (callback: (data: any) => void) => {
        ipcRenderer.on('download-completed', (_, data) => callback(data))
      },
      removeDownloadListeners: () => {
        ipcRenderer.removeAllListeners('download-started')
        ipcRenderer.removeAllListeners('download-updated')
        ipcRenderer.removeAllListeners('download-completed')
      },
      // Download completion notification
      onDownloadCompletedNotification: (callback: (data: any) => void) => {
        ipcRenderer.on('download-completed-notification', (_, data) => callback(data))
      },
      // Download warning dialog
      onDownloadWarningShow: (callback: (count: number) => void) => {
        ipcRenderer.on('download-warning-show', (_, count) => callback(count))
      },
      onDownloadWarningHide: (callback: () => void) => {
        ipcRenderer.on('download-warning-hide', callback)
      },
      openDownloadsPage: () => ipcRenderer.send('open-downloads-page'),
      confirmQuitWithDownloads: () => ipcRenderer.send('confirm-quit-with-downloads'),
      // Password save prompt
      onPasswordSavePrompt: (callback: (data: any) => void) => {
        ipcRenderer.on('password-save-prompt', (_, data) => callback(data))
      },
      removePasswordSavePromptListener: () => {
        ipcRenderer.removeAllListeners('password-save-prompt')
      },
    })
  } catch (error) {
    console.error(error)
  }
} else {
  window.conveyor = conveyor
  window.electronAPI = {
    onWebviewContextMenu: (callback: (data: any) => void) => {
      ipcRenderer.on('webview-context-menu', (_, data) => callback(data))
    },
    removeWebviewContextMenuListener: () => {
      ipcRenderer.removeAllListeners('webview-context-menu')
    },
    onWebviewTitleUpdated: (callback: (data: any) => void) => {
      ipcRenderer.on('webview-title-updated', (_, data) => callback(data))
    },
    removeWebviewTitleUpdatedListener: () => {
      ipcRenderer.removeAllListeners('webview-title-updated')
    },
    // Menu action listeners
    onNavigateToSettings: (callback: () => void) => {
      ipcRenderer.on('navigate-to-settings', callback)
    },
    onNavigateToDownloads: (callback: () => void) => {
      ipcRenderer.on('navigate-to-downloads', callback)
    },
    onNavigateToHistory: (callback: () => void) => {
      ipcRenderer.on('navigate-to-history', callback)
    },
    onToggleSidebar: (callback: () => void) => {
      ipcRenderer.on('toggle-sidebar', callback)
    },
    onReloadPlatform: (callback: () => void) => {
      ipcRenderer.on('reload-platform', callback)
    },
    onForceReloadPlatform: (callback: () => void) => {
      ipcRenderer.on('force-reload-platform', callback)
    },
    onGoBack: (callback: () => void) => {
      ipcRenderer.on('go-back', callback)
    },
    onGoForward: (callback: () => void) => {
      ipcRenderer.on('go-forward', callback)
    },
    onClosePlatform: (callback: () => void) => {
      ipcRenderer.on('close-platform', callback)
    },
    onToggleCommandPalette: (callback: () => void) => {
      ipcRenderer.on('toggle-command-palette', callback)
    },
    onNextTab: (callback: () => void) => {
      ipcRenderer.on('next-tab', callback)
    },
    onReopenClosedTab: (callback: () => void) => {
      ipcRenderer.on('reopen-closed-tab', callback)
    },
    removeMenuActionListeners: () => {
      ipcRenderer.removeAllListeners('navigate-to-settings')
      ipcRenderer.removeAllListeners('navigate-to-downloads')
      ipcRenderer.removeAllListeners('toggle-sidebar')
      ipcRenderer.removeAllListeners('toggle-command-palette')
      ipcRenderer.removeAllListeners('next-tab')
      ipcRenderer.removeAllListeners('reopen-closed-tab')
      ipcRenderer.removeAllListeners('reload-platform')
      ipcRenderer.removeAllListeners('force-reload-platform')
      ipcRenderer.removeAllListeners('go-back')
      ipcRenderer.removeAllListeners('go-forward')
      ipcRenderer.removeAllListeners('close-platform')
    },
    // Updater API
    getVersion: async () => ipcRenderer.invoke('updater:getVersion'),
    checkForUpdates: async () => ipcRenderer.invoke('updater:check'),
    quitAndInstall: async () => ipcRenderer.invoke('updater:quitAndInstall'),
    onUpdaterChecking: (cb: () => void) => ipcRenderer.on('updater:checking', cb),
    onUpdaterAvailable: (cb: (e: any, info: any) => void) => ipcRenderer.on('updater:available', cb),
    onUpdaterNotAvailable: (cb: (e: any, info: any) => void) => ipcRenderer.on('updater:not-available', cb),
    onUpdaterError: (cb: (e: any, err: string) => void) => ipcRenderer.on('updater:error', cb),
    onUpdaterProgress: (cb: (e: any, progress: any) => void) => ipcRenderer.on('updater:download-progress', cb),
    onUpdaterDownloaded: (cb: (e: any, info: any) => void) => ipcRenderer.on('updater:downloaded', cb),
    // Search suggestions
    getSearchSuggestions: async (query: string) => ipcRenderer.invoke('search:getSuggestions', query),
    // Fast one-way send for marking background URLs (bypasses validation for speed)
    markBackgroundUrl: (url: string) => ipcRenderer.send('mark-background-url-fast', url),
    // Open a new browser window (optionally with a URL)
    openNewWindow: (url?: string) => ipcRenderer.send('new-window', url),
    // Open an incognito window
    openIncognitoWindow: () => ipcRenderer.send('new-incognito-window'),
    // Listen for incognito mode signal
    onSetIncognito: (cb: (isIncognito: boolean, partition: string) => void) => {
      ipcRenderer.on('set-incognito', (_, isIncognito, partition) => cb(isIncognito, partition))
    },
    // Download event listeners
    onDownloadStarted: (callback: (data: any) => void) => {
      ipcRenderer.on('download-started', (_, data) => callback(data))
    },
    onDownloadUpdated: (callback: (data: any) => void) => {
      ipcRenderer.on('download-updated', (_, data) => callback(data))
    },
    onDownloadCompleted: (callback: (data: any) => void) => {
      ipcRenderer.on('download-completed', (_, data) => callback(data))
    },
    removeDownloadListeners: () => {
      ipcRenderer.removeAllListeners('download-started')
      ipcRenderer.removeAllListeners('download-updated')
      ipcRenderer.removeAllListeners('download-completed')
    },
    // Download completion notification
    onDownloadCompletedNotification: (callback: (data: any) => void) => {
      ipcRenderer.on('download-completed-notification', (_, data) => callback(data))
    },
    // Download warning dialog
    onDownloadWarningShow: (callback: (count: number) => void) => {
      ipcRenderer.on('download-warning-show', (_, count) => callback(count))
    },
    onDownloadWarningHide: (callback: () => void) => {
      ipcRenderer.on('download-warning-hide', callback)
    },
    openDownloadsPage: () => ipcRenderer.send('open-downloads-page'),
    confirmQuitWithDownloads: () => ipcRenderer.send('confirm-quit-with-downloads'),
    // Password save prompt
    onPasswordSavePrompt: (callback: (data: any) => void) => {
      ipcRenderer.on('password-save-prompt', (_, data) => callback(data))
    },
    removePasswordSavePromptListener: () => {
      ipcRenderer.removeAllListeners('password-save-prompt')
    },
  }
}
