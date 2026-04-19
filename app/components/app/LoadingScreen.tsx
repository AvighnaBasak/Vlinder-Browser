import LoadingSpinner from '@/app/components/ui/loading-spinner'
import { LoadingBar } from '@/app/components/ui/loading-bar'
import AppLogo from '@/app/components/ui/logo'

export default function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#1a1a1a] dark:to-[#1a1a1a]">
      <LoadingBar isLoading={true} />
      <LoadingSpinner logo={AppLogo} logoAlt="Vlinder" size="xl" gradient="from-gray-500 to-gray-600" />
    </div>
  )
}
