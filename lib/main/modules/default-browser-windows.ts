import path from 'path'
import { readFile, writeFile, unlink } from 'fs/promises'
import { exec } from 'child_process'
import { app } from 'electron'

// --- Configuration: Define your Application Details ---
const APP_NAME_SHORT = 'vlinder' // CHANGE THIS: e.g., "myapp", "myeditor" (no spaces!)
const APP_NAME = 'Vlinder' // Use the product name from package.json
const APP_DESCRIPTION = 'A unified social media platform browser with modern design.' // CHANGE THIS if needed

// --- Association Data (from your JSON example) ---
const associations = {
  protocols: [
    {
      name: 'HyperText Transfer Protocol',
      schemes: ['http', 'https'],
    },
    // Add other protocols here if needed
    // { name: "File Transfer Protocol", schemes: ["ftp"] }
  ],
  fileAssociations: [
    { ext: 'htm', name: 'HyperText Markup File', role: 'Viewer' },
    { ext: 'html', description: 'HTML Document', role: 'Viewer' },
    { ext: 'mhtml', description: 'MHTML Document', role: 'Viewer' },
    { ext: 'shtml', name: 'HyperText Markup File', role: 'Viewer' },
    { ext: 'xhtml', name: 'Extensible HyperText Markup File', role: 'Viewer' },
    { ext: 'xhtm', name: 'Extensible HyperText Markup File', role: 'Viewer' },
    { ext: 'pdf', description: 'PDF Document', role: 'Viewer' },
    // Add other file types here if needed
    // { ext: "txt", description: "Text Document", role: "Editor" }
  ],
}

// --- Paths ---
// Path to the *template* batch script
const scriptTemplatePath = path.join(
  app.isPackaged ? process.resourcesPath : path.join(__dirname, '../../resources/build'),
  'default-app',
  'register_app_user_template.bat'
)
const appExecutablePath = process.execPath
const tempDir = app.getPath('temp')
// Temporary file for the *finalized* script
const tempFile = path.join(tempDir, `register_${APP_NAME_SHORT}_final.bat`)

