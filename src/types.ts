// A swimming animal with no neighbor within this distance counts as isolated: stalker crocs hunt it
// and the HUD shows the isolation warning.
export const STRAY_DISTANCE = 120;

export interface Position {
  x: number;
  y: number;
}

export type WildebeestState = 'idle' | 'walking' | 'swimming' | 'grazing' | 'dead';
export type WildebeestType = 'lead' | 'follower';

export interface Wildebeest {
  id: string;
  type: WildebeestType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  state: WildebeestState;
  stamina: number;
  health: number; // Health mechanic
  isDashing: boolean;
  size: number;
  stunTime: number;
  legAngle: number;
  color: string;
  onLogId: string | null; // Attached to a log
  completed: boolean;     // Reached the other side
  deathTimer: number;     // If dying
  isCrowded?: boolean;    // If stuck in a stampede/mass of wildebeests
  hopAirTime?: number;    // Remaining frames of hop animation
  hopCooldown?: number;   // Remaining cooldown frames for hop action
  hasCliffJumped?: boolean; // Whether they performed the scenic cliff dive into the water
  isClimbingAllowed?: boolean; // Whether they have locked-in permission to climb the ramp because it was green
  waveIndex?: number;       // The wave number this wildebeest belongs to
  isZebra?: boolean;        // Whether this is a zebra
}

export type CrocodileType = 'lane' | 'stalker' | 'sleeper';
export type CrocodileState = 'patrolling' | 'hunting' | 'sleeping' | 'eating';

export interface Crocodile {
  id: string;
  type: CrocodileType;
  state: CrocodileState;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  size: number;
  originalX: number;
  originalY: number;
  rangeX: [number, number];
  rangeY: [number, number];
  snapCooldown: number;
  wakeTimer: number;
  jawAngle: number;
  targetX?: number;
  targetY?: number;
  sated?: boolean; // True if croc made a kill and is permanently occupied feeding
}

export interface FloatingLog {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
}

export interface Rock {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface Distraction {
  id: string;
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
}

export interface GameParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}
