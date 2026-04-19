import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Globe, CheckCircle, XCircle } from 'lucide-react'
import { useConveyor } from '@/app/hooks/use-conveyor'
import { OnboardingAdvanceCallback } from '../OnboardingMain'

interface DefaultBrowserStageProps {
  advance: OnboardingAdvanceCallback
  goBack: OnboardingAdvanceCallback
}

export function DefaultBrowserStage({ advance, goBack }: DefaultBrowserStageProps) {
  const conveyor = useConveyor()
  const [isDefault, setIsDefault] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [setting, setSetting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const check = async () => {
      try {
        const val = await conveyor.app.isDefaultBrowser()
        setIsDefault(val)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    check()
  }, [conveyor.app])

  const handleSetDefault = async () => {
    setSetting(true)
    setError(null)
    try {
      const result = await conveyor.app.setDefaultBrowser()
      if (result?.success) {
        setIsDefault(true)
      } else if (result?.error) {
        setError(result.error)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set as default browser')
    } finally {
      setSetting(false)
    }
  }

  return (
    <motion.div
      className="relative z-10 max-w-5xl mx-auto"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <h2 className="text-4xl md:text-5xl font-bold mb-2 text-white flex items-center gap-3"><Globe className="w-7 h-7" /> Default Browser</h2>
        <p className="text-gray-400 mb-8">Set this as your default browser to open links from other apps.</p>
      </motion.div>

      <div className="p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            {isDefault ? <CheckCircle className="w-5 h-5 text-green-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
            <span className="text-sm">{loading ? 'Checking…' : isDefault ? 'Qore is default' : 'Not default'}</span>
          </div>
          <button
            onClick={handleSetDefault}
            disabled={isDefault || setting}
            className={`px-4 py-2 rounded-lg border transition ${
              isDefault ? 'border-white/10 text-white/60 cursor-not-allowed' : 'border-[#0066FF]/40 bg-[#0066FF]/10 text-white hover:bg-[#0066FF]/20'
            }`}
          >
            {setting ? 'Setting…' : isDefault ? 'Already Set' : 'Set as Default'}
          </button>
        </div>
        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
      </div>

      <div className="mt-10 flex items-center justify-between">
        <button onClick={goBack} className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-white/80">Back</button>
        <button onClick={advance} className="px-6 py-2 rounded-2xl border border-[#0066FF]/30 bg-[#0066FF]/10 hover:bg-[#0066FF]/20 text-white">Continue</button>
      </div>
    </motion.div>
  )
}


