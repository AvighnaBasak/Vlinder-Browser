import keytar from 'keytar'
import { handle } from '@/lib/main/shared'

const SERVICE = 'vlinder:passwords'

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
    // If username changes, delete old and write new
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
          // Preserve createdAt if updating existing credential
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
}
