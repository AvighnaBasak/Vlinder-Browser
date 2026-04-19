import { BrowserWindow, WebContents, app, shell } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { ElectronDownloadManager, DownloadData } from 'electron-dl-manager'

export interface DownloadInfo {
  id: string
  url: string
  filename: string
  path: string
  totalBytes: number
  receivedBytes: number
  state: 'progressing' | 'completed' | 'cancelled' | 'interrupted' | 'paused'
  startTime: number
  endTime?: number
  mimeType?: string
  error?: string
  downloadRateBytesPerSecond?: number
  estimatedTimeRemainingSeconds?: number
  percentCompleted?: number
}

class DownloadManager {
  private manager: ElectronDownloadManager
  private downloads: Map<string, DownloadInfo> = new Map()
  private downloadPath: string = app.getPath('downloads')
  private activeDownloadsByUrl: Map<string, string> = new Map() // URL -> downloadId
  private mainWindow: BrowserWindow | null = null
  private store: any = null

  constructor() {
    this.manager = new ElectronDownloadManager()
    this.loadDownloadPath()
    this.initStore().then(() => {
      this.loadPersistedDownloads()
    })
  }

  private async initStore() {
    if (!this.store) {
      const Store = (await import('electron-store')).default
      this.store = new Store({ name: 'downloads-history' })
    }
    return this.store
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window
  }

  private async loadDownloadPath() {
    try {
      const defaultPath = app.getPath('downloads')
      this.downloadPath = defaultPath
      if (!existsSync(this.downloadPath)) {
        mkdirSync(this.downloadPath, { recursive: true })
      }
    } catch {
      // Failed to load download path
    }
  }

  setDownloadPath(path: string) {
    this.downloadPath = path
    if (!existsSync(this.downloadPath)) {
      mkdirSync(this.downloadPath, { recursive: true })
    }
  }

  private async loadPersistedDownloads() {
    try {
      const store = await this.initStore()
      const persistedDownloads = store.get('downloads', []) as DownloadInfo[]

      for (const download of persistedDownloads) {
        if (download.state === 'completed') {
          if (existsSync(download.path)) {
            this.downloads.set(download.id, download)
          } else {
            download.state = 'interrupted'
            download.error = 'File not found (may have been deleted)'
            this.downloads.set(download.id, download)
          }
        } else if (download.state === 'cancelled' || download.state === 'interrupted') {
          this.downloads.set(download.id, download)
        } else if (download.state === 'progressing' || download.state === 'paused') {
          download.state = 'interrupted'
          download.error = 'Download interrupted (app was closed)'
          download.endTime = Date.now()
          this.downloads.set(download.id, download)
        }
      }

      this.persistDownloads()
    } catch {
      // Failed to load persisted downloads
    }
  }

  private async persistDownloads() {
    try {
      const store = await this.initStore()
      const downloadsToPersist = Array.from(this.downloads.values()).filter(
        (d) => d.state === 'completed' || d.state === 'cancelled' || d.state === 'interrupted'
      )
      store.set('downloads', downloadsToPersist)
    } catch {
      // Failed to persist downloads
    }
  }

  getDownloadPath(): string {
    return this.downloadPath
  }

  private convertDownloadData(data: DownloadData): DownloadInfo {
    const existing = this.downloads.get(data.id)
    const startTime = existing?.startTime || Date.now()

    let state: DownloadInfo['state'] = 'progressing'
    try {
      if (data.isDownloadCompleted()) {
        state = 'completed'
      } else if (data.isDownloadCancelled()) {
        state = 'cancelled'
      } else if (data.isDownloadInterrupted()) {
        state = 'interrupted'
      } else if (data.isDownloadPaused()) {
        state = 'paused'
      } else if (data.isDownloadInProgress()) {
        state = 'progressing'
      }
    } catch {
      const itemState = data.item.getState()
      if (itemState === 'completed') state = 'completed'
      else if (itemState === 'cancelled') state = 'cancelled'
      else if (itemState === 'interrupted') state = 'interrupted'
      else state = 'progressing'
    }

    return {
      id: data.id,
      url: data.item.getURL(),
      filename: data.resolvedFilename,
      path: data.item.getSavePath() || join(this.downloadPath, data.resolvedFilename),
      totalBytes: data.item.getTotalBytes(),
      receivedBytes: data.item.getReceivedBytes(),
      state,
      startTime,
      mimeType: data.item.getMimeType(),
      downloadRateBytesPerSecond: data.downloadRateBytesPerSecond,
      estimatedTimeRemainingSeconds: data.estimatedTimeRemainingSeconds,
      percentCompleted: data.percentCompleted,
    }
  }

