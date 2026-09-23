import React from 'react';
import { Skull, RotateCcw, Award, Volume2, VolumeX, Sparkles, HelpCircle } from 'lucide-react';
import GuideModal from './GuideModal';
import { playSelect, toggleMute, getMuteStatus } from '../utils/audio';
import { DeathCause } from '../types';

interface GameOverProps {
  dayReached: number;
  isVictory?: boolean;
  deathCause?: DeathCause | null;
  onRetryLevel: () => void;
  onNewMigration: () => void;
}

const CAUSE_TEXT: Record<DeathCause, string> = {
  eaten: 'Taken by a crocodile',
  washed: 'Swept away by the current',
  trampled: 'Trampled in a stampede',
  drowned: 'Drowned from exhaustion',
};

export default function GameOver({ dayReached, isVictory, deathCause, onRetryLevel, onNewMigration }: GameOverProps) {
  const [muted, setMuted] = React.useState(getMuteStatus());
  const [guideOpen, setGuideOpen] = React.useState(false);

  const handleMuteToggle = () => {
    const isMutedNow = toggleMute();
    setMuted(isMutedNow);
    playSelect();
  };

  // Rank on the crossings actually finished, not the one that was lost
  const finished = isVictory ? 10 : dayReached - 1;
  const herds = `${finished} herd${finished === 1 ? '' : 's'}`;

  let titleText = "Crossing Failed";
  let subtitle = "No herd made it across this time. The Mara is unforgiving.";
  let badgeColor = "border-rose-500/30 text-rose-400 bg-rose-500/10";
  let grade = "Riverbank Rookie";
  
  if (isVictory) {
    titleText = "All Ten Crossings Made!";
    subtitle = "You led a herd safely across every one of the ten crossings, from the gentlest to the most dangerous point on the Mara. Fresh grazing awaits on the far bank.";
    grade = "Serengeti Savior";
    badgeColor = "border-[#c2a078]/30 text-[#c2a078] bg-[#c2a078]/10 animate-pulse";
  } else if (finished >= 5) {
    subtitle = `A strong showing. You led ${herds} across, including some of the most dangerous crossings on the river.`;
    grade = "Gnu Master";
    badgeColor = "border-emerald-500/30 text-emerald-400 bg-emerald-500/10";
  } else if (finished >= 2) {
    subtitle = `A respectable run. ${herds} made it to the other shore, and the cycle continues.`;
    grade = "Savannah Survivor";
    badgeColor = "border-amber-500/30 text-amber-400 bg-amber-500/10";
  } else if (finished >= 1) {
    subtitle = "One herd made it across before the river got the better of you.";
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
    <div className="flex flex-col items-center justify-center min-h-screen screen-glow p-6 select-none text-[#e5e5e5]">
      <div className="absolute top-10 right-10 z-10 flex gap-2">
        <button
          onClick={handleMuteToggle}
          className="p-3 rounded-full bg-panel border border-line hover:border-[#c2a078]/50 hover:bg-panel-raised text-[#c2a078] transition-colors cursor-pointer flex items-center justify-center"
          title={muted ? "Unmute sounds" : "Mute sounds"}
        >
          {muted ? <VolumeX className="w-5 h-5 text-neutral-500" /> : <Volume2 className="w-5 h-5 text-[#c2a078]" />}
        </button>
        <button
          id="gameover-guide-btn"
          onClick={() => { playSelect(); setGuideOpen(true); }}
          className="p-3 rounded-full bg-panel border border-line hover:border-[#c2a078]/50 hover:bg-panel-raised text-[#c2a078] transition-colors cursor-pointer flex items-center justify-center"
          title="Help & Information"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      <GuideModal isOpen={guideOpen} originId="gameover-guide-btn" onClose={() => setGuideOpen(false)} />

      <div className="relative w-full max-w-xl bg-panel border border-line rounded overflow-hidden shadow-2xl p-8 md:p-12 flex flex-col items-center">
        {/* Subtle background light */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-[#c2a078]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Skull or Sparkles Icon */}
        <div className={`p-4 bg-inset border border-line rounded-sm mb-6 relative ${isVictory ? 'text-[#c2a078]' : 'text-[#a34d4d]'}`}>
          {isVictory ? <Sparkles className="w-12 h-12" /> : <Skull className="w-12 h-12" />}
        </div>

        {/* Title & Comment */}
        <div className="text-center space-y-3 mb-8">
          <h1 className="font-display text-3xl font-light tracking-widest text-[#c2a078] uppercase pb-1">
            {titleText}
          </h1>
          <p className="text-xs text-white/60 leading-relaxed max-w-sm mx-auto font-sans">
            {subtitle}
          </p>
        </div>

        {/* Grade Badge */}
        <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-sm border text-[10px] tracking-widest font-semibold uppercase mb-8 ${badgeColor}`}>
          <Award className="w-4 h-4" />
          Rank: {grade}
        </div>

        {/* Final Statistics Panel */}
        <div className="w-full bg-panel-raised rounded-sm border border-line p-5 mb-8">
          <div className="flex justify-between items-center text-xs font-sans">
            <span className="text-white/60 uppercase tracking-wider text-[10px]">
              {isVictory ? "Crossings Made" : "Lost At"}
            </span>
            <span className="text-[#c2a078] font-mono font-bold text-sm bg-[#c2a078]/10 px-3 py-1 border border-[#c2a078]/20 rounded-sm">
              {isVictory ? "10 / 10" : `Crossing #${dayReached}`}
            </span>
          </div>
          {!isVictory && deathCause && (
            <div className="flex justify-between items-center text-xs font-sans mt-3 pt-3 border-t border-line">
              <span className="text-white/60 uppercase tracking-wider text-[10px]">Cause</span>
              <span className="text-[#a34d4d] font-sans font-semibold text-xs">{CAUSE_TEXT[deathCause]}</span>
            </div>
          )}
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
            Start Over from Crossing #1
          </button>
        </div>
      </div>
    </div>
  );
}
