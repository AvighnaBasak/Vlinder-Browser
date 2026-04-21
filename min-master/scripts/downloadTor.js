/*
  Downloads the Tor Expert Bundle for Windows and Linux.
  Run: node scripts/downloadTor.js [--platform=win32|linux] [--arch=x64|arm64]

  Downloads from the official Tor Project distribution.
  The binaries are placed in the tor/ directory at the project root,
  which gets included in the packaged app.
*/

const https = require('https')
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const DOWNLOAD_URLS = {
  'win32-x64': 'https://archive.torproject.org/tor-package-archive/torbrowser/14.0.4/tor-expert-bundle-windows-x86_64-14.0.4.tar.gz',
  'win32-ia32': 'https://archive.torproject.org/tor-package-archive/torbrowser/14.0.4/tor-expert-bundle-windows-i686-14.0.4.tar.gz',
  'linux-x64': 'https://archive.torproject.org/tor-package-archive/torbrowser/14.0.4/tor-expert-bundle-linux-x86_64-14.0.4.tar.gz',
  'linux-arm64': 'https://archive.torproject.org/tor-package-archive/torbrowser/14.0.4/tor-expert-bundle-linux-aarch64-14.0.4.tar.gz'
}

const torOutputDir = path.resolve(__dirname, '..', 'tor')

function getPlatformKey () {
  let platform = process.platform
  let arch = process.arch

  for (const arg of process.argv) {
    if (arg.startsWith('--platform=')) {
      platform = arg.split('=')[1]
    }
    if (arg.startsWith('--arch=')) {
      arch = arg.split('=')[1]
    }
  }

  return platform + '-' + arch
}

function downloadFile (url, destPath) {
  return new Promise((resolve, reject) => {
    console.log('Downloading: ' + url)

    const makeRequest = (requestUrl) => {
      https.get(requestUrl, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          makeRequest(response.headers.location)
          return
        }

        if (response.statusCode !== 200) {
          reject(new Error('Download failed with status: ' + response.statusCode))
          return
        }

        const totalSize = parseInt(response.headers['content-length'], 10) || 0
        let downloadedSize = 0

        const file = fs.createWriteStream(destPath)
        response.pipe(file)

        response.on('data', (chunk) => {
          downloadedSize += chunk.length
          if (totalSize > 0) {
            const percent = Math.round((downloadedSize / totalSize) * 100)
            process.stdout.write('\rProgress: ' + percent + '%')
          }
        })

        file.on('finish', () => {
          file.close()
          console.log('\nDownload complete.')
          resolve()
        })
      }).on('error', reject)
    }

    makeRequest(url)
  })
}

function extractTarGz (archivePath, outputDir) {
  console.log('Extracting to: ' + outputDir)

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  execFileSync('tar', ['-xzf', archivePath, '-C', outputDir], { stdio: 'inherit' })
}

function arrangeFiles () {
  const extractedTorDir = path.join(torOutputDir, 'tor')

  if (fs.existsSync(extractedTorDir)) {
    const files = fs.readdirSync(extractedTorDir)
    for (const file of files) {
      const src = path.join(extractedTorDir, file)
      const dest = path.join(torOutputDir, file)
      if (fs.statSync(src).isFile()) {
        fs.copyFileSync(src, dest)
      }
    }
    fs.rmSync(extractedTorDir, { recursive: true, force: true })
  }

  const dataDir = path.join(torOutputDir, 'data')
  if (fs.existsSync(dataDir)) {
    fs.rmSync(dataDir, { recursive: true, force: true })
  }

  if (process.platform !== 'win32') {
    const torBin = path.join(torOutputDir, 'tor')
    if (fs.existsSync(torBin)) {
      fs.chmodSync(torBin, 0o755)
    }
  }

  console.log('Tor files arranged in: ' + torOutputDir)
  console.log('Contents:')
  fs.readdirSync(torOutputDir).forEach(f => console.log('  ' + f))
}

async function main () {
  const platformKey = getPlatformKey()
  const url = DOWNLOAD_URLS[platformKey]

  if (!url) {
    console.error('No Tor download available for platform: ' + platformKey)
    console.error('Available platforms: ' + Object.keys(DOWNLOAD_URLS).join(', '))
    process.exit(1)
  }

  if (!fs.existsSync(torOutputDir)) {
    fs.mkdirSync(torOutputDir, { recursive: true })
  }

  const archivePath = path.join(torOutputDir, 'tor-expert-bundle.tar.gz')

  try {
    await downloadFile(url, archivePath)
    extractTarGz(archivePath, torOutputDir)
    arrangeFiles()
    fs.unlinkSync(archivePath)
    console.log('Tor expert bundle ready for platform: ' + platformKey)
  } catch (e) {
    console.error('Failed to download/extract Tor:', e)
    process.exit(1)
  }
}

main()
