import { motion } from 'framer-motion'
import { useState } from 'react'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { OnboardingAdvanceCallback } from '../OnboardingMain'

export function FinishStage({
  advance,
  goBack,
}: {
  advance: OnboardingAdvanceCallback
  goBack: OnboardingAdvanceCallback
}) {
  const [isFinishing, setIsFinishing] = useState(false)

  const handleFinish = () => {
    if (isFinishing) return
    setIsFinishing(true)
    advance()
  }
  return (
    <motion.div
      className="relative z-10 flex flex-col items-center text-center px-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
    >
      {/* Success icon with glow */}
      <motion.div
        className="mb-6"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="relative">
          <div className="absolute -inset-4 rounded-full bg-[radial-gradient(circle_at_center,rgba(102,163,255,0.25),transparent_60%)] blur-xl" />
          <CheckCircle2 className="relative z-10 w-16 h-16 text-[#66A3FF]" />
        </div>
      </motion.div>

      {/* Title and subtitle */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <h2 className="text-5xl md:text-6xl font-bold mb-3 text-white">All set!</h2>
        <p className="text-gray-300">You can tweak anything later in Settings.</p>
      </motion.div>

      {/* Quick tips */}
      <motion.ul
        className="mt-8 grid gap-2 text-left text-sm text-gray-300"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
      >
        <li className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#66A3FF]" /> Press Ctrl+T for Command Palette
        </li>
        <li className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#66A3FF]" /> Change privacy and sidebar anytime in Settings
        </li>
      </motion.ul>

      {/* Actions */}
      <div className="mt-10 flex items-center gap-3">
        <button onClick={goBack} className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-white/80">
          Back
        </button>
        <button
          onClick={handleFinish}
          disabled={isFinishing}
          className="px-8 py-3 rounded-2xl border border-[#0066FF]/30 bg-[#0066FF]/10 hover:bg-[#0066FF]/20 text-white disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Finish
        </button>
      </div>
    </motion.div>
  )
}
