import { Session, app } from 'electron'
import { execFile, ChildProcess } from 'child_process'
import { existsSync, mkdirSync, createWriteStream, chmodSync, readdirSync, statSync } from 'fs'
import { join, basename } from 'path'
import { createConnection } from 'net'
import { createGunzip } from 'zlib'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { extract } from 'tar'
import { createReadStream } from 'fs'

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

const TOR_SOCKS_PORT = 9050
const TOR_CONTROL_PORT = 9051

const TOR_VERSION = '15.0.10'

function getTorDir(): string {
  return join(app.getPath('userData'), 'tor')
}

function getBundledTorBinary(): string | null {
  const torDir = getTorDir()
  if (!existsSync(torDir)) return null

  if (process.platform === 'win32') {
    const torExe = join(torDir, 'tor', 'tor.exe')
    if (existsSync(torExe)) return torExe
    // Search recursively for tor.exe
    const found = findFileRecursive(torDir, 'tor.exe')
    if (found) return found
  } else {
    const torBin = join(torDir, 'tor', 'tor')
    if (existsSync(torBin)) return torBin
    const found = findFileRecursive(torDir, 'tor')
    if (found) return found
  }
  return null
}

function findFileRecursive(dir: string, filename: string): string | null {
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const full = join(dir, entry)
      try {
        const stat = statSync(full)
        if (stat.isFile() && entry === filename) return full
        if (stat.isDirectory()) {
          const found = findFileRecursive(full, filename)
          if (found) return found
        }
      } catch { continue }
    }
  } catch { /* dir not readable */ }
  return null
}

function findSystemTorBinary(): string | null {
  const candidates: string[] = []

  if (process.platform === 'win32') {
    candidates.push(
      'C:\\Program Files\\Tor Browser\\Browser\\TorBrowser\\Tor\\tor.exe',
      'C:\\Program Files (x86)\\Tor Browser\\Browser\\TorBrowser\\Tor\\tor.exe',
      join(app.getPath('home'), 'Desktop', 'Tor Browser', 'Browser', 'TorBrowser', 'Tor', 'tor.exe'),
      join(app.getPath('home'), 'OneDrive', 'Desktop', 'Tor Browser', 'Browser', 'TorBrowser', 'Tor', 'tor.exe'),
    )
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Tor Browser.app/Contents/MacOS/Tor/tor.app/Contents/MacOS/tor',
      '/opt/homebrew/bin/tor',
      '/usr/local/bin/tor',
    )
  } else {
    candidates.push('/usr/bin/tor', '/usr/local/bin/tor', '/snap/bin/tor')
  }

  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return null
}

function getTorDownloadUrl(): { url: string; filename: string } {
  const platform = process.platform
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64'

  if (platform === 'win32') {
    const filename = `tor-expert-bundle-windows-${arch}-${TOR_VERSION}.tar.gz`
    return {
      url: `https://dist.torproject.org/torbrowser/${TOR_VERSION}/${filename}`,
      filename,
    }
  } else if (platform === 'darwin') {
    const filename = `tor-expert-bundle-macos-${arch}-${TOR_VERSION}.tar.gz`
    return {
      url: `https://dist.torproject.org/torbrowser/${TOR_VERSION}/${filename}`,
      filename,
    }
  } else {
    const filename = `tor-expert-bundle-linux-${arch}-${TOR_VERSION}.tar.gz`
    return {
      url: `https://dist.torproject.org/torbrowser/${TOR_VERSION}/${filename}`,
      filename,
    }
  }
}

function isTorRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port: TOR_SOCKS_PORT }, () => {
      socket.destroy()
      resolve(true)
    })
    socket.on('error', () => resolve(false))
    socket.setTimeout(2000, () => {
      socket.destroy()
      resolve(false)
    })
  })
}

async function fetchExitIp(): Promise<string | null> {
  try {
    const { net } = await import('electron')
    return new Promise((resolve) => {
      const request = net.request({
        url: 'https://check.torproject.org/api/ip',
        method: 'GET',
        partition: 'persist:unified-session',
      })
      let data = ''
      request.on('response', (response) => {
        response.on('data', (chunk) => { data += chunk.toString() })
        response.on('end', () => {
          try { resolve(JSON.parse(data).IP || null) }
          catch { resolve(null) }
        })
      })
      request.on('error', () => resolve(null))
      request.end()
    })
  } catch { return null }
}

class TorProxy {
  private torProcess: ChildProcess | null = null
  private enabled = false
  private connecting = false
  private downloading = false
  private downloadProgress = 0
  private exitIp: string | null = null
  private managedProcess = false

  async enable(session: Session): Promise<{ success: boolean; ip?: string; error?: string }> {
    if (this.enabled) return { success: true, ip: this.exitIp || undefined }

    this.connecting = true

    const alreadyRunning = await isTorRunning()

    if (!alreadyRunning) {
      let torBin = getBundledTorBinary() || findSystemTorBinary()

      if (!torBin) {
        // Download Tor expert bundle
        try {
          torBin = await this.downloadTor()
        } catch (err: any) {
          this.connecting = false
          this.downloading = false
          return { success: false, error: `Failed to download Tor: ${err.message}` }
        }
      }

      try {
        await this.startTorProcess(torBin)
        this.managedProcess = true
      } catch (err: any) {
        this.connecting = false
        return { success: false, error: `Failed to start Tor: ${err.message}` }
      }
    }

    try {
      await session.setProxy({
        proxyRules: `socks5://127.0.0.1:${TOR_SOCKS_PORT}`,
        proxyBypassRules: '<local>',
      })
    } catch (err: any) {
      this.connecting = false
      return { success: false, error: `Failed to set proxy: ${err.message}` }
    }

    this.enabled = true
    this.connecting = false

    this.exitIp = await fetchExitIp()

    const s = await initStore()
    s.set('vpnEnabled', true)

    return { success: true, ip: this.exitIp || undefined }
  }

