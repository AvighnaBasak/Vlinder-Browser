import { motion } from 'framer-motion'
import { Maximize2, Minimize2, EyeOff } from 'lucide-react'
import { OnboardingAdvanceCallback } from '../OnboardingMain'

type SidebarMode = 'expanded' | 'compact' | 'hidden'

interface SidebarModeStageProps {
  mode: SidebarMode
  onChange: (mode: SidebarMode) => void
  advance: OnboardingAdvanceCallback
  goBack: OnboardingAdvanceCallback
}

export function SidebarModeStage({ mode, onChange, advance, goBack }: SidebarModeStageProps) {
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
        <h2 className="text-4xl md:text-5xl font-bold mb-2 text-white">Sidebar mode</h2>
        <p className="text-gray-400 mb-8">Choose how the sidebar is displayed.</p>
      </motion.div>
      <div className="flex items-center justify-between p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onChange('expanded')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
              mode === 'expanded' ? 'bg-[#0066FF] text-white' : 'bg-white/10 text-white/80 hover:bg-white/15'
            }`}
            title="Expanded - Full width sidebar"
          >
            <Maximize2 className="w-4 h-4" /> Expanded
          </button>
          <button
            onClick={() => onChange('compact')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
              mode === 'compact' ? 'bg-[#0066FF] text-white' : 'bg-white/10 text-white/80 hover:bg-white/15'
            }`}
            title="Compact - Narrow sidebar"
          >
            <Minimize2 className="w-4 h-4" /> Compact
          </button>
          <button
            onClick={() => onChange('hidden')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
              mode === 'hidden' ? 'bg-[#0066FF] text-white' : 'bg-white/10 text-white/80 hover:bg-white/15'
            }`}
            title="Hidden - Slides in on hover"
          >
            <EyeOff className="w-4 h-4" /> Hidden
          </button>
        </div>
      </div>
      <div className="mt-10 flex items-center justify-between">
        <button onClick={goBack} className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-white/80">Back</button>
        <button onClick={advance} className="px-6 py-2 rounded-2xl border border-[#0066FF]/30 bg-[#0066FF]/10 hover:bg-[#0066FF]/20 text-white">Continue</button>
      </div>
    </motion.div>
  )
}


