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

  private readonly forceDarkCSS = `
    /* Force dark mode: make all text white and backgrounds transparent/dark */
    *, *::before, *::after {
      color: #e8e8e8 !important;
      border-color: rgba(255,255,255,0.08) !important;
    }
    html, body {
      background-color: transparent !important;
      color-scheme: dark !important;
    }
    /* Force all container/element backgrounds dark or transparent */
    div, section, article, aside, main, nav, header, footer,
    table, thead, tbody, tfoot, tr, td, th,
    ul, ol, li, dl, dt, dd, form, fieldset, legend,
    details, summary, figure, figcaption, p, span, label,
    h1, h2, h3, h4, h5, h6, blockquote, pre, code {
      background-color: transparent !important;
    }
    /* Links */
    a, a:visited { color: #8ab4f8 !important; }
    a:hover { color: #aecbfa !important; }
    /* Form elements get a subtle dark background so they remain usable */
    input, textarea, select, button {
      background-color: rgba(30,30,30,0.7) !important;
      color: #e0e0e0 !important;
    }
    input::placeholder, textarea::placeholder {
      color: #888888 !important;
    }
    /* Don't force color/bg on media elements — preserve their appearance */
    img, video, canvas, picture, iframe,
    img *, video *, canvas *, picture * {
      color: initial !important;
      background-color: initial !important;
      border-color: initial !important;
    }
    /* Preserve SVG icon colors where they use fill/stroke, not text color */
    svg { color: inherit !important; border-color: initial !important; }
    /* Scrollbar in dark mode */
    ::-webkit-scrollbar-track { background: transparent !important; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15) !important; }
  `

  /**
   * Create the JavaScript injection script
   */
  private createInjectionScript(url: string, platformName: string, transparencyEnabled: boolean): string {
    const isEnabled = styleManager.areStylesEnabled(url)

    if (!isEnabled || !transparencyEnabled) {
      return this.createRemovalScript()
    }

    const css = styleManager.getStyle(url)
    // Always append forceDarkCSS so text is readable on the blended dark background
    const baseCSS = css || ''
    const finalCSS = baseCSS + '\n' + this.forceDarkCSS
    const escapedCSS = this.escapeCSS(finalCSS)

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
