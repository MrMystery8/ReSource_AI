import { motion } from 'framer-motion';
import { Recycle, Zap } from 'lucide-react';

export function Header() {
  return (
    <header className="relative py-8 sm:py-12 mb-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex items-center gap-4"
        >
          {/* Logo */}
          <motion.div
            className="relative"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center glow-primary">
              <Recycle className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
            <motion.div
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 flex items-center justify-center"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap className="w-2.5 h-2.5 text-surface" />
            </motion.div>
          </motion.div>

          {/* Title */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-primary-200 to-primary-400 bg-clip-text text-transparent">
              ReSource AI
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Intelligent E-Waste Triage System
            </p>
          </div>
        </motion.div>
      </div>
    </header>
  );
}
