import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'
import { OnboardingAdvanceCallback } from '../OnboardingMain'

interface PrivacyStageProps {
  adBlockerMode: string
  onChange: (mode: string) => void
  advance: OnboardingAdvanceCallback
  goBack: OnboardingAdvanceCallback
}

const modes = [
  { id: 'disabled', name: 'Disabled', description: 'No content blocking' },
  { id: 'adsOnly', name: 'Block Ads', description: 'Block ads including YouTube video ads' },
  { id: 'adsAndTrackers', name: 'Block Ads & Trackers', description: 'Block ads and tracking scripts' },
  { id: 'adsTrackersAndCookies', name: 'Block Ads, Trackers & Cookies', description: 'Block ads, trackers, and cookie popups' },
  { id: 'aggressive', name: 'Aggressive', description: 'Maximum blocking — all ads, trackers, cookies, and consent popups' },
]

export function PrivacyStage({ adBlockerMode, onChange, advance, goBack }: PrivacyStageProps) {
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
        <h2 className="text-4xl md:text-5xl font-bold mb-2 text-white flex items-center gap-3"><Shield className="w-7 h-7" /> Privacy</h2>
        <p className="text-gray-400 mb-8">Choose your content blocking level.</p>
      </motion.div>
      <div className="space-y-3">
        {modes.map((mode) => (
          <label key={mode.id} className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer backdrop-blur-sm ${adBlockerMode === mode.id ? 'border-white/40 bg-white/10' : 'border-white/10 hover:bg-white/5'}`}>
            <input
              type="radio"
              name="adBlocker"
              value={mode.id}
              checked={adBlockerMode === mode.id}
              onChange={(e) => onChange(e.target.value)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-white">{mode.name}</div>
              <div className="text-sm text-gray-400">{mode.description}</div>
            </div>
          </label>
        ))}
      </div>
      <div className="mt-10 flex items-center justify-between">
        <button onClick={goBack} className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-white/80">Back</button>
        <button onClick={advance} className="px-6 py-2 rounded-2xl border border-white/30 bg-white/10 hover:bg-white/20 text-white">Continue</button>
      </div>
    </motion.div>
  )
}


