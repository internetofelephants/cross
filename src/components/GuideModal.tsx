import React, { useState, useEffect, useLayoutEffect } from 'react';
import { X } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { AboutContent, InstructionsContent, ReferencesContent } from '../data/guideContent';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** DOM id of the button that opened the modal; the dialog grows out of it and shrinks back into it. */
  originId?: string;
}

type TabId = 'instructions' | 'about' | 'references';

interface Tab {
  id: TabId;
  label: string;
  content: React.ReactNode;
}

const TABS: Tab[] = [
  { id: 'instructions', label: 'Instructions', content: <InstructionsContent /> },
  { id: 'about', label: 'About', content: <AboutContent /> },
  { id: 'references', label: 'References', content: <ReferencesContent /> },
];

const OPEN_MS = 450;
const CLOSE_MS = 300;

/** Offset from the viewport centre to the centre of the element with `id`. */
function offsetFromCenter(id?: string): { x: number; y: number } {
  const el = id ? document.getElementById(id) : null;
  if (!el) return { x: 0, y: 0 };
  const rect = el.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2 - window.innerWidth / 2,
    y: rect.top + rect.height / 2 - window.innerHeight / 2,
  };
}

export default function GuideModal({ isOpen, onClose, originId }: GuideModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('instructions');
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  // `mounted` keeps the dialog in the DOM while it animates closed; `shown` drives the transition itself
  const [mounted, setMounted] = useState(isOpen);
  const [shown, setShown] = useState(false);

  useLayoutEffect(() => {
    if (isOpen) {
      setOrigin(offsetFromCenter(originId));
      setMounted(true);
    } else {
      setShown(false);
    }
  }, [isOpen, originId]);

  useEffect(() => {
    if (isOpen && mounted) {
      // Wait a frame so the collapsed starting position is painted before transitioning out of it
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    if (!isOpen && mounted) {
      const t = setTimeout(() => setMounted(false), CLOSE_MS);
      return () => clearTimeout(t);
    }
  }, [isOpen, mounted]);

  useEscapeKey(onClose, isOpen);

  if (!mounted) return null;

  const activeIndex = TABS.findIndex((t) => t.id === activeTab);

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-[2px] transition-opacity"
      style={{ opacity: shown ? 1 : 0, transitionDuration: `${shown ? OPEN_MS : CLOSE_MS}ms` }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Information & Guide"
        className="relative w-full max-w-xl rounded-2xl bg-panel/95 backdrop-blur-md text-[#e5e5e5] shadow-2xl border border-line overflow-hidden flex flex-col select-none"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: shown
            ? 'translate(0px, 0px) scale(1)'
            : `translate(${origin.x}px, ${origin.y}px) scale(0.02)`,
          opacity: shown ? 1 : 0,
          transition: shown
            ? `transform ${OPEN_MS}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${OPEN_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`
            : `transform ${CLOSE_MS}ms ease-in, opacity ${CLOSE_MS}ms ease-in`,
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line bg-panel-raised/60">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[#c2a078] text-[#0a0a0a] font-bold text-xs flex items-center justify-center">
              ?
            </span>
            <h3 className="font-display text-lg font-semibold text-[#c2a078]">
              Information & guide
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-sm text-white/60 hover:text-[#c2a078] hover:bg-white/5 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="relative flex border-b border-line bg-inset/40" role="tablist">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                id={`guide-tab-${tab.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls={`guide-tabpanel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 px-3 sm:px-4 text-center font-display text-sm sm:text-base font-semibold transition-colors cursor-pointer ${
                  isActive ? 'text-[#c2a078] bg-panel-raised/80' : 'text-white/60 hover:text-white/70 hover:bg-white/[0.03]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
          {/* Sliding underline under the active tab */}
          <div
            className="absolute bottom-0 left-0 h-0.5 bg-[#c2a078] transition-transform duration-300 ease-out"
            style={{ width: `${100 / TABS.length}%`, transform: `translateX(${activeIndex * 100}%)` }}
          />
        </div>

        {/* Panels: equal height, scroll if needed */}
        <div className="p-4 sm:p-5 flex-1">
          {TABS.map((tab) => (
            <div
              key={tab.id}
              id={`guide-tabpanel-${tab.id}`}
              role="tabpanel"
              aria-labelledby={`guide-tab-${tab.id}`}
              hidden={activeTab !== tab.id}
              className="guide-scroll h-72 sm:h-80 w-full overflow-y-auto rounded-xl p-4 bg-inset/60 border border-line select-text"
            >
              {tab.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
