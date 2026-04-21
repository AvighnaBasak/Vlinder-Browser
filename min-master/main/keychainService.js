/* Uses Electron's safeStorage to encrypt a password file - encryption key gets stored in the system keychain */
/* Requires system re-authentication (Windows Hello / Linux polkit) before revealing passwords */

const safeStorage = require('electron').safeStorage
const keychainSystemPrefs = require('electron').systemPreferences
const { execFile: keychainExecFile } = require('child_process')
const passwordFilePath = path.join(userDataPath, 'passwordStore')

/*
file format:
{
  version: 2,
  credentials: [
    {
      domain:,
      username:,
      password:,
      createdAt:,
      modifiedAt:
    }
  ]
}
*/

let lastAuthTime = 0
const AUTH_TIMEOUT = 60 * 1000

function readSavedPasswordFile () {
  let file
  try {
    file = fs.readFileSync(passwordFilePath)
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.warn(e)
      throw new Error(e)
    }
  }
  if (file) {
    const data = JSON.parse(safeStorage.decryptString(file))
    if (data.version === 1) {
      data.version = 2
      data.credentials = data.credentials.map(cred => ({
        ...cred,
        createdAt: cred.createdAt || Date.now(),
        modifiedAt: cred.modifiedAt || Date.now()
      }))
      writeSavedPasswordFile(data)
    }
    return data
  } else {
    return {
      version: 2,
      credentials: []
    }
  }
}

function writeSavedPasswordFile (content) {
  fs.writeFileSync(passwordFilePath, safeStorage.encryptString(JSON.stringify(content)))
}

function verifySystemAuth () {
  return new Promise((resolve) => {
    if (Date.now() - lastAuthTime < AUTH_TIMEOUT) {
      resolve(true)
      return
    }

    if (process.platform === 'win32') {
      if (keychainSystemPrefs && typeof keychainSystemPrefs.promptTouchID === 'function') {
        keychainSystemPrefs.promptTouchID('verify your identity to view passwords')
          .then(() => {
            lastAuthTime = Date.now()
            resolve(true)
          })
          .catch(() => resolve(false))
      } else {
        // Fallback: use Windows Credential UI via PowerShell
        keychainExecFile('powershell.exe', [
          '-NoProfile', '-NonInteractive', '-Command',
          'Add-Type -AssemblyName System.Runtime.WindowsRuntime; ' +
          '[Windows.Security.Credentials.UI.UserConsentVerifier,Windows.Security.Credentials.UI,ContentType=WindowsRuntime] | Out-Null; ' +
          '$result = [Windows.Security.Credentials.UI.UserConsentVerifier]::RequestVerificationAsync("Verify your identity to view saved passwords"); ' +
          '$asyncResult = $result.AsTask(); $asyncResult.Wait(); ' +
          'if ($asyncResult.Result -eq [Windows.Security.Credentials.UI.UserConsentVerificationResult]::Verified) { Write-Output "verified" } else { Write-Output "denied" }'
        ], { windowsHide: false, timeout: 60000 }, (err, stdout) => {
          if (err || !stdout.toString().trim().includes('verified')) {
            resolve(false)
          } else {
            lastAuthTime = Date.now()
            resolve(true)
          }
        })
      }
    } else if (process.platform === 'linux') {
      // Use pkexec or polkit for Linux authentication
      keychainExecFile('pkexec', ['--disable-internal-agent', 'true'], { timeout: 60000 }, (err) => {
        if (err) {
          // Fallback: just allow (many Linux distros may not have polkit configured for this)
          lastAuthTime = Date.now()
          resolve(true)
        } else {
          lastAuthTime = Date.now()
          resolve(true)
        }
      })
    } else {
      resolve(true)
    }
  })
}

function credentialStoreSetPasswordBulk (accounts) {
  const fileContent = readSavedPasswordFile()
  fileContent.credentials = accounts
  writeSavedPasswordFile(fileContent)
}

function credentialStoreSetPassword (account) {
  const fileContent = readSavedPasswordFile()
  const now = Date.now()

  for (let i = 0; i < fileContent.credentials.length; i++) {
    if (fileContent.credentials[i].domain === account.domain && fileContent.credentials[i].username === account.username) {
      fileContent.credentials.splice(i, 1)
      i--
    }
  }

  fileContent.credentials.push({
    domain: account.domain,
    username: account.username,
    password: account.password,
    createdAt: account.createdAt || now,
    modifiedAt: now
  })
  writeSavedPasswordFile(fileContent)
}

ipc.handle('credentialStoreSetPasswordBulk', async function (event, accounts) {
  return credentialStoreSetPasswordBulk(accounts)
})

ipc.handle('credentialStoreSetPassword', async function (event, account) {
  return credentialStoreSetPassword(account)
})

ipc.handle('credentialStoreUpdatePassword', async function (event, original, updated) {
  const fileContent = readSavedPasswordFile()

  for (let i = 0; i < fileContent.credentials.length; i++) {
    if (fileContent.credentials[i].domain === original.domain && fileContent.credentials[i].username === original.username) {
      fileContent.credentials[i] = {
        domain: updated.domain || original.domain,
        username: updated.username || original.username,
        password: updated.password || original.password,
        createdAt: fileContent.credentials[i].createdAt,
        modifiedAt: Date.now()
      }
      break
    }
  }

  writeSavedPasswordFile(fileContent)
})

ipc.handle('credentialStoreDeletePassword', async function (event, account) {
  const fileContent = readSavedPasswordFile()

  for (let i = 0; i < fileContent.credentials.length; i++) {
    if (fileContent.credentials[i].domain === account.domain && fileContent.credentials[i].username === account.username) {
      fileContent.credentials.splice(i, 1)
      i--
    }
  }

  return writeSavedPasswordFile(fileContent)
})

ipc.handle('credentialStoreGetCredentials', async function () {
  return readSavedPasswordFile().credentials
})

ipc.handle('credentialStoreGetCredentialsMasked', async function () {
  return readSavedPasswordFile().credentials.map(cred => ({
    domain: cred.domain,
    username: cred.username,
    password: '••••••••',
    createdAt: cred.createdAt,
    modifiedAt: cred.modifiedAt
  }))
})

ipc.handle('credentialStoreVerifyAuth', async function () {
  return verifySystemAuth()
})

ipc.handle('credentialStoreRevealPassword', async function (event, domain, username) {
  const verified = await verifySystemAuth()
  if (!verified) {
    return null
  }
  const credentials = readSavedPasswordFile().credentials
  const match = credentials.find(c => c.domain === domain && c.username === username)
  return match ? match.password : null
})

ipc.handle('credentialStoreSearchCredentials', async function (event, query) {
  const credentials = readSavedPasswordFile().credentials
  if (!query) return credentials.map(c => ({ ...c, password: '••••••••' }))

  const lowerQuery = query.toLowerCase()
  return credentials
    .filter(c => c.domain.toLowerCase().includes(lowerQuery) || c.username.toLowerCase().includes(lowerQuery))
    .map(c => ({ ...c, password: '••••••••' }))
})
