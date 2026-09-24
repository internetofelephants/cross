import React, { useState, useEffect } from 'react';
import { Play, RefreshCw, NotebookPen } from 'lucide-react';
import { playSelect } from '../utils/audio';
import CrossingMap, { CROSSING_NAMES } from './CrossingMap';
import ScreenControls from './ScreenControls';
import { FIELD_NOTES } from '../data/fieldNotes';

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

  const fieldNote = FIELD_NOTES[nextDay];

  const handleStartNext = () => {
    playSelect();
    onNextWave();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen screen-glow p-6 select-none text-[#e5e5e5]">
      <div className="relative w-full max-w-2xl bg-panel border border-line rounded-2xl overflow-hidden shadow-2xl p-6 md:p-10 flex flex-col">
        {/* Subtle decorative elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#c2a078]/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Level Stats Summary */}
        <div className="flex justify-between items-end border-b border-line pb-6 mb-8 gap-4">
          <div>
            <span className="text-[#c2a078] text-sm font-semibold">{CROSSING_NAMES[nextDay - 2]}: made it!</span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-white mt-1">Nice swimming</h2>
          </div>
          {/* Sound and guide, level with the title */}
          <ScreenControls guideId="summary-guide-btn" className="shrink-0" />
        </div>

        {/* Field note for the crossing ahead, then the briefing for it */}
        <div className="bg-panel-raised border border-line p-5 rounded-xl mb-8 space-y-3">
          <h3 className="font-display text-xl font-semibold text-[#c2a078] flex items-center gap-2">
            <NotebookPen className="w-5 h-5 text-[#c2a078]" />
            Field note
          </h3>
          {fieldNote && (
            <p className="text-white/70 text-[13px] leading-relaxed">
              <strong className="font-semibold text-white">{fieldNote.headline}</strong> {fieldNote.body}
            </p>
          )}
          <p className="text-white/70 text-[13px] leading-relaxed">
            <strong className="font-display font-semibold text-[15px] text-[#c2a078]">
              Next up: {CROSSING_NAMES[nextDay - 1]}
            </strong>{' '}
            — A new herd has gathered on the bank at the next crossing point. The river here is more dangerous than the
            last. The currents are swifter, there are more crocodiles and they are more aggressive, and the herd is
            larger. Good luck guiding them across!
          </p>
        </div>

        {/* Crossing map: crossings done so far, next one pulsing */}
        <div className="w-full mb-8 border border-line rounded-xl overflow-hidden">
          <CrossingMap
            completed={nextDay - 1}
            justCompleted={nextDay - 1}
            onSelect={n => { playSelect(); onPlayCrossing(n); }}
          />
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
              className={`px-6 py-3 rounded-full font-display text-base font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 border ${
                isConfirmingReset
                  ? 'bg-red-950 border-red-700 text-red-200 animate-pulse'
                  : 'bg-transparent border-line hover:border-red-500/40 text-red-400 hover:bg-red-500/5'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isConfirmingReset ? 'animate-spin' : ''}`} />
              {isConfirmingReset ? 'Confirm reset' : 'Reset all'}
            </button>
            <button
              id="next-crossing-btn"
              onClick={handleStartNext}
              className="px-8 py-3 rounded-full bg-[#c2a078] hover:bg-[#d1b08a] font-display text-base font-semibold text-[#1e1a15] shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-2 border-0"
            >
              Into the water
              <Play className="w-4 h-4 fill-[#1e1a15]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
