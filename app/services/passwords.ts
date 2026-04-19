import { useConveyor } from '@/app/hooks/use-conveyor'

export function usePasswordsService() {
  const conveyor = useConveyor()
  return conveyor.passwords
}
