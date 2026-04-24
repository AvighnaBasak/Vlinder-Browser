import React from 'react'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary'
import { WindowTopBar } from './components/layout/WindowTopBar'
import { WindowTopBarProvider } from './components/layout/WindowTopBarContext'
import { AppWithTopBar } from './components/layout/AppWithTopBar'
import App from './app'
import { loadAndApplyTheme } from './utils/themes'

loadAndApplyTheme()

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WindowTopBarProvider>
        <div className="relative h-screen bg-[#1a1a1a]">
          <WindowTopBar />
          <AppWithTopBar>
            <App />
          </AppWithTopBar>
        </div>
      </WindowTopBarProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