// --- Fallback Registration Function ---
async function registerWithoutTemplate(): Promise<boolean> {
  // Create a minimal batch script for registration
  const minimalScript = `@echo off
setlocal enabledelayedexpansion

set "APP_PATH=${appExecutablePath}"
set "APP_NAME_SHORT=${APP_NAME_SHORT}"
set "APP_NAME=${APP_NAME}"
set "APP_DESCRIPTION=${APP_DESCRIPTION}"

set "APP_ICON=\\"%APP_PATH%\\",0"
set "APP_ARGS=\\"%APP_PATH%\\" \\"%%1\\""
set "APP_OPEN_CMD=\\"%APP_PATH%\\""

echo Registering "%APP_NAME%" for the current user...

rem Define handler for file types
reg add "HKCU\\Software\\Classes\\%APP_NAME_SHORT%File" /v "" /t REG_SZ /d "%APP_NAME% File" /f >nul
reg add "HKCU\\Software\\Classes\\%APP_NAME_SHORT%File\\DefaultIcon" /v "" /t REG_SZ /d "%APP_ICON%" /f >nul
reg add "HKCU\\Software\\Classes\\%APP_NAME_SHORT%File\\shell\\open\\command" /v "" /t REG_SZ /d "%APP_ARGS%" /f >nul
rem Add Application entry for proper app identification
reg add "HKCU\\Software\\Classes\\%APP_NAME_SHORT%File\\Application" /v "ApplicationIcon" /t REG_SZ /d "%APP_ICON%" /f >nul
reg add "HKCU\\Software\\Classes\\%APP_NAME_SHORT%File\\Application" /v "ApplicationName" /t REG_SZ /d "%APP_NAME%" /f >nul
reg add "HKCU\\Software\\Classes\\%APP_NAME_SHORT%File\\Application" /v "AppUserModelId" /t REG_SZ /d "com.avighnabasak.vlinder" /f >nul

rem Define handler for URL protocols
reg add "HKCU\\Software\\Classes\\%APP_NAME_SHORT%URL" /v "" /t REG_SZ /d "%APP_NAME% Protocol" /f >nul
reg add "HKCU\\Software\\Classes\\%APP_NAME_SHORT%URL" /v "EditFlags" /t REG_DWORD /d "2" /f >nul
reg add "HKCU\\Software\\Classes\\%APP_NAME_SHORT%URL" /v "FriendlyTypeName" /t REG_SZ /d "%APP_NAME% Protocol" /f >nul
reg add "HKCU\\Software\\Classes\\%APP_NAME_SHORT%URL" /v "URL Protocol" /t REG_SZ /d "" /f >nul
reg add "HKCU\\Software\\Classes\\%APP_NAME_SHORT%URL\\DefaultIcon" /v "" /t REG_SZ /d "%APP_ICON%" /f >nul
reg add "HKCU\\Software\\Classes\\%APP_NAME_SHORT%URL\\shell\\open\\command" /v "" /t REG_SZ /d "%APP_ARGS%" /f >nul
rem Add Application entry for proper app identification
reg add "HKCU\\Software\\Classes\\%APP_NAME_SHORT%URL\\Application" /v "ApplicationIcon" /t REG_SZ /d "%APP_ICON%" /f >nul
reg add "HKCU\\Software\\Classes\\%APP_NAME_SHORT%URL\\Application" /v "ApplicationName" /t REG_SZ /d "%APP_NAME%" /f >nul
reg add "HKCU\\Software\\Classes\\%APP_NAME_SHORT%URL\\Application" /v "AppUserModelId" /t REG_SZ /d "com.avighnabasak.vlinder" /f >nul

rem Register with Default Programs
reg add "HKCU\\Software\\RegisteredApplications" /v "%APP_NAME_SHORT%" /t REG_SZ /d "Software\\Clients\\StartMenuInternet\\%APP_NAME_SHORT%\\Capabilities" /f >nul

rem Register as Start Menu Internet client
reg add "HKCU\\Software\\Clients\\StartMenuInternet\\%APP_NAME_SHORT%" /v "" /t REG_SZ /d "%APP_NAME%" /f >nul
reg add "HKCU\\Software\\Clients\\StartMenuInternet\\%APP_NAME_SHORT%\\DefaultIcon" /v "" /t REG_SZ /d "%APP_ICON%" /f >nul
reg add "HKCU\\Software\\Clients\\StartMenuInternet\\%APP_NAME_SHORT%\\shell\\open\\command" /v "" /t REG_SZ /d "%APP_OPEN_CMD%" /f >nul
reg add "HKCU\\Software\\Clients\\StartMenuInternet\\%APP_NAME_SHORT%\\InstallInfo" /v "IconsVisible" /t REG_DWORD /d "1" /f >nul

rem Define capabilities
reg add "HKCU\\Software\\Clients\\StartMenuInternet\\%APP_NAME_SHORT%\\Capabilities" /v "ApplicationIcon" /t REG_SZ /d "%APP_ICON%" /f >nul
reg add "HKCU\\Software\\Clients\\StartMenuInternet\\%APP_NAME_SHORT%\\Capabilities" /v "ApplicationName" /t REG_SZ /d "%APP_NAME%" /f >nul
reg add "HKCU\\Software\\Clients\\StartMenuInternet\\%APP_NAME_SHORT%\\Capabilities" /v "ApplicationDescription" /t REG_SZ /d "%APP_DESCRIPTION%" /f >nul

rem Add Start Menu capability
reg add "HKCU\\Software\\Clients\\StartMenuInternet\\%APP_NAME_SHORT%\\Capabilities\\StartMenu" /v "StartMenuInternet" /t REG_SZ /d "%APP_NAME_SHORT%" /f >nul

rem File associations (Capabilities)
reg add "HKCU\\Software\\Clients\\StartMenuInternet\\%APP_NAME_SHORT%\\Capabilities\\FileAssociations" /v ".html" /t REG_SZ /d "%APP_NAME_SHORT%File" /f >nul
reg add "HKCU\\Software\\Clients\\StartMenuInternet\\%APP_NAME_SHORT%\\Capabilities\\FileAssociations" /v ".htm" /t REG_SZ /d "%APP_NAME_SHORT%File" /f >nul
reg add "HKCU\\Software\\Clients\\StartMenuInternet\\%APP_NAME_SHORT%\\Capabilities\\FileAssociations" /v ".xhtml" /t REG_SZ /d "%APP_NAME_SHORT%File" /f >nul
reg add "HKCU\\Software\\Clients\\StartMenuInternet\\%APP_NAME_SHORT%\\Capabilities\\FileAssociations" /v ".xhtm" /t REG_SZ /d "%APP_NAME_SHORT%File" /f >nul
reg add "HKCU\\Software\\Clients\\StartMenuInternet\\%APP_NAME_SHORT%\\Capabilities\\FileAssociations" /v ".mhtml" /t REG_SZ /d "%APP_NAME_SHORT%File" /f >nul
reg add "HKCU\\Software\\Clients\\StartMenuInternet\\%APP_NAME_SHORT%\\Capabilities\\FileAssociations" /v ".shtml" /t REG_SZ /d "%APP_NAME_SHORT%File" /f >nul

rem URL associations (Capabilities)
reg add "HKCU\\Software\\Clients\\StartMenuInternet\\%APP_NAME_SHORT%\\Capabilities\\URLAssociations" /v "http" /t REG_SZ /d "%APP_NAME_SHORT%URL" /f >nul
reg add "HKCU\\Software\\Clients\\StartMenuInternet\\%APP_NAME_SHORT%\\Capabilities\\URLAssociations" /v "https" /t REG_SZ /d "%APP_NAME_SHORT%URL" /f >nul

rem Set actual default file associations
reg add "HKCU\\Software\\Classes\\.html" /v "" /t REG_SZ /d "%APP_NAME_SHORT%File" /f >nul
reg add "HKCU\\Software\\Classes\\.html\\OpenWithProgIds" /v "%APP_NAME_SHORT%File" /t REG_SZ /d "" /f >nul
reg add "HKCU\\Software\\Classes\\.htm" /v "" /t REG_SZ /d "%APP_NAME_SHORT%File" /f >nul
reg add "HKCU\\Software\\Classes\\.htm\\OpenWithProgIds" /v "%APP_NAME_SHORT%File" /t REG_SZ /d "" /f >nul

rem Set actual default URL associations
reg add "HKCU\\Software\\Classes\\http" /v "" /t REG_SZ /d "%APP_NAME_SHORT%URL" /f >nul
reg add "HKCU\\Software\\Classes\\http\\OpenWithProgIds" /v "%APP_NAME_SHORT%URL" /t REG_SZ /d "" /f >nul
reg add "HKCU\\Software\\Classes\\https" /v "" /t REG_SZ /d "%APP_NAME_SHORT%URL" /f >nul
reg add "HKCU\\Software\\Classes\\https\\OpenWithProgIds" /v "%APP_NAME_SHORT%URL" /t REG_SZ /d "" /f >nul

echo Registration complete for "%APP_NAME%".
echo Opening Default Apps settings...
start "" ms-settings:defaultapps
`

  try {
    // Write the minimal script to a temporary file
    await writeFile(tempFile, minimalScript, 'utf-8')

    // Execute the minimal script
    const command = `Powershell -NoProfile -ExecutionPolicy Bypass -Command "$result = Start-Process -FilePath '${tempFile}' -PassThru -Wait; Write-Host 'Process completed with exit code: ' $result.ExitCode;"`

    return new Promise((resolve) => {
      exec(command, async (err, stdout) => {
        if (err) {
          console.error('Error executing minimal registration script:', err.message)
          resolve(false)
        } else {
          resolve(true)
        }

        // Clean up the temporary file
        try {
          await unlink(tempFile)
        } catch (unlinkError) {
          // Could not delete temporary script file
        }
      })
    })
  } catch (error) {
    console.error('Failed to create minimal registration script:', error)
    return false
  }
}

