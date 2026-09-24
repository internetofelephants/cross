import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, RotateCcw, RefreshCw, HelpCircle, Dumbbell, Zap, Heart } from 'lucide-react';
import { toggleMute, getMuteStatus, playSelect } from '../utils/audio';
import { STRAY_DISTANCE } from '../types';
import GuideModal from './GuideModal';

interface GameHUDProps {
  day: number;
  stamina: number;
  health: number; // Health parameter
  onGuideToggle: (open: boolean) => void;
  onRestartWave: () => void;
  onResetGame: () => void;
  onSprintPressDown: () => void;
  onSprintPressUp: () => void;
  isSprinting: boolean;
  minHerdDistance: number;
}

export default function GameHUD({
  day,
  stamina,
  health,
  onGuideToggle,
  onRestartWave,
  onResetGame,
  onSprintPressDown,
  onSprintPressUp,
  isSprinting,
  minHerdDistance,
}: GameHUDProps) {
  const [muted, setMuted] = useState(getMuteStatus());
  const [guideOpen, setGuideOpen] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  // Auto-cancel confirmation after 4 seconds
  useEffect(() => {
    if (isConfirmingReset) {
      const timer = setTimeout(() => setIsConfirmingReset(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmingReset]);

  // The game pauses while the guide is open
  const setGuide = (open: boolean) => {
    setGuideOpen(open);
    onGuideToggle(open);
  };

  const handleMuteToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    const isMutedNow = toggleMute();
    setMuted(isMutedNow);
    playSelect();
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 font-sans select-none z-10">
      
      {/* Top HUD Cluster */}
      <div className="w-full flex justify-between items-start pointer-events-auto">
        
        {/* Left Side: Stats Panel */}
        <div className="flex gap-2">
          <div className="bg-panel/95 border border-line rounded-xl px-4 py-2.5 shadow-xl backdrop-blur-md flex gap-4 text-xs">
            <div>
              <span className="text-[11px] text-[#c2a078] block font-semibold">Crossing</span>
              <span className="text-2xl leading-none font-display font-semibold text-[#e5e5e5]">#{day}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Action buttons */}
        <div className="flex gap-2">
          {/* Restart */}
          <button
            onClick={(e) => { e.currentTarget.blur(); onRestartWave(); }}
            className="p-2.5 rounded-full bg-panel/95 hover:bg-panel-raised border border-line text-white/60 hover:text-[#a34d4d] hover:border-[#a34d4d]/30 shadow-xl backdrop-blur-md transition-all cursor-pointer"
            title="Restart this crossing"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Reset Everything (Start Over at Crossing #1) */}
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
            className={`p-2.5 rounded-full border shadow-xl backdrop-blur-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              isConfirmingReset 
                ? 'bg-red-950 hover:bg-red-900 border-red-700 text-red-200 animate-pulse px-3' 
                : 'bg-panel/95 hover:bg-panel-raised border-line text-red-400 hover:border-red-500/30'
            }`}
            title={isConfirmingReset ? "Click again to start over from Crossing #1" : "Start over from Crossing #1"}
          >
            <RefreshCw className={`w-4 h-4 ${isConfirmingReset ? 'animate-spin' : ''}`} />
            {isConfirmingReset && <span className="text-sm font-display font-semibold">Start over?</span>}
          </button>

          {/* Sound Mute */}
          <button
            onClick={handleMuteToggle}
            className="p-2.5 rounded-full bg-panel/95 hover:bg-panel-raised border border-line text-[#c2a078] hover:border-[#c2a078]/30 shadow-xl backdrop-blur-md transition-all cursor-pointer"
            title={muted ? "Unmute sounds" : "Mute sounds"}
          >
            {muted ? <VolumeX className="w-4 h-4 text-[#e5e5e5]/40" /> : <Volume2 className="w-4 h-4 text-[#c2a078]" />}
          </button>

          {/* Help & information guide */}
          <button
            id="hud-guide-btn"
            onClick={(e) => { e.currentTarget.blur(); playSelect(); setGuide(true); }}
            className="p-2.5 rounded-full bg-panel/95 hover:bg-panel-raised border border-line text-[#c2a078] hover:border-[#c2a078]/30 shadow-xl backdrop-blur-md transition-all cursor-pointer"
            title="Help & Information"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Centered Isolation Warning */}
      {minHerdDistance > STRAY_DISTANCE && minHerdDistance < 1200 && (
        <div className="self-center bg-amber-950/95 border border-red-600/60 text-[#ffc2c2] px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md animate-pulse flex items-center gap-1.5 mb-2 pointer-events-auto max-w-[420px] text-center">
          <span className="leading-snug">
            <span className="font-display font-semibold text-base text-[#ffb0b0]">⚠️ You&rsquo;ve strayed from the herd!</span><br/>
            <span className="text-xs">Crocodiles hunt lone swimmers. Get back to the others.</span>
          </span>
        </div>
      )}

      {/* Bottom HUD Cluster */}
      <div className="w-full flex flex-col md:flex-row gap-4 items-center justify-between mt-auto mx-auto max-w-5xl">
        
        {/* Stamina / Power Indicators */}
        <div className="flex flex-col gap-1.5 w-full max-w-xs pointer-events-auto bg-panel/95 border border-line rounded-xl p-3 shadow-xl backdrop-blur-md">
          {/* Health Bar */}
          <div className="flex justify-between items-center text-sm font-display font-semibold text-white/60">
            <span className="flex items-center gap-1.5 text-[#d97a7a]">
              <Heart className="w-3.5 h-3.5 fill-[#c05a5a] text-[#c05a5a]" />
              Health
            </span>
            <span className="text-[#d97a7a]">{Math.round(health)}%</span>
          </div>
          <div className="w-full h-2 bg-inset rounded-full overflow-hidden border border-line mb-1">
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

          <div className="flex justify-between items-center text-sm font-display font-semibold text-white/60">
            <span className="flex items-center gap-1.5 text-[#c2a078]">
              <Dumbbell className="w-3.5 h-3.5 text-[#c2a078] animate-pulse" />
              Stamina
            </span>
            <span className="text-[#c2a078]">{Math.round(stamina)}%</span>
          </div>

          {/* Progress bar container */}
          <div className="w-full h-2 bg-inset rounded-full overflow-hidden border border-line">
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
          
          <div className="text-[11px] text-white/60 leading-snug mt-1">
            {stamina < 15 ? 'Too tired to hop. Save your strength!' : 'Press Space to hop: shove the crowd aside or leap over jaws.'}
          </div>
        </div>

        {/* Hotkeys / Touch Control Actions */}
        <div className="flex gap-3 pointer-events-auto bg-panel/95 border border-line rounded-full p-2 shadow-xl backdrop-blur-md items-center">
          {/* Sprint Action Button (Touch Helper to Hop) */}
          <button
            onMouseDown={onSprintPressDown}
            onMouseUp={onSprintPressUp}
            onMouseLeave={onSprintPressUp}
            onTouchStart={(e) => { e.preventDefault(); onSprintPressDown(); }}
            onTouchEnd={(e) => { e.preventDefault(); onSprintPressUp(); }}
            onTouchCancel={onSprintPressUp}
            className={`px-6 py-2.5 rounded-full font-display text-base font-semibold transition-all flex items-center gap-1.5 cursor-pointer border-0 select-none ${
              isSprinting
                ? 'bg-[#c2a078] text-[#1e1a15] scale-[0.97]'
                : 'bg-panel-raised hover:bg-white/5 text-white/80 border border-line'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isSprinting ? 'animate-bounce fill-neutral-950 text-neutral-950' : 'text-[#c2a078]'}`} />
            Hop!
          </button>
        </div>
      </div>

      <GuideModal isOpen={guideOpen} originId="hud-guide-btn" onClose={() => setGuide(false)} />
    </div>
  );
}
