import React from 'react';
import { Play } from 'lucide-react';
import { playSelect } from '../utils/audio';
import CrossingMap from './CrossingMap';
import ScreenControls from './ScreenControls';

interface MainMenuProps {
  onStartGame: () => void;
  onPlayCrossing: (crossing: number) => void;
}

export default function MainMenu({ onStartGame, onPlayCrossing }: MainMenuProps) {
  const handleStart = () => {
    playSelect();
    onStartGame();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen screen-glow p-6 select-none text-[#e5e5e5]">
      {/* Main Container Card */}
      <div className="relative w-full max-w-2xl bg-panel border border-line rounded-2xl shadow-2xl p-8 md:p-12 flex flex-col items-center">
        {/* Subtle Decorative Gradient */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-[#c2a078]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Sound and guide, level with the title */}
        <ScreenControls guideId="menu-guide-btn" className="absolute right-3 md:right-8 top-8 md:top-12 h-10 sm:h-12 md:h-15 items-center" />

        {/* Title & Theme */}
        <div className="text-center space-y-3 mb-8">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold tracking-wide text-[#c2a078] uppercase">
            Cross
          </h1>
          <p className="font-sans tracking-[0.15em] text-white/60 uppercase text-[11px] font-medium">
            The Great Wildebeest Migration
          </p>
        </div>

        {/* Story Intro */}
        <div className="bg-panel-raised/80 border border-line/40 rounded-xl p-6 mb-8 text-[13px] leading-relaxed text-white/65 text-center font-sans">
          Every year, more than a million wildebeest and other plains animals like zebra take part in a circular migration across the Serengeti/Mara ecosystem. And each year they must cross the Mara River, braving crocodiles, strong currents, and each other to get to the other side. Herds cross at many points along the river, some far more dangerous than others. Try your hand at leading a herd across ten of them, each crossing harder than the last.
          <br />
          <span className="text-[#c2a078] font-medium mt-3 block text-base font-display">
            Steer your wildebeest through the melee and keep the cycle going.
          </span>
        </div>

        {/* Crossing map: ten crossings ahead */}
        <div className="w-full mb-8 border border-line rounded-xl overflow-hidden">
          <CrossingMap completed={0} onSelect={n => { playSelect(); onPlayCrossing(n); }} />
        </div>

        {/* Action Button */}
        <button
          onClick={handleStart}
          className="w-full sm:w-auto px-10 py-3.5 rounded-full bg-[#c2a078] hover:bg-[#d1b08a] font-display text-base font-semibold text-[#1e1a15] shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-2 border-0"
        >
          Into the water
          <Play className="w-4 h-4 fill-[#1e1a15]" />
        </button>
      </div>
    </div>
  );
}
