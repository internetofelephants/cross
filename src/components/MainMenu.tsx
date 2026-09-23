import React, { useState } from 'react';
import { Shield, Navigation, Waves, Volume2, VolumeX } from 'lucide-react';
import { playSelect, toggleMute, getMuteStatus } from '../utils/audio';
import CrossingMap from './CrossingMap';

interface MainMenuProps {
  onStartGame: () => void;
}

export default function MainMenu({ onStartGame }: MainMenuProps) {
  const [muted, setMuted] = useState(getMuteStatus());

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-6 select-none text-[#e5e5e5]">
      {/* Absolute Decorative elements */}
      <div className="absolute top-10 right-10 z-10">
        <button
          onClick={handleMuteToggle}
          className="p-3 rounded-full bg-[#0d0d0d] border border-[#2a2a2a] hover:border-[#c2a078]/50 hover:bg-[#121212] text-[#c2a078] transition-colors cursor-pointer flex items-center justify-center"
          title={muted ? "Unmute sounds" : "Mute sounds"}
        >
          {muted ? <VolumeX className="w-5 h-5 text-neutral-500" /> : <Volume2 className="w-5 h-5 text-[#c2a078]" />}
        </button>
      </div>

      {/* Main Container Card */}
      <div className="relative w-full max-w-2xl bg-[#0d0d0d] border border-[#2a2a2a] rounded shadow-2xl p-8 md:p-12 md:pb-8 flex flex-col items-center">
        {/* Subtle Decorative Gradient */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-[#c2a078]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Title & Theme */}
        <div className="text-center space-y-3 mb-8">
          <h1 className="font-display text-4xl md:text-5xl font-light tracking-widest text-[#c2a078] uppercase pb-1">
            Cross
          </h1>
          <p className="font-sans tracking-[0.3em] text-white/40 uppercase text-[10px]">
            The Great Wildebeest Migration
          </p>
        </div>

        {/* Story Intro */}
        <div className="bg-[#121212]/80 border border-[#2a2a2a]/40 rounded-sm p-6 mb-8 text-xs leading-relaxed text-white/60 text-center font-sans tracking-wide">
          Every year, more than a million wildebeest and other plains animals like zebra take part in a circular migration across the Serengeti/Mara ecosystem. And each year they must cross the Mara river, braving crocodiles, strong currents, and each other to get to the other side.
          <br />
          <span className="text-[#c2a078] font-light italic mt-3 block text-[13px] tracking-widest font-display">
            Steer your wildebeest through the melee and keep the cycle going.
          </span>
        </div>

        {/* Migration map: ten crossings ahead */}
        <div className="w-full mb-8 border border-[#2a2a2a] rounded-sm overflow-hidden">
          <CrossingMap completed={0} />
        </div>

        {/* Instructions Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-[11px] font-sans">
          <div className="bg-[#121212] p-4 rounded-sm border border-[#2a2a2a] hover:border-white/10 transition-all flex gap-3">
            <div className="p-2 rounded-sm bg-[#0d0d0d] text-[#c2a078] h-fit">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-medium text-[#c2a078] uppercase tracking-wider mb-1">Steering controls</h4>
              <p className="text-white/40 leading-normal">
                Use <strong className="text-white/70">WASD</strong> or <strong className="text-white/70">Arrows</strong> to move. Or simply <strong className="text-white/70">Click / Tap</strong> on the river to swim towards that point on the screen.
              </p>
            </div>
          </div>

          <div className="bg-[#121212] p-4 rounded-sm border border-[#2a2a2a] hover:border-white/10 transition-all flex gap-3">
            <div className="p-2 rounded-sm bg-[#0d0d0d] text-[#c2a078] h-fit">
              <Waves className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-medium text-[#c2a078] uppercase tracking-wider mb-1">Dodge & Dash Jumps</h4>
              <p className="text-white/40 leading-normal">
                Press <strong className="text-white/70">SPACEBAR</strong> or tap the Jump button to jump. Leaping uses stamina but gives you massive forward speed to outswim and dodge snapping crocodile jaws.
              </p>
            </div>
          </div>

          <div className="bg-[#121212] p-4 rounded-sm border border-[#2a2a2a] hover:border-white/10 transition-all flex gap-3 col-span-1 md:col-span-2">
            <div className="p-2 rounded-sm bg-[#0d0d0d] text-[#c2a078] h-fit">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-medium text-[#c2a078] uppercase tracking-wider mb-1">Tactics: Stampedes and Hops</h4>
              <p className="text-white/40 text-xs leading-normal">
                Crowding too close to other wildebeests triggers a slow, dangerous <strong className="text-[#c2a078]">stampede</strong> that bleeds health. Press <strong className="text-white/70">SPACEBAR</strong> to <strong className="text-[#c2a078]">HOP</strong>, which physically pushes nearby herd members away and creates separation! Beware: each leap takes up <strong className="text-red-400">15% stamina</strong>, so jump wisely.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleStart}
          className="w-full sm:w-auto px-10 py-4 rounded-sm bg-[#c2a078] hover:bg-[#b08f68] font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#0a0a0a] shadow-lg active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-2 border-0"
        >
          Begin Great Migration
        </button>

        {/* Footer credits */}
        <div className="mt-8 pt-4 w-full border-t border-[#2a2a2a] flex justify-between items-center text-[9px] text-white/30 font-mono tracking-widest uppercase">
          <span>COOPERATING HERD ENGINE v2.4.0</span>
          <span>Section VII — Southern Serengeti Cycle</span>
        </div>
      </div>
    </div>
  );
}
