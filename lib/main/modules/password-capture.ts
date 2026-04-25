import { app, BrowserWindow, WebContents } from 'electron'
import { findCredentialsForOrigin, isNeverSaveOriginCheck } from './passwords'

const PASSWORD_DETECT_SCRIPT = `
(function() {
  'use strict';
  if (window.__vlinder_pw_capture) return;
  window.__vlinder_pw_capture = true;
  window.__vlinder_pw_captured = null;

  function findPasswordFields() {
    return Array.from(document.querySelectorAll('input[type="password"]'))
      .filter(function(el) { return el.offsetParent !== null; });
  }

  function findUsernameField(container) {
    var selectors = [
      'input[autocomplete="username"]',
      'input[autocomplete="email"]',
      'input[type="email"]',
      'input[name*="user" i]',
      'input[name*="login" i]',
      'input[name*="email" i]',
      'input[id*="user" i]',
      'input[id*="login" i]',
      'input[id*="email" i]',
      'input[type="text"]',
      'input[type="tel"]',
    ];
    for (var i = 0; i < selectors.length; i++) {
      var field = container.querySelector(selectors[i]);
      if (field && field.type !== 'password' && field.offsetParent !== null) return field;
    }
    return null;
  }

  function captureCredentials() {
    var pwFields = findPasswordFields();
    for (var i = 0; i < pwFields.length; i++) {
      var pwField = pwFields[i];
      if (!pwField.value) continue;

      var form = pwField.closest('form');
      var container = form || pwField.closest('div[class*="login" i], div[class*="signin" i], div[class*="auth" i], div[role="dialog"], body');
      if (!container) container = document.body;

      var usernameField = findUsernameField(container);
      var username = usernameField ? usernameField.value : '';

      if (username && pwField.value) {
        window.__vlinder_pw_captured = {
          origin: window.location.origin,
          url: window.location.href,
          username: username,
          password: pwField.value
        };
        return;
      }
    }
  }

  document.addEventListener('submit', function() { captureCredentials(); }, true);

  document.addEventListener('click', function(e) {
    var target = e.target;
    while (target && target !== document) {
      if (target.tagName === 'BUTTON' || (target.tagName === 'INPUT' && target.type === 'submit')) {
        setTimeout(captureCredentials, 0);
        return;
      }
      target = target.parentElement;
    }
  }, true);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && document.activeElement &&
        (document.activeElement.type === 'password' || document.activeElement.type === 'text' || document.activeElement.type === 'email')) {
      var pwFields = findPasswordFields();
      if (pwFields.length > 0) captureCredentials();
    }
  }, true);
})();
`

function getOriginFromUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return ''
    const host = u.hostname.replace(/^www\./, '')
    const parts = host.split('.')
    const eTLDPlus1 = parts.length >= 2 ? parts.slice(-2).join('.') : host
    return `${u.protocol}//${eTLDPlus1}`
  } catch {
    return ''
  }
}

function escapeJsString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r')
}

function makeAutofillScript(username: string, password: string): string {
  return `
(function() {
  'use strict';
  var pwFields = Array.from(document.querySelectorAll('input[type="password"]'))
    .filter(function(el) { return el.offsetParent !== null; });
  if (pwFields.length === 0) return;

  var pwField = pwFields[0];
  var form = pwField.closest('form') || pwField.closest('div') || document.body;

  var selectors = [
    'input[autocomplete="username"]', 'input[autocomplete="email"]',
    'input[type="email"]', 'input[name*="user" i]', 'input[name*="login" i]',
    'input[name*="email" i]', 'input[type="text"]'
  ];
  var usernameField = null;
  for (var i = 0; i < selectors.length; i++) {
    usernameField = form.querySelector(selectors[i]);
    if (usernameField && usernameField.type !== 'password' && usernameField.offsetParent !== null) break;
    usernameField = null;
  }

  function setNativeValue(el, value) {
    var proto = Object.getPrototypeOf(el);
    var setter = Object.getOwnPropertyDescriptor(proto, 'value') ||
                 Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (setter && setter.set) setter.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  if (usernameField) setNativeValue(usernameField, '${escapeJsString(username)}');
  setNativeValue(pwField, '${escapeJsString(password)}');
})();
`
}

export function initPasswordCapture(_mainWindow?: BrowserWindow) {

  app.on('web-contents-created', (_, contents) => {
    if (contents.getType() !== 'webview') return

    contents.on('did-finish-load', () => {
      const url = contents.getURL()
      if (!url.startsWith('http')) return

      contents.executeJavaScript(PASSWORD_DETECT_SCRIPT, true).catch(() => {})

      tryAutofill(contents, url)
    })

    contents.on('will-navigate', (_event, url) => {
      retrieveCapturedCredentials(contents, url)
    })

    contents.on('did-navigate', () => {
      const url = contents.getURL()
      if (url.startsWith('http')) {
        contents.executeJavaScript(PASSWORD_DETECT_SCRIPT, true).catch(() => {})
        tryAutofill(contents, url)
      }
    })
  })
}

async function retrieveCapturedCredentials(contents: WebContents, _navigatingTo: string) {
  try {
    const captured = await contents.executeJavaScript('window.__vlinder_pw_captured', true)
    if (captured && captured.origin && captured.username && captured.password) {
      // Reset so we don't capture the same creds again
      contents.executeJavaScript('window.__vlinder_pw_captured = null', true).catch(() => {})
      await handleCapturedCredential(captured)
    }
  } catch {}
}

async function handleCapturedCredential(captured: {
  origin: string
  url: string
  username: string
  password: string
}) {
  const origin = getOriginFromUrl(captured.url)
  if (!origin) return

  if (await isNeverSaveOriginCheck(origin)) return

  const existing = await findCredentialsForOrigin(origin)
  const alreadySaved = existing.some(
    (c) => c.username === captured.username && c.password === captured.password
  )
  if (alreadySaved) return

  const isUpdate = existing.some((c) => c.username === captured.username)

  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows().find(w => !w.isDestroyed())
  if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
    win.webContents.send('password-save-prompt', {
      origin,
      username: captured.username,
      password: captured.password,
      isUpdate,
    })
  }
}

async function tryAutofill(contents: WebContents, url: string) {
  const origin = getOriginFromUrl(url)
  if (!origin) return

  try {
    const creds = await findCredentialsForOrigin(origin)
    if (creds.length === 0) return

    const hasPasswordField = await contents.executeJavaScript(
      'document.querySelectorAll("input[type=password]").length > 0',
      true
    )
    if (!hasPasswordField) return

    const { username, password } = creds[0]
    await contents.executeJavaScript(makeAutofillScript(username, password), true)
  } catch {}
}
