import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ConceptVisualOutput } from '@resource-ai/shared';
import { ImageIcon, AlertCircle } from 'lucide-react';
import { Card } from './ui/Card';
import {
  ANALYSIS_BODY_WHITE,
  ANALYSIS_EMERALD,
  ANALYSIS_SOFT_SURFACE,
  ANALYSIS_WHITE,
} from './analysisTheme';

export interface ConceptImageProps {
  data: ConceptVisualOutput;
}

export function ConceptImage({ data }: ConceptImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    /*
     * w-full + min-w-0 prevent the card from stretching beyond the viewport
     * on narrow screens (Requirement 6.4, 9.2, 9.6).
     */
    <Card surface="neon" elevation="md" className="w-full min-w-0 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-5 h-5" style={{ color: ANALYSIS_WHITE }} />
        <h3 className="text-lg font-semibold" style={{ color: ANALYSIS_EMERALD }}>Concept Visual</h3>
      </div>

      <div
        className="relative rounded-xl overflow-hidden border"
        style={{ borderColor: 'rgba(52, 211, 153, 0.26)' }}
      >
        <AnimatePresence>
          {!loaded && !error && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[300px]"
              style={{ backgroundColor: ANALYSIS_SOFT_SURFACE }}
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex flex-col items-center gap-3"
              >
                <ImageIcon className="w-8 h-8" style={{ color: ANALYSIS_EMERALD }} />
                <span className="text-sm" style={{ color: ANALYSIS_BODY_WHITE }}>Loading concept visual...</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="flex items-center justify-center min-h-[200px] bg-rose-500/5">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">Failed to load concept image</span>
            </div>
          </div>
        )}

        {/* max-w-full ensures the image never overflows its container (Requirement 9.6) */}
        <motion.img
          src={data.imageUrl}
          alt="ReSource Concept Visual showing the recommended second-life project"
          className={`w-full max-w-full h-auto rounded-xl ${loaded ? 'block' : 'hidden'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={loaded ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5 }}
        />
      </div>
    </Card>
  );
}

export default ConceptImage;
