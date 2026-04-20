import React from 'react'
import { motion } from 'framer-motion'

interface OnboardingScreenProps {
  children: React.ReactNode
}

export function OnboardingScreen({ children }: OnboardingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden window-drag select-none bg-[#0a0a0a]">
      {/* Gradient orbs */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),rgba(255,255,255,0.03),transparent)] blur-[60px] z-[5] pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[-30%] right-[-20%] w-[80%] h-[80%] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),rgba(200,200,200,0.03),transparent)] blur-[70px] z-[5] pointer-events-none"
        aria-hidden="true"
      />

      {/* Content container */}
      <div className="relative z-20 flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-5xl mx-auto window-no-drag text-white"
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}
