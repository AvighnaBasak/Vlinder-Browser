import { ElectronBlocker } from '@ghostery/adblocker-electron'
import { Session, WebContents, app, ipcMain } from 'electron'

export type AdBlockMode = 'disabled' | 'adsAndTrackers' | 'aggressive'

let Store: any = null
let store: any = null

async function initStore() {
  if (!Store) {
    const ElectronStore = await import('electron-store')
    Store = ElectronStore.default
    store = new Store({ name: 'vlinder-config' })
  }
  return store
}

// ─── Filter list URLs (industry-standard, updated daily) ───
const EASYLIST_URL = 'https://easylist.to/easylist/easylist.txt'
const EASYPRIVACY_URL = 'https://easylist.to/easylist/easyprivacy.txt'
const FANBOY_ANNOYANCES_URL = 'https://easylist.to/easylist/fanboy-annoyance.txt'
const PETER_LOWE_URL =
  'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=hosts&showintro=0&mimetype=plaintext'

const YT_AD_DOMAINS = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'google-analytics.com',
  'googletagmanager.com',
  'googletagservices.com',
  'adservice.google.com',
  'pagead2.googlesyndication.com',
  'tpc.googlesyndication.com',
  'youtube.com/api/stats/ads',
  'youtube.com/pagead/',
  'youtube.com/ptracking',
  'youtube.com/get_midroll_',
  'youtube.com/api/stats/qoe',
  'ad.youtube.com',
  'ads.youtube.com',
  'youtube.com/get_video_info',
]

const TRACKING_DOMAINS = [
  'facebook.com/tr',
  'connect.facebook.net/signals',
  'analytics.tiktok.com',
  'bat.bing.com',
  'pixel.quantserve.com',
  'mc.yandex.ru',
  'hotjar.com',
  'mouseflow.com',
  'fullstory.com',
  'amplitude.com',
  'mixpanel.com',
  'segment.io',
  'segment.com/v1',
  'sentry.io',
  'clarity.ms',
  'scorecardresearch.com',
  'taboola.com',
  'outbrain.com',
  'criteo.com',
  'amazon-adsystem.com',
  'adsrvr.org',
  'pubmatic.com',
  'casalemedia.com',
  'rubiconproject.com',
  'openx.net',
  'adnxs.com',
  'moatads.com',
  'serving-sys.com',
  'bidswitch.net',
  'sharethrough.com',
  'smartadserver.com',
]

const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'dclid', 'msclkid', 'yclid', 'twclid',
  'mc_cid', 'mc_eid', 'ref', '_ga', '_gl', 'oly_enc_id', 'oly_anon_id',
  'vero_id', 'wickedid', 'icid', 'igshid',
]

const COOKIE_CONSENT_DOMAINS = [
  'cookiebot.com',
  'cookiepro.com',
  'cookielaw.org',
  'onetrust.com',
  'trustarc.com',
  'quantcast.com/choice',
  'consensu.org',
  'privacymanager.io',
  'cookieinformation.com',
  'usercentrics.eu',
  'didomi.io',
  'iubenda.com',
]

