import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

// Top-down "stepping stones" map of the migration: one stone per crossing, with crocodiles
// patrolling up and down the river. Used on the main menu and between crossings.

const WIDTH = 680;
const HEIGHT = 320;
const RIVER_PATH = 'M -20 160 C 100 50 160 270 280 170 S 420 60 500 170 S 610 220 700 150';
const TOTAL_CROSSINGS = 10;
// Distance from the river's centerline to the middle of the waiting herd (the bank edge is at 29)
const HERD_GAP = 42;

// Night-time palette taken from the in-game canvas (banks, river, crocs) and the UI's gold accent.
const C = {
  land: '#3f3628',
  tuft: '#574a36',
  trunk: '#4a3826',
  canopy: '#4a6139',
  bank: '#3d2e21',
  deepWater: '#2a4652',
  shallows: '#335a67',
  flow: '#9fc3cc',
  croc: '#4d7043',
  crocEye: '#ffd700',
  gold: '#c2a078',
  stoneShadow: '#18262b',
  stoneTodo: '#475a60',
  stoneTodoText: '#b0c2c6',
  ink: '#1e1a15',
  labelActive: '#e5e5e5',
  labelTodo: '#aaa190',
  nameActive: '#c4b394',
  nameTodo: '#8a806e',
  herd: '#efe3c8',
};

export const CROSSING_NAMES = [
  "Kichwa Tembo",
  "Little Governor's",
  "Serena",
  "Fumbi Fumbi",
  "Cul de Sac",
  "Paradise",
  "Purungat Bridge",
  "Lookout Hill",
  "Mara Bridge",
  "Mortuary",
];

// [start position along the river (0-1), speed in units per frame, sideways offset from the centerline]
const CROC_SPECS: [number, number, number][] = [
  [0.15, 0.35, 5],
  [0.55, -0.25, -6],
  [0.85, 0.3, 3],
  [0.4, 0.2, -2],
];

// The herd waiting on the bank at the next crossing, as [x, y] offsets from its centre.
const HERD_DOTS: [number, number][] = (() => {
  const rnd = seededRandom(11);
  const dots: [number, number][] = [];
  // Scatter within a level oval (x, y offsets), keeping each animal a little apart so the herd reads as dots, not a blob
  for (let tries = 0; dots.length < 15 && tries < 800; tries++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd());
    const u = Math.cos(a) * r * 17;
    const v = Math.sin(a) * r * 8;
    if (dots.every(([du, dv]) => Math.hypot(du - u, dv - v) > 5.3)) dots.push([u, v]);
  }
  return dots;
})();

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
  // Crossing (1-based) to celebrate with a pop-in check mark, e.g. the one just finished.
  justCompleted?: number;
  // When given, every stone is clickable and plays that crossing (1-based).
  onSelect?: (crossing: number) => void;
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

// Where the waiting herd stands for a crossing: always on the top bank, kept inside the map.
function herdCentre(p: Crossing) {
  const up = p.ny > 0 ? -1 : 1; // which way along the normal points to the top bank
  return {
    x: Math.max(20, Math.min(WIDTH - 20, p.x + p.nx * up * HERD_GAP)),
    y: Math.max(12, Math.min(HEIGHT - 12, p.y + p.ny * up * HERD_GAP)),
  };
}

// Rough check for whether a two-line label centred on (lx, ly) would cover the herd.
function labelHitsHerd(lx: number, ly: number, i: number, herd: { x: number; y: number }) {
  const halfWidth = Math.max(`Crossing #${i + 1}`.length * 3.6, CROSSING_NAMES[i].length * 3) + 3;
  return Math.abs(lx - herd.x) < halfWidth + 19 && herd.y > ly - 11 - 13 && herd.y < ly + 16 + 13;
}

