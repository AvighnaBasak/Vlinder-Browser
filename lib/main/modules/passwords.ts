import keytar from 'keytar'
import { systemPreferences } from 'electron'
import { execFile } from 'child_process'
import { handle } from '@/lib/main/shared'

const SERVICE = 'vlinder:passwords'
const NEVER_SAVE_SERVICE = 'vlinder:never-save'

let lastAuthTime = 0
const AUTH_TIMEOUT = 60 * 1000

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

function makeId(origin: string, username: string) {
  return `${origin}|${username}`
}

async function listAll(): Promise<Array<{ id: string; origin: string; username: string; createdAt: string }>> {
  const creds = await keytar.findCredentials(SERVICE)
  return creds.map(({ account, password }) => {
    const [origin, username] = account.split('|')
    let createdAt = new Date().toISOString()
    try {
      const parsed = JSON.parse(password)
      if (parsed && parsed.createdAt) createdAt = parsed.createdAt
    } catch {}
    return { id: account, origin, username, createdAt }
  })
}

function verifySystemAuth(): Promise<boolean> {
  return new Promise((resolve) => {
    if (Date.now() - lastAuthTime < AUTH_TIMEOUT) {
      resolve(true)
      return
    }

    if (process.platform === 'win32') {
      if (typeof systemPreferences.promptTouchID === 'function') {
        systemPreferences
          .promptTouchID('Verify your identity to view passwords')
          .then(() => {
            lastAuthTime = Date.now()
            resolve(true)
          })
          .catch(() => resolve(false))
      } else {
        execFile(
          'powershell.exe',
          [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            'Add-Type -AssemblyName System.Runtime.WindowsRuntime; ' +
              '[Windows.Security.Credentials.UI.UserConsentVerifier,Windows.Security.Credentials.UI,ContentType=WindowsRuntime] | Out-Null; ' +
              '$result = [Windows.Security.Credentials.UI.UserConsentVerifier]::RequestVerificationAsync("Verify your identity to view saved passwords"); ' +
              '$asyncResult = $result.AsTask(); $asyncResult.Wait(); ' +
              'if ($asyncResult.Result -eq [Windows.Security.Credentials.UI.UserConsentVerificationResult]::Verified) { Write-Output "verified" } else { Write-Output "denied" }',
          ],
          { windowsHide: false, timeout: 60000 },
          (err, stdout) => {
            if (err || !stdout.toString().trim().includes('verified')) {
              resolve(false)
            } else {
              lastAuthTime = Date.now()
              resolve(true)
            }
          }
        )
      }
    } else if (process.platform === 'linux') {
      execFile('pkexec', ['--disable-internal-agent', 'true'], { timeout: 60000 }, (err) => {
        lastAuthTime = Date.now()
        resolve(true)
      })
    } else {
      lastAuthTime = Date.now()
      resolve(true)
    }
  })
}

let neverSaveOrigins: Set<string> | null = null

async function loadNeverSaveOrigins(): Promise<Set<string>> {
  if (neverSaveOrigins) return neverSaveOrigins
  neverSaveOrigins = new Set()
  try {
    const creds = await keytar.findCredentials(NEVER_SAVE_SERVICE)
    for (const { account } of creds) {
      neverSaveOrigins.add(account)
    }
  } catch {}
  return neverSaveOrigins
}

export async function isNeverSaveOriginCheck(origin: string): Promise<boolean> {
  const set = await loadNeverSaveOrigins()
  return set.has(origin)
}

export async function findCredentialsForOrigin(
  origin: string
): Promise<Array<{ username: string; password: string }>> {
  const all = await keytar.findCredentials(SERVICE)
  const results: Array<{ username: string; password: string }> = []
  for (const { account, password } of all) {
    const [credOrigin] = account.split('|')
    if (credOrigin === origin) {
      try {
        const parsed = JSON.parse(password)
        const [, username] = account.split('|')
        results.push({ username, password: parsed.password })
      } catch {}
    }
  }
  return results
}

export const registerPasswordsHandlers = () => {
  handle('passwords:list', async (origin?: string) => {
    const all = await listAll()
    return origin ? all.filter((c) => c.origin === origin) : all
  })

  handle('passwords:get', async (id: string) => {
    const found = await keytar.getPassword(SERVICE, id)
    if (!found) throw new Error('Credential not found')
    const [origin, username] = id.split('|')
    const parsed = JSON.parse(found)
    return { id, origin, username, password: parsed.password, createdAt: parsed.createdAt || new Date().toISOString() }
  })

  handle('passwords:save', async (cred: { origin: string; username: string; password: string }) => {
    const origin = getOriginFromUrl(cred.origin)
    const id = makeId(origin, cred.username)
    const payload = JSON.stringify({ password: cred.password, createdAt: new Date().toISOString() })
    await keytar.setPassword(SERVICE, id, payload)
  })

  handle('passwords:update', async (id: string, patch: { username?: string; password?: string }) => {
    const existing = await keytar.getPassword(SERVICE, id)
    if (!existing) throw new Error('Credential not found')
    const [origin, oldUsername] = id.split('|')
    const parsed = JSON.parse(existing)
    const newUsername = patch.username ?? oldUsername
    const newPassword = patch.password ?? parsed.password
    const newId = makeId(origin, newUsername)
    const payload = JSON.stringify({ password: newPassword, createdAt: parsed.createdAt || new Date().toISOString() })
    if (newId !== id) {
      await keytar.deletePassword(SERVICE, id)
    }
    await keytar.setPassword(SERVICE, newId, payload)
  })

  handle('passwords:remove', async (id: string) => {
    await keytar.deletePassword(SERVICE, id)
  })

  handle(
    'passwords:importCsv',
    async (rows: Array<{ name?: string; url: string; username: string; password: string; note?: string }>) => {
      let imported = 0
      let skipped = 0
      for (const row of rows) {
        const origin = getOriginFromUrl(row.url)
        const username = row.username
        const password = row.password
        if (!origin || !username || !password) {
          skipped++
          continue
        }
        const id = makeId(origin, username)
        try {
          const existing = await keytar.getPassword(SERVICE, id)
          let createdAt = new Date().toISOString()
          if (existing) {
            try {
              const parsed = JSON.parse(existing)
              if (parsed && parsed.createdAt) createdAt = parsed.createdAt
            } catch {}
          }
          const payload = JSON.stringify({ password, createdAt })
          await keytar.setPassword(SERVICE, id, payload)
          imported++
        } catch {
          skipped++
        }
      }
      return { imported, skipped }
    }
  )

  handle('passwords:findForUrl', async (url: string) => {
    const origin = getOriginFromUrl(url)
    const all = await listAll()
    return all.filter((c) => c.origin === origin)
  })

  handle('passwords:verifyAuth', async () => {
    return verifySystemAuth()
  })

  handle('passwords:revealPassword', async (id: string) => {
    const verified = await verifySystemAuth()
    if (!verified) return null
    const found = await keytar.getPassword(SERVICE, id)
    if (!found) return null
    const parsed = JSON.parse(found)
    return parsed.password as string
  })

  handle('passwords:dismissSavePrompt', async (_origin: string) => {
    // No-op: the renderer just dismisses the prompt
  })

  handle('passwords:neverSaveForOrigin', async (origin: string) => {
    const set = await loadNeverSaveOrigins()
    set.add(origin)
    await keytar.setPassword(NEVER_SAVE_SERVICE, origin, '1')
  })

  handle('passwords:isNeverSaveOrigin', async (origin: string) => {
    const set = await loadNeverSaveOrigins()
    return set.has(origin)
  })
}
