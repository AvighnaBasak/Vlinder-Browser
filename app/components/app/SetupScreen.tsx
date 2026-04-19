import { OnboardingMain } from '@/app/components/onboarding/OnboardingMain'
import { useConveyor } from '@/app/hooks/use-conveyor'

export default function SetupScreen() {
  const conveyor = useConveyor()

  const handleComplete = async (data: {
    selectedPlatforms: Record<string, boolean>
    sidebarPosition: 'left' | 'right'
    adBlockerMode: string
  }) => {
    // Persist privacy
    await conveyor.config.setAdBlocker(data.adBlockerMode)

    // Sidebar position already persisted to localStorage by the stage; nothing else needed here

    // Complete setup without platform store
    await conveyor.config.completeSetup([])
  }

  return (
    <div className="flex flex-col h-screen ">
      <OnboardingMain onComplete={handleComplete} />
    </div>
  )
}
