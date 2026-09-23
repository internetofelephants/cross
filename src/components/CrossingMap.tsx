import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

// Top-down "stepping stones" map of the migration: one stone per day's crossing, with crocodiles
// patrolling up and down the river. Used on the main menu and between days.

const WIDTH = 680;
const HEIGHT = 320;
const RIVER_PATH = 'M -20 160 C 100 50 160 270 280 170 S 420 60 500 170 S 610 220 700 150';
const TOTAL_CROSSINGS = 10;

export const CROSSING_NAMES = [
  'Lookout',
  'Main',
  'Cul-de-sac',
  'Serena',
  'Kaburu',
  'Rekero',
  'Paradise',
  'Double',
  'Mara Bridge',
  'Purungat',
];

// [start position along the river (0-1), speed in units per frame, sideways offset from the centerline]
const CROC_SPECS: [number, number, number][] = [
  [0.15, 0.35, 5],
  [0.55, -0.25, -6],
  [0.85, 0.3, 3],
  [0.4, 0.2, -2],
];

const TREES: [number, number][] = [[70, 50], [600, 40], [380, 290], [140, 290], [620, 300], [330, 40]];

interface Crossing {
  x: number;
  y: number;
  nx: number; // unit normal to the river at this point
  ny: number;
}

interface CrossingMapProps {
  // Number of crossings finished; the next one pulses as the current target.
  completed: number;
  // Crossing (1-based) to celebrate with a pop-in check mark, e.g. the day just finished.
  justCompleted?: number;
  className?: string;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function pointAt(path: SVGPathElement, s: number) {
  const p = path.getPointAtLength(s);
  const q = path.getPointAtLength(s + 1);
  const tx = q.x - p.x;
  const ty = q.y - p.y;
  const m = Math.hypot(tx, ty) || 1;
  return { x: p.x, y: p.y, nx: -ty / m, ny: tx / m, angle: (Math.atan2(ty, tx) * 180) / Math.PI };
}

export default function CrossingMap({ completed, justCompleted, className = '' }: CrossingMapProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const crocRefs = useRef<(SVGGElement | null)[]>([]);
  const [crossings, setCrossings] = useState<Crossing[]>([]);

  const tufts = useMemo(() => {
    const rnd = seededRandom(3);
    return Array.from({ length: 40 }, () => ({ x: rnd() * WIDTH, y: rnd() * HEIGHT }));
  }, []);

  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    setCrossings(
      Array.from({ length: TOTAL_CROSSINGS }, (_, i) =>
        pointAt(path, length * (0.08 + (0.82 * i) / (TOTAL_CROSSINGS - 1)))
      )
    );
  }, []);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const crocs = CROC_SPECS.map(([start, speed, offset]) => ({ s: start * length, v: speed, offset }));

    let frame = 0;
    const step = () => {
      crocs.forEach((croc, i) => {
        if (!reduceMotion) {
          croc.s += croc.v;
          if (croc.s > length * 0.97 || croc.s < length * 0.03) croc.v = -croc.v;
        }
        const p = pointAt(path, croc.s);
        const heading = p.angle + (croc.v < 0 ? 180 : 0);
        crocRefs.current[i]?.setAttribute(
          'transform',
          `translate(${p.x + p.nx * croc.offset} ${p.y + p.ny * croc.offset}) rotate(${heading})`
        );
      });
      if (!reduceMotion) frame = requestAnimationFrame(step);
    };
    step();
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={`w-full h-auto block rounded-sm select-none ${className}`}
      role="img"
      aria-label={`Migration map: ${completed} of ${TOTAL_CROSSINGS} river crossings completed`}
    >
      <style>{`
        .cm-flow { animation: cm-flow 3s linear infinite; }
        @keyframes cm-flow { to { stroke-dashoffset: -42; } }
        .cm-pop { transform-box: fill-box; transform-origin: center; animation: cm-pop 700ms 300ms cubic-bezier(.34,1.56,.64,1) both; }
        @keyframes cm-pop { from { transform: scale(0.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .cm-flow, .cm-pop { animation: none; } }
      `}</style>

      {/* Savanna */}
      <rect width={WIDTH} height={HEIGHT} fill="#E8DAAE" />
      {tufts.map(({ x, y }, i) => (
        <path key={i} d={`M${x} ${y} l-3 -6 M${x} ${y} l0 -7 M${x} ${y} l3 -6`} stroke="#C4B27A" strokeWidth={1.5} />
      ))}
      {TREES.map(([x, y], i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x} y2={y + 14} stroke="#6b5434" strokeWidth={3} />
          <ellipse cx={x} cy={y} rx={22} ry={7} fill="#7E9B4B" />
        </g>
      ))}

      {/* River: bank, deep water, shallows, flowing current */}
      <path d={RIVER_PATH} fill="none" stroke="#C9B37C" strokeWidth={58} />
      <path d={RIVER_PATH} fill="none" stroke="#3E8FA3" strokeWidth={46} />
      <path d={RIVER_PATH} fill="none" stroke="#58AABD" strokeWidth={28} />
      <path
        className="cm-flow"
        d={RIVER_PATH}
        fill="none"
        stroke="#ffffff"
        strokeWidth={2}
        strokeDasharray="3 18"
        opacity={0.7}
      />
      <path ref={pathRef} d={RIVER_PATH} fill="none" />

      {/* Crocodiles: eyes and snout above the waterline */}
      {CROC_SPECS.map((_, i) => (
        <g key={i} ref={el => { crocRefs.current[i] = el; }}>
          <ellipse rx={14} ry={6} fill="none" stroke="#ffffff" strokeWidth={1} opacity={0.5} />
          <ellipse cx={4} rx={8} ry={3.2} fill="#3F6B3A" />
          <circle cx={-4} cy={-3.5} r={2.6} fill="#3F6B3A" />
          <circle cx={-4} cy={3.5} r={2.6} fill="#3F6B3A" />
          <circle cx={-3.5} cy={-3.5} r={1} fill="#F2D060" />
          <circle cx={-3.5} cy={3.5} r={1} fill="#F2D060" />
        </g>
      ))}

      {/* Crossing stones */}
      {crossings.map((p, i) => {
        const state = i < completed ? 'done' : i === completed ? 'current' : 'todo';
        const side = i % 2 ? 1 : -1;
        // Labels sit on alternating banks; push further out where the river runs steeply, since the
        // text is wider than it is tall.
        const offset = 36 + Math.abs(p.nx) * 30 + Math.abs(p.ny) * 6;
        const lx = Math.max(40, Math.min(WIDTH - 40, p.x + p.nx * side * offset));
        const ly = Math.max(16, Math.min(HEIGHT - 20, p.y + p.ny * side * offset - 4));
        const celebrate = state === 'done' && justCompleted === i + 1;
        return (
          <g key={i}>
            {state === 'current' && (
              <circle cx={p.x} cy={p.y} r={13} fill="none" stroke="#F2B544" strokeWidth={2}>
                <animate attributeName="r" values="13;22;13" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0;0.9" dur="1.8s" repeatCount="indefinite" />
              </circle>
            )}
            <ellipse cx={p.x} cy={p.y + 2} rx={14} ry={12} fill="#2F6F80" opacity={0.5} />
            <g className={celebrate ? 'cm-pop' : undefined}>
              <ellipse
                cx={p.x}
                cy={p.y}
                rx={14}
                ry={12}
                fill={state === 'done' ? '#F4EBD0' : state === 'current' ? '#F2B544' : '#9DB7BD'}
                stroke="#2d2618"
                strokeWidth={state === 'todo' ? 0 : 1.5}
              />
              {state === 'done' ? (
                <path
                  d={`M${p.x - 5} ${p.y} l3.5 3.5 l6.5 -7`}
                  fill="none"
                  stroke="#2d2618"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <text
                  x={p.x}
                  y={p.y + 5}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={600}
                  fill={state === 'todo' ? '#ffffff' : '#2d2618'}
                >
                  {i + 1}
                </text>
              )}
            </g>
            <text x={lx} y={ly} textAnchor="middle" fontSize={12} fontWeight={600} fill="#2d2618">
              Day {i + 1}
            </text>
            <text x={lx} y={ly + 13} textAnchor="middle" fontSize={11} fill="#5c4f36">
              {CROSSING_NAMES[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
