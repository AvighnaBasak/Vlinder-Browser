/* Tor integration - manages bundled Tor daemon lifecycle and SOCKS5 proxy routing */

const { spawn: torSpawn } = require('child_process')
const nodeNet = require('net')

const torDataDir = path.join(userDataPath, 'tor-data')
const torBinDir = path.join(__dirname, 'tor')

let torProcess = null
let torState = 'disconnected' // disconnected | connecting | connected | error
let torSocksPort = 9150
let bootstrapProgress = 0

function getTorBinaryPath () {
  if (process.platform === 'win32') {
    return path.join(torBinDir, 'tor.exe')
  } else {
    return path.join(torBinDir, 'tor')
  }
}

function ensureDataDir () {
  if (!fs.existsSync(torDataDir)) {
    fs.mkdirSync(torDataDir, { recursive: true })
  }
}

function isTorBinaryAvailable () {
  return fs.existsSync(getTorBinaryPath())
}

function findAvailablePort (startPort) {
  return new Promise((resolve, reject) => {
    const server = nodeNet.createServer()
    server.listen(startPort, '127.0.0.1', () => {
      const port = server.address().port
      server.close(() => resolve(port))
    })
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1))
    })
  })
}

async function startTor () {
  if (torProcess) {
    return
  }

  if (!isTorBinaryAvailable()) {
    torState = 'error'
    broadcastTorStatus()
    console.error('Tor binary not found at: ' + getTorBinaryPath())
    return
  }

  ensureDataDir()

  torSocksPort = await findAvailablePort(9150)
  const controlPort = await findAvailablePort(torSocksPort + 1)

  torState = 'connecting'
  bootstrapProgress = 0
  broadcastTorStatus()

  const torArgs = [
    '--SocksPort', String(torSocksPort),
    '--ControlPort', String(controlPort),
    '--DataDirectory', torDataDir,
    '--GeoIPFile', path.join(torBinDir, 'geoip'),
    '--GeoIPv6File', path.join(torBinDir, 'geoip6'),
    '--Log', 'notice stdout',
    '--ClientOnly', '1',
    '--SafeSocks', '1'
  ]

  try {
    torProcess = torSpawn(getTorBinaryPath(), torArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    })
  } catch (e) {
    torState = 'error'
    broadcastTorStatus()
    console.error('Failed to start Tor:', e)
    return
  }

  torProcess.stdout.on('data', (data) => {
    const output = data.toString()
    const bootstrapMatch = output.match(/Bootstrapped (\d+)%/)
    if (bootstrapMatch) {
      bootstrapProgress = parseInt(bootstrapMatch[1])
      if (bootstrapProgress === 100) {
        torState = 'connected'
        applyTorProxy()
      }
      broadcastTorStatus()
    }
  })

  torProcess.stderr.on('data', (data) => {
    console.error('Tor stderr:', data.toString())
  })

  torProcess.on('exit', (code) => {
    torProcess = null
    if (torState !== 'disconnected') {
      torState = code === 0 ? 'disconnected' : 'error'
      removeTorProxy()
      broadcastTorStatus()
    }
  })

  torProcess.on('error', (err) => {
    console.error('Tor process error:', err)
    torProcess = null
    torState = 'error'
    removeTorProxy()
    broadcastTorStatus()
  })
}

function stopTor () {
  if (torProcess) {
    torState = 'disconnected'
    bootstrapProgress = 0
    try {
      torProcess.kill('SIGTERM')
    } catch (e) {
      try {
        torProcess.kill('SIGKILL')
      } catch (e2) {}
    }
    torProcess = null
    removeTorProxy()
    broadcastTorStatus()
  }
}

function applyTorProxy () {
  const proxyRules = 'socks5://127.0.0.1:' + torSocksPort
  webContents.getAllWebContents().forEach(wc => {
    if (wc.session) {
      wc.session.setProxy({ proxyRules, proxyBypassRules: '' })
    }
  })
}

function removeTorProxy () {
  // Restore the user's configured proxy settings (if any) instead of clearing to empty
  const userProxy = settings.get('proxy') || {}
  let restoreConfig = {}
  if (userProxy.type === 1) {
    restoreConfig = { proxyRules: userProxy.proxyRules, proxyBypassRules: userProxy.proxyBypassRules }
  } else if (userProxy.type === 2) {
    restoreConfig = { pacScript: userProxy.pacScript }
  }
  webContents.getAllWebContents().forEach(wc => {
    if (wc.session) {
      wc.session.setProxy(restoreConfig)
    }
  })
}

function broadcastTorStatus () {
  const status = {
    state: torState,
    progress: bootstrapProgress,
    port: torSocksPort,
    binaryAvailable: isTorBinaryAvailable()
  }
  webContents.getAllWebContents().forEach(wc => {
    try {
      wc.send('tor-status-update', status)
    } catch (e) {}
  })
}

function getTorStatus () {
  return {
    state: torState,
    progress: bootstrapProgress,
    port: torSocksPort,
    binaryAvailable: isTorBinaryAvailable()
  }
}

ipc.handle('tor-get-status', async function () {
  return getTorStatus()
})

ipc.handle('tor-start', async function () {
  await startTor()
  return getTorStatus()
})

ipc.handle('tor-stop', async function () {
  stopTor()
  return getTorStatus()
})

ipc.handle('tor-check-binary', async function () {
  return isTorBinaryAvailable()
})

settings.listen('torEnabled', async (value) => {
  if (value === true) {
    await startTor()
  } else {
    stopTor()
  }
})

app.on('before-quit', () => {
  stopTor()
})

app.on('ready', () => {
  if (settings.get('torEnabled') === true) {
    startTor()
  }
})