  async disable(session: Session): Promise<void> {
    await session.setProxy({ proxyRules: '' })
    this.enabled = false
    this.exitIp = null

    if (this.torProcess && this.managedProcess) {
      this.torProcess.kill()
      this.torProcess = null
      this.managedProcess = false
    }

    const s = await initStore()
    s.set('vpnEnabled', false)
  }

  async newIdentity(session: Session): Promise<{ success: boolean; ip?: string; error?: string }> {
    if (!this.enabled) return { success: false, error: 'VPN not enabled' }

    try {
      await this.sendControlSignal('SIGNAL NEWNYM')
      await new Promise((r) => setTimeout(r, 3000))
      this.exitIp = await fetchExitIp()
      return { success: true, ip: this.exitIp || undefined }
    } catch {
      await session.setProxy({ proxyRules: '' })
      await new Promise((r) => setTimeout(r, 500))
      await session.setProxy({
        proxyRules: `socks5://127.0.0.1:${TOR_SOCKS_PORT}`,
        proxyBypassRules: '<local>',
      })
      await new Promise((r) => setTimeout(r, 2000))
      this.exitIp = await fetchExitIp()
      return { success: true, ip: this.exitIp || undefined }
    }
  }

  getStatus(): { enabled: boolean; connecting: boolean; downloading: boolean; progress: number; ip: string | null } {
    return {
      enabled: this.enabled,
      connecting: this.connecting,
      downloading: this.downloading,
      progress: this.downloadProgress,
      ip: this.exitIp,
    }
  }

  private async downloadTor(): Promise<string> {
    this.downloading = true
    this.downloadProgress = 0

    const { url, filename } = getTorDownloadUrl()
    const torDir = getTorDir()

    if (!existsSync(torDir)) {
      mkdirSync(torDir, { recursive: true })
    }

    const archivePath = join(torDir, filename)

    // Download the archive using Electron's net module (respects proxy settings)
    const { net } = await import('electron')

    await new Promise<void>((resolve, reject) => {
      const request = net.request({ url, method: 'GET' })

      request.on('response', (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${response.statusCode}`))
          return
        }

        const totalBytes = parseInt(response.headers['content-length'] as string, 10) || 0
        let receivedBytes = 0
        const fileStream = createWriteStream(archivePath)

        response.on('data', (chunk) => {
          receivedBytes += chunk.length
          if (totalBytes > 0) {
            this.downloadProgress = Math.round((receivedBytes / totalBytes) * 100)
          }
          fileStream.write(chunk)
        })

        response.on('end', () => {
          fileStream.end(() => resolve())
        })

        response.on('error', (err) => {
          fileStream.close()
          reject(err)
        })
      })

      request.on('error', (err) => reject(err))
      request.end()
    })

    // Extract the tar.gz archive
    this.downloadProgress = 100

    await extract({
      file: archivePath,
      cwd: torDir,
    })

    // Clean up archive
    try {
      const { unlinkSync } = await import('fs')
      unlinkSync(archivePath)
    } catch { /* ignore cleanup failures */ }

    // Find the extracted tor binary
    const torBin = getBundledTorBinary()
    if (!torBin) {
      throw new Error('Tor binary not found after extraction')
    }

    // Make executable on Unix
    if (process.platform !== 'win32') {
      try { chmodSync(torBin, 0o755) } catch { /* ignore */ }
    }

    this.downloading = false
    this.downloadProgress = 0

    return torBin
  }

  private startTorProcess(torBin: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const dataDir = join(app.getPath('userData'), 'tor-data')
      if (!existsSync(dataDir)) {
        mkdirSync(dataDir, { recursive: true })
      }

      // Set working directory to the tor binary's directory so it can find its libs
      const torWorkDir = join(torBin, '..')

      this.torProcess = execFile(
        torBin,
        ['--SocksPort', String(TOR_SOCKS_PORT), '--DataDirectory', dataDir],
        { windowsHide: true, cwd: torWorkDir },
      )

      let resolved = false
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          reject(new Error('Tor startup timed out after 45s'))
        }
      }, 45000)

      const poll = setInterval(async () => {
        if (resolved) { clearInterval(poll); return }
        const running = await isTorRunning()
        if (running) {
          clearInterval(poll)
          clearTimeout(timeout)
          if (!resolved) { resolved = true; resolve() }
        }
      }, 1000)

      this.torProcess.on('error', (err) => {
        clearInterval(poll)
        clearTimeout(timeout)
        if (!resolved) { resolved = true; reject(err) }
      })

      this.torProcess.on('exit', (code) => {
        clearInterval(poll)
        clearTimeout(timeout)
        if (!resolved) { resolved = true; reject(new Error(`Tor exited with code ${code}`)) }
      })
    })
  }

  private sendControlSignal(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = createConnection({ host: '127.0.0.1', port: TOR_CONTROL_PORT }, () => {
        socket.write(`AUTHENTICATE\r\n${command}\r\nQUIT\r\n`)
      })
      let data = ''
      socket.on('data', (chunk) => { data += chunk.toString() })
      socket.on('end', () => resolve(data))
      socket.on('error', (err) => reject(err))
      socket.setTimeout(5000, () => {
        socket.destroy()
        reject(new Error('Control port timeout'))
      })
    })
  }
}

export const torProxy = new TorProxy()
