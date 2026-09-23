import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { playSelect } from '../utils/audio';
import titleArt from '../assets/title-art.webp';

interface TitleScreenProps {
  // Called once the art has fully dissolved, so the screen can be unmounted
  onDone: () => void;
}

const DISSOLVE_MS = 1200;

// Full-screen concept art shown on first load. It sits on top of the start screen and dissolves away
// when Play is pressed, revealing the menu underneath.
export default function TitleScreen({ onDone }: TitleScreenProps) {
  const [dissolving, setDissolving] = useState(false);

  const handlePlay = () => {
    if (dissolving) return;
    playSelect();
    setDissolving(true);
    setTimeout(onDone, DISSOLVE_MS);
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-page overflow-hidden select-none"
      style={{
        opacity: dissolving ? 0 : 1,
        filter: dissolving ? 'blur(12px)' : 'none',
        transform: dissolving ? 'scale(1.06)' : 'none',
        transition: `opacity ${DISSOLVE_MS}ms ease-in-out, filter ${DISSOLVE_MS}ms ease-in-out, transform ${DISSOLVE_MS}ms ease-in-out`,
        pointerEvents: dissolving ? 'none' : 'auto',
      }}
    >
      {/* Cover the screen, cropping as needed; anchored top-left so the logo stays in view */}
      <img
        src={titleArt}
        alt="Cross: wildebeest and zebra crossing a crocodile-filled river"
        className="absolute inset-0 w-full h-full object-cover object-left-top"
        draggable={false}
      />

      {/* Soft darkening at the bottom so the Play button stands out from the busy art */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

      <div className="absolute inset-x-0 bottom-[10%] flex justify-center px-4">
        <button
          onClick={handlePlay}
          autoFocus
          className="group inline-flex items-center gap-3 px-12 py-4 rounded-full bg-[#f5ecd7] hover:bg-white text-[#10243a] font-sans text-lg font-extrabold tracking-[0.25em] uppercase border-4 border-[#10243a] shadow-[0_6px_0_#10243a,0_12px_30px_rgba(0,0,0,0.45)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#10243a] transition-all cursor-pointer"
        >
          <Play className="w-5 h-5 fill-[#10243a] transition-transform group-hover:scale-110" />
          Play
        </button>
      </div>
    </div>
  );
}
