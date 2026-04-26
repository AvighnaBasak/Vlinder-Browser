import React from 'react'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary'
import { WindowTopBar } from './components/layout/WindowTopBar'
import { WindowTopBarProvider } from './components/layout/WindowTopBarContext'
import { AppWithTopBar } from './components/layout/AppWithTopBar'
import App from './app'
import { loadAndApplyTheme } from './utils/themes'

loadAndApplyTheme()

// Handle drag-and-drop: allow the drop cursor and route dropped URLs/files to the active webview
document.addEventListener('dragover', (e) => {
  e.preventDefault()
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'copy'
  }
})
document.addEventListener('drop', (e) => {
  e.preventDefault()
  if (!e.dataTransfer) return

  let url: string | null = null

  // Check for a dragged URL (text/uri-list or plain text link)
  const uriList = e.dataTransfer.getData('text/uri-list')
  const textData = e.dataTransfer.getData('text/plain')
  if (uriList) {
    url = uriList.split('\n').find((l) => l.startsWith('http://') || l.startsWith('https://')) || null
  } else if (textData && (textData.startsWith('http://') || textData.startsWith('https://'))) {
    url = textData
  }

  // Check for dropped files (open the first one)
  if (!url && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0]
    url = `file://${file.path.replace(/\\/g, '/')}`
  }

  if (url) {
    window.dispatchEvent(new CustomEvent('app-drop-url', { detail: { url } }))
  }
})

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WindowTopBarProvider>
        <div className="relative h-screen" style={{ backgroundColor: 'var(--background, #1a1a1a)' }}>
          <WindowTopBar />
          <AppWithTopBar>
            <App />
          </AppWithTopBar>
        </div>
      </WindowTopBarProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
