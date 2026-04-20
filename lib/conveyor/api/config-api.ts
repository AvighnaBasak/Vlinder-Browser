import { ConveyorApi } from '@/lib/preload/shared'

export class ConfigApi extends ConveyorApi {
  getLastApp = () => this.invoke('config-get-last-app')
  setLastApp = (name: string) => this.invoke('config-set-last-app', name)
  isEnabled = (name: string) => this.invoke('config-is-enabled', name)
  setEnabled = (name: string, enabled: boolean) => this.invoke('config-set-enabled', name, enabled)
  hasSetup = () => this.invoke('config-has-setup')
  completeSetup = (platforms: Array<{ name: string; enabled: boolean }>) =>
    this.invoke('config-complete-setup', platforms)
  clearData = () => this.invoke('config-clear-data')
  resetApp = () => this.invoke('config-reset-app')
  getAllEnabled = () => this.invoke('config-get-all-enabled')
  isPinned = (name: string) => this.invoke('config-is-pinned', name)
  setPinned = (name: string, pinned: boolean) => this.invoke('config-set-pinned', name, pinned)
  isMuted = (name: string) => this.invoke('config-is-muted', name)
  setMuted = (name: string, muted: boolean) => this.invoke('config-set-muted', name, muted)
  getAllPinned = () => this.invoke('config-get-all-pinned')
  getAllMuted = () => this.invoke('config-get-all-muted')
  isNotificationsEnabled = (name: string) => this.invoke('config-is-notifications-enabled', name)
  setNotificationsEnabled = (name: string, enabled: boolean) =>
    this.invoke('config-set-notifications-enabled', name, enabled)
  getAllNotificationsEnabled = () => this.invoke('config-get-all-notifications-enabled')
  getNotificationCount = (name: string) => this.invoke('config-get-notification-count', name)
  setNotificationCount = (name: string, count: number) => this.invoke('config-set-notification-count', name, count)
  getAllNotificationCounts = () => this.invoke('config-get-all-notification-counts')
  incrementNotificationCount = (name: string) => this.invoke('config-increment-notification-count', name)
  clearNotificationCount = (name: string) => this.invoke('config-clear-notification-count', name)
  getGlobalNotificationsEnabled = () => this.invoke('config-get-global-notifications-enabled')
  setGlobalNotificationsEnabled = (enabled: boolean) => this.invoke('config-set-global-notifications-enabled', enabled)

  // Custom platforms
  getCustomPlatforms = () => this.invoke('config-get-custom-platforms')
  setCustomPlatforms = (
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
  ) => this.invoke('config-set-custom-platforms', platforms)
  addCustomPlatform = (platform: {
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
  }) => this.invoke('config-add-custom-platform', platform)
  removeCustomPlatform = (platformId: string) => this.invoke('config-remove-custom-platform', platformId)

  // Ad Blocker
  getAdBlocker = () => this.invoke('config-get-adblocker')
  setAdBlocker = (mode: string) => this.invoke('config-set-adblocker', mode)

  // VPN / Tor
  getVpnStatus = () => this.invoke('vpn-get-status')
  enableVpn = () => this.invoke('vpn-enable')
  disableVpn = () => this.invoke('vpn-disable')
  vpnNewIdentity = () => this.invoke('vpn-new-identity')

  // Platform Order
  getPlatformOrder = () => this.invoke('config-get-platform-order')
  setPlatformOrder = (order: string[]) => this.invoke('config-set-platform-order', order)

  // Download methods
  getAllDownloads = () => this.invoke('download-get-all')
  getDownload = (downloadId: string) => this.invoke('download-get', downloadId)
  pauseDownload = (downloadId: string) => this.invoke('download-pause', downloadId)
  resumeDownload = (downloadId: string) => this.invoke('download-resume', downloadId)
  cancelDownload = (downloadId: string) => this.invoke('download-cancel', downloadId)
  removeDownload = (downloadId: string) => this.invoke('download-remove', downloadId)
  openDownload = (downloadId: string) => this.invoke('download-open', downloadId)
  showDownloadInFolder = (downloadId: string) => this.invoke('download-show-in-folder', downloadId)
  clearCompletedDownloads = () => this.invoke('download-clear-completed')
  getDownloadPath = () => this.invoke('download-get-path')
  setDownloadPath = (path: string) => this.invoke('download-set-path', path)
  selectDownloadPath = () => this.invoke('download-select-path')
  initDownloadPath = () => this.invoke('download-init-path')
  getDownloadState = () => this.invoke('download-get-state')
  getActiveDownloadCount = () => this.invoke('download-get-active-count')
  isDownloadInProgress = (downloadId: string) => this.invoke('download-is-in-progress', downloadId)
  isDownloadPaused = (downloadId: string) => this.invoke('download-is-paused', downloadId)
  isDownloadResumable = (downloadId: string) => this.invoke('download-is-resumable', downloadId)
  isDownloadCancelled = (downloadId: string) => this.invoke('download-is-cancelled', downloadId)
  isDownloadInterrupted = (downloadId: string) => this.invoke('download-is-interrupted', downloadId)
  isDownloadCompleted = (downloadId: string) => this.invoke('download-is-completed', downloadId)
}