// ─── YouTube ad-skip script ───
const YT_AD_SKIP_SCRIPT = `
(function() {
  'use strict';
  if (window.__vlinder_yt_adblock) return;
  window.__vlinder_yt_adblock = true;

  const skipAd = () => {
    const skipBtn = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, [id="skip-button:"] button, .ytp-ad-skip-button-slot button');
    if (skipBtn) { skipBtn.click(); return; }

    const closeBtn = document.querySelector('.ytp-ad-overlay-close-button, .ytp-ad-overlay-close-container');
    if (closeBtn) { closeBtn.click(); }

    const video = document.querySelector('video');
    const adContainer = document.querySelector('.ad-showing, .ad-interrupting');
    if (video && adContainer && video.duration && isFinite(video.duration)) {
      video.currentTime = video.duration;
    }

    document.querySelectorAll('.ytp-ad-module, .ytp-ad-overlay-container, .ytp-ad-text-overlay, .video-ads, #player-ads, #masthead-ad, ytd-promoted-sparkles-web-renderer, ytd-display-ad-renderer, ytd-promoted-video-renderer, ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer, ytd-banner-promo-renderer, tp-yt-paper-dialog:has(.ytd-popup-container), #panels:has(ytd-ads-engagement-panel-content-renderer)').forEach(el => {
      el.remove();
    });
  };

  const style = document.createElement('style');
  style.textContent = \`
    .ad-showing .video-stream { display: none !important; }
    .ytp-ad-module, .ytp-ad-overlay-container, .ytp-ad-text-overlay,
    .video-ads, #player-ads, #masthead-ad, ytd-promoted-sparkles-web-renderer,
    ytd-display-ad-renderer, ytd-promoted-video-renderer, ytd-ad-slot-renderer,
    ytd-in-feed-ad-layout-renderer, ytd-banner-promo-renderer,
    ytd-popup-container:has(tp-yt-paper-dialog),
    tp-yt-paper-dialog.ytd-popup-container,
    #panels ytd-ads-engagement-panel-content-renderer { display: none !important; }
  \`;
  document.head.appendChild(style);

  const observer = new MutationObserver(() => { skipAd(); });
  observer.observe(document.body, { childList: true, subtree: true });
  setInterval(skipAd, 500);
})();
`

// ─── Cookie consent auto-dismiss ───
const COOKIE_DISMISS_SCRIPT = `
(function() {
  'use strict';
  if (window.__vlinder_cookie_dismiss) return;
  window.__vlinder_cookie_dismiss = true;

  const selectors = [
    '#onetrust-accept-btn-handler',
    '.cookie-consent-accept-all',
    '[data-cookiebanner="accept_button"]',
    '#cookie-consent-button-accept',
    '.js-cookie-consent-agree',
    '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
    '#CybotCookiebotDialogBodyButtonDecline',
    '.cc-btn.cc-dismiss',
    '.cc-compliance .cc-btn',
    '#accept-cookies',
    '.accept-cookies-button',
    '[aria-label="Accept all cookies"]',
    '[aria-label="Accept cookies"]',
    'button[data-testid="cookie-policy-dialog-accept-button"]',
    '#gdpr-cookie-accept',
    '.gdpr-accept-btn',
    '.cookie-notice-accept',
    '#cookieAcceptAll',
  ];

  const dismissBanners = () => {
    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        btn.click();
        return;
      }
    }
    document.querySelectorAll('#onetrust-banner-sdk, #CybotCookiebotDialog, .cookie-consent-banner, .cookie-notice, .cookie-banner, [class*="cookie-consent"], [id*="cookie-consent"], [class*="cookie-banner"], [id*="cookie-banner"], .cc-window').forEach(el => {
      el.style.display = 'none';
    });
  };

  setTimeout(dismissBanners, 1000);
  setTimeout(dismissBanners, 3000);
  setTimeout(dismissBanners, 6000);

  const observer = new MutationObserver(() => { dismissBanners(); });
  observer.observe(document.body, { childList: true, subtree: true });
})();
`

