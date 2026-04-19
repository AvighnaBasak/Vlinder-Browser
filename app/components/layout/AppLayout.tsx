import { ReactNode } from 'react'

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex-1 main-content overflow-hidden">
      <div className="h-full overflow-hidden">{children}</div>
    </div>
  )
}