  async handleDownload(webContents: WebContents, downloadItem: any) {
    const url = downloadItem.getURL()
    const filename = downloadItem.getFilename()
    const savePath = join(this.downloadPath, filename)

    if (!this.mainWindow) {
      return null
    }

    if (url.startsWith('blob:')) {
      downloadItem.setSavePath(savePath)
      const downloadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      const downloadInfo: DownloadInfo = {
        id: downloadId,
        url,
        filename,
        path: savePath,
        totalBytes: downloadItem.getTotalBytes(),
        receivedBytes: downloadItem.getReceivedBytes(),
        state: 'progressing',
        startTime: Date.now(),
        mimeType: downloadItem.getMimeType(),
      }

      this.downloads.set(downloadId, downloadInfo)
      this.activeDownloadsByUrl.set(url, downloadId)

      downloadItem.on('updated', () => {
        const info = this.downloads.get(downloadId)
        if (!info) return
        const updatedInfo = {
          ...info,
          receivedBytes: downloadItem.getReceivedBytes(),
          totalBytes: downloadItem.getTotalBytes(),
        }
        const state = downloadItem.getState()
        if (state === 'progressing') {
          updatedInfo.state = 'progressing'
        } else if (state === 'completed') {
          updatedInfo.state = 'completed'
          updatedInfo.endTime = Date.now()
        } else if (state === 'cancelled') {
          updatedInfo.state = 'cancelled'
          updatedInfo.endTime = Date.now()
        } else if (state === 'interrupted') {
          updatedInfo.state = 'interrupted'
          updatedInfo.error = 'Download interrupted'
          updatedInfo.endTime = Date.now()
        }
        this.downloads.set(downloadId, updatedInfo)

        webContents.send('download-updated', { ...updatedInfo })
        if (this.mainWindow && this.mainWindow.webContents !== webContents) {
          this.mainWindow.webContents.send('download-updated', { ...updatedInfo })
        }
      })

      downloadItem.on('done', (_event, state) => {
        const info = this.downloads.get(downloadId)
        if (!info) return
        this.activeDownloadsByUrl.delete(url)

        const updatedInfo = { ...info }
        if (state === 'completed') {
          updatedInfo.state = 'completed'
          updatedInfo.endTime = Date.now()
          if (this.mainWindow) {
            this.mainWindow.webContents.send('download-completed-notification', {
              filename: updatedInfo.filename,
              path: updatedInfo.path,
              downloadId: updatedInfo.id,
            })
          }
        } else if (state === 'cancelled') {
          updatedInfo.state = 'cancelled'
          updatedInfo.endTime = Date.now()
        } else {
          updatedInfo.state = 'interrupted'
          updatedInfo.error = 'Download interrupted'
          updatedInfo.endTime = Date.now()
        }
        this.downloads.set(downloadId, updatedInfo)
        if (
          updatedInfo.state === 'completed' ||
          updatedInfo.state === 'cancelled' ||
          updatedInfo.state === 'interrupted'
        ) {
          this.persistDownloads()
        }

        webContents.send('download-completed', { ...updatedInfo })
        if (this.mainWindow && this.mainWindow.webContents !== webContents) {
          this.mainWindow.webContents.send('download-completed', { ...updatedInfo })
        }
      })

      webContents.send('download-started', { ...downloadInfo })
      if (this.mainWindow && this.mainWindow.webContents !== webContents) {
        this.mainWindow.webContents.send('download-started', { ...downloadInfo })
      }

      return downloadId
    }

    try {
      downloadItem.cancel()

      const downloadId = await this.manager.download({
        window: this.mainWindow,
        url: url,
        directory: this.downloadPath,
        callbacks: {
          onDownloadStarted: (data: DownloadData) => {
            try {
              const info = this.convertDownloadData(data)
              this.downloads.set(data.id, info)
              this.activeDownloadsByUrl.set(url, data.id)

              webContents.send('download-started', { ...info })
              if (this.mainWindow && this.mainWindow.webContents !== webContents) {
                this.mainWindow.webContents.send('download-started', { ...info })
              }
            } catch {
              // Error in onDownloadStarted
            }
          },
          onDownloadProgress: (data: DownloadData) => {
            try {
              const info = this.convertDownloadData(data)
              this.downloads.set(data.id, info)

              webContents.send('download-updated', { ...info })
              if (this.mainWindow && this.mainWindow.webContents !== webContents) {
                this.mainWindow.webContents.send('download-updated', { ...info })
              }
            } catch {
              // Error in onDownloadProgress
            }
          },
          onDownloadCompleted: (data: DownloadData) => {
            try {
              const info = this.convertDownloadData(data)
              info.endTime = Date.now()
              info.state = 'completed'
              this.downloads.set(data.id, info)
              this.activeDownloadsByUrl.delete(url)
              this.persistDownloads()

              if (this.mainWindow) {
                this.mainWindow.webContents.send('download-completed-notification', {
                  filename: info.filename,
                  path: info.path,
                  downloadId: info.id,
                })
              }

              webContents.send('download-completed', { ...info })
              if (this.mainWindow && this.mainWindow.webContents !== webContents) {
                this.mainWindow.webContents.send('download-completed', { ...info })
              }
            } catch {
              // Error in onDownloadCompleted
            }
          },
          onDownloadCancelled: (data: DownloadData) => {
            try {
              const info = this.convertDownloadData(data)
              info.endTime = Date.now()
              info.state = 'cancelled'
              this.downloads.set(data.id, info)
              this.activeDownloadsByUrl.delete(url)
              this.persistDownloads()

              webContents.send('download-completed', { ...info })
              if (this.mainWindow && this.mainWindow.webContents !== webContents) {
                this.mainWindow.webContents.send('download-completed', { ...info })
              }
            } catch {
              // Error in onDownloadCancelled
            }
          },
          onDownloadInterrupted: (data: DownloadData) => {
            try {
              const info = this.convertDownloadData(data)
              info.endTime = Date.now()
              info.state = 'interrupted'
              info.error = 'Download interrupted'
              this.downloads.set(data.id, info)
              this.activeDownloadsByUrl.delete(url)
              this.persistDownloads()

              webContents.send('download-completed', { ...info })
              if (this.mainWindow && this.mainWindow.webContents !== webContents) {
                this.mainWindow.webContents.send('download-completed', { ...info })
              }
            } catch {
              // Error in onDownloadInterrupted
            }
          },
          onError: (error: Error, data?: DownloadData) => {
            if (data) {
              try {
                const info = this.convertDownloadData(data)
                info.error = error.message
                info.endTime = Date.now()
                info.state = 'interrupted'
                this.downloads.set(data.id, info)
                this.activeDownloadsByUrl.delete(url)
                this.persistDownloads()

                webContents.send('download-completed', { ...info })
                if (this.mainWindow && this.mainWindow.webContents !== webContents) {
                  this.mainWindow.webContents.send('download-completed', { ...info })
                }
              } catch {
                // Error converting download data
              }
            }
          },
        },
      })

      return downloadId
    } catch {
      return null
    }
  }