// ─── Popup, redirect & clickjacking defense script ───
const POPUP_REDIRECT_BLOCK_SCRIPT = `
(function() {
  'use strict';
  if (window.__vlinder_popup_block) return;
  window.__vlinder_popup_block = true;

  // ── 1. User-gesture tracking ──
  let lastUserInteraction = 0;
  const USER_GESTURE_WINDOW = 1000;
  const gestureEvents = ['click', 'keydown', 'submit', 'touchend', 'mousedown'];
  gestureEvents.forEach(evt => {
    document.addEventListener(evt, () => { lastUserInteraction = Date.now(); }, true);
  });

  function isUserInitiated() {
    return (Date.now() - lastUserInteraction) < USER_GESTURE_WINDOW;
  }

  // ── 2. Block window.open unless user-initiated ──
  const origOpen = window.open;
  window.open = function(url, target, features) {
    if (isUserInitiated()) {
      return origOpen.call(window, url, target, features);
    }
    return null;
  };

  // ── 3. Block programmatic click() on target="_blank" anchors ──
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function() {
    if (this.target === '_blank' && !isUserInitiated()) {
      return;
    }
    return origClick.call(this);
  };

  // ── 4. Block programmatic dispatchEvent on target="_blank" anchors ──
  const origDispatchEvent = EventTarget.prototype.dispatchEvent;
  EventTarget.prototype.dispatchEvent = function(event) {
    if (event.type === 'click' && this instanceof HTMLAnchorElement &&
        this.target === '_blank' && !isUserInitiated()) {
      return false;
    }
    return origDispatchEvent.call(this, event);
  };

  // ── 5. Clickjacking / invisible overlay defense ──
  // Detect elements covering >90% of viewport with near-zero opacity
  // and neutralize them with pointer-events: none
  function neutralizeClickjackOverlays() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const threshold = 0.9;

    const allEls = document.querySelectorAll('div, section, aside, span, a, iframe');
    for (const el of allEls) {
      const style = window.getComputedStyle(el);
      const opacity = parseFloat(style.opacity);
      if (opacity >= 0.1) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width < vw * threshold || rect.height < vh * threshold) continue;

      const zIndex = parseInt(style.zIndex, 10);
      if (isNaN(zIndex) || zIndex < 1) continue;

      el.style.setProperty('pointer-events', 'none', 'important');
      el.style.setProperty('display', 'none', 'important');
    }
  }

  // Run on load + observe for dynamically added overlays
  setTimeout(neutralizeClickjackOverlays, 500);
  setTimeout(neutralizeClickjackOverlays, 2000);

  const overlayObserver = new MutationObserver(() => {
    neutralizeClickjackOverlays();
  });
  overlayObserver.observe(document.documentElement, { childList: true, subtree: true });

  // ── 6. Event listener hijacking (capturing phase) ──
  // Trap clicks on suspicious elements before they can trigger popups
  window.addEventListener('click', function(event) {
    const target = event.target;
    if (!target || !target.tagName) return;

    // Check if target is a huge transparent anchor (common clickjack trick)
    if (target.tagName === 'A') {
      const style = window.getComputedStyle(target);
      const opacity = parseFloat(style.opacity);
      const rect = target.getBoundingClientRect();
      if (opacity < 0.1 && rect.width > window.innerWidth * 0.5 && rect.height > window.innerHeight * 0.5) {
        event.stopPropagation();
        event.preventDefault();
        return;
      }
    }

    // Block clicks on dynamically created off-screen or invisible iframes
    if (target.tagName === 'IFRAME') {
      const rect = target.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) {
        event.stopPropagation();
        event.preventDefault();
        return;
      }
    }
  }, true);

  // ── 7. Frame-busting protection ──
  // Prevent the page from being framed by malicious sites
  try {
    if (top !== self) {
      // We're in a frame — check if the framing site is same-origin
      try {
        // Accessing top.location will throw if cross-origin
        void top.location.hostname;
      } catch {
        // Cross-origin frame — break out
        top.location = self.location;
      }
    }
  } catch {}

  // ── 8. Block meta refresh redirects ──
  function removeMetaRefreshes() {
    document.querySelectorAll('meta[http-equiv="refresh"]').forEach(el => {
      const content = el.getAttribute('content') || '';
      if (content.includes('url=') && !content.startsWith('0;')) {
        el.remove();
      }
    });
  }
  removeMetaRefreshes();

  const metaObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeName === 'META') {
          const httpEquiv = node.getAttribute && node.getAttribute('http-equiv');
          if (httpEquiv && httpEquiv.toLowerCase() === 'refresh') {
            const content = node.getAttribute('content') || '';
            if (content.includes('url=') && !content.startsWith('0;')) {
              node.remove();
            }
          }
        }
      }
    }
  });
  metaObserver.observe(document.documentElement, { childList: true, subtree: true });
})();
`