// --- Function to Register ---
export async function registerAppForCurrentUserOnWindows(): Promise<boolean> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    let scriptTemplate: string
    try {
      // 1. Read the contents of the template batch script
      scriptTemplate = await readFile(scriptTemplatePath, 'utf-8')
    } catch (readError) {
      console.error(`Error reading script template at ${scriptTemplatePath}:`, readError)

      // Fallback: Try to create a minimal registration without the template
      try {
        const success = await registerWithoutTemplate()
        resolve(success)
        return
      } catch (fallbackError) {
        console.error('Fallback registration also failed:', fallbackError)
        resolve(false)
        return
      }
    }

    // 2. Generate File Association registry commands (for Capabilities)
    const fileAssocLines = associations.fileAssociations
      .map(
        (assoc) =>
          // Note: Registry paths need double backslashes in JS strings
          // The value name is the extension (e.g., ".html")
          // The value data points to the handler we defined (%APP_NAME_SHORT%File)
          `reg add "HKCU\\Software\\Clients\\StartMenuInternet\\%APP_NAME_SHORT%\\Capabilities\\FileAssociations" /v ".${assoc.ext}" /t REG_SZ /d "%APP_NAME_SHORT%File" /f >nul`
      )
      .join('\r\n') // Use Windows line endings for batch scripts

    // 3. Generate URL Association registry commands (for Capabilities)
    const urlAssocLines = associations.protocols
      .flatMap(
        (
          proto // Use flatMap to handle nested schemes array easily
        ) =>
          proto.schemes.map(
            (scheme) =>
              // The value name is the scheme (e.g., "http")
              // The value data points to the handler we defined (%APP_NAME_SHORT%URL)
              `reg add "HKCU\\Software\\Clients\\StartMenuInternet\\%APP_NAME_SHORT%\\Capabilities\\URLAssociations" /v "${scheme}" /t REG_SZ /d "%APP_NAME_SHORT%URL" /f >nul`
          )
      )
      .join('\r\n') // Use Windows line endings

    // 4. Generate actual default file associations (sets the default handler)
    const defaultFileAssocLines = associations.fileAssociations
      .map((assoc) => {
        const ext = assoc.ext
        return `rem Set default handler for .${ext} files
reg add "HKCU\\Software\\Classes\\.${ext}" /v "" /t REG_SZ /d "%APP_NAME_SHORT%File" /f >nul
reg add "HKCU\\Software\\Classes\\.${ext}\\OpenWithProgIds" /v "%APP_NAME_SHORT%File" /t REG_SZ /d "" /f >nul`
      })
      .join('\r\n\r\n')

    // 5. Generate actual default URL associations (sets the default handler)
    const defaultUrlAssocLines = associations.protocols
      .flatMap((proto) =>
        proto.schemes.map((scheme) => {
          return `rem Set default handler for ${scheme}:// protocol
reg add "HKCU\\Software\\Classes\\${scheme}" /v "" /t REG_SZ /d "%APP_NAME_SHORT%URL" /f >nul
reg add "HKCU\\Software\\Classes\\${scheme}\\OpenWithProgIds" /v "%APP_NAME_SHORT%URL" /t REG_SZ /d "" /f >nul`
        })
      )
      .join('\r\n\r\n')

    // 6. Inject generated commands into the template
    let finalScriptContents = scriptTemplate.replace(
      'REM <<FILE_ASSOCIATIONS_PLACEHOLDER>>',
      fileAssocLines || 'rem No file associations defined.' // Add fallback comment
    )
    finalScriptContents = finalScriptContents.replace(
      'REM <<URL_ASSOCIATIONS_PLACEHOLDER>>',
      urlAssocLines || 'rem No URL associations defined.' // Add fallback comment
    )
    finalScriptContents = finalScriptContents.replace(
      'REM <<DEFAULT_FILE_ASSOCIATIONS_PLACEHOLDER>>',
      defaultFileAssocLines || 'rem No default file associations defined.'
    )
    finalScriptContents = finalScriptContents.replace(
      'REM <<DEFAULT_URL_ASSOCIATIONS_PLACEHOLDER>>',
      defaultUrlAssocLines || 'rem No default URL associations defined.'
    )

    // --- Write and Execute Final Script ---
    try {
      // 5. Write the *finalized* script contents to the temporary file
      await writeFile(tempFile, finalScriptContents, 'utf-8')
    } catch (writeError) {
      console.error(`Error writing temporary script file to ${tempFile}:`, writeError)
      resolve(false)
      return
    }

    // 6. Prepare arguments for the batch script
    const arg1 = `"""${appExecutablePath}"""`
    const arg2 = `"${APP_NAME_SHORT}"`
    const arg3 = `"""${APP_NAME}"""`
    const arg4 = `"""${APP_DESCRIPTION}"""`

    // 7. Construct the execution command (NO -Verb Runas)
    const command = `Powershell -NoProfile -ExecutionPolicy Bypass -Command "$result = Start-Process -FilePath '${tempFile}' -ArgumentList ${arg1}, ${arg2}, ${arg3}, ${arg4} -PassThru -Wait; Write-Host 'Process completed with exit code: ' $result.ExitCode; Write-Host 'Press any key to continue...';"`

    // 8. Execute the command
    exec(command, async (err, stdout) => {
      if (err) {
        console.error('Error executing registration script:', err.message)
        resolve(false)
      } else {
        resolve(true)
      }

      // 9. Clean up the temporary file
      try {
        await unlink(tempFile)
      } catch (unlinkError) {
        // Could not delete temporary script file
      }
    })
  })
}