  pauseDownload(downloadId: string): any {
    try {
      const restoreData = this.manager.pauseDownload(downloadId)
      if (restoreData) {
        const info = this.downloads.get(downloadId)
        if (info) {
          const updatedInfo = { ...info, state: 'paused' as const }
          this.downloads.set(downloadId, updatedInfo)

          if (this.mainWindow) {
            this.mainWindow.webContents.send('download-updated', updatedInfo)
          }
        }
      }
      return restoreData
    } catch {
      return undefined
    }
  }

  resumeDownload(downloadId: string): boolean {
    try {
      this.manager.resumeDownload(downloadId)
      const info = this.downloads.get(downloadId)
      if (info) {
        const updatedInfo = { ...info, state: 'progressing' as const }
        this.downloads.set(downloadId, updatedInfo)

        if (this.mainWindow) {
          this.mainWindow.webContents.send('download-updated', updatedInfo)
        }
      }
      return true
    } catch {
      return false
    }
  }

  cancelDownload(downloadId: string): boolean {
    try {
      const info = this.downloads.get(downloadId)
      if (!info) return false

      // Try to cancel in electron-dl-manager if it exists
      try {
        const downloadData = this.manager.getDownloadData(downloadId)
        if (downloadData) {
          this.manager.cancelDownload(downloadId)
        }
      } catch {
        // Download might not be managed by electron-dl-manager (e.g., blob URLs), continue anyway
      }

      const updatedInfo = { ...info, state: 'cancelled' as const, endTime: Date.now() }
      this.downloads.set(downloadId, updatedInfo)
      this.activeDownloadsByUrl.delete(info.url)
      this.persistDownloads()

      if (
        this.mainWindow &&
        !this.mainWindow.isDestroyed() &&
        this.mainWindow.webContents &&
        !this.mainWindow.webContents.isDestroyed()
      ) {
        try {
          this.mainWindow.webContents.send('download-completed', { ...updatedInfo })
        } catch {
          // Window might be destroyed, ignore
        }
      }
      return true
    } catch {
      return false
    }
  }

