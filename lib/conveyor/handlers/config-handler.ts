import { handle } from '@/lib/main/shared'
import { app, session, dialog } from 'electron'
import { downloadManager } from '@/lib/main/modules/download-manager'

let Store: any = null
let store: any = null

// Initialize electron-store using dynamic import (ESM module)
async function initStore() {
  if (!Store) {
    const ElectronStore = await import('electron-store')
    Store = ElectronStore.default
    store = new Store({
      name: 'vlinder-config',
    })
  }
  return store
}

export const registerConfigHandlers = () => {
  handle('config-get-last-app', async () => {
    const s = await initStore()
    return s.get('lastApp', null) as string | null
  })

  handle('config-set-last-app', async (name: string) => {
    const s = await initStore()
    s.set('lastApp', name)
  })

  handle('config-is-enabled', async (name: string) => {
    const s = await initStore()
    return s.get(`app.${name}.enabled`, false) as boolean
  })

  handle('config-set-enabled', async (name: string, enabled: boolean) => {
    const s = await initStore()
    s.set(`app.${name}.enabled`, enabled)
  })

  handle('config-has-setup', async () => {
    const s = await initStore()
    return s.get('hasSetup', false) as boolean
  })

  handle('config-complete-setup', async (platforms: Array<{ name: string; enabled: boolean }>) => {
    const s = await initStore()
    platforms.forEach((platform, index) => {
      s.set(`app.${platform.name}.enabled`, platform.enabled)
      s.set(`app.${platform.name}.position`, index + 1)
    })
    s.set('lastApp', 'first-time')
    s.set('hasSetup', true)

    // Relaunch the app to show the main interface
    app.relaunch()
    app.exit(0)
  })

  handle('config-clear-data', async () => {
    // Clear webview session data (cache, cookies, auth) but preserve app settings
    const ses = session.fromPartition('persist:unified-session')
    await ses.clearStorageData({
      storages: [
        'appcache',
        'cookies',
        'filesystem',
        'indexdb',
        'localstorage',
        'shadercache',
        'websql',
        'serviceworkers',
        'cachestorage',
      ],
    })
  })

  handle('config-reset-app', async () => {
    const s = await initStore()
    s.clear()
    // Relaunch the app to reset to setup screen
    app.relaunch()
    app.exit(0)
  })

  handle('config-get-all-enabled', async () => {
    const s = await initStore()
    const appData = s.get('app', {}) as Record<string, { enabled?: boolean }>
    const result: Record<string, boolean> = {}

    Object.keys(appData).forEach((key) => {
      result[key] = appData[key]?.enabled ?? false
    })

    return result
  })

  handle('config-is-pinned', async (name: string) => {
    const s = await initStore()
    return s.get(`app.${name}.pinned`, false) as boolean
  })

  handle('config-set-pinned', async (name: string, pinned: boolean) => {
    const s = await initStore()
    s.set(`app.${name}.pinned`, pinned)
  })

  handle('config-is-muted', async (name: string) => {
    const s = await initStore()
    return s.get(`app.${name}.muted`, false) as boolean
  })

  handle('config-set-muted', async (name: string, muted: boolean) => {
    const s = await initStore()
    s.set(`app.${name}.muted`, muted)
  })

  handle('config-get-all-pinned', async () => {
    const s = await initStore()
    const appData = s.get('app', {}) as Record<string, { pinned?: boolean }>
    const result: Record<string, boolean> = {}

    Object.keys(appData).forEach((key) => {
      result[key] = appData[key]?.pinned ?? false
    })

    return result
  })

  handle('config-get-all-muted', async () => {
    const s = await initStore()
    const appData = s.get('app', {}) as Record<string, { muted?: boolean }>
    const result: Record<string, boolean> = {}

    Object.keys(appData).forEach((key) => {
      result[key] = appData[key]?.muted ?? false
    })

    return result
  })

  handle('config-is-notifications-enabled', async (name: string) => {
    const s = await initStore()
    return s.get(`app.${name}.notificationsEnabled`, true) as boolean
  })

  handle('config-set-notifications-enabled', async (name: string, enabled: boolean) => {
    const s = await initStore()
    s.set(`app.${name}.notificationsEnabled`, enabled)
  })

  handle('config-get-all-notifications-enabled', async () => {
    const s = await initStore()
    const appData = s.get('app', {}) as Record<string, { notificationsEnabled?: boolean }>
    const result: Record<string, boolean> = {}

    Object.keys(appData).forEach((key) => {
      result[key] = appData[key]?.notificationsEnabled ?? true
    })

    return result
  })

  handle('config-get-notification-count', async (name: string) => {
    const s = await initStore()
    return s.get(`app.${name}.notificationCount`, 0) as number
  })

  handle('config-set-notification-count', async (name: string, count: number) => {
    const s = await initStore()
    s.set(`app.${name}.notificationCount`, Math.max(0, count))
  })

  handle('config-get-all-notification-counts', async () => {
    const s = await initStore()
    const appData = s.get('app', {}) as Record<string, { notificationCount?: number }>
    const result: Record<string, number> = {}

    Object.keys(appData).forEach((key) => {
      result[key] = appData[key]?.notificationCount ?? 0
    })

    return result
  })

  handle('config-increment-notification-count', async (name: string) => {
    const s = await initStore()
    const current = s.get(`app.${name}.notificationCount`, 0) as number
    const newCount = current + 1
    s.set(`app.${name}.notificationCount`, newCount)
    return newCount
  })

  handle('config-clear-notification-count', async (name: string) => {
    const s = await initStore()
    s.set(`app.${name}.notificationCount`, 0)
  })

  handle('config-get-global-notifications-enabled', async () => {
    const s = await initStore()
    return s.get('globalNotificationsEnabled', true) as boolean
  })

  handle('config-set-global-notifications-enabled', async (enabled: boolean) => {
    const s = await initStore()
    s.set('globalNotificationsEnabled', enabled)
  })

  // Custom platforms handlers
  handle('config-get-custom-platforms', async () => {
    const s = await initStore()
    return s.get('customPlatforms', []) as Array<{
      id: string
      name: string
      url: string
      logoUrl: string
      faviconUrl?: string
      category: string
      description: string
      rating: number
      downloads: string
      gradient: string
      features: string[]
    }>
  })

  handle(
    'config-set-custom-platforms',
    async (
      platforms: Array<{
        id: string
        name: string
        url: string
        logoUrl: string
        faviconUrl?: string
        category: string
        description: string
        rating: number
        downloads: string
        gradient: string
        features: string[]
      }>
    ) => {
      const s = await initStore()
      s.set('customPlatforms', platforms)
    }
  )

  handle(
    'config-add-custom-platform',
    async (platform: {
      id: string
      name: string
      url: string
      logoUrl: string
      faviconUrl?: string
      category: string
      description: string
      rating: number
      downloads: string
      gradient: string
      features: string[]
    }) => {
      const s = await initStore()
      const existingPlatforms = s.get('customPlatforms', []) as Array<typeof platform>
      const updatedPlatforms = [...existingPlatforms, platform]
      s.set('customPlatforms', updatedPlatforms)
    }
  )

  // Platform order handlers
  handle('config-get-platform-order', async () => {
    const s = await initStore()
    return s.get('platformOrder', []) as string[]
  })

  handle('config-set-platform-order', async (order: string[]) => {
    const s = await initStore()
    s.set('platformOrder', order)
  })

  handle('config-remove-custom-platform', async (platformId: string) => {
    const s = await initStore()
    const existingPlatforms = s.get('customPlatforms', []) as Array<{
      id: string
      name: string
      url: string
      logoUrl: string
      faviconUrl?: string
      category: string
      description: string
      rating: number
      downloads: string
      gradient: string
      features: string[]
    }>
    const updatedPlatforms = existingPlatforms.filter((p) => p.id !== platformId)
    s.set('customPlatforms', updatedPlatforms)
  })

  // Ad Blocker handlers
  handle('config-get-adblocker', async () => {
    const s = await initStore()
    return s.get('adBlocker', 'disabled') as string
  })

  handle('config-set-adblocker', async (mode: string) => {
    const s = await initStore()
    s.set('adBlocker', mode)

    const { contentBlocker } = await import('@/lib/main/modules/content-blocker')
    const ses = session.fromPartition('persist:unified-session')
    await contentBlocker.updateConfig(ses)
  })

  // VPN / Tor handlers
  handle('vpn-get-status', async () => {
    const { torProxy } = await import('@/lib/main/modules/tor-proxy')
    return torProxy.getStatus()
  })

  handle('vpn-enable', async () => {
    const { torProxy } = await import('@/lib/main/modules/tor-proxy')
    const ses = session.fromPartition('persist:unified-session')
    return torProxy.enable(ses)
  })

  handle('vpn-disable', async () => {
    const { torProxy } = await import('@/lib/main/modules/tor-proxy')
    const ses = session.fromPartition('persist:unified-session')
    await torProxy.disable(ses)
  })

  handle('vpn-new-identity', async () => {
    const { torProxy } = await import('@/lib/main/modules/tor-proxy')
    const ses = session.fromPartition('persist:unified-session')
    return torProxy.newIdentity(ses)
  })

  // Download handlers
  handle('download-get-all', async () => {
    return downloadManager.getAllDownloads()
  })

  handle('download-get', async (downloadId: string) => {
    return downloadManager.getDownload(downloadId)
  })

  handle('download-pause', async (downloadId: string) => {
    return downloadManager.pauseDownload(downloadId)
  })

  handle('download-resume', async (downloadId: string) => {
    return downloadManager.resumeDownload(downloadId)
  })

  handle('download-cancel', async (downloadId: string) => {
    return downloadManager.cancelDownload(downloadId)
  })

  handle('download-remove', async (downloadId: string) => {
    return downloadManager.removeDownload(downloadId)
  })

  handle('download-open', async (downloadId: string) => {
    return downloadManager.openDownload(downloadId)
  })

  handle('download-show-in-folder', async (downloadId: string) => {
    return downloadManager.showInFolder(downloadId)
  })

  handle('download-clear-completed', async () => {
    return downloadManager.clearCompleted()
  })

  handle('download-get-path', async () => {
    return downloadManager.getDownloadPath()
  })

  handle('download-set-path', async (path: string) => {
    downloadManager.setDownloadPath(path)
    const s = await initStore()
    s.set('downloadPath', path)
    return true
  })

  handle('download-select-path', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Download Location',
    })
    if (!result.canceled && result.filePaths.length > 0) {
      const path = result.filePaths[0]
      downloadManager.setDownloadPath(path)
      const s = await initStore()
      s.set('downloadPath', path)
      return path
    }
    return null
  })

  // Load download path on initialization
  handle('download-init-path', async () => {
    const s = await initStore()
    const savedPath = s.get('downloadPath', null) as string | null
    if (savedPath) {
      downloadManager.setDownloadPath(savedPath)
      return savedPath
    }
    const defaultPath = app.getPath('downloads')
    downloadManager.setDownloadPath(defaultPath)
    return defaultPath
  })

  handle('download-get-state', async () => {
    return downloadManager.getDownloadState()
  })

  handle('download-get-active-count', async () => {
    return downloadManager.getActiveDownloadCount()
  })

  handle('download-is-in-progress', async (downloadId: string) => {
    return downloadManager.isDownloadInProgress(downloadId)
  })

  handle('download-is-paused', async (downloadId: string) => {
    return downloadManager.isDownloadPaused(downloadId)
  })

  handle('download-is-resumable', async (downloadId: string) => {
    return downloadManager.isDownloadResumable(downloadId)
  })

  handle('download-is-cancelled', async (downloadId: string) => {
    return downloadManager.isDownloadCancelled(downloadId)
  })

  handle('download-is-interrupted', async (downloadId: string) => {
    return downloadManager.isDownloadInterrupted(downloadId)
  })

  handle('download-is-completed', async (downloadId: string) => {
    return downloadManager.isDownloadCompleted(downloadId)
  })
}
