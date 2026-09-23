import React, { useState, useEffect } from 'react';
import { Waves, Play, RefreshCw } from 'lucide-react';
import { playSelect } from '../utils/audio';
import CrossingMap from './CrossingMap';

interface DaySummaryProps {
  // The crossing about to be played; the one just finished is nextDay - 1.
  nextDay: number;
  onNextWave: () => void;
  onResetGame: () => void;
  onPlayCrossing: (crossing: number) => void;
}

export default function DaySummary({ nextDay, onNextWave, onResetGame, onPlayCrossing }: DaySummaryProps) {
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  // Auto-cancel confirmation after 4 seconds
  useEffect(() => {
    if (isConfirmingReset) {
      const timer = setTimeout(() => setIsConfirmingReset(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmingReset]);

  const handleStartNext = () => {
    playSelect();
    onNextWave();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen screen-glow p-6 select-none text-[#e5e5e5]">
      <div className="relative w-full max-w-2xl bg-panel border border-line rounded overflow-hidden shadow-2xl p-6 md:p-10 flex flex-col">
        {/* Subtle decorative elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#c2a078]/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Level Stats Summary */}
        <div className="text-center md:text-left md:flex justify-between items-end border-b border-line pb-6 mb-8 gap-4">
          <div>
            <span className="text-[#c2a078] font-mono text-xs font-semibold tracking-widest uppercase">Crossing #{nextDay - 1} Complete</span>
            <h2 className="font-display text-2xl md:text-3xl font-light text-white uppercase tracking-wider mt-1">Crossings Made</h2>
          </div>
        </div>

        {/* Crossing map: crossings done so far, next one pulsing */}
        <div className="w-full mb-8 border border-line rounded-sm overflow-hidden">
          <CrossingMap
            completed={nextDay - 1}
            justCompleted={nextDay - 1}
            onSelect={n => { playSelect(); onPlayCrossing(n); }}
          />
        </div>

        {/* River briefing */}
        <div className="bg-panel-raised border border-line p-5 rounded-sm mb-8 space-y-4">
          <h3 className="font-display text-sm font-semibold text-[#c2a078] uppercase tracking-widest flex items-center gap-2">
            <Waves className="w-4 h-4 text-[#c2a078]" />
            CROSSING #{nextDay} RIVER BRIEFING
          </h3>
          <p className="text-white/65 text-xs leading-relaxed">
            A new herd has gathered on the bank at the next crossing point. The river here is more dangerous than the
            last. The currents are swifter, there are more crocodiles and they are more aggressive, and the herd is
            larger. Good luck guiding them across!
          </p>
        </div>

        {/* Continuance Action */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-end border-t border-line pt-6">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              id="reset-btn"
              onClick={() => {
                playSelect();
                if (isConfirmingReset) {
                  onResetGame();
                } else {
                  setIsConfirmingReset(true);
                }
              }}
              className={`px-5 py-3 rounded-sm font-sans text-xs font-semibold tracking-[0.18em] uppercase transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 border ${
                isConfirmingReset
                  ? 'bg-red-950 border-red-700 text-red-200 animate-pulse'
                  : 'bg-transparent border-line hover:border-red-500/40 text-red-400 hover:bg-red-500/5'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isConfirmingReset ? 'animate-spin' : ''}`} />
              {isConfirmingReset ? 'Confirm Reset' : 'Reset All'}
            </button>
            <button
              id="next-crossing-btn"
              onClick={handleStartNext}
              className="px-8 py-3 rounded-sm bg-[#c2a078] hover:bg-[#b08f68] font-sans text-xs font-semibold tracking-[0.18em] uppercase text-[#0a0a0a] cursor-pointer transition-all flex items-center justify-center gap-2 border-0"
            >
              Begin Crossing #{nextDay}
              <Play className="w-3.5 h-3.5 fill-[#0a0a0a]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
