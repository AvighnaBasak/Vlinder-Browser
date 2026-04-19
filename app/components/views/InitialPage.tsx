import { NewTabPage } from '@/app/components/views/new-tab/NewTabPage'

interface InitialPageProps {
  isActive: boolean
  onNavigate?: (url: string) => void
}

export default function InitialPage({ isActive, onNavigate }: InitialPageProps) {
  if (!isActive) return null

  return <NewTabPage onNavigate={onNavigate} />
}
