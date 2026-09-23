import React, { useState } from 'react';
import { Volume2, VolumeX, HelpCircle } from 'lucide-react';
import { playSelect, toggleMute, getMuteStatus } from '../utils/audio';
import CrossingMap from './CrossingMap';
import GuideModal from './GuideModal';

interface MainMenuProps {
  onStartGame: () => void;
  onPlayCrossing: (crossing: number) => void;
}

export default function MainMenu({ onStartGame, onPlayCrossing }: MainMenuProps) {
  const [muted, setMuted] = useState(getMuteStatus());
  const [guideOpen, setGuideOpen] = useState(false);

  const handleMuteToggle = () => {
    const isMutedNow = toggleMute();
    setMuted(isMutedNow);
    playSelect();
  };

  const handleStart = () => {
    playSelect();
    onStartGame();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen screen-glow p-6 select-none text-[#e5e5e5]">
      {/* Absolute Decorative elements */}
      <div className="absolute top-10 right-10 z-10 flex gap-2">
        <button
          onClick={handleMuteToggle}
          className="p-3 rounded-full bg-panel border border-line hover:border-[#c2a078]/50 hover:bg-panel-raised text-[#c2a078] transition-colors cursor-pointer flex items-center justify-center"
          title={muted ? "Unmute sounds" : "Mute sounds"}
        >
          {muted ? <VolumeX className="w-5 h-5 text-neutral-500" /> : <Volume2 className="w-5 h-5 text-[#c2a078]" />}
        </button>
        <button
          id="menu-guide-btn"
          onClick={() => { playSelect(); setGuideOpen(true); }}
          className="p-3 rounded-full bg-panel border border-line hover:border-[#c2a078]/50 hover:bg-panel-raised text-[#c2a078] transition-colors cursor-pointer flex items-center justify-center"
          title="Help & Information"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      <GuideModal isOpen={guideOpen} originId="menu-guide-btn" onClose={() => setGuideOpen(false)} />

      {/* Main Container Card */}
      <div className="relative w-full max-w-2xl bg-panel border border-line rounded shadow-2xl p-8 md:p-12 md:pb-8 flex flex-col items-center">
        {/* Subtle Decorative Gradient */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-[#c2a078]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Title & Theme */}
        <div className="text-center space-y-3 mb-8">
          <h1 className="font-display text-4xl md:text-5xl font-light tracking-widest text-[#c2a078] uppercase pb-1">
            Cross
          </h1>
          <p className="font-sans tracking-[0.3em] text-white/60 uppercase text-[10px]">
            The Great Wildebeest Migration
          </p>
        </div>

        {/* Story Intro */}
        <div className="bg-panel-raised/80 border border-line/40 rounded-sm p-6 mb-8 text-xs leading-relaxed text-white/60 text-center font-sans tracking-wide">
          Every year, more than a million wildebeest and other plains animals like zebra take part in a circular migration across the Serengeti/Mara ecosystem. And each year they must cross the Mara River, braving crocodiles, strong currents, and each other to get to the other side. Herds cross at many points along the river, some far more dangerous than others. Try your hand at leading a herd across ten of them, each crossing harder than the last.
          <br />
          <span className="text-[#c2a078] font-light italic mt-3 block text-[13px] tracking-widest font-display">
            Steer your wildebeest through the melee and keep the cycle going.
          </span>
        </div>

        {/* Crossing map: ten crossings ahead */}
        <div className="w-full mb-8 border border-line rounded-sm overflow-hidden">
          <CrossingMap completed={0} onSelect={n => { playSelect(); onPlayCrossing(n); }} />
        </div>

        {/* Action Button */}
        <button
          onClick={handleStart}
          className="w-full sm:w-auto px-10 py-4 rounded-sm bg-[#c2a078] hover:bg-[#b08f68] font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#0a0a0a] shadow-lg active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-2 border-0"
        >
          Begin Crossing #1
        </button>

        {/* Footer credits */}
        <div className="mt-8 pt-4 w-full border-t border-line flex justify-between items-center text-[9px] text-white/50 font-mono tracking-widest uppercase">
          <span>COOPERATING HERD ENGINE v2.4.0</span>
          <span>Section VII — Southern Serengeti Cycle</span>
        </div>
      </div>
    </div>
  );
}
