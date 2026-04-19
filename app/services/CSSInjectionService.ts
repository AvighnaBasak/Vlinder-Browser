/**
 * CSS Injection Service
 * Professional service for managing CSS injection into Electron webviews
 * Based on Browser-main's StyleManager implementation
 */

import { styleManager } from './StyleManager'

export interface CSSInjectionOptions {
  styleId?: string
  priority?: 'high' | 'normal'
  transparencyEnabled?: boolean
}

export class CSSInjectionService {
  private static instance: CSSInjectionService
  private readonly defaultStyleId = 'transparency-style'

  private constructor() {}

  public static getInstance(): CSSInjectionService {
    if (!CSSInjectionService.instance) {
      CSSInjectionService.instance = new CSSInjectionService()
    }
    return CSSInjectionService.instance
  }

  /**
   * Apply transparency styles to a webview
   * Mirrors Browser-main's applyTransparency method
   */
  public async applyTransparency(
    webview: any,
    platformName: string,
    transparencyEnabled: boolean = false
  ): Promise<void> {
    try {
      if (!webview) return

      // Check if webview is ready before executing JavaScript
      if (webview.isLoading && webview.isLoading()) {
        return
      }

      // Additional check for webview readiness
      if (!webview.executeJavaScript) {
        return
      }

      const currentURL = webview.getURL?.()
      if (!currentURL) return

      // Only fetch remote styles if transparency is enabled and we don't have cached styles
      if (transparencyEnabled && !styleManager.hasStyles) {
        await styleManager.fetchRemoteStyles()
      }

      const js = this.createInjectionScript(currentURL, platformName, transparencyEnabled)
      webview.executeJavaScript(js)
    } catch (error) {
      // Failed to apply transparency
    }
  }

  /**
   * Remove transparency styles from a webview
   */
  public async removeTransparency(webview: any): Promise<void> {
    try {
      if (!webview) return

      // Check if webview is ready before executing JavaScript
      if (webview.isLoading && webview.isLoading()) {
        return
      }

      // Additional check for webview readiness
      if (!webview.executeJavaScript) {
        return
      }

      const js = this.createRemovalScript()
      webview.executeJavaScript(js)
    } catch (error) {
      // Failed to remove transparency
    }
  }

  /**
   * Create the JavaScript injection script
   */
  private createInjectionScript(url: string, platformName: string, transparencyEnabled: boolean): string {
    const isEnabled = styleManager.areStylesEnabled(url)

    if (!isEnabled || !transparencyEnabled) {
      return this.createRemovalScript()
    }

    const css = styleManager.getStyle(url)
    if (!css) {
      return this.createRemovalScript()
    }

    const escapedCSS = this.escapeCSS(css)

    return `
      (function() {
        var style = document.getElementById('${this.defaultStyleId}');
        if (!style) {
          style = document.createElement('style');
          style.id = '${this.defaultStyleId}';
          document.head.appendChild(style);
        }
        style.textContent = \`${escapedCSS}\`;
      })();
    `
  }

  /**
   * Create the JavaScript removal script
   */
  private createRemovalScript(): string {
    return `
      (function() {
        var style = document.getElementById('${this.defaultStyleId}');
        if (style) {
          style.remove();
        }
      })();
    `
  }

  /**
   * Escape CSS content for JavaScript injection
   */
  private escapeCSS(css: string): string {
    return css.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')
  }
}

// Export singleton instance
export const cssInjectionService = CSSInjectionService.getInstance()
