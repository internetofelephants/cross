import React from 'react';
import { Skull, RotateCcw, Award, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { playSelect, toggleMute, getMuteStatus } from '../utils/audio';

interface GameOverProps {
  dayReached: number;
  isVictory?: boolean;
  onRetryLevel: () => void;
  onNewMigration: () => void;
}

export default function GameOver({ dayReached, isVictory, onRetryLevel, onNewMigration }: GameOverProps) {
  const [muted, setMuted] = React.useState(getMuteStatus());

  const handleMuteToggle = () => {
    const isMutedNow = toggleMute();
    setMuted(isMutedNow);
    playSelect();
  };

  // Personalized summary based on results
  let titleText = "Migration Concluded";
  let subtitle = "Nature can be harsh. The crocodiles of the Mara River were well fed.";
  let badgeColor = "border-rose-500/30 text-rose-400 bg-rose-500/10";
  let grade = "Croc Feast";
  
  if (isVictory) {
    titleText = "Migration Victorious!";
    subtitle = "A historical milestone! Your alpha has successfully guided the herd across all 10 perilous crossings of the Mara River. The lush, safe pastures of the Serengeti await!";
    grade = "Serengeti Savior";
    badgeColor = "border-[#c2a078]/30 text-[#c2a078] bg-[#c2a078]/10 animate-pulse";
  } else if (dayReached >= 6) {
    subtitle = "A legendary trek! Your alpha guided the herd like a seasoned general through endless sunrises.";
    grade = "Gnu Master";
    badgeColor = "border-emerald-500/30 text-emerald-400 bg-emerald-500/10";
  } else if (dayReached >= 3) {
    subtitle = "A respectable migration. The cycle of life continues on the other shore.";
    grade = "Savannah Survivor";
    badgeColor = "border-amber-500/30 text-amber-400 bg-amber-500/10";
  } else if (dayReached >= 2) {
    subtitle = "The river claimed many, but your alpha led the survivors to rebuild the herd.";
    grade = "Plains Walker";
    badgeColor = "border-yellow-600/30 text-yellow-500 bg-yellow-600/10";
  }

  const handleRetryClick = () => {
    playSelect();
    onRetryLevel();
  };

  const handleNewMigrationClick = () => {
    playSelect();
    onNewMigration();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] p-6 select-none text-[#e5e5e5]">
      <div className="absolute top-10 right-10 z-10">
        <button
          onClick={handleMuteToggle}
          className="p-3 rounded-full bg-[#0d0d0d] border border-[#2a2a2a] hover:border-[#c2a078]/50 hover:bg-[#121212] text-[#c2a078] transition-colors cursor-pointer flex items-center justify-center"
          title={muted ? "Unmute sounds" : "Mute sounds"}
        >
          {muted ? <VolumeX className="w-5 h-5 text-neutral-500" /> : <Volume2 className="w-5 h-5 text-[#c2a078]" />}
        </button>
      </div>

      <div className="relative w-full max-w-xl bg-[#0d0d0d] border border-[#2a2a2a] rounded overflow-hidden shadow-2xl p-8 md:p-12 flex flex-col items-center">
        {/* Subtle background light */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-[#c2a078]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Skull or Sparkles Icon */}
        <div className={`p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-sm mb-6 relative ${isVictory ? 'text-[#c2a078]' : 'text-[#a34d4d]'}`}>
          {isVictory ? <Sparkles className="w-12 h-12" /> : <Skull className="w-12 h-12" />}
        </div>

        {/* Title & Comment */}
        <div className="text-center space-y-3 mb-8">
          <h1 className="font-display text-3xl font-light tracking-widest text-[#c2a078] uppercase pb-1">
            {titleText}
          </h1>
          <p className="text-xs text-white/40 leading-relaxed max-w-sm mx-auto font-sans">
            {subtitle}
          </p>
        </div>

        {/* Grade Badge */}
        <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-sm border text-[10px] tracking-widest font-semibold uppercase mb-8 ${badgeColor}`}>
          <Award className="w-4 h-4" />
          Rank: {grade}
        </div>

        {/* Final Statistics Panel */}
        <div className="w-full bg-[#121212] rounded-sm border border-[#2a2a2a] p-5 mb-8">
          <div className="flex justify-between items-center text-xs font-sans">
            <span className="text-white/40 uppercase tracking-wider text-[10px]">
              {isVictory ? "Migration Crossings Completed" : "Migration Days Survived"}
            </span>
            <span className="text-[#c2a078] font-mono font-bold text-sm bg-[#c2a078]/10 px-3 py-1 border border-[#c2a078]/20 rounded-sm">
              {isVictory ? "10 / 10" : `Day ${dayReached}`}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          {!isVictory && (
            <button
              onClick={handleRetryClick}
              className="px-8 py-3.5 rounded-sm bg-[#c2a078] hover:bg-[#b08f68] font-sans text-xs font-semibold tracking-[0.2em] uppercase text-[#0a0a0a] shadow-md active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-2 border-0"
            >
              <RotateCcw className="w-4 h-4" />
              Try Crossing Again
            </button>
          )}

          <button
            onClick={handleNewMigrationClick}
            className={`px-8 py-3.5 rounded-sm font-sans text-xs font-semibold tracking-[0.2em] uppercase transition-all cursor-pointer inline-flex items-center justify-center gap-2 ${
              isVictory
                ? 'bg-[#c2a078] hover:bg-[#b08f68] text-[#0a0a0a] border-0 shadow-md active:scale-[0.98]'
                : 'border border-[#c2a078]/40 hover:border-[#c2a078] text-[#c2a078] hover:bg-[#c2a078]/10'
            }`}
          >
            {isVictory ? <RotateCcw className="w-4 h-4" /> : null}
            Begin New Migration
          </button>
        </div>
      </div>
    </div>
  );
}
