/**
 * StyleManager - CSS injection service for Electron webviews
 * Mirrors the Swift StyleManager implementation from Browser-main
 */

import { RemoteStyles, StyleManagerState, StyleMatchResult, DomainMatchType } from '../types/styles'

/**
 * Singleton service for managing website-specific CSS themes from remote JSON
 * Fetches from my-internet repository and caches locally
 */
class StyleManager {
  private static instance: StyleManager
  private state: StyleManagerState = {
    styleCache: {},
    fallbackStyle: '',
    disabledWebsites: new Set(),
    hasStyles: false,
  }

  private readonly remoteStylesURL = 'https://sameerasw.github.io/my-internet/styles.json'
  private readonly cachedStylesKey = 'cached_remote_styles'
  private readonly disabledWebsitesKey = 'disabled_websites_for_styles'

  private constructor() {
    this.loadDisabledWebsites()
    this.loadCachedStyles()
    // Only fetch remote styles if transparency might be used
    // This will be called explicitly when needed
  }

  public static getInstance(): StyleManager {
    if (!StyleManager.instance) {
      StyleManager.instance = new StyleManager()
    }
    return StyleManager.instance
  }

  /**
   * Fetches remote styles from the hosted JSON
   */
  public async fetchRemoteStyles(): Promise<void> {
    try {
      const response = await fetch(this.remoteStylesURL)

      if (!response.ok) {
        return
      }

      const data = await response.text()
      const remoteStyles: RemoteStyles = JSON.parse(data)

      // Save to localStorage for caching
      localStorage.setItem(this.cachedStylesKey, data)

      // Process and update cache
      this.processRemoteStyles(remoteStyles)
    } catch (error) {
      // Silently fail - will use cached styles if available
    }
  }

  /**
   * Loads cached styles from localStorage
   */
  private loadCachedStyles(): void {
    const jsonString = localStorage.getItem(this.cachedStylesKey)
    if (!jsonString) return

    try {
      const remoteStyles: RemoteStyles = JSON.parse(jsonString)
      this.processRemoteStyles(remoteStyles)
    } catch (error) {
      // Silently fail - will fetch fresh styles
    }
  }

  /**
   * Loads disabled websites from localStorage
   */
  private loadDisabledWebsites(): void {
    const array = localStorage.getItem(this.disabledWebsitesKey)
    if (array) {
      try {
        const disabledArray = JSON.parse(array) as string[]
        this.state.disabledWebsites = new Set(disabledArray)
      } catch (error) {
        // Silently fail - will use empty set
      }
    }
  }

  /**
   * Saves disabled websites to localStorage
   */
  private saveDisabledWebsites(): void {
    const array = Array.from(this.state.disabledWebsites)
    localStorage.setItem(this.disabledWebsitesKey, JSON.stringify(array))
  }

  /**
   * Toggle styles for a specific website (enable/disable)
   */
  public toggleStyles(url: string): void {
    const host = this.extractHostFromURL(url)
    if (!host) return

    const normalizedHost = this.normalizeHost(host)

    if (this.state.disabledWebsites.has(normalizedHost)) {
      this.state.disabledWebsites.delete(normalizedHost)
    } else {
      this.state.disabledWebsites.add(normalizedHost)
    }
    this.saveDisabledWebsites()
  }

  /**
   * Check if styles are enabled for a specific website
   */
  public areStylesEnabled(url: string): boolean {
    const host = this.extractHostFromURL(url)
    if (!host) return false

    const normalizedHost = this.normalizeHost(host)
    return !this.state.disabledWebsites.has(normalizedHost)
  }

  /**
   * Process remote styles and populate the cache
   */
  private processRemoteStyles(remoteStyles: RemoteStyles): void {
    this.state.styleCache = {}
    this.state.fallbackStyle = ''

    for (const [websiteKey, features] of Object.entries(remoteStyles.website)) {
      // Combine all CSS features for this website
      const combinedCSS = Object.values(features).join('\n\n')

      // Remove .css extension if present
      const domainKey = websiteKey.endsWith('.css') ? websiteKey.slice(0, -4) : websiteKey

      // Check if this is the example.com fallback style
      if (domainKey === 'example.com' || domainKey === '+example.com' || domainKey === '-example.com') {
        this.state.fallbackStyle = combinedCSS
      } else {
        this.state.styleCache[domainKey] = combinedCSS
      }
    }

    this.state.hasStyles = Object.keys(this.state.styleCache).length > 0 || this.state.fallbackStyle.length > 0
  }

  /**
   * Get CSS for a specific domain, or fallback if not found
   */
  public getStyle(url: string): string | null {
    const host = this.extractHostFromURL(url)
    if (!host) return this.state.fallbackStyle || null

    // Normalize domain by removing www. prefix
    const normalizedHost = this.normalizeHost(host)

    // Check if styles are disabled for this website
    if (this.state.disabledWebsites.has(normalizedHost)) {
      return null
    }

    // Try to find matching styles with prefix handling
    for (const [key, css] of Object.entries(this.state.styleCache)) {
      // Handle + prefix: matches subdomains (e.g., +adobe.com matches in.adobe.com, www.adobe.com)
      if (key.startsWith('+')) {
        const domain = key.slice(1) // Remove the +
        if (normalizedHost.endsWith(domain) || normalizedHost === domain) {
          return css
        }
      }
      // Handle - prefix: matches different TLDs (e.g., -google.com matches google.lk, google.co.uk)
      else if (key.startsWith('-')) {
        const domain = key.slice(1) // Remove the -
        // Extract the base domain without TLD from the pattern
        const baseDomain = this.extractBaseDomain(domain)
        const hostBaseDomain = this.extractBaseDomain(normalizedHost)

        if (baseDomain && hostBaseDomain) {
          // Also check that both domains have similar structure (same number of parts)
          // google.com vs google.lk (both 2 parts) = match ✓
          // google.com vs translate.google.com (2 vs 3 parts) = no match ✗
          const domainParts = domain.split('.').length
          const hostParts = normalizedHost.split('.').length

          if (baseDomain === hostBaseDomain && domainParts === hostParts) {
            return css
          }
        }
      }
      // Exact match (with or without www.)
      else if (key === normalizedHost || key === host) {
        return css
      }
    }

    // Try fallback (example.com) if available, otherwise return null
    return this.state.fallbackStyle || null
  }

  /**
   * Extract base domain from a domain string (e.g., google.com -> google)
   */
  private extractBaseDomain(domain: string): string | null {
    const components = domain.split('.')
    if (components.length < 2) return null
    return components[components.length - 2]
  }

  /**
   * Extract host from URL
   */
  private extractHostFromURL(url: string): string | null {
    try {
      const urlObj = new URL(url)
      return urlObj.hostname
    } catch {
      return null
    }
  }

  /**
   * Normalize host by removing www. prefix
   */
  private normalizeHost(host: string): string {
    return host.startsWith('www.') ? host.slice(4) : host
  }

  /**
   * Check if styles are available (either domain-specific or fallback)
   */
  public get hasStyles(): boolean {
    return this.state.hasStyles
  }

  /**
   * Get current state for debugging
   */
  public getState(): StyleManagerState {
    return { ...this.state }
  }

  /**
   * Force refresh styles from remote
   */
  public async refreshStyles(): Promise<void> {
    await this.fetchRemoteStyles()
  }
}

// Export singleton instance
export const styleManager = StyleManager.getInstance()
export default styleManager
