import { motion } from 'framer-motion'
import { OnboardingAdvanceCallback } from '../OnboardingMain'
import AppLogo from '@/ui-ref/vlinder-logo.png'

export function Welcome({ advance }: { advance: OnboardingAdvanceCallback }) {
  return (
    <div className="relative z-10 flex flex-col items-center text-center px-4">
      <motion.div
        className="mb-8"
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <img src={AppLogo} alt="Vlinder" className="h-16 object-contain" />
      </motion.div>
      <motion.div
        className="relative z-10 mb-6 px-4 py-1 border border-gray-500/50 rounded-full"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
      >
        <span className="text-gray-400 text-sm">Vlinder Browser</span>
      </motion.div>
      <motion.h1
        className="text-5xl md:text-6xl font-bold text-white mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
      >
        Welcome to
        {/* <br /> */}
        <span className="text-gray-300"> Vlinder</span>
      </motion.h1>
      <motion.p
        className="text-gray-400 text-xl max-w-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25, ease: 'easeOut' }}
      >
        Thank you for joining us early on this journey.
      </motion.p>

      <div className="mb-8"></div>

      <div className="my-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
        >
          <button
            onClick={advance}
            className="remove-app-drag cursor-pointer px-12 py-3 text-lg bg-white/5 hover:bg-white/10 text-white backdrop-blur-md border border-white/10 rounded-2xl"
          >
            Continue
          </button>
        </motion.div>
      </div>
    </div>
  )
}
