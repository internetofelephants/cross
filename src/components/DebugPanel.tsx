import React, { useState } from 'react';
import { Bug, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

// Developer-only overlay (enabled with ?debug in the URL) for jumping straight into any day.

interface DebugPanelProps {
  currentDay: number;
  isPlaying: boolean;
  onPlayDay: (day: number) => void;
}

export const DEBUG_MODE = new URLSearchParams(window.location.search).has('debug');

export default function DebugPanel({ currentDay, isPlaying, onPlayDay }: DebugPanelProps) {
  const [open, setOpen] = useState(true);

  // Drop focus after a click so Space (hop) can't re-trigger the button mid-game.
  const play = (e: React.MouseEvent<HTMLButtonElement>, day: number) => {
    e.currentTarget.blur();
    onPlayDay(day);
  };

  return (
    <div className="fixed bottom-3 left-3 z-50 bg-[#0d0d0d]/95 border border-[#c2a078]/40 rounded-sm text-[11px] font-mono text-[#e5e5e5] select-none shadow-2xl">
      <button
        onClick={e => { e.currentTarget.blur(); setOpen(o => !o); }}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-[#c2a078] uppercase tracking-widest cursor-pointer"
      >
        <span className="flex items-center gap-1.5"><Bug className="w-3.5 h-3.5" /> Debug</span>
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <div className="text-white/40">Play day</div>
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(d => (
              <button
                key={d}
                onClick={e => play(e, d)}
                className={`w-8 h-7 rounded-sm border cursor-pointer transition-colors ${
                  isPlaying && d === currentDay
                    ? 'bg-[#c2a078] border-[#c2a078] text-[#0a0a0a] font-bold'
                    : 'border-[#2a2a2a] hover:border-[#c2a078]/60 text-white/70'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
          <button
            onClick={e => play(e, currentDay)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-sm border border-[#2a2a2a] hover:border-[#c2a078]/60 text-white/70 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Restart day {currentDay}
          </button>
        </div>
      )}
    </div>
  );
}