class ContentBlocker {
  private blockerInstancePromise: Promise<ElectronBlocker> | undefined = undefined
  private blockerMode: AdBlockMode = 'disabled'
  private blockedSession: Session | undefined = undefined
  private requestHandler: ((details: any, callback: any) => void) | null = null
  private headerHandler: ((details: any, callback: any) => void) | null = null

  private isUrlBlocked(url: string, mode: AdBlockMode): boolean {
    const lower = url.toLowerCase()

    if (mode === 'disabled') return false

    for (const domain of YT_AD_DOMAINS) {
      if (lower.includes(domain)) return true
    }

    for (const domain of TRACKING_DOMAINS) {
      if (lower.includes(domain)) return true
    }

    if (mode === 'aggressive') {
      for (const domain of COOKIE_CONSENT_DOMAINS) {
        if (lower.includes(domain)) return true
      }
    }

    return false
  }

  private stripTrackingParams(url: string): string | null {
    try {
      const parsed = new URL(url)
      let modified = false
      for (const param of TRACKING_PARAMS) {
        if (parsed.searchParams.has(param)) {
          parsed.searchParams.delete(param)
          modified = true
        }
      }
      return modified ? parsed.toString() : null
    } catch {
      return null
    }
  }

  private async createGhosteryBlocker(mode: AdBlockMode): Promise<ElectronBlocker> {
    if (this.blockerInstancePromise && this.blockerMode === mode) {
      return this.blockerInstancePromise
    }
    if (this.blockerInstancePromise) {
      await this.teardown()
    }

    // Use fromLists with real filter lists for comprehensive blocking
    const lists: string[] = []
    switch (mode) {
      case 'aggressive':
        lists.push(EASYLIST_URL, EASYPRIVACY_URL, FANBOY_ANNOYANCES_URL, PETER_LOWE_URL)
        break
      case 'adsAndTrackers':
        lists.push(EASYLIST_URL, EASYPRIVACY_URL)
        break
      default:
        this.blockerInstancePromise = undefined
        return undefined as any
    }

    this.blockerInstancePromise = ElectronBlocker.fromLists(
      fetch,
      lists,
      { enableCompression: true },
    ).catch(() => {
      // Fall back to prebuilt if list fetch fails
      if (mode === 'aggressive') {
        return ElectronBlocker.fromPrebuiltFull()
      }
      return ElectronBlocker.fromPrebuiltAdsAndTracking()
    })

    return this.blockerInstancePromise as Promise<ElectronBlocker>
  }

  private setupRequestInterception(ses: Session, mode: AdBlockMode): void {
    this.removeRequestInterception(ses)

    this.requestHandler = (details: any, callback: any) => {
      if (this.isUrlBlocked(details.url, mode)) {
        callback({ cancel: true })
        return
      }

      const stripped = this.stripTrackingParams(details.url)
      if (stripped) {
        callback({ redirectURL: stripped })
        return
      }

      callback({})
    }

    ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, this.requestHandler)