  removeDownload(downloadId: string): boolean {
    const info = this.downloads.get(downloadId)
    if (!info) return false

    // Try to cancel in electron-dl-manager if it exists and is active
    if (info.state === 'progressing' || info.state === 'paused') {
      try {
        const downloadData = this.manager.getDownloadData(downloadId)
        if (downloadData) {
          this.manager.cancelDownload(downloadId)
        }
      } catch {
        // Download might not be managed by electron-dl-manager, continue anyway
      }
    }

    if (info.url) {
      this.activeDownloadsByUrl.delete(info.url)
    }
    const deleted = this.downloads.delete(downloadId)
    if (deleted) {
      this.persistDownloads()

      // Notify renderer that download was removed
      if (
        this.mainWindow &&
        !this.mainWindow.isDestroyed() &&
        this.mainWindow.webContents &&
        !this.mainWindow.webContents.isDestroyed()
      ) {
        try {
          this.mainWindow.webContents.send('download-completed', { ...info, state: 'cancelled' as const })
        } catch {
          // Window might be destroyed, ignore
        }
      }
    }
    return deleted
  }

  getDownloadState() {
    const allDownloads = Array.from(this.downloads.values())
    const activeDownloads = allDownloads.filter((d) => d.state === 'progressing')
    const completedDownloads = allDownloads.filter((d) => d.state === 'completed')

    let totalProgress = 0
    if (activeDownloads.length > 0) {
      const totalBytes = activeDownloads.reduce((sum, d) => sum + d.totalBytes, 0)
      const receivedBytes = activeDownloads.reduce((sum, d) => sum + d.receivedBytes, 0)
      totalProgress = totalBytes > 0 ? (receivedBytes / totalBytes) * 100 : 0
    }

    return {
      activeCount: activeDownloads.length,
      totalProgress,
      hasCompleted: completedDownloads.length > 0,
      hasNewCompleted: completedDownloads.some((d) => !d.endTime || Date.now() - d.endTime < 5000),
    }
  }

  openDownload(downloadId: string): boolean {
    const info = this.downloads.get(downloadId)
    if (!info || info.state !== 'completed') return false

    try {
      shell.openPath(info.path)
      return true
    } catch {
      return false
    }
  }

  showInFolder(downloadId: string): boolean {
    const info = this.downloads.get(downloadId)
    if (!info) return false

    try {
      shell.showItemInFolder(info.path)
      return true
    } catch {
      return false
    }
  }

  getAllDownloads(): DownloadInfo[] {
    return Array.from(this.downloads.values()).sort((a, b) => b.startTime - a.startTime)
  }

  getDownload(downloadId: string): DownloadInfo | undefined {
    return this.downloads.get(downloadId)
  }

  clearCompleted(): number {
    let count = 0
    for (const [id, info] of this.downloads.entries()) {
      if (info.state === 'completed' || info.state === 'cancelled' || info.state === 'interrupted') {
        this.downloads.delete(id)
        count++
      }
    }
    if (count > 0) {
      this.persistDownloads()
    }
    return count
  }

  hasActiveDownloads(): boolean {
    const allDownloads = Array.from(this.downloads.values())
    // Only check for progressing downloads, not paused ones
    return allDownloads.some((d) => d.state === 'progressing')
  }

  getActiveDownloadCount(): number {
    const allDownloads = Array.from(this.downloads.values())
    // Only count progressing downloads, not paused ones
    return allDownloads.filter((d) => d.state === 'progressing').length
  }

  getDownloadData(downloadId: string): DownloadData | undefined {
    try {
      return this.manager.getDownloadData(downloadId)
    } catch {
      return undefined
    }
  }

  isDownloadInProgress(downloadId: string): boolean {
    try {
      const data = this.manager.getDownloadData(downloadId)
      return data ? data.isDownloadInProgress() : false
    } catch {
      return false
    }
  }

  isDownloadPaused(downloadId: string): boolean {
    try {
      const data = this.manager.getDownloadData(downloadId)
      return data ? data.isDownloadPaused() : false
    } catch {
      return false
    }
  }

  isDownloadResumable(downloadId: string): boolean {
    try {
      const data = this.manager.getDownloadData(downloadId)
      return data ? data.isDownloadResumable() : false
    } catch {
      return false
    }
  }

  isDownloadCancelled(downloadId: string): boolean {
    try {
      const data = this.manager.getDownloadData(downloadId)
      return data ? data.isDownloadCancelled() : false
    } catch {
      return false
    }
  }

  isDownloadInterrupted(downloadId: string): boolean {
    try {
      const data = this.manager.getDownloadData(downloadId)
      return data ? data.isDownloadInterrupted() : false
    } catch {
      return false
    }
  }

  isDownloadCompleted(downloadId: string): boolean {
    try {
      const data = this.manager.getDownloadData(downloadId)
      return data ? data.isDownloadCompleted() : false
    } catch {
      return false
    }
  }
}

export const downloadManager = new DownloadManager()
