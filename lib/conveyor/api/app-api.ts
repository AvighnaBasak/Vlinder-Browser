import { ConveyorApi } from '@/lib/preload/shared'

export class AppApi extends ConveyorApi {
  version = () => this.invoke('version')

  // External link handling
  openExternalLink = (url: string) => this.invoke('open-external-link', url)

  // Webview title updates
  webviewTitleUpdated = (platformId: string, title: string) => this.invoke('webview-title-updated', platformId, title)

  // Default browser functionality
  isDefaultBrowser = () => this.invoke('is-default-browser')
  setDefaultBrowser = () => this.invoke('set-default-browser')

  // Mark URL as background (for Ctrl+Click)
  markBackgroundUrl = (url: string) => this.invoke('mark-background-url', url)

  // Listen for external link navigation events from main process
  onExternalLink = (callback: (data: { url: string; currentUrl: string; title: string }) => void) => {
    const handler = (_event: any, data: { url: string; currentUrl: string; title: string }) => {
      callback(data)
    }
    this.renderer.on('external-link-navigation', handler)

    // Return cleanup function
    return () => {
      this.renderer.removeListener('external-link-navigation', handler)
    }
  }

  // Listen for background external link navigation events from main process
  onExternalLinkBackground = (callback: (data: { url: string; currentUrl: string; title: string }) => void) => {
    const handler = (_event: any, data: { url: string; currentUrl: string; title: string }) => {
      callback(data)
    }
    this.renderer.on('external-link-navigation-background', handler)

    // Return cleanup function
    return () => {
      this.renderer.removeListener('external-link-navigation-background', handler)
    }
  }
}