    if (mode === 'aggressive') {
      this.headerHandler = (details: any, callback: any) => {
        const headers = { ...details.responseHeaders }
        delete headers['set-cookie']
        delete headers['Set-Cookie']
        callback({ responseHeaders: headers })
      }
      ses.webRequest.onHeadersReceived({ urls: ['*://*/*'] }, this.headerHandler)
    }
  }

  private removeRequestInterception(ses: Session): void {
    if (this.requestHandler) {
      ses.webRequest.onBeforeRequest(null as any)
      this.requestHandler = null
    }
    if (this.headerHandler) {
      ses.webRequest.onHeadersReceived(null as any)
      this.headerHandler = null
    }
  }

  private setupScriptInjection(): void {
    app.on('web-contents-created', (_, contents) => {
      if (contents.getType() === 'webview') {
        // Inject popup defense as early as possible — did-navigate fires before DOMContentLoaded
        contents.on('did-navigate', () => {
          if (contents.isDestroyed()) return
          this.injectPopupDefense(contents)
        })
        contents.on('did-navigate-in-page', () => {
          if (contents.isDestroyed()) return
          this.injectPopupDefense(contents)
        })
        // Fallback: re-inject at dom-ready in case did-navigate was too early for the context
        contents.on('dom-ready', () => {
          if (contents.isDestroyed()) return
          this.injectPopupDefense(contents)
        })
        // Page-specific scripts (YouTube, cookies) need DOM elements, so inject at did-finish-load
        contents.on('did-finish-load', () => {
          if (contents.isDestroyed()) return
          this.injectPageSpecificScripts(contents)
        })
      }
    })
  }

  private injectPopupDefense(contents: WebContents): void {
    if (this.blockerMode === 'disabled') return
    try {
      if (contents.isDestroyed()) return
      contents.executeJavaScript(POPUP_REDIRECT_BLOCK_SCRIPT).catch(() => {})
    } catch {}
  }

  private injectPageSpecificScripts(contents: WebContents): void {
    const mode = this.blockerMode
    if (mode === 'disabled') return
    try {
      if (contents.isDestroyed()) return
      const url = contents.getURL()
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        contents.executeJavaScript(YT_AD_SKIP_SCRIPT).catch(() => {})
      }
      if (mode === 'aggressive') {
        contents.executeJavaScript(COOKIE_DISMISS_SCRIPT).catch(() => {})
      }
    } catch {}
  }

  private async teardown(): Promise<void> {
    if (this.blockerInstancePromise && this.blockedSession) {
      try {
        const blocker = await this.blockerInstancePromise
        blocker.disableBlockingInSession(this.blockedSession)
      } catch {}
    }
    if (this.blockedSession) {
      this.removeRequestInterception(this.blockedSession)
    }
    this.removeCosmeticFilterHandler()
    this.blockedSession = undefined
    this.blockerInstancePromise = undefined
  }

  private migrateMode(raw: string): AdBlockMode {
    if (raw === 'all' || raw === 'adsTrackersAndCookies') return 'aggressive'
    if (raw === 'adsOnly') return 'adsAndTrackers'
    if (raw === 'adsAndTrackers' || raw === 'aggressive') return raw as AdBlockMode
    return 'disabled'
  }

  public async updateConfig(session: Session): Promise<void> {
    const s = await initStore()
    const raw = s.get('adBlocker', 'disabled') as string
    const mode = this.migrateMode(raw)
    if (mode !== raw) s.set('adBlocker', mode)

    await this.teardown()
    this.blockerMode = mode

    // Always keep fallback handlers registered so webviews never hit "No handler"
    this.ensureCosmeticFilterHandler()

    if (mode === 'disabled') {
      return
    }

    this.blockedSession = session

    const blocker = await this.createGhosteryBlocker(mode)
    if (blocker) {
      // Atomic swap: remove fallback, immediately register real handlers
      this.removeCosmeticFilterHandler()
      blocker.enableBlockingInSession(session)
    }

    this.setupRequestInterception(session, mode)
  }

  public async initialize(session: Session): Promise<void> {
    this.setupScriptInjection()
    await this.updateConfig(session)
  }

  private ensureCosmeticFilterHandler(): void {
    try {
      ipcMain.handle('@ghostery/adblocker/inject-cosmetic-filters', () => {
        return { active: false, scripts: [], styles: '' }
      })
    } catch {}
    try {
      ipcMain.handle('@ghostery/adblocker/is-mutation-observer-enabled', () => {
        return false
      })
    } catch {}
  }

  private removeCosmeticFilterHandler(): void {
    try {
      ipcMain.removeHandler('@ghostery/adblocker/inject-cosmetic-filters')
    } catch {}
    try {
      ipcMain.removeHandler('@ghostery/adblocker/is-mutation-observer-enabled')
    } catch {}
  }

  public getMode(): AdBlockMode {
    return this.blockerMode
  }
}

export const contentBlocker = new ContentBlocker()
