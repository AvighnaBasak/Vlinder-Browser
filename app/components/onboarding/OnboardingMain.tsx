import { useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { OnboardingScreen } from './OnboardingScreen'
type SimpleApp = { id: string; name: string; logoUrl?: string; description?: string }
import { Welcome } from './stages/Welcome'
import { SidebarPositionStage } from './stages/SidebarPosition'
import { SidebarModeStage } from './stages/SidebarMode'
import { PrivacyStage } from './stages/Privacy'
import { CommandPaletteStage } from './stages/CommandPalette'
import { DefaultBrowserStage } from './stages/DefaultBrowser'
import { FinishStage } from './stages/Finish'

export type OnboardingAdvanceCallback = () => void

interface OnboardingMainProps {
  onComplete?: (data: {
    selectedPlatforms: Record<string, boolean>
    sidebarPosition: 'left' | 'right'
    adBlockerMode: string
  }) => void
}

export function OnboardingMain({ onComplete }: OnboardingMainProps) {
  const [stage, setStage] = useState<number>(0)
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>(() => {
    try {
      const stored = localStorage.getItem('sidebar-position')
      return stored === 'right' ? 'right' : 'left'
    } catch {
      return 'left'
    }
  })
  const [adBlockerMode, setAdBlockerMode] = useState<string>('disabled')
  type SidebarMode = 'expanded' | 'compact' | 'hidden'
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => {
    try {
      const stored = localStorage.getItem('sidebar-mode')
      if (stored === 'compact' || stored === 'hidden' || stored === 'expanded') return stored as SidebarMode
      const oldStored = localStorage.getItem('sidebar-compact')
      if (oldStored === '1') return 'compact'
      return 'expanded'
    } catch {
      return 'expanded'
    }
  })
  const [commandPaletteEnabled, setCommandPaletteEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('command-palette-enabled')
      return stored === null ? true : stored === '1'
    } catch {
      return true
    }
  })
  const [selectedPlatforms] = useState<Record<string, boolean>>({})

  const stages = [
    <Welcome key="welcome" advance={() => setStage(1)} />,
    <SidebarPositionStage
      key="sidebar"
      sidebarPosition={sidebarPosition}
      onChange={(pos) => {
        setSidebarPosition(pos)
        try {
          localStorage.setItem('sidebar-position', pos)
        } catch {
          // ignore persistence errors
        }
      }}
      advance={() => setStage(2)}
      goBack={() => setStage(0)}
    />,
    <SidebarModeStage
      key="sidebar-mode"
      mode={sidebarMode}
      onChange={(mode) => {
        setSidebarMode(mode)
        try {
          localStorage.setItem('sidebar-mode', mode)
          window.dispatchEvent(new CustomEvent('sidebar-mode-changed', { detail: mode }))
        } catch {
          // ignore
        }
      }}
      advance={() => setStage(3)}
      goBack={() => setStage(1)}
    />,
    <PrivacyStage
      key="privacy"
      adBlockerMode={adBlockerMode}
      onChange={setAdBlockerMode}
      advance={() => setStage(4)}
      goBack={() => setStage(2)}
    />,
    <CommandPaletteStage
      key="command-palette"
      enabled={commandPaletteEnabled}
      onToggle={(enabled) => {
        setCommandPaletteEnabled(enabled)
        try {
          localStorage.setItem('command-palette-enabled', enabled ? '1' : '0')
        } catch {
          // ignore
        }
      }}
      advance={() => setStage(5)}
      goBack={() => setStage(3)}
    />,
    <DefaultBrowserStage key="default-browser" advance={() => setStage(6)} goBack={() => setStage(4)} />,
    <FinishStage
      key="finish"
      advance={() => {
        onComplete?.({ selectedPlatforms, sidebarPosition, adBlockerMode })
      }}
      goBack={() => setStage(6)}
    />,
  ]

  return (
    <OnboardingScreen>
      <AnimatePresence mode="wait" initial={true}>
        {stages[stage]}
      </AnimatePresence>
    </OnboardingScreen>
  )
}
