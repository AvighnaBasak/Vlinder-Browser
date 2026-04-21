import { ElectronBlocker } from '@ghostery/adblocker-electron'
import { Session, WebContents, app } from 'electron'

export type AdBlockMode = 'disabled' | 'adsOnly' | 'adsAndTrackers' | 'adsTrackersAndCookies' | 'aggressive'

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

// Script injected into YouTube pages to skip ads
const YT_AD_SKIP_SCRIPT = `
(function() {
  'use strict';
  if (window.__vlinder_yt_adblock) return;
  window.__vlinder_yt_adblock = true;

  const skipAd = () => {
    // Click skip button if present
    const skipBtn = document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, [id="skip-button:"] button, .ytp-ad-skip-button-slot button');
    if (skipBtn) { skipBtn.click(); return; }

    // Close overlay ads
    const closeBtn = document.querySelector('.ytp-ad-overlay-close-button, .ytp-ad-overlay-close-container');
    if (closeBtn) { closeBtn.click(); }

    // Force-skip unskippable video ads by seeking to end
    const video = document.querySelector('video');
    const adContainer = document.querySelector('.ad-showing, .ad-interrupting');
    if (video && adContainer && video.duration && isFinite(video.duration)) {
      video.currentTime = video.duration;
    }

    // Remove ad overlay elements
    document.querySelectorAll('.ytp-ad-module, .ytp-ad-overlay-container, .ytp-ad-text-overlay, .video-ads, #player-ads, #masthead-ad, ytd-promoted-sparkles-web-renderer, ytd-display-ad-renderer, ytd-promoted-video-renderer, ytd-ad-slot-renderer, ytd-in-feed-ad-layout-renderer, ytd-banner-promo-renderer, tp-yt-paper-dialog:has(.ytd-popup-container), #panels:has(ytd-ads-engagement-panel-content-renderer)').forEach(el => {
      el.remove();
    });
  };

  // Remove ad-related styles and overlays via CSS
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

  // MutationObserver to catch dynamically added ads
  const observer = new MutationObserver(() => { skipAd(); });
  observer.observe(document.body, { childList: true, subtree: true });

  // Periodic check as backup
  setInterval(skipAd, 500);
})();
`

// Script to auto-dismiss cookie consent banners
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
    // Hide common cookie banner containers
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

    if (mode === 'adsAndTrackers' || mode === 'adsTrackersAndCookies' || mode === 'aggressive') {
      for (const domain of TRACKING_DOMAINS) {
        if (lower.includes(domain)) return true
      }
    }

    if (mode === 'adsTrackersAndCookies' || mode === 'aggressive') {
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
    switch (mode) {
      case 'aggressive':
      case 'adsTrackersAndCookies':
        this.blockerInstancePromise = ElectronBlocker.fromPrebuiltFull()
        break
      case 'adsAndTrackers':
        this.blockerInstancePromise = ElectronBlocker.fromPrebuiltAdsAndTracking()
        break
      case 'adsOnly':
        this.blockerInstancePromise = ElectronBlocker.fromPrebuiltAdsOnly()
        break
      default:
        this.blockerInstancePromise = undefined
        break
    }
    return this.blockerInstancePromise as Promise<ElectronBlocker>
  }

  private setupRequestInterception(ses: Session, mode: AdBlockMode): void {
    this.removeRequestInterception(ses)

    this.requestHandler = (details: any, callback: any) => {
      if (this.isUrlBlocked(details.url, mode)) {
        callback({ cancel: true })
        return
      }

      if (mode === 'aggressive' || mode === 'adsAndTrackers' || mode === 'adsTrackersAndCookies') {
        const stripped = this.stripTrackingParams(details.url)
        if (stripped) {
          callback({ redirectURL: stripped })
          return
        }
      }

      callback({})
    }

    ses.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, this.requestHandler)

    if (mode === 'adsTrackersAndCookies' || mode === 'aggressive') {
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
        contents.on('did-finish-load', () => {
          this.injectScripts(contents)
        })
        contents.on('did-navigate-in-page', () => {
          this.injectScripts(contents)
        })
      }
    })
  }

  private injectScripts(contents: WebContents): void {
    const mode = this.blockerMode
    if (mode === 'disabled') return
    try {
      const url = contents.getURL()
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        contents.executeJavaScript(YT_AD_SKIP_SCRIPT).catch(() => {})
      }
      if (mode === 'adsTrackersAndCookies' || mode === 'aggressive') {
        contents.executeJavaScript(COOKIE_DISMISS_SCRIPT).catch(() => {})
      }
    } catch {
      // webContents may be destroyed
    }
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
    this.blockedSession = undefined
    this.blockerInstancePromise = undefined
  }

  public async updateConfig(session: Session): Promise<void> {
    const s = await initStore()
    const raw = s.get('adBlocker', 'disabled') as string
    const mode = ((raw === 'all' ? 'aggressive' : raw) as AdBlockMode) || 'disabled'

    await this.teardown()
    this.blockerMode = mode

    if (mode === 'disabled') return

    this.blockedSession = session

    const blocker = await this.createGhosteryBlocker(mode)
    if (blocker) {
      blocker.enableBlockingInSession(session)
    }

    this.setupRequestInterception(session, mode)
  }

  public async initialize(session: Session): Promise<void> {
    const s = await initStore()
    // Migrate old 'all' mode to new 'aggressive'
    const raw = s.get('adBlocker', 'disabled') as string
    const mode = (raw === 'all' ? 'aggressive' : raw) as AdBlockMode
    if (raw === 'all') s.set('adBlocker', 'aggressive')
    this.blockerMode = mode || 'disabled'
    this.setupScriptInjection()
    await this.updateConfig(session)
  }

  public getMode(): AdBlockMode {
    return this.blockerMode
  }
}

export const contentBlocker = new ContentBlocker()