export default function CrossingMap({ completed, justCompleted, onSelect, className = '' }: CrossingMapProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const crocRefs = useRef<(SVGGElement | null)[]>([]);
  const [crossings, setCrossings] = useState<Crossing[]>([]);
  const herd = crossings[completed] ? herdCentre(crossings[completed]) : null;

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
      role={onSelect ? 'group' : 'img'}
      aria-label={`Crossing map: ${completed} of ${TOTAL_CROSSINGS} river crossings completed`}
    >
      <style>{`
        .cm-flow { animation: cm-flow 3s linear infinite; }
        @keyframes cm-flow { to { stroke-dashoffset: -42; } }
        .cm-pop { transform-box: fill-box; transform-origin: center; animation: cm-pop 700ms 300ms cubic-bezier(.34,1.56,.64,1) both; }
        @keyframes cm-pop { from { transform: scale(0.3); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .cm-pick { cursor: pointer; outline: none; }
        .cm-pick .cm-rock { transition: filter 150ms; }
        .cm-pick:hover .cm-rock, .cm-pick:focus-visible .cm-rock { filter: brightness(1.35); }
        .cm-pick:focus-visible .cm-focus { opacity: 1; }
        .cm-herd { transform-box: fill-box; transform-origin: center; animation: cm-herd 1.8s ease-in-out infinite; }
        @keyframes cm-herd { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.3); opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .cm-flow, .cm-pop, .cm-herd { animation: none; } }
      `}</style>

      {/* Savanna */}
      <rect width={WIDTH} height={HEIGHT} fill={C.land} />
      {tufts.map(({ x, y }, i) => (
        <path key={i} d={`M${x} ${y} l-3 -6 M${x} ${y} l0 -7 M${x} ${y} l3 -6`} stroke={C.tuft} strokeWidth={1.5} />
      ))}
      {TREES.map(([x, y], i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x} y2={y + 14} stroke={C.trunk} strokeWidth={3} />
          <ellipse cx={x} cy={y} rx={22} ry={7} fill={C.canopy} />
        </g>
      ))}

      {/* River: bank, deep water, shallows, flowing current */}
      <path d={RIVER_PATH} fill="none" stroke={C.bank} strokeWidth={58} />
      <path d={RIVER_PATH} fill="none" stroke={C.deepWater} strokeWidth={46} />
      <path d={RIVER_PATH} fill="none" stroke={C.shallows} strokeWidth={28} />
      <path
        className="cm-flow"
        d={RIVER_PATH}
        fill="none"
        stroke={C.flow}
        strokeWidth={2}
        strokeDasharray="3 18"
        opacity={0.35}
      />
      <path ref={pathRef} d={RIVER_PATH} fill="none" />

      {/* Crocodiles: eyes and snout above the waterline */}
      {CROC_SPECS.map((_, i) => (
        <g key={i} ref={el => { crocRefs.current[i] = el; }}>
          <ellipse rx={14} ry={6} fill="none" stroke={C.flow} strokeWidth={1} opacity={0.3} />
          <ellipse cx={4} rx={8} ry={3.2} fill={C.croc} />
          <circle cx={-4} cy={-3.5} r={2.1} fill={C.croc} />
          <circle cx={-4} cy={3.5} r={2.1} fill={C.croc} />
          <circle cx={-3.5} cy={-3.5} r={1} fill={C.crocEye} />
          <circle cx={-3.5} cy={3.5} r={1} fill={C.crocEye} />
        </g>
      ))}

      {/* Crossing stones */}
      {crossings.map((p, i) => {
        const state = i < completed ? 'done' : i === completed ? 'current' : 'todo';
        // Labels sit on alternating banks, pushed further out where the river runs steeply since the
        // text is wider than it is tall, and further still if they would cover the waiting herd.
        const side = i % 2 ? 1 : -1;
        let offset = 36 + Math.abs(p.nx) * 30 + Math.abs(p.ny) * 6;
        const labelAt = (o: number) => [
          Math.max(40, Math.min(WIDTH - 40, p.x + p.nx * side * o)),
          Math.max(16, Math.min(HEIGHT - 20, p.y + p.ny * side * o - 4)),
        ];
        let [lx, ly] = labelAt(offset);
        for (let k = 0; herd && k < 12 && labelHitsHerd(lx, ly, i, herd); k++) [lx, ly] = labelAt((offset += 4));
        const celebrate = state === 'done' && justCompleted === i + 1;
        const pick = onSelect
          ? {
              className: 'cm-pick',
              role: 'button',
              tabIndex: 0,
              'aria-label': `Play crossing #${i + 1}`,
              onClick: () => onSelect(i + 1),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelect(i + 1);
                }
              },
            }
          : {};
        return (
          <g key={i} {...pick}>
            {onSelect && <title>{`Play crossing #${i + 1}`}</title>}
            {onSelect && (
              <>
                {/* Invisible hit area, so a click near the stone still counts */}
                <circle cx={p.x} cy={p.y} r={22} fill="transparent" />
                <circle className="cm-focus" cx={p.x} cy={p.y} r={18} fill="none" stroke={C.gold} strokeWidth={1.5} opacity={0} />
              </>
            )}
            {state === 'current' && (
              <circle cx={p.x} cy={p.y} r={13} fill="none" stroke={C.gold} strokeWidth={2}>
                <animate attributeName="r" values="13;22;13" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0;0.9" dur="1.8s" repeatCount="indefinite" />
              </circle>
            )}
            <ellipse cx={p.x} cy={p.y + 2} rx={14} ry={12} fill={C.stoneShadow} opacity={0.7} />
            <g className={celebrate ? 'cm-pop cm-rock' : 'cm-rock'}>
              <ellipse
                cx={p.x}
                cy={p.y}
                rx={14}
                ry={12}
                fill={state === 'done' ? C.gold : state === 'current' ? C.ink : C.stoneTodo}
                stroke={C.gold}
                strokeWidth={state === 'current' ? 2 : 0}
              />
              {state === 'done' ? (
                <path
                  d={`M${p.x - 5} ${p.y} l3.5 3.5 l6.5 -7`}
                  fill="none"
                  stroke={C.ink}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <text
                  x={p.x}
                  y={p.y + 5}
                  textAnchor="middle"
                  fontSize={15}
                  fontWeight={600}
                  fontFamily="var(--font-display)"
                  fill={state === 'todo' ? C.stoneTodoText : C.gold}
                >
                  {i + 1}
                </text>
              )}
            </g>
            {state === 'current' && herd && (
              <g pointerEvents="none">
                {HERD_DOTS.map(([u, v], j) => {
                  // The herd stays level rather than following the river, so it never stretches
                  // towards a neighbouring label.
                  return (
                    <circle
                      key={j}
                      className="cm-herd"
                      style={{ animationDelay: `${(j % 4) * -0.25}s` }}
                      cx={herd.x + u}
                      cy={herd.y + v}
                      r={2.1}
                      fill={C.herd}
                    />
                  );
                })}
              </g>
            )}
            <text x={lx} y={ly} textAnchor="middle" fontSize={13} fontWeight={600} fontFamily="var(--font-display)" fill={state === 'todo' ? C.labelTodo : C.labelActive}>
              Crossing #{i + 1}
            </text>
            <text x={lx} y={ly + 13} textAnchor="middle" fontSize={11} fill={state === 'todo' ? C.nameTodo : C.nameActive}>
              {CROSSING_NAMES[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
