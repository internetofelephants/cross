import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Navigation, Volume2, VolumeX, RotateCcw, RefreshCw, HelpCircle, Dumbbell, Zap, Heart } from 'lucide-react';
import { toggleMute, getMuteStatus, playSelect } from '../utils/audio';

interface GameHUDProps {
  day: number;
  remainingInHerdWave: number;
  activeFollowers: number;
  stamina: number;
  health: number; // Health parameter
  onTogglePause: () => void;
  onRestartWave: () => void;
  onResetGame: () => void;
  onSprintPressDown: () => void;
  onSprintPressUp: () => void;
  isSprinting: boolean;
  minHerdDistance: number;
}

export default function GameHUD({
  day,
  remainingInHerdWave,
  activeFollowers,
  stamina,
  health,
  onTogglePause,
  onRestartWave,
  onResetGame,
  onSprintPressDown,
  onSprintPressUp,
  isSprinting,
  minHerdDistance,
}: GameHUDProps) {
  const [muted, setMuted] = useState(getMuteStatus());
  const [showHowTo, setShowHowTo] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  // Auto-cancel confirmation after 4 seconds
  useEffect(() => {
    if (isConfirmingReset) {
      const timer = setTimeout(() => setIsConfirmingReset(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmingReset]);

  const handleMuteToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    const isMutedNow = toggleMute();
    setMuted(isMutedNow);
    playSelect();
  };

  const activeHerdSize = remainingInHerdWave + activeFollowers + 1; // +1 for Alpha

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 font-sans select-none z-10">
      
      {/* Top HUD Cluster */}
      <div className="w-full flex justify-between items-start pointer-events-auto">
        
        {/* Left Side: Stats Panel */}
        <div className="flex gap-2">
          <div className="bg-[#0d0d0d]/95 border border-[#2a2a2a] rounded-sm px-4 py-3 shadow-xl backdrop-blur-md flex gap-4 text-xs font-mono">
            {/* Day and Wave remaining */}
            <div>
              <span className="text-[9px] text-[#c2a078] uppercase block tracking-widest font-semibold font-sans">Migration</span>
              <span className="text-lg font-display font-light text-[#e5e5e5]">Day {day}</span>
            </div>
            
            {/* Active herd status */}
            <div className="border-l border-[#2a2a2a] pl-4">
              <span className="text-[9px] text-white/40 uppercase block tracking-widest font-semibold font-sans">Herd Pool</span>
              <span className="text-lg font-display font-light text-[#e5e5e5]">{activeHerdSize}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Action buttons */}
        <div className="flex gap-2">
          {/* How to play icon */}
          <button
            onClick={(e) => { e.currentTarget.blur(); playSelect(); setShowHowTo(!showHowTo); }}
            className={`p-2.5 rounded-sm border shadow-xl backdrop-blur-md transition-all cursor-pointer ${
              showHowTo 
                ? 'bg-[#c2a078] hover:bg-[#b08f68] border-[#c2a078] text-[#0a0a0a]' 
                : 'bg-[#0d0d0d]/95 hover:bg-[#121212] border-[#2a2a2a] text-[#c2a078]'
            }`}
            title="How to Play"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Restart */}
          <button
            onClick={(e) => { e.currentTarget.blur(); onRestartWave(); }}
            className="p-2.5 rounded-sm bg-[#0d0d0d]/95 hover:bg-[#121212] border border-[#2a2a2a] text-white/40 hover:text-[#a34d4d] hover:border-[#a34d4d]/30 shadow-xl backdrop-blur-md transition-all cursor-pointer"
            title="Restart Active Wave"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Reset Everything (Start Over at Day 1) */}
          <button
            onClick={(e) => {
              e.currentTarget.blur();
              playSelect();
              if (isConfirmingReset) {
                onResetGame();
              } else {
                setIsConfirmingReset(true);
              }
            }}
            className={`p-2.5 rounded-sm border shadow-xl backdrop-blur-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              isConfirmingReset 
                ? 'bg-red-950 hover:bg-red-900 border-red-700 text-red-200 animate-pulse px-3' 
                : 'bg-[#0d0d0d]/95 hover:bg-[#121212] border-[#2a2a2a] text-red-400 hover:border-red-500/30'
            }`}
            title={isConfirmingReset ? "Confirm Reset to Day 1" : "Reset Game & Start Over from Day 1"}
          >
            <RefreshCw className={`w-4 h-4 ${isConfirmingReset ? 'animate-spin' : ''}`} />
            {isConfirmingReset && <span className="text-[9px] font-bold font-mono tracking-wider">CONFIRM RESET?</span>}
          </button>

          {/* Sound Mute */}
          <button
            onClick={handleMuteToggle}
            className="p-2.5 rounded-sm bg-[#0d0d0d]/95 hover:bg-[#121212] border border-[#2a2a2a] text-[#c2a078] hover:border-[#c2a078]/30 shadow-xl backdrop-blur-md transition-all cursor-pointer"
            title={muted ? "Unmute sounds" : "Mute sounds"}
          >
            {muted ? <VolumeX className="w-4 h-4 text-[#e5e5e5]/40" /> : <Volume2 className="w-4 h-4 text-[#c2a078]" />}
          </button>
        </div>
      </div>

      {/* Middle instructions overlay, only when toggled */}
      {showHowTo && (
        <div className="self-center bg-[#0d0d0d]/95 border border-[#2a2a2a] p-6 rounded-sm max-w-sm pointer-events-auto shadow-2xl space-y-3 text-xs leading-relaxed text-white/60 select-text font-sans">
          <h3 className="font-display font-light text-lg tracking-wider text-[#c2a078] flex items-center gap-1.5 border-b border-[#2a2a2a] pb-2">
            <Sparkles className="w-4 h-4 text-[#c2a078]" />
            MIGRATION STRATEGY
          </h3>
          <ul className="space-y-2.5 list-none text-white/60">
            <li>
              <span className="text-[#c2a078] font-medium block uppercase tracking-wider text-[10px] mb-0.5">Steering:</span>
              Move with <span className="font-mono bg-[#0a0a0a] px-1 border border-[#2a2a2a] rounded-sm text-white/50">WASD</span>, <span className="font-mono bg-[#0a0a0a] px-1 border border-[#2a2a2a] rounded-sm text-white/50">Arrows</span>, or click <strong className="text-white/80">anywhere</strong> to swim towards safety exit mud channels on the right bank.
            </li>
            <li>
              <span className="text-[#c2a078] font-medium block uppercase tracking-wider text-[10px] mb-0.5">Lunge Hop:</span>
              Hold or tap <span className="font-mono bg-[#0a0a0a] px-1 border border-[#2a2a2a] rounded-sm text-white/50">SPACEBAR</span> or tap the button. Consumes <strong className="text-red-400">22% stamina</strong>, but pushes nearby animals back, breaking apart dangerous bottleneck stampedes and giving you distance!
            </li>
            <li>
              <span className="text-[#c2a078] font-medium block uppercase tracking-wider text-[10px] mb-0.5">Stampedes & Predators:</span>
              Getting crowded in tightly packed groups limits speed and inflicts trample damage. Crocodiles lie in waiting; their jaws snap wide only when attacking!
            </li>
          </ul>
          <button
            onClick={() => { playSelect(); setShowHowTo(false); }}
            className="w-full text-center py-2 bg-[#0a0a0a] hover:bg-[#121212] rounded-sm text-[#c2a078] font-semibold border border-[#2a2a2a] cursor-pointer text-[10px] uppercase tracking-widest mt-2"
          >
            Dismiss Guide
          </button>
        </div>
      )}

      {/* Centered Isolation Warning */}
      {minHerdDistance > 135 && minHerdDistance < 1200 && (
        <div className="self-center bg-amber-950/95 border border-red-600/60 text-[#ffa3a3] px-5 py-2.5 rounded-sm shadow-2xl backdrop-blur-md animate-pulse flex items-center gap-1.5 mb-2 pointer-events-auto max-w-[420px] text-center font-mono">
          <span className="text-xs font-bold uppercase tracking-widest text-[#fca3a3] leading-tight">
            ⚠️ ISOLATED FROM THE HERD!<br/>
            Crocodiles will detect & chase you more aggressively!
          </span>
        </div>
      )}

      {/* Bottom HUD Cluster */}
      <div className="w-full flex flex-col md:flex-row gap-4 items-center justify-between mt-auto mx-auto max-w-5xl">
        
        {/* Stamina / Power Indicators */}
        <div className="flex flex-col gap-1.5 w-full max-w-xs pointer-events-auto bg-[#0d0d0d]/95 border border-[#2a2a2a] rounded-sm p-3 shadow-xl backdrop-blur-md">
          {/* Health Bar */}
          <div className="flex justify-between items-center text-[10px] font-semibold text-white/40">
            <span className="flex items-center gap-1 uppercase font-mono tracking-widest text-[#a34d4d]">
              <Heart className="w-3.5 h-3.5 fill-[#a34d4d] text-[#a34d4d]" />
              Alpha Health
            </span>
            <span className="font-mono text-[#a34d4d]">{Math.round(health)}%</span>
          </div>
          <div className="w-full h-2 bg-[#0a0a0a] rounded-sm overflow-hidden border border-[#2a2a2a] mb-1">
            <div 
              style={{ width: `${health}%` }} 
              className={`h-full transition-all duration-75 rounded-sm ${
                health > 50 
                  ? 'bg-[#a34d4d]' 
                  : health > 20 
                    ? 'font-bold bg-amber-600' 
                    : 'font-bold bg-red-700 animate-pulse'
              }`}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-semibold text-white/40">
            <span className="flex items-center gap-1 uppercase font-mono tracking-widest">
              <Dumbbell className="w-3.5 h-3.5 text-[#c2a078] animate-pulse" />
              Alpha Stamina
            </span>
            <span className="font-mono text-[#c2a078]/95">{Math.round(stamina)}%</span>
          </div>

          {/* Progress bar container */}
          <div className="w-full h-2 bg-[#0a0a0a] rounded-sm overflow-hidden border border-[#2a2a2a]">
            <div 
              style={{ width: `${stamina}%` }} 
              className={`h-full transition-all duration-75 rounded-sm ${
                stamina > 50 
                  ? 'bg-gradient-to-r from-[#c2a078] to-[#b08f68]' 
                  : stamina > 20 
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500' 
                    : 'bg-gradient-to-r from-[#a34d4d] to-red-800 animate-pulse'
              }`}
            />
          </div>
          
          <div className="text-[9px] text-white/40 leading-none mt-1">
            {stamina < 15 ? '‼️ LOW ENERGY: Cannot make leap hops currently!' : 'Hold SPACE to lunge jump (push other wildebeests, dodge teeth)'}
          </div>
        </div>

        {/* Hotkeys / Touch Control Actions */}
        <div className="flex gap-3 pointer-events-auto bg-[#0d0d0d]/95 border border-[#2a2a2a] rounded-sm p-2.5 shadow-xl backdrop-blur-md items-center">
          {/* Sprint Action Button (Touch Helper to Hop) */}
          <button
            onMouseDown={onSprintPressDown}
            onMouseUp={onSprintPressUp}
            onTouchStart={(e) => { e.preventDefault(); onSprintPressDown(); }}
            onTouchEnd={(e) => { e.preventDefault(); onSprintPressUp(); }}
            className={`px-5 py-2.5 rounded-sm font-sans text-[10px] font-semibold tracking-widest uppercase transition-all flex items-center gap-1.5 cursor-pointer border-0 select-none ${
              isSprinting
                ? 'bg-[#c2a078] text-[#0a0a0a] scale-[0.97]'
                : 'bg-[#121212] hover:bg-white/5 text-white/80 border border-[#2a2a2a]'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isSprinting ? 'animate-bounce fill-neutral-950 text-neutral-950' : 'text-[#c2a078]'}`} />
            Jump Hop
          </button>
        </div>
      </div>
    </div>
  );
}
