import React, { useState } from 'react';
import { Volume2, VolumeX, HelpCircle } from 'lucide-react';
import { playSelect, toggleMute, getMuteStatus } from '../utils/audio';
import GuideModal from './GuideModal';

// Sound and ? buttons shown in the corner of the menu, between-crossings and game-over panels.
interface ScreenControlsProps {
  // Id for the ? button, which the guide grows out of.
  guideId: string;
  className?: string;
}

const BUTTON =
  'p-2 md:p-3 rounded-full bg-panel border border-line hover:border-[#c2a078]/50 hover:bg-panel-raised text-[#c2a078] transition-colors cursor-pointer flex items-center justify-center';

export default function ScreenControls({ guideId, className = '' }: ScreenControlsProps) {
  const [muted, setMuted] = useState(getMuteStatus());
  const [guideOpen, setGuideOpen] = useState(false);

  const handleMuteToggle = () => {
    setMuted(toggleMute());
    playSelect();
  };

  return (
    <>
      <div className={`flex gap-1 md:gap-2 ${className}`}>
        <button onClick={handleMuteToggle} className={BUTTON} title={muted ? 'Unmute sounds' : 'Mute sounds'}>
          {muted ? <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-neutral-500" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
        </button>
        <button
          id={guideId}
          onClick={() => { playSelect(); setGuideOpen(true); }}
          className={BUTTON}
          title="Help & Information"
        >
          <HelpCircle className="w-4 h-4 md:w-5 md:h-5" />
        </button>
      </div>
      <GuideModal isOpen={guideOpen} originId={guideId} onClose={() => setGuideOpen(false)} />
    </>
  );
}
