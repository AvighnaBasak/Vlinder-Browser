/**
 * TypeScript interfaces for CSS injection system
 * Mirrors the Swift RemoteStyles structure from Browser-main
 */

export interface RemoteStyles {
  website: Record<string, Record<string, string>>
  mapping?: Record<string, string[]>
}

export interface StyleManagerState {
  styleCache: Record<string, string>
  fallbackStyle: string
  disabledWebsites: Set<string>
  hasStyles: boolean
}

export interface StyleMatchResult {
  css: string
  matchedKey: string
  matchType: 'exact' | 'subdomain' | 'tld' | 'fallback'
}

/**
 * Domain matching types for CSS file prefixes
 */
export type DomainMatchType = 'exact' | 'subdomain' | 'tld'

/**
 * CSS injection options
 */
export interface CSSInjectionOptions {
  styleId?: string
  priority?: 'high' | 'normal'
  replaceExisting?: boolean
}

/**
 * Electron WebviewTag type extensions
 */
export interface WebviewTag extends HTMLElement {
  src: string
  useragent?: string
  partition?: string
  getURL(): string
  isLoading(): boolean
  executeJavaScript(code: string, callback?: (result: any) => void): void
  setAudioMuted(muted: boolean): void
  reload(): void
  addEventListener(type: string, listener: (event: any) => void): void
  removeEventListener(type: string, listener: (event: any) => void): void
}

/**
 * Webview event types
 */
export interface WebviewEvent {
  title?: string
  isMainFrame?: boolean
  errorDescription?: string
}

/**
 * Style manager configuration
 */
export interface StyleManagerConfig {
  remoteStylesURL: string
  cachedStylesKey: string
  disabledWebsitesKey: string
  cacheTimeout: number
  retryAttempts: number
}
