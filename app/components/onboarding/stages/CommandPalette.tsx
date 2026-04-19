import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { OnboardingAdvanceCallback } from '../OnboardingMain'

interface CommandPaletteStageProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  advance: OnboardingAdvanceCallback
  goBack: OnboardingAdvanceCallback
}

export function CommandPaletteStage({ enabled, onToggle, advance, goBack }: CommandPaletteStageProps) {
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
        <h2 className="text-4xl md:text-5xl font-bold mb-2 text-white flex items-center gap-3"><Search className="w-7 h-7" /> Command Palette</h2>
        <p className="text-gray-400 mb-8">Enable quick search and actions with Ctrl+T.</p>
      </motion.div>
      <div className="flex items-center justify-between p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
        <div className="text-white/90">
          <div className="font-medium">{enabled ? 'Enabled' : 'Disabled'}</div>
          <div className="text-sm text-gray-400">Toggle the keyboard-driven command palette.</div>
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          className={`px-4 py-2 rounded-lg border transition ${enabled ? 'border-[#0066FF]/40 bg-[#0066FF]/10 text-white' : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'}`}
        >
          {enabled ? 'Disable' : 'Enable'}
        </button>
      </div>
      <div className="mt-10 flex items-center justify-between">
        <button onClick={goBack} className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-white/80">Back</button>
        <button onClick={advance} className="px-6 py-2 rounded-2xl border border-[#0066FF]/30 bg-[#0066FF]/10 hover:bg-[#0066FF]/20 text-white">Continue</button>
      </div>
    </motion.div>
  )
}


