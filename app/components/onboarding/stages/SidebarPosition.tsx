import { motion } from 'framer-motion'
import { PanelLeft, PanelRight } from 'lucide-react'
import { OnboardingAdvanceCallback } from '../OnboardingMain'

interface SidebarPositionStageProps {
  sidebarPosition: 'left' | 'right'
  onChange: (pos: 'left' | 'right') => void
  advance: OnboardingAdvanceCallback
  goBack: OnboardingAdvanceCallback
}

export function SidebarPositionStage({ sidebarPosition, onChange, advance, goBack }: SidebarPositionStageProps) {
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
        <h2 className="text-4xl md:text-5xl font-bold mb-2 text-white">Sidebar position</h2>
        <p className="text-gray-400 mb-8">Choose which side of the window the sidebar appears on.</p>
      </motion.div>
      <div className="flex gap-3">
        <button
          onClick={() => onChange('left')}
          className={`flex-1 p-4 rounded-2xl border transition backdrop-blur-sm ${
            sidebarPosition === 'left' ? 'border-[#0066FF]/40 bg-[#0066FF]/10' : 'border-white/10 hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-2">
            <PanelLeft className="w-5 h-5" /> Left
          </div>
        </button>
        <button
          onClick={() => onChange('right')}
          className={`flex-1 p-4 rounded-2xl border transition backdrop-blur-sm ${
            sidebarPosition === 'right' ? 'border-[#0066FF]/40 bg-[#0066FF]/10' : 'border-white/10 hover:bg-white/5'
          }`}
        >
          <div className="flex items-center gap-2">
            <PanelRight className="w-5 h-5" /> Right
          </div>
        </button>
      </div>
      <div className="mt-10 flex items-center justify-between">
        <button onClick={goBack} className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-white/80">Back</button>
        <button onClick={advance} className="px-6 py-2 rounded-2xl border border-[#0066FF]/30 bg-[#0066FF]/10 hover:bg-[#0066FF]/20 text-white">Continue</button>
      </div>
    </motion.div>
  )
}


