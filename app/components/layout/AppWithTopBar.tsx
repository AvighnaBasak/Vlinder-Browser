import React from 'react'

interface AppWithTopBarProps {
  children: React.ReactNode
}

export function AppWithTopBar({ children }: AppWithTopBarProps) {
  return <div className="pt-6 h-screen overflow-hidden">{children}</div>
}
