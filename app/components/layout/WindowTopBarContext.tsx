import React, { createContext, useContext, useState } from 'react'

interface WindowTopBarContextType {
  isTopBarVisible: boolean
  setIsTopBarVisible: (visible: boolean) => void
}

const WindowTopBarContext = createContext<WindowTopBarContextType | undefined>(undefined)

export function WindowTopBarProvider({ children }: { children: React.ReactNode }) {
  const [isTopBarVisible, setIsTopBarVisible] = useState(false)

  return (
    <WindowTopBarContext.Provider value={{ isTopBarVisible, setIsTopBarVisible }}>
      {children}
    </WindowTopBarContext.Provider>
  )
}

export function useWindowTopBar() {
  const context = useContext(WindowTopBarContext)
  if (context === undefined) {
    throw new Error('useWindowTopBar must be used within a WindowTopBarProvider')
  }
  return context
}
