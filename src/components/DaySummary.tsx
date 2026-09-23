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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-6 select-none text-[#e5e5e5]">
      <div className="relative w-full max-w-2xl bg-[#0d0d0d] border border-[#2a2a2a] rounded overflow-hidden shadow-2xl p-6 md:p-10 flex flex-col">
        {/* Subtle decorative elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#c2a078]/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Level Stats Summary */}
        <div className="text-center md:text-left md:flex justify-between items-end border-b border-[#2a2a2a] pb-6 mb-8 gap-4">
          <div>
            <span className="text-[#c2a078] font-mono text-xs font-semibold tracking-widest uppercase">Crossing #{nextDay - 1} Complete</span>
            <h2 className="font-display text-2xl md:text-3xl font-light text-white uppercase tracking-wider mt-1">Crossings Made</h2>
          </div>
          <div className="flex bg-[#121212]/80 px-4 py-2 rounded-sm border border-[#2a2a2a] items-center gap-2 text-white/50 text-xs font-mono">
            <span>PREDATOR INTENSITY:</span>
            <span className="text-red-400 font-bold">LEVEL {nextDay}</span>
          </div>
        </div>

        {/* Crossing map: crossings done so far, next one pulsing */}
        <div className="w-full mb-8 border border-[#2a2a2a] rounded-sm overflow-hidden">
          <CrossingMap
            completed={nextDay - 1}
            justCompleted={nextDay - 1}
            onSelect={n => { playSelect(); onPlayCrossing(n); }}
          />
        </div>

        {/* Next crossing's conditions */}
        <div className="mb-8">
          <div className="bg-[#121212] p-5 border border-[#2a2a2a] rounded-sm flex flex-col justify-center">
            <span className="text-[10px] text-white/40 block uppercase font-mono tracking-wider">Threat Intensity</span>
            <span className="text-red-400 font-mono text-2xl font-bold mt-1">Crossing #{nextDay} Conditions</span>
            <span className="text-[10px] text-white/30 block mt-1">crocodile speed and current velocity increased</span>
          </div>
        </div>

        {/* Toughening Briefing Section */}
        <div className="bg-[#121212] border border-[#2a2a2a] p-5 rounded-sm mb-8 space-y-4">
          <h3 className="font-display text-sm font-semibold text-[#c2a078] uppercase tracking-widest flex items-center gap-2">
            <Waves className="w-4 h-4 text-[#c2a078]" />
            CROSSING #{nextDay} RIVER BRIEFING
          </h3>
          <p className="text-white/50 text-xs leading-relaxed">
            A new herd has gathered on the bank at the next crossing point, and you are leading it. The river here is more dangerous than the last:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-white/40 font-mono">
            <li className="flex items-start gap-2">
              <span className="text-[#c2a078]">⚡</span>
              <span><strong>Swifter Currents:</strong> The current here pulls downstream harder. Protect your stamina.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#c2a078]">🐊</span>
              <span><strong>Aggressive Crocs:</strong> Crocodiles move quicker and will snap jaws open when they chase you.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#c2a078]">🏃‍♂️</span>
              <span><strong>Stampede Risks:</strong> Higher herd crowding triggers panicked stampedes. Leap/hop upwards to break apart and push other beasts away!</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#c2a078]">🔋</span>
              <span><strong>Exhaustion Penalty:</strong> Swimming slows significantly at low stamina. Plan your sprint hops carefully as they drain <strong className="text-white/70">15% stamina</strong> per leap!</span>
            </li>
          </ul>
        </div>

        {/* Continuance Action */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-[#2a2a2a] pt-6">
          <div className="text-[11px] text-white/40 text-center sm:text-left leading-relaxed">
            A new herd, a tougher crossing.
          </div>
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
                  : 'bg-transparent border-[#2a2a2a] hover:border-red-500/40 text-red-400 hover:bg-red-500/5'
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
