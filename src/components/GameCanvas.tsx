import React, { useEffect, useRef, useState } from 'react';
import { 
  Position, 
  Wildebeest, 
  Crocodile, 
  FloatingLog, 
  Rock, 
  Distraction, 
  GameParticle, 
  Upgrades, 
  GameStats,
  WildebeestState 
} from '../types';
import { 
  playSplash, 
  playChomp, 
  playSprint, 
  playStoneThrow, 
  playCrossSuccess, 
  playCrocStun, 
  playDeathDefied,
  playSelect,
  startRiverAmbiance,
  stopRiverAmbiance
} from '../utils/audio';
import GameHUD from './GameHUD';
import { Skull } from 'lucide-react';

interface GameCanvasProps {
  day: number;
  upgrades: Upgrades;
  onWaveComplete: (crossedCount: number, lostCount: number) => void;
  onGameOver: (crossed: number, lost: number) => void;
  initialGoldCorms: number;
  onResetGame: () => void;
}

export default function GameCanvas({
  day,
  upgrades,
  onWaveComplete,
  onGameOver,
  initialGoldCorms,
  onResetGame
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Core Game State
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    goldCorms: initialGoldCorms,
    day: day,
    herdTotal: 35 + day * 10, // Total remaining herd on left bank
    herdActive: 0,
    herdCrossed: 0,
    herdLost: 0,
  });

  const [activeHUD, setActiveHUD] = useState({
    stamina: 100,
    health: 100,
    stoneCooldown: 0,
    isSprinting: false,
    crossedActive: 0,
    lostActive: 0,
    followersActiveCount: 0,
    isClimbingCliff: false,
    isCrowded: false,
    minHerdDistance: 0,
  });

  const [playerDeathMessage, setPlayerDeathMessage] = useState<string | null>(null);
  const [playerDeathTitle, setPlayerDeathTitle] = useState<string>("ALPHALOST");
  const [pendingDeathAction, setPendingDeathAction] = useState<(() => void) | null>(null);

  // Keep mutables in refs for high-frequency physics update loop without react latency
  const stateRef = useRef({
    alphaWildebeest: null as Wildebeest | null,
    followers: [] as Wildebeest[],
    ambientWildebeests: [] as Wildebeest[], // Other wildebeests crossing concurrently
    lions: [] as {
      id: string;
      x: number;
      y: number;
      vx: number;
      vy: number;
      angle: number;
      state: 'patrolling' | 'hunting';
      patrolRangeY: [number, number];
      size: number;
      color: string;
      aggroCooldown: number;
    }[], // Lions patrolling on banks
    grazingHerd: [] as { x: number; y: number; id: string; size: number; color: string; animOffset: number }[],
    crocodiles: [] as Crocodile[],
    logs: [] as FloatingLog[],
    rocks: [] as Rock[],
    particles: [] as GameParticle[],
    distractions: [] as Distraction[],
    
    // Physics variables
    currentWaveActive: false,
    alphaExhausted: false,
    alphaClimbingCliff: false,
    stoneCooldownTimer: 0,
    ramp1ExitCooldown: 0,
    ramp2ExitCooldown: 0,
    redFlashTimer: 0,
    screenShake: 0,
    
    // New variables for dynamic herd distance and secondary waves
    minHerdDistance: 0,
    activeWaveIndex: 1,
    waveJumpedInTracked: false,
    waveTimer: 0,
    killerCrocId: null as string | null,
    
    // Mouse Interaction
    targetInput: null as Position | null,
    
    // Key States
    keys: {} as { [key: string]: boolean },
    
    // Day progress limits
    waveTotalFollowersSpawning: 0,
    waveCrossedCount: 0,
    waveLostCount: 0,
    goldCormsEarned: initialGoldCorms,
    dayNumber: day,
    wildebeestsSpawnCount: 0,
  });

  // Keep upgrades in ref so loop always has up-to-date upgrade values
  const upgradesRef = useRef(upgrades);
  useEffect(() => {
    upgradesRef.current = upgrades;
  }, [upgrades]);

  const incrementLostCount = () => {
    const s = stateRef.current;
    if (!s.currentWaveActive) return;
    if (s.alphaWildebeest && s.alphaWildebeest.state === 'dead') return;
    
    s.waveLostCount++;
    setStats(prev => ({
      ...prev,
      herdLost: prev.herdLost + 1,
    }));
  };

  // Initial Level Setup
  useEffect(() => {
    setupLevel();
  }, [day]);

  // Manage river audio ambient only during active gameplay!
  useEffect(() => {
    startRiverAmbiance();
    return () => {
      stopRiverAmbiance();
    };
  }, []);

  const setupLevel = () => {
    const s = stateRef.current;
    setPlayerDeathMessage(null);
    setPlayerDeathTitle("ALPHALOST");
    setPendingDeathAction(null);
    
    // Configure settings based on Day/Level difficulty
    s.waveTotalFollowersSpawning = 1;
    s.waveCrossedCount = 0;
    s.waveLostCount = 0;
    s.dayNumber = day;

    // 1. Spawning Lead Alpha
    const alpha: Wildebeest = {
      id: 'alpha-lead',
      type: 'lead',
      x: 80,
      y: 337,
      vx: 0,
      vy: 0,
      angle: 0,
      state: 'idle',
      stamina: 100,
      health: 100,
      isDashing: false,
      size: 20,
      stunTime: 0,
      legAngle: 0,
      color: '#2e3034', // Dark charcol leader
      onLogId: null,
      completed: false,
      deathTimer: 0,
    };
    s.alphaWildebeest = alpha;

    // 2. Spawn followers in immediate clustering simulating real stampede masses (moves from 13 to 40 on level 10)
    const numFollowersPerWave = 10 + (day * 3);
    s.waveTotalFollowersSpawning = numFollowersPerWave;
    const followersList: Wildebeest[] = [];
    for (let i = 0; i < numFollowersPerWave; i++) {
      followersList.push({
        id: `follower-${i}-${Date.now()}`,
        type: 'follower',
        x: 40 + Math.random() * 40,
        y: 200 + Math.random() * 260,
        vx: 0,
        vy: 0,
        angle: 0,
        state: 'idle',
        stamina: 100,
        health: 100,
        isDashing: false,
        size: 15 + Math.random() * 3,
        stunTime: 0,
        legAngle: Math.random() * Math.PI,
        color: i % 2 === 0 ? '#4e413b' : '#5c504a', // Natural dusty brown
        onLogId: null,
        completed: false,
        deathTimer: 0,
        waveIndex: 1,
      });
    }
    s.followers = followersList;

    // Pre-populate a good sized pack of active ambient wildebeests jumping in at the beginning to instantly create a hectic, lifelike, manic crossing scene!
    const numInitialAmbient = 8 + Math.floor(Math.random() * 8);
    const ambientList: Wildebeest[] = [];
    for (let c = 0; c < numInitialAmbient; c++) {
      const baseMeetY = 150 + Math.random() * 350;
      ambientList.push({
        id: `ambient-init-${c}-${Date.now()}-${Math.random()}`,
        type: 'follower',
        x: 40 - (c * 25), // staggered behind the main pack
        y: Math.max(80, Math.min(590, baseMeetY + (Math.random() * 40 - 20))),
        vx: 0.95 + Math.random() * 0.3,
        vy: 0,
        angle: 0,
        state: 'idle',
        stamina: 100,
        health: 100,
        isDashing: false,
        size: 13 + Math.random() * 3.5,
        stunTime: 0,
        legAngle: Math.random() * Math.PI,
        color: Math.random() < 0.5 ? '#3a3429' : Math.random() < 0.8 ? '#4a4233' : '#28241b',
        onLogId: null,
        completed: false,
        deathTimer: 0,
        waveIndex: 1,
      });
    }

    // Add 1 Zebra for every 5 wildebeests initially spawned
    s.wildebeestsSpawnCount = numFollowersPerWave + numInitialAmbient;
    const numInitialZebras = Math.floor(s.wildebeestsSpawnCount / 5);
    s.wildebeestsSpawnCount %= 5;

    for (let z = 0; z < numInitialZebras; z++) {
      const baseMeetY = 150 + Math.random() * 350;
      ambientList.push({
        id: `zebra-init-${z}-${Date.now()}-${Math.random()}`,
        type: 'follower',
        isZebra: true,
        x: 40 - (z * 24) - 20, // slightly staggered
        y: Math.max(80, Math.min(590, baseMeetY + (Math.random() * 40 - 20))),
        vx: 0.95 + Math.random() * 0.3,
        vy: 0,
        angle: 0,
        state: 'idle',
        stamina: 100,
        health: 100,
        isDashing: false,
        size: 13 + Math.random() * 3.5,
        stunTime: 0,
        legAngle: Math.random() * Math.PI,
        color: '#ffffff',
        onLogId: null,
        completed: false,
        deathTimer: 0,
        waveIndex: 1,
      });
    }

    s.ambientWildebeests = ambientList;

    // 3. Clear transient effects
    s.particles = [];
    s.distractions = [];
    s.keys = {};
    s.targetInput = null;
    s.stoneCooldownTimer = 0;
    s.ramp1ExitCooldown = 0;
    s.ramp2ExitCooldown = 0;
    s.redFlashTimer = 0;
    s.screenShake = 0;
    s.minHerdDistance = 0;
    s.activeWaveIndex = 1;
    s.waveJumpedInTracked = false;
    s.waveTimer = 0;
    s.killerCrocId = null;
    s.currentWaveActive = true;

    // Spawn 0 patrolling Lions on the banks (disabled)
    s.lions = [];

    // 4. Set persistent Rocks (Islands in River) - Turned off for realistic crossing
    s.rocks = [];

    // 5. Spawn Floating Logs - Turned off for realistic crossing
    s.logs = [];

    // 6. Spawn Crocodiles
    const crocodilesList: Crocodile[] = [];
    
    // Graded crocodile level count progression for gradual difficulty ramp up to 10 levels
    let numLaneCrocs = 1;
    let numStalkers = 0;
    let numSleepers = 2;

    switch (day) {
      case 1:
        numLaneCrocs = 1; numStalkers = 0; numSleepers = 2;
        break;
      case 2:
        numLaneCrocs = 1; numStalkers = 1; numSleepers = 2;
        break;
      case 3:
        numLaneCrocs = 2; numStalkers = 1; numSleepers = 3;
        break;
      case 4:
        numLaneCrocs = 2; numStalkers = 2; numSleepers = 3;
        break;
      case 5:
        numLaneCrocs = 3; numStalkers = 1; numSleepers = 4;
        break;
      case 6:
        numLaneCrocs = 3; numStalkers = 2; numSleepers = 4;
        break;
      case 7:
        numLaneCrocs = 4; numStalkers = 2; numSleepers = 5;
        break;
      case 8:
        numLaneCrocs = 4; numStalkers = 3; numSleepers = 5;
        break;
      case 9:
        numLaneCrocs = 5; numStalkers = 3; numSleepers = 6;
        break;
      case 10:
      default:
        numLaneCrocs = 6; numStalkers = 4; numSleepers = 7;
        break;
    }

    const lanesList = [280, 420, 560, 700, 840, 930];
    
    for (let i = 0; i < numLaneCrocs; i++) {
      // Evenly distribute lane crocs horizontally across the width of the Mara river (from 280 to 920)
      const ratio = numLaneCrocs > 1 ? i / (numLaneCrocs - 1) : 0.5;
      const laneX = 280 + ratio * 640 + (Math.random() * 32 - 16);
      const isGoingDown = Math.random() > 0.5;
      const speed = 0.15 + Math.random() * 0.12 + (day * 0.045); // scaled speed, slowed down
      crocodilesList.push({
        id: `croc-lane-${i}`,
        type: 'lane',
        state: 'patrolling',
        x: laneX,
        y: Math.random() * 500 + 50,
        vx: 0,
        vy: isGoingDown ? speed : -speed,
        angle: isGoingDown ? Math.PI / 2 : -Math.PI / 2,
        size: 32 + Math.random() * 6,
        originalX: laneX,
        originalY: 0,
        rangeX: [laneX - 30, laneX + 30],
        rangeY: [80, 580],
        snapCooldown: 0,
        wakeTimer: 0,
        jawAngle: 0,
      });
    }

    // Add Stalker crocs
    for (let i = 0; i < numStalkers; i++) {
      // Spread stalkers across the intermediate zones
      const ratio = numStalkers > 1 ? i / (numStalkers - 1) : 0.5;
      const startX = 330 + ratio * 550 + (Math.random() * 30 - 15);
      crocodilesList.push({
        id: `croc-stalk-${i}`,
        type: 'stalker',
        state: 'patrolling',
        x: startX,
        y: Math.random() * 600,
        vx: -0.1 - Math.random() * 0.1,
        vy: 0.02,
        angle: Math.PI,
        size: 30 + Math.random() * 5,
        originalX: startX,
        originalY: 0,
        rangeX: [startX - 400, startX + 400],
        rangeY: [50, 620],
        snapCooldown: 0,
        wakeTimer: 0,
        jawAngle: 0,
      });
    }

    // Add Sleepers (looks like stationary logs)
    for (let i = 0; i < numSleepers; i++) {
      // Spread sleeper logs across the deep channels
      const ratio = numSleepers > 1 ? i / (numSleepers - 1) : 0.5;
      const sleepX = 350 + ratio * 500 + (Math.random() * 40 - 20);
      const sleepY = 150 + Math.random() * 350;
      crocodilesList.push({
        id: `croc-sleep-${i}`,
        type: 'sleeper',
        state: 'sleeping',
        x: sleepX,
        y: sleepY,
        vx: 0,
        vy: 0,
        angle: Math.random() * Math.PI * 2,
        size: 35 + Math.random() * 5,
        originalX: sleepX,
        originalY: sleepY,
        rangeX: [sleepX, sleepX],
        rangeY: [sleepY, sleepY],
        snapCooldown: 0,
        wakeTimer: Math.random() * 3000, 
        jawAngle: 0,
      });
    }
    s.crocodiles = crocodilesList;

    // Build some decoration grazing wildebeests from yesterday
    if (s.grazingHerd.length === 0) {
      for (let i = 0; i < 6; i++) {
        s.grazingHerd.push({
          id: `grazing-${i}`,
          x: 1060 + Math.random() * 100,
          y: 60 + Math.random() * 550,
          size: 13 + Math.random() * 4,
          color: i % 2 === 0 ? '#4e413b' : '#5c504a',
          animOffset: Math.random() * 10,
        });
      }
    }

    // Pre-populate natural current bubbles already floating in the river so the water feels alive instantly on start!
    const baseCurrentSpeed = 0.4 + (day * 0.11);
    for (let i = 0; i < 35; i++) {
      s.particles.push({
        id: `bubble-init-${i}-${Math.random()}`,
        x: 220 + Math.random() * 760,
        y: Math.random() * 675,
        vx: 0,
        vy: baseCurrentSpeed + Math.random() * 0.8,
        size: 2 + Math.random() * 3,
        alpha: 0.3 + Math.random() * 0.4,
        color: '#ffffff',
        life: Math.floor(Math.random() * 200), // partially aged so they don't all disappear at once
        maxLife: 300 + Math.random() * 200,
      });
    }

    // Keep state stats synced
    setStats(prev => ({
      ...prev,
      day: day,
      herdActive: s.followers.length,
      goldCorms: prev.goldCorms,
    }));

    syncActiveHUD();
  };

  const syncActiveHUD = () => {
    const s = stateRef.current;
    setActiveHUD({
      stamina: s.alphaWildebeest ? s.alphaWildebeest.stamina : 0,
      health: s.alphaWildebeest ? s.alphaWildebeest.health : 0,
      stoneCooldown: s.stoneCooldownTimer,
      isSprinting: s.alphaWildebeest ? s.alphaWildebeest.isDashing : false,
      crossedActive: s.waveCrossedCount,
      lostActive: s.waveLostCount,
      followersActiveCount: s.followers.filter(f => f.state !== 'dead' && !f.completed).length,
      isClimbingCliff: s.alphaClimbingCliff,
      isCrowded: s.alphaWildebeest ? !!s.alphaWildebeest.isCrowded : false,
      minHerdDistance: s.minHerdDistance || 0,
    });
  };

  // Keyboard controls listener setup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s.currentWaveActive) return;

      const code = e.key.toLowerCase();
      s.keys[code] = true;
      s.keys[e.key] = true; // original form

      // Prevent spacebar scrolling or triggering focused buttons in the document
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (!s.currentWaveActive) return;
      const code = e.key.toLowerCase();
      s.keys[code] = false;
      s.keys[e.key] = false;
      
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Click / Touch Steering Handlers
  const handleCanvasInteraction = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const s = stateRef.current;
    if (!s.currentWaveActive) return;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 1200;
    const y = ((clientY - rect.top) / rect.height) * 675;

    // If clicking in river zone and space / mud throw button was queued, it's a stone throw
    // To make interactions super simple and fluid:
    // Left click on River coordinates = steering leader waypoint AND optional throw stone if CD is 0.
    // Wait, let's keep click for steering and clicks near the river can dynamically do stones if player clicks an active throw stone panel, or if we make click steering extremely reliable.
    // If the click is in the river area, set the destination target for Alpha
    s.targetInput = { x, y };
  };

  // Main game physics and rendering tick
  useEffect(() => {
    let animFrameId = 0;

    const gameTick = () => {
      const s = stateRef.current;
      const up = upgradesRef.current;
      
      if (!s.currentWaveActive) {
        // Simple graphics tick even when paused
        drawGameOnly();
        animFrameId = requestAnimationFrame(gameTick);
        return;
      }

      // 1. UPDATE TIMERS & COOLDOWNS
      if (s.stoneCooldownTimer > 0) {
        s.stoneCooldownTimer--;
      }
      if (s.ramp1ExitCooldown && s.ramp1ExitCooldown > 0) {
        s.ramp1ExitCooldown--;
      }
      if (s.ramp2ExitCooldown && s.ramp2ExitCooldown > 0) {
        s.ramp2ExitCooldown--;
      }
      if (s.redFlashTimer > 0) {
        s.redFlashTimer--;
      }
      if (s.screenShake > 0) {
        s.screenShake -= 0.1;
      }

      // 1b. MULTI-WAVE SEQUENCING SYSTEM
      const currentWaveWildebeests = [...s.followers, ...s.ambientWildebeests].filter(
        w => w.waveIndex === s.activeWaveIndex && w.state !== 'dead' && !w.completed
      );

      if (!s.waveJumpedInTracked) {
        // Look for the jump-in trigger of the current wave
        const anyJumped = currentWaveWildebeests.some(w => w.hasCliffJumped || w.x >= 220) || (currentWaveWildebeests.length === 0);
        if (anyJumped) {
          s.waveJumpedInTracked = true;
          s.waveTimer = 300; // 5 seconds in frames at 60fps
        }
      } else {
        s.waveTimer--;
        if (s.waveTimer <= 0) {
          s.activeWaveIndex++;
          s.waveJumpedInTracked = false;
          s.waveTimer = 0;

          // Spawn next wave as consecutive mass of wildebeests (followers and ambients)
          const waveCount = s.activeWaveIndex;
          // Calibrate bigger herds per day level and double waves 2 and 3
          const baseClusterSize = 12 + day * 3 + Math.floor(Math.random() * 8);
          const clusterMultiplier = (waveCount === 2 || waveCount === 3) ? 2 : 1;
          const clusterSize = baseClusterSize * clusterMultiplier;
          const baseMeetY = 120 + Math.random() * 380;
          
          for (let i = 0; i < clusterSize; i++) {
            s.ambientWildebeests.push({
              id: `ambient-wave${waveCount}-${i}-${Date.now()}-${Math.random()}`,
              type: 'follower',
              x: 10 - (i * 26), 
              y: Math.max(80, Math.min(590, baseMeetY + (Math.random() * 60 - 30))),
              vx: 0.98 + Math.random() * 0.35,
              vy: 0,
              angle: 0,
              state: 'idle',
              stamina: 100,
              health: 100,
              isDashing: false,
              size: 13 + Math.random() * 3.5,
              stunTime: 0,
              legAngle: Math.random() * Math.PI,
              color: Math.random() < 0.5 ? '#3a3429' : Math.random() < 0.8 ? '#4a4233' : '#28241b',
              onLogId: null,
              completed: false,
              deathTimer: 0,
              waveIndex: waveCount,
            });
          }

          s.wildebeestsSpawnCount += clusterSize;
          const numWaveZebras = Math.floor(s.wildebeestsSpawnCount / 5);
          s.wildebeestsSpawnCount %= 5;

          for (let z = 0; z < numWaveZebras; z++) {
            s.ambientWildebeests.push({
              id: `zebra-wave${waveCount}-${z}-${Date.now()}-${Math.random()}`,
              type: 'follower',
              isZebra: true,
              x: 10 - (clusterSize * 26) - (z * 26), 
              y: Math.max(80, Math.min(590, baseMeetY + (Math.random() * 60 - 30))),
              vx: 0.98 + Math.random() * 0.35,
              vy: 0,
              angle: 0,
              state: 'idle',
              stamina: 100,
              health: 100,
              isDashing: false,
              size: 13 + Math.random() * 3.5,
              stunTime: 0,
              legAngle: Math.random() * Math.PI,
              color: '#ffffff',
              onLogId: null,
              completed: false,
              deathTimer: 0,
              waveIndex: waveCount,
            });
          }
        }
      }

      // Spawns dust splash particles slowly
      updateFloatingElements_andParticles();

      // 2. ALPHA LEADER CONTROL
      if (s.alphaWildebeest) {
        updateAlphaLeader(up);
      }

      // 3. FLOCKING / BOIDS FOLLOWERS CONTROLLER
      updateFollowerHerd(up);
      updateAmbientWildebeests(up);

      // 4. PREDEATOR PATROL & HUNT LOOP
      updatePredators();
      updateLions();

      // 5. PROCESS COLLISION, BITES, RECOVERY
      processCollisions(up);

      // 6. DRAW GAME BOARD
      drawGameOnly();

      // 7. CHECK WIN / LOSS STATUS FOR ACTIVE BATCH
      evaluateWaveProgress();

      // Tick HUD frequently but not necessarily every single frame to prevent react throttling
      if (Math.random() < 0.1) {
        syncActiveHUD();
      }

      animFrameId = requestAnimationFrame(gameTick);
    };

    animFrameId = requestAnimationFrame(gameTick);
    return () => cancelAnimationFrame(animFrameId);
  }, [day]);

  // Update floating logs & visual particles in river
  const updateFloatingElements_andParticles = () => {
    const s = stateRef.current;
    
    // Water current speed scaling by day level
    const currentSpeed = 0.4 + (s.dayNumber * 0.11);

    // Update Floating Logs
    s.logs.forEach(log => {
      log.y += log.vy;
      // Wrap log back to the top if washed off bottom boundary
      if (log.y > 675 + 100) {
        log.y = -log.height - 20;
        log.x = 240 + Math.random() * 700; // randomize channel position slightly
      }
    });

    // Update Particles
    s.particles = s.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha = 1 - (p.life / p.maxLife);
      return p.life < p.maxLife;
    });

    // Update Distraction Stone Ripple Ripples
    s.distractions = s.distractions.filter(d => {
      d.life++;
      // Create ring bubbles
      if (d.life % 20 === 0 && Math.random() < 0.8) {
        createSplashParticles(d.x, d.y, 4, 1.2, '#ffffff');
      }
      return d.life < d.maxLife;
    });

    // Periodically spawn natural river eddies and current bubbles
    if (Math.random() < 0.2) {
      s.particles.push({
        id: `bubble-${Date.now()}-${Math.random()}`,
        x: 220 + Math.random() * 760,
        y: -10,
        vx: 0,
        vy: currentSpeed + Math.random() * 0.8,
        size: 2 + Math.random() * 3,
        alpha: 0.3 + Math.random() * 0.4,
        color: '#ffffff',
        life: 0,
        maxLife: 300 + Math.random() * 200,
      });
    }
  };

  const createSplashParticles = (x: number, y: number, count: number, speedMultiplier = 1.0, customColor?: string) => {
    const s = stateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.5 + Math.random() * 2) * speedMultiplier;
      s.particles.push({
        id: `splash-${Date.now()}-${Math.random()}`,
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 3,
        alpha: 1.0,
        color: customColor || '#e6f2ff',
        life: 0,
        maxLife: 30 + Math.floor(Math.random() * 40),
      });
    }
  };

  const updateAlphaLeader = (up: Upgrades) => {
    const s = stateRef.current;
    const alpha = s.alphaWildebeest!;

    if (alpha.state === 'dead') {
      alpha.deathTimer++;
      if (s.killerCrocId) {
        const croc = s.crocodiles.find(c => c.id === s.killerCrocId);
        if (croc) {
          alpha.x = croc.x + Math.cos(croc.angle) * croc.size * 0.95;
          alpha.y = croc.y + Math.sin(croc.angle) * croc.size * 0.95;
          alpha.angle = croc.angle + Math.PI / 4;
        }
      } else {
        // Drift downstream with the current flow!
        const currentSpeed = 0.4 + (s.dayNumber * 0.11);
        alpha.y += currentSpeed * 0.85; // gently float down with the current
        alpha.x += Math.sin(alpha.deathTimer * 0.05) * 0.15; // gentle swaying motion
        alpha.angle += 0.006; // slow rotate drift!
      }
      return;
    }

    // Decrement hop timers if present
    if (alpha.hopAirTime && alpha.hopAirTime > 0) {
      alpha.hopAirTime--;
      if (alpha.hopAirTime === 0 && alpha.hasCliffJumped) {
        // HUGE SPLASH LANDING!
        createSplashParticles(alpha.x, alpha.y, 16, 2.2, '#ffffff');
        createSplashParticles(alpha.x, alpha.y, 10, 1.5, '#a2c2e8');
        playSplash(); // splash sound
      }
    }
    if (alpha.hopCooldown && alpha.hopCooldown > 0) alpha.hopCooldown--;

    // Determine target speed base 
    const baseSpeedMultiplier = 1 + (up.leaderSpeed * 0.12);
    let speed = 0.82 * baseSpeedMultiplier; // faster, ultra responsive leader speed

    // Calculate Crowding / Stampede Stuck condition - requires a larger bottleneck group
    let crowdingCount = 0;
    const allBeests = [...s.followers, ...s.ambientWildebeests];
    allBeests.forEach(other => {
      if (other.id !== alpha.id && other.state !== 'dead' && !other.completed) {
        const d = Math.hypot(alpha.x - other.x, alpha.y - other.y);
        if (d < 38) {
          crowdingCount++;
        }
      }
    });

    const isHopping = alpha.hopAirTime && alpha.hopAirTime > 0;
    alpha.isCrowded = (crowdingCount >= 3) && !isHopping; 
    if (alpha.isCrowded) {
      speed *= 0.70; // gently slowed in stampede masses (was 0.40)
      // Trampled by herd health decay: significantly reduced to keep it balanced and fair
      alpha.health = Math.max(0, alpha.health - 0.02);
      if (Math.random() < 0.1) {
        createSplashParticles(alpha.x, alpha.y, 2, 0.6, '#382a1d');
      }
    }

    // Handle keypress Hop triggers
    const isWantingHop = s.keys[' '] || s.keys['spacebar'] || s.keys['space'] || activeHUD.isSprinting;
    
    // Check if swimming
    const inRiver = alpha.x > 220 && alpha.x < 980;

    if (isWantingHop && inRiver && (alpha.hopCooldown || 0) <= 0 && alpha.stamina >= 15 && !s.alphaExhausted) {
      // Trigger Hop
      alpha.hopAirTime = 18;
      alpha.hopCooldown = 40;
      alpha.stamina = Math.max(0, alpha.stamina - 15); // lowered from 22% for better crossing balance
      playSplash(); // plays jump splash sound
      createSplashParticles(alpha.x, alpha.y, 8, 1.8);
      
      // Clear activeHUD helper trigger if clicked touch button
      if (activeHUD.isSprinting) {
         setActiveHUD(prev => ({ ...prev, isSprinting: false }));
      }
    }

    // Handle Hop movement boost and push nearby herd away for separation
    let hopSpeedBoost = 0;
    if (alpha.hopAirTime && alpha.hopAirTime > 0) {
      const progress = (18 - alpha.hopAirTime) / 18;
      hopSpeedBoost = Math.sin(progress * Math.PI) * 1.5; // leaping forward impulse

      // Physics separation push
      const separationRadius = 60;
      const allBeestsForPush = [...s.followers, ...s.ambientWildebeests];
      allBeestsForPush.forEach(other => {
        if (other.id !== alpha.id && other.state !== 'dead' && !other.completed) {
          const dx = other.x - alpha.x;
          const dy = other.y - alpha.y;
          const dist = Math.hypot(dx, dy);
          if (dist < separationRadius && dist > 1) {
            const pushForce = 1.35 * (1 - dist / separationRadius);
            other.x += (dx / dist) * pushForce;
            other.y += (dy / dist) * pushForce;
            if (Math.random() < 0.1) {
              createSplashParticles(other.x, other.y, 1, 0.4, '#433d31');
            }
          }
        }
      });
    }

    // Calculate distance to closest alive herd member to check isolation status
    let minHerdValue = 9999;
    const allHerdMembers = [...s.followers, ...s.ambientWildebeests];
    allHerdMembers.forEach(other => {
      if (other.id !== alpha.id && other.state !== 'dead' && !other.completed) {
        const dist = Math.hypot(alpha.x - other.x, alpha.y - other.y);
        if (dist < minHerdValue) {
          minHerdValue = dist;
        }
      }
    });
    s.minHerdDistance = minHerdValue === 9999 ? 0 : minHerdValue;

    // Stamina depletion/recovery
    if (inRiver) {
      const isUpstream = alpha.vy < 0 || s.keys['w'] || s.keys['arrowup'];
      const baseDrain = isUpstream ? 0.024 : 0.01;
      let swimDrain = baseDrain;
      if (alpha.isCrowded) {
        swimDrain += 0.095; // Crowded stampede causes heavy fatigue, player risks drowning if they stay huddled in the herd too long!
      }
      alpha.stamina = Math.max(0, alpha.stamina - swimDrain);

      // Washed away downstream
      if (alpha.y >= 645) {
        alpha.health = 0; // dies instantly
      }
    } else {
      // Stamina restoration on banks removed completely
      alpha.health = Math.min(100, alpha.health + 0.25);
    }

    if (alpha.stamina < 5) {
      s.alphaExhausted = true;
    }
    if (alpha.stamina > 35) {
      s.alphaExhausted = false;
    }

    // Drowning mechanic if stamina reaches 0 while in open water
    if (inRiver && alpha.stamina <= 0) {
      alpha.health = Math.max(0, alpha.health - 0.06); // drowning damage rate
      if (Math.random() < 0.12) {
        createSplashParticles(alpha.x, alpha.y, 2, 0.8, '#437397');
      }
    }

    if (alpha.health <= 0 && alpha.state !== 'dead') {
      // Alpha drowned / washed away / trampled!
      alpha.state = 'dead';
      alpha.deathTimer = 0;
      createSplashParticles(alpha.x, alpha.y, 10, 2.0, '#315f8c');

      s.waveLostCount++;
      setStats(prev => {
        return {
          ...prev,
          herdTotal: Math.max(0, prev.herdTotal - 1),
          herdLost: prev.herdLost + 1,
        };
      });

      let cause = "Drowned from exhaustion: Your stamina depleted while swimming in the turbulent river, and you sank beneath the waves.";
      let title = "Drowned";
      if (alpha.y >= 645) {
        cause = "Washed away down river: The powerful currents swept you downstream beyond the safe landing banks.";
        title = "Washed Away";
      } else if (alpha.isCrowded) {
        cause = "Trampled in the stampede: You got caught in the frantic crowd crush of the herd and drowned.";
        title = "Drowned";
      }

      const crossedAtDeath = s.waveCrossedCount;
      const lostAtDeath = s.waveLostCount;
      setPendingDeathAction(() => () => {
        onGameOver(crossedAtDeath, lostAtDeath);
      });

      // Pause two seconds before showing the death tile
      setTimeout(() => {
        s.currentWaveActive = false;
        setPlayerDeathMessage(cause);
        setPlayerDeathTitle(title);
      }, 2000);
    }

    // Exhaustion penalty
    if (s.alphaExhausted) {
      speed *= 0.55;
    }

    // Direction steer vectors
    let inputDx = 0;
    let inputDy = 0;

    // A. Keyboard Check
    if (s.keys['w'] || s.keys['arrowup']) inputDy = -1;
    if (s.keys['s'] || s.keys['arrowdown']) inputDy = 1;
    if (s.keys['a'] || s.keys['arrowleft']) inputDx = -1;
    if (s.keys['d'] || s.keys['arrowright']) inputDx = 1;

    // Apply normalization to keyboard input diag
    if (inputDx !== 0 && inputDy !== 0) {
      const length = Math.hypot(inputDx, inputDy);
      inputDx /= length;
      inputDy /= length;
    }

    // B. Target click steering override
    if (s.targetInput) {
      const tx = s.targetInput.x;
      const ty = s.targetInput.y;
      const tdx = tx - alpha.x;
      const tdy = ty - alpha.y;
      const dist = Math.hypot(tdx, tdy);

      if (dist > 10) {
        inputDx = tdx / dist;
        inputDy = tdy / dist;
      } else {
        s.targetInput = null; // reached clicking checkpoint
      }
    }

    // Apply Mud / Water Current slows and physics forces
    const onMudLeft = alpha.x >= 180 && alpha.x <= 220;
    const onMudRight = alpha.x >= 980 && alpha.x <= 1020;

    let dragFactor = 1.0;
    if (onMudLeft || onMudRight) {
      dragFactor = 0.65; // mud drag slow
    } else if (inRiver) {
      dragFactor = 0.8;  // swimming resistance drag
    }

    // Set velocity
    alpha.vx = inputDx * speed * dragFactor;
    alpha.vy = inputDy * speed * dragFactor;

    // Apply hop forward thrust vectors
    if (alpha.hopAirTime && alpha.hopAirTime > 0) {
      const angle = alpha.angle || 0;
      alpha.vx += Math.cos(angle) * hopSpeedBoost;
      alpha.vy += Math.sin(angle) * hopSpeedBoost;
    }

    // River water flow force push downward (slowed down for realism)
    if (inRiver) {
      alpha.vy += 0.10 + (s.dayNumber * 0.035); // river current force
      alpha.state = 'swimming';
      
      // Bubbles trailing when swimming
      if (Math.random() < 0.15) {
        createSplashParticles(alpha.x, alpha.y, 1, 0.5);
      }
    } else {
      alpha.state = 'walking';
    }

    // Apply positions
    const oldAlphaX = alpha.x;
    alpha.x += alpha.vx;
    alpha.y += alpha.vy;

    // Scenic Cliff Jump simulation when entering the river from the left bank (at x = 220)
    if (oldAlphaX < 220 && alpha.x >= 220 && !alpha.hasCliffJumped) {
      alpha.hasCliffJumped = true;
      alpha.hopAirTime = 18;
      alpha.hopCooldown = 45;
      alpha.vx = Math.max(alpha.vx, 3.8); // give substantial forward jump/dive impulse
      playSplash(); // play splash jump sound
      createSplashParticles(220, alpha.y, 14, 2.0, '#ffffff');
    }

    // --- EXIT PATH / STEEP CLIFFS CONSTRAINTS ---
    const isExitZone1 = (alpha.y >= 80 && alpha.y <= 200);
    const isExitZone2 = (alpha.y >= 460 && alpha.y <= 580);
    const isExitZone = isExitZone1 || isExitZone2;

    // Calculate Exit Lane queuing bottleneck sizes
    const activeAtExit1 = [...s.followers, ...s.ambientWildebeests, ...(s.alphaWildebeest ? [s.alphaWildebeest] : [])].filter(
      other => !other.completed && other.state !== 'dead' && other.x >= 930 && other.x <= 985 && other.y >= 80 && other.y <= 200
    ).length;

    const activeAtExit2 = [...s.followers, ...s.ambientWildebeests, ...(s.alphaWildebeest ? [s.alphaWildebeest] : [])].filter(
      other => !other.completed && other.state !== 'dead' && other.x >= 930 && other.x <= 985 && other.y >= 460 && other.y <= 580
    ).length;

    // Check if exit ramp is actively busy
    const isRamp1Blocked = isExitZone1 && (s.ramp1ExitCooldown || 0) > 0;
    const isRamp2Blocked = isExitZone2 && (s.ramp2ExitCooldown || 0) > 0;
    const isRampCurrentlyBlocked = isExitZone1 ? isRamp1Blocked : isRamp2Blocked;

    // If entering the exit area while NOT blocked, grant persistent climbing allowance!
    if (isExitZone && alpha.x >= 925) {
      if (!isRampCurrentlyBlocked) {
        alpha.isClimbingAllowed = true;
      }
    } else {
      alpha.isClimbingAllowed = false;
    }

    if (isExitZone && alpha.x >= 980 && !alpha.completed) {
      if (!alpha.isClimbingAllowed) {
        alpha.x = 979; // block horizontal progress
        alpha.vx = -0.5; // step back slightly into waters
        alpha.isCrowded = true; // triggers crowded stampede panic & health strain
        s.alphaClimbingCliff = true; // display warning banner overlay
        if (Math.random() < 0.15) {
          createSplashParticles(alpha.x, alpha.y, 3, 1.2, '#382a1d'); // mud splash
        }
      } else {
        s.alphaClimbingCliff = false;
      }
    } else if (!isExitZone && alpha.x >= 980 && !alpha.completed) {
      alpha.x = 979; // block horizontal progress
      alpha.vx = -0.6; // step back into waters
      if (Math.random() < 0.18) {
        createSplashParticles(alpha.x, alpha.y, 3, 1.2, '#382a1d'); // muddy brown splash
        s.alphaClimbingCliff = true; // flag to display warning banner overlay
      }
    } else {
      s.alphaClimbingCliff = false;
    }

    // Clamp safe boundaries
    alpha.x = Math.max(25, Math.min(1175, alpha.x));
    alpha.y = Math.max(25, Math.min(650, alpha.y));

    // Update facing angles using movement vectors
    if (Math.hypot(alpha.vx, alpha.vy) > 0.15) {
      alpha.angle = Math.atan2(alpha.vy, alpha.vx);
      // cycle leg speed animations
      alpha.legAngle += 0.15 + (Math.hypot(alpha.vx, alpha.vy) * 0.08);
    }

    // Completed Crossing Check
    if (alpha.x >= 1020 && !alpha.completed) {
      alpha.completed = true;
      alpha.isClimbingAllowed = false;
      
      // Set exit ramp busy cooldown - bottleneck delay! If many are trying to exit, wait is even shorter!
      if (alpha.y >= 80 && alpha.y <= 200) {
        s.ramp1ExitCooldown = activeAtExit1 >= 3 ? 35 : 15;
      } else {
        s.ramp2ExitCooldown = activeAtExit2 >= 3 ? 35 : 15;
      }

      playCrossSuccess();
      s.waveCrossedCount++;
      // Spawn standard peaceful decorations
      s.grazingHerd.push({
        id: `grazing-finish-${Date.now()}`,
        x: alpha.x,
        y: alpha.y,
        size: alpha.size * 0.8,
        color: alpha.color,
        animOffset: Math.random() * 10,
      });

      // Swap control or warp back later when wave finishes
      alpha.state = 'grazing';
    }
  };

  const updateFollowerHerd = (up: Upgrades) => {
    const s = stateRef.current;
    
    // Create a high-performance single flat list of active, living, uncompleted wildebeests
    // to avoid high-overhead array spreads inside outer loops.
    const allLivingWildebeests: Wildebeest[] = [];
    s.followers.forEach(w => {
      if (w.state !== 'dead' && !w.completed) allLivingWildebeests.push(w);
    });
    s.ambientWildebeests.forEach(w => {
      if (w.state !== 'dead' && !w.completed) allLivingWildebeests.push(w);
    });
    if (s.alphaWildebeest && s.alphaWildebeest.state !== 'dead' && !s.alphaWildebeest.completed) {
      allLivingWildebeests.push(s.alphaWildebeest);
    }

    const activeAtExit1 = allLivingWildebeests.filter(
      other => other.x >= 925 && other.x <= 985 && other.y >= 80 && other.y <= 200
    ).length;

    const activeAtExit2 = allLivingWildebeests.filter(
      other => other.x >= 925 && other.x <= 985 && other.y >= 460 && other.y <= 580
    ).length;

    s.followers.forEach(f => {
      if (f.state === 'dead' || f.completed) return;

      const alpha = s.alphaWildebeest!;
      
      // Decrement hop timers
      if (f.hopAirTime && f.hopAirTime > 0) f.hopAirTime--;
      if (f.hopCooldown && f.hopCooldown > 0) f.hopCooldown--;

      // Core Flocking / Boids Steering Forces
      let steerX = 0;
      let steerY = 0;

      // 1. Target Attraction (Cohesion toward Alpha Leader or collective herd centroid)
      let followTargetX = alpha.x;
      let followTargetY = alpha.y;

      // If Alpha completed, followers try to target the Right bank to graze
      if (alpha.completed) {
        followTargetX = 1100;
        followTargetY = f.y < 330 ? 140 : 520; // steer towards the nearest exit zone
      } else if (f.x >= 750) {
        // Even when alpha is not completed, as followers get closer to the right bank,
        // they should feel the pull to naturally head for the sand bank openings rather than steep cliffs
        const nearestExitY = f.y < 330 ? 140 : 520;
        followTargetY = (followTargetY * 0.45) + (nearestExitY * 0.55);
      }

      const dxToLead = followTargetX - f.x;
      const dyToLead = followTargetY - f.y;
      const distToLead = Math.hypot(dxToLead, dyToLead);

      if (distToLead > 0) {
        steerX += (dxToLead / distToLead) * 1.5;
        steerY += (dyToLead / distToLead) * 1.5;
      }

      // 2. Separation: Keep spacing between nearby followers to look like a realistic deer herd
      let separationCount = 0;
      let sepForceX = 0;
      let sepForceY = 0;

      s.followers.forEach(other => {
        if (other.id === f.id || other.state === 'dead' || other.completed) return;
        const oDx = f.x - other.x;
        const oDy = f.y - other.y;
        const distOther = Math.hypot(oDx, oDy);

        if (distOther < 36) {
          separationCount++;
          // Repulsion weight inversely proportional to distance
          const magnitude = (36 - distOther) / 36;
          sepForceX += (oDx / (distOther || 1)) * magnitude * 2.5;
          sepForceY += (oDy / (distOther || 1)) * magnitude * 2.5;
        }
      });

      if (separationCount > 0) {
        steerX += sepForceX / separationCount;
        steerY += sepForceY / separationCount;
      }

      // Determine crowding
      let fCrowdingCount = 0;
      allLivingWildebeests.forEach(other => {
        if (other.id !== f.id) {
          const d = Math.hypot(f.x - other.x, f.y - other.y);
          if (d < 36) fCrowdingCount++;
        }
      });
      f.isCrowded = (fCrowdingCount >= 2);

      // Determine crocodile threats
      let crocThreatened = false;
      s.crocodiles.forEach(c => {
        if (!c.sated && c.state !== 'sleeping' && c.snapCooldown <= 0) {
          const dCroc = Math.hypot(c.x - f.x, c.y - f.y);
          if (dCroc < 110) {
            crocThreatened = true;
          }
        }
      });

      // Simulate independent hops when they get stuck in stampedes or are attacked/chased by crocodiles
      const isSwim = f.x > 220 && f.x < 980;
      if ((f.hopCooldown || 0) <= 0 && f.stamina >= 15) {
        const isThreatenedInRiver = crocThreatened && isSwim;
        const triggerChance = isThreatenedInRiver ? 0.038 : (f.isCrowded ? 0.009 : 0);
        
        if (triggerChance > 0 && Math.random() < triggerChance) {
          f.hopAirTime = 18;
          f.hopCooldown = 50 + Math.random() * 30; // randomized cooldown to prevent synchronized pulsating
          f.stamina = Math.max(0, f.stamina - 12);
          if (isSwim) {
            playSplash();
          } else {
            playSprint();
          }
          createSplashParticles(f.x, f.y, 6, 1.3, '#ffffff');

          // Push nearby herd members away when they hop to relieve crowding!
          const pushRadius = 55;
          allLivingWildebeests.forEach(other => {
            if (other.id !== f.id) {
              const dx = other.x - f.x;
              const dy = other.y - f.y;
              const dist = Math.hypot(dx, dy);
              if (dist < pushRadius && dist > 1) {
                const pushForce = 1.0 * (1 - dist / pushRadius);
                other.x += (dx / dist) * pushForce;
                other.y += (dy / dist) * pushForce;
              }
            }
          });
        }
      }

      // Follower Speed configuration - aligned with leader speed for cohesive herd behavior
      let moveSpeed = 0.74 + (up.leaderSpeed * 0.08);
      if (f.isCrowded) {
        moveSpeed *= 0.70; // gently slowed down in stampede clumps
      }

      // Drag rates in sand/water
      const onMudLeft = f.x >= 180 && f.x <= 220;
      const onMudRight = f.x >= 980 && f.x <= 1020;
      const inRiver = f.x > 220 && f.x < 980;

      let dragVal = 1.0;
      if (onMudLeft || onMudRight) dragVal = 0.6;
      else if (inRiver) dragVal = 0.80; // matches leader's river drag coefficient

      // Total vector calculation
      const steerLen = Math.hypot(steerX, steerY);
      if (steerLen > 0) {
        steerX = (steerX / steerLen);
        steerY = (steerY / steerLen);
      }

      f.vx = steerX * moveSpeed * dragVal;
      f.vy = steerY * moveSpeed * dragVal;

      // Apply hop forward impulse
      if (f.hopAirTime && f.hopAirTime > 0) {
        const progress = (18 - f.hopAirTime) / 18;
        const hSBoost = Math.sin(progress * Math.PI) * 1.3;
        const angle = f.angle || 0;
        f.vx += Math.cos(angle) * hSBoost;
        f.vy += Math.sin(angle) * hSBoost;
      }

      // Water current downward drag (slowed down for realism)
      if (inRiver) {
        f.vy += 0.10 + (s.dayNumber * 0.035);
        f.state = 'swimming';
        if (Math.random() < 0.1) {
          createSplashParticles(f.x, f.y, 1, 0.4);
        }
      } else {
        f.state = 'walking';
      }

      // Follower Stamina and Health updates
      const fIsResting = !inRiver;

      if (f.hopAirTime && f.hopAirTime > 0) {
        f.hopAirTime--;
        if (f.hopAirTime === 0 && f.hasCliffJumped) {
          // HUGE SPLASH LANDING!
          createSplashParticles(f.x, f.y, 14, 2.0, '#ffffff');
          createSplashParticles(f.x, f.y, 8, 1.4, '#a2c2e8');
          playSplash(); // splash sound
        }
      } else {
        if (fIsResting) {
          // Stamina restoration on banks removed completely
          f.health = Math.min(100, f.health + 0.12);
        } else {
          // Slow stamina decay when swimming normally
          const isUpstream = f.vy < 0 || steerY < 0;
          const baseDrain = isUpstream ? 0.024 : 0.01;
          let swimDrain = baseDrain;
          if (f.isCrowded) {
            swimDrain += 0.035; // crowd panic drains extra energy
          }
          f.stamina = Math.max(0, f.stamina - swimDrain);
        }
      }

      // Drowning / damage from exhaustion
      if (!fIsResting && f.stamina <= 0) {
        f.health = Math.max(0, f.health - 0.07); // drowning damage rate (more forgiving)
        if (Math.random() < 0.1) {
          createSplashParticles(f.x, f.y, 1, 0.4, '#437397');
        }

        if (f.health <= 0) {
          f.state = 'dead';
          playChomp(); // drowning splash sound
          incrementLostCount();
          createSplashParticles(f.x, f.y, 10, 1.8, '#315f8c'); // blue bubbling spray
        }
      }

      // Apply coordinates
      const oldFX = f.x;
      f.x += f.vx;
      f.y += f.vy;

      // Scenic Cliff Jump simulation when entering the river from the left bank (at x = 220)
      if (oldFX < 220 && f.x >= 220 && !f.hasCliffJumped) {
        f.hasCliffJumped = true;
        f.hopAirTime = 18;
        f.hopCooldown = 50 + Math.random() * 45;
        f.vx = Math.max(f.vx, 3.8); // give substantial forward jump/dive impulse
        createSplashParticles(220, f.y, 12, 1.8, '#ffffff');
      }

      // Block Right Bank steep cliffs progress outside of exit zones OR due to bottleneck clogging
      const isExitZone1 = (f.y >= 80 && f.y <= 200);
      const isExitZone2 = (f.y >= 460 && f.y <= 580);
      const isExitZone = isExitZone1 || isExitZone2;

      // Check if exit ramp is actively busy
      const isRamp1Blocked = isExitZone1 && (s.ramp1ExitCooldown || 0) > 0;
      const isRamp2Blocked = isExitZone2 && (s.ramp2ExitCooldown || 0) > 0;
      const isRampCurrentlyBlocked = isExitZone1 ? isRamp1Blocked : isRamp2Blocked;

      // If entering the exit area while NOT blocked, grant persistent climbing allowance!
      if (isExitZone && f.x >= 925) {
        if (!isRampCurrentlyBlocked) {
          f.isClimbingAllowed = true;
        }
      } else {
        f.isClimbingAllowed = false;
      }

      if (isExitZone && f.x >= 980 && !f.completed) {
        if (!f.isClimbingAllowed) {
          f.x = 979; // block progress
          f.vx = -0.4; // slide back slightly into water
          f.isCrowded = true; // triggers crowded stampede panic
          if (Math.random() < 0.12) {
            createSplashParticles(f.x, f.y, 2, 0.9, '#382a1d');
          }
        }
      } else if (!isExitZone && f.x >= 980 && !f.completed) {
        f.x = 979; // block horizontal progress
        f.vx = -0.5; // step back
        // Steer upstream or downstream to find the nearest exit zone!
        const nearestExitY = f.y < 330 ? 140 : 520;
        f.vy = f.y < nearestExitY ? 0.76 : -0.76;
        if (Math.random() < 0.08) {
          createSplashParticles(f.x, f.y, 1, 0.8, '#382a1d'); // muddy brown splash
        }
      }

      // Prevent followers from flying off top/bottom visual edges completely while in River
      f.y = Math.max(15, Math.min(660, f.y));

      // Check if washed all the way off the bottom screen
      if (inRiver && f.y >= 658 && Math.random() < 0.01) {
        // Crocodile eats them or swept downstream
        f.state = 'dead';
        playChomp();
        incrementLostCount();
        createSplashParticles(f.x, 650, 6, 2.0, '#b30000');
      }

      // Smooth sprite rotate angles
      if (Math.hypot(f.vx, f.vy) > 0.1) {
        f.angle = Math.atan2(f.vy, f.vx);
        f.legAngle += 0.15 + (Math.hypot(f.vx, f.vy) * 0.08);
      }

      // Check Saved crossing for follower
      if (f.x >= 1020 && !f.completed) {
        f.completed = true;
        f.isClimbingAllowed = false;

        // Block exit ramp - single file bottleneck delay
        if (f.y >= 80 && f.y <= 200) {
          s.ramp1ExitCooldown = activeAtExit1 >= 3 ? 35 : 15;
        } else {
          s.ramp2ExitCooldown = activeAtExit2 >= 3 ? 35 : 15;
        }

        playCrossSuccess();
        s.waveCrossedCount++;
        
        // Spawn standard peaceful grazing decorations
        s.grazingHerd.push({
          id: `grazing-follow-${Date.now()}-${Math.random()}`,
          x: f.x,
          y: f.y,
          size: f.size,
          color: f.color,
          animOffset: Math.random() * 10,
        });

        f.state = 'grazing';
      }
    });
  };

  const updateAmbientWildebeests = (up: Upgrades) => {
    const s = stateRef.current;
    if (!s.currentWaveActive) return;

    const allLivingWildebeests: Wildebeest[] = [];
    s.followers.forEach(w => {
      if (w.state !== 'dead' && !w.completed) allLivingWildebeests.push(w);
    });
    s.ambientWildebeests.forEach(w => {
      if (w.state !== 'dead' && !w.completed) allLivingWildebeests.push(w);
    });
    if (s.alphaWildebeest && s.alphaWildebeest.state !== 'dead' && !s.alphaWildebeest.completed) {
      allLivingWildebeests.push(s.alphaWildebeest);
    }

    const activeAtExit1 = allLivingWildebeests.filter(
      other => other.x >= 925 && other.x <= 985 && other.y >= 80 && other.y <= 200
    ).length;

    const activeAtExit2 = allLivingWildebeests.filter(
      other => other.x >= 925 && other.x <= 985 && other.y >= 460 && other.y <= 580
    ).length;

    // 1. Periodic spawning - increased frequency and capacity to mimic real great herds crossing together!
    // Spawns families or little clusters of 1-4 ambient wildebeests (increased rate/cap for stampedes)
    if (Math.random() < 0.16 && s.ambientWildebeests.length < 80) {
      const clusterSize = Math.random() < 0.3 ? 1 : Math.random() < 0.6 ? 2 : Math.random() < 0.85 ? 3 : 4;
      const baseMeetY = 100 + Math.random() * 420;
      for (let c = 0; c < clusterSize; c++) {
        s.ambientWildebeests.push({
          id: `ambient-${Date.now()}-${Math.random()}-${c}`,
          type: 'follower',
          x: 60 - (c * 28), // staggered row
          y: Math.max(80, Math.min(590, baseMeetY + (Math.random() * 30 - 15))), // clustered closely vertically
          vx: 0.95 + Math.random() * 0.3, // slow, scenic, realistic swim pace matching player herd
          vy: 0,
          angle: 0,
          state: 'idle',
          stamina: 100,
          health: 100,
          isDashing: false,
          size: 13 + Math.random() * 3.5,
          stunTime: 0,
          legAngle: Math.random() * Math.PI,
          color: Math.random() < 0.5 ? '#3a3429' : Math.random() < 0.8 ? '#4a4233' : '#28241b', // authentic varied wildebeest colors
          onLogId: null,
          completed: false,
          deathTimer: 0,
        });
      }

      s.wildebeestsSpawnCount += clusterSize;
      const numAmbientZebras = Math.floor(s.wildebeestsSpawnCount / 5);
      s.wildebeestsSpawnCount %= 5;

      for (let z = 0; z < numAmbientZebras; z++) {
        s.ambientWildebeests.push({
          id: `zebra-ambient-${Date.now()}-${Math.random()}-${z}`,
          type: 'follower',
          isZebra: true,
          x: 60 - (clusterSize * 28) - (z * 28), 
          y: Math.max(80, Math.min(590, baseMeetY + (Math.random() * 30 - 15))),
          vx: 0.95 + Math.random() * 0.3, 
          vy: 0,
          angle: 0,
          state: 'idle',
          stamina: 100,
          health: 100,
          isDashing: false,
          size: 13 + Math.random() * 3.5,
          stunTime: 0,
          legAngle: Math.random() * Math.PI,
          color: '#ffffff',
          onLogId: null,
          completed: false,
          deathTimer: 0,
        });
      }
    }

    // 2. Update existing ones
    s.ambientWildebeests = s.ambientWildebeests.filter(w => {
      if (w.state === 'dead' || w.completed) return false;

      // Decrement hop timers
      if (w.hopAirTime && w.hopAirTime > 0) {
        w.hopAirTime--;
        if (w.hopAirTime === 0 && w.hasCliffJumped) {
          // HUGE SPLASH LANDING!
          createSplashParticles(w.x, w.y, 14, 2.0, '#ffffff');
          createSplashParticles(w.x, w.y, 8, 1.4, '#a2c2e8');
          playSplash(); // splash sound
        }
      }
      if (w.hopCooldown && w.hopCooldown > 0) w.hopCooldown--;

      // Swim towards right bank (x = 1100), but steer to exits as they approach
      const targetX = 1100;
      // If approaching the right side, target the nearest exit zone center (y = 140 or 520)
      const nearestExitY = w.y < 330 ? 140 : 520;
      const targetY = w.x >= 650 ? nearestExitY : w.y;

      const dx = targetX - w.x;
      const dy = targetY - w.y;
      const dist = Math.hypot(dx, dy);

      let steerX = dist > 0 ? dx / dist : 1;
      let steerY = dist > 0 ? dy / dist : 0;

      // Rest on logs/rocks check disabled
      let onRockVal = false;

      const inRiver = w.x > 220 && w.x < 980;
      const isResting = !inRiver;

      let moveSpeed = 0.78; // aligned with the player's herd swim speeds
      let dragVal = 1.0;
      if (inRiver) {
        dragVal = 0.80; // matches player's river drag
        w.state = 'swimming';
      } else {
        w.state = 'walking';
      }

      w.vx = steerX * moveSpeed * dragVal;
      w.vy = steerY * moveSpeed * dragVal;

      // Apply hop forward impulse
      if (w.hopAirTime && w.hopAirTime > 0) {
        const progress = (18 - w.hopAirTime) / 18;
        const hSBoost = Math.sin(progress * Math.PI) * 1.3;
        const angle = w.angle || 0;
        w.vx += Math.cos(angle) * hSBoost;
        w.vy += Math.sin(angle) * hSBoost;
      }

      // Determine crowding for ambient ones
      let ambCrowdingCount = 0;
      allLivingWildebeests.forEach(other => {
        if (other.id !== w.id) {
          const d = Math.hypot(w.x - other.x, w.y - other.y);
          if (d < 36) ambCrowdingCount++;
        }
      });
      w.isCrowded = (ambCrowdingCount >= 2);

      // Determine crocodile threats
      let crocThreatened = false;
      s.crocodiles.forEach(c => {
        if (!c.sated && c.state !== 'sleeping' && c.snapCooldown <= 0) {
          const dCroc = Math.hypot(c.x - w.x, c.y - w.y);
          if (dCroc < 110) {
            crocThreatened = true;
          }
        }
      });

      // Simulate independent hops when they get stuck in stampedes or are threatened by crocodiles
      if ((w.hopCooldown || 0) <= 0 && w.stamina >= 15) {
        const isThreatenedInRiver = crocThreatened && inRiver;
        const triggerChance = isThreatenedInRiver ? 0.038 : (w.isCrowded ? 0.009 : 0);
        
        if (triggerChance > 0 && Math.random() < triggerChance) {
          w.hopAirTime = 18;
          w.hopCooldown = 50 + Math.random() * 30;
          w.stamina = Math.max(0, w.stamina - 12);
          if (inRiver) {
            playSplash();
          } else {
            playSprint();
          }
          createSplashParticles(w.x, w.y, 6, 1.3, '#ffffff');

          // Push nearby ones away
          const pushRadius = 55;
          allLivingWildebeests.forEach(other => {
            if (other.id !== w.id) {
              const dx = other.x - w.x;
              const dy = other.y - w.y;
              const dist = Math.hypot(dx, dy);
              if (dist < pushRadius && dist > 1) {
                const pushForce = 1.0 * (1 - dist / pushRadius);
                other.x += (dx / dist) * pushForce;
                other.y += (dy / dist) * pushForce;
              }
            }
          });
        }
      }

      if (inRiver && !w.onLogId) {
        w.vy += 0.10 + (s.dayNumber * 0.035); // unified current drift across the river for everyone
        if (Math.random() < 0.08) {
          createSplashParticles(w.x, w.y, 1, 0.3);
        }
      } else if (inRiver && w.onLogId) {
        const logVal = s.logs.find(l => l.id === w.onLogId);
        if (logVal) {
          w.x += logVal.vx;
          w.y += logVal.vy * 0.95;
        }
      }

      // Apply coords
      const oldWX = w.x;
      w.x += w.vx;
      w.y += w.vy;
      w.y = Math.max(15, Math.min(660, w.y));

      // Scenic Cliff Jump simulation when entering the river from the left bank (at x = 220)
      if (oldWX < 220 && w.x >= 220 && !w.hasCliffJumped) {
        w.hasCliffJumped = true;
        w.hopAirTime = 18;
        w.hopCooldown = 50 + Math.random() * 45;
        w.vx = Math.max(w.vx, 3.8); // give substantial forward jump/dive impulse
        createSplashParticles(220, w.y, 11, 2.0, '#ffffff');
      }

      // Block Right Bank steep cliffs progress outside of exit zones for ambient wildebeests too!
      const isExitZone1 = (w.y >= 80 && w.y <= 200);
      const isExitZone2 = (w.y >= 460 && w.y <= 580);
      const isExitZone = isExitZone1 || isExitZone2;

      // Check if exit ramp is actively busy
      const isRamp1Blocked = isExitZone1 && (s.ramp1ExitCooldown || 0) > 0;
      const isRamp2Blocked = isExitZone2 && (s.ramp2ExitCooldown || 0) > 0;
      const isRampCurrentlyBlocked = isExitZone1 ? isRamp1Blocked : isRamp2Blocked;

      // If entering the exit area while NOT blocked, grant persistent climbing allowance!
      if (isExitZone && w.x >= 925) {
        if (!isRampCurrentlyBlocked) {
          w.isClimbingAllowed = true;
        }
      } else {
        w.isClimbingAllowed = false;
      }

      if (isExitZone && w.x >= 980 && !w.completed) {
        if (!w.isClimbingAllowed) {
          w.x = 979; // block progress
          w.vx = -0.4; // slide back slightly into water
          w.isCrowded = true; // triggers crowding panic
          if (Math.random() < 0.12) {
            createSplashParticles(w.x, w.y, 2, 0.9, '#382a1d');
          }
        }
      } else if (!isExitZone && w.x >= 980 && !w.completed) {
        w.x = 979; // block horizontal progress
        w.vx = -0.5; // step back
        // Steer upstream or downstream to find the nearest exit zone!
        const nearestExitY = w.y < 330 ? 140 : 520;
        w.vy = w.y < nearestExitY ? 0.76 : -0.76;
        if (Math.random() < 0.08) {
          createSplashParticles(w.x, w.y, 1, 0.8, '#382a1d');
        }
      }

      // Stamina and health
      if (isResting) {
        // Stamina restoration on banks removed completely
        w.health = Math.min(100, w.health + 0.12);
      } else {
        const isUpstream = w.vy < 0 || steerY < 0;
        const baseDrain = isUpstream ? 0.024 : 0.01;
        let swimDrain = baseDrain;
        if (w.isCrowded) {
          swimDrain += 0.035;
        }
        w.stamina = Math.max(0, w.stamina - swimDrain);
      }

      // Drowning
      if (!isResting && w.stamina <= 0) {
        w.health = Math.max(0, w.health - 0.07);
        if (Math.random() < 0.1) {
          createSplashParticles(w.x, w.y, 1, 0.4, '#437397');
        }
        if (w.health <= 0) {
          w.state = 'dead';
          createSplashParticles(w.x, w.y, 8, 1.5, '#315f8c');
          playChomp();
          incrementLostCount();
        }
      }

      // Rot angles
      if (Math.hypot(w.vx, w.vy) > 0.1) {
        w.angle = Math.atan2(w.vy, w.vx);
        w.legAngle += 0.12;
      }

      // Completed check
      if (w.x >= 1020 && !w.completed) {
        w.completed = true;
        w.isClimbingAllowed = false;

        // Block exit ramp - single file bottleneck delay
        if (w.y >= 80 && w.y <= 200) {
          s.ramp1ExitCooldown = activeAtExit1 >= 3 ? 35 : 15;
        } else {
          s.ramp2ExitCooldown = activeAtExit2 >= 3 ? 35 : 15;
        }

        playCrossSuccess();
        s.waveCrossedCount++;
        setStats(prev => ({ ...prev, herdCrossed: prev.herdCrossed + 1 }));

        s.grazingHerd.push({
          id: `grazing-ambient-${Date.now()}-${Math.random()}`,
          x: w.x,
          y: w.y,
          size: w.size * 0.8,
          color: w.color,
          animOffset: Math.random() * 10,
        });
      }

      return !w.completed && w.state !== 'dead';
    });
  };

  const updateLions = () => {
    const s = stateRef.current;
    if (!s.currentWaveActive) return;

    s.lions.forEach(lion => {
      // Find nearest wildebeest in aggro range on the same bank
      let target: Wildebeest | null = null;
      let minDist = 130; // Chase range on the bank

      // Candidate list of both followers and alpha!
      const candidates: Wildebeest[] = [...s.followers, ...s.ambientWildebeests];
      if (s.alphaWildebeest) candidates.push(s.alphaWildebeest);

      candidates.forEach(w => {
        if (w.state !== 'dead' && !w.completed) {
          // Check if candidate is on the same bank
          const sameBank = (lion.id === 'lion-left' && w.x < 220) || (lion.id === 'lion-right' && w.x > 980);
          if (sameBank) {
            const dist = Math.hypot(w.x - lion.x, w.y - lion.y);
            if (dist < minDist) {
              minDist = dist;
              target = w;
            }
          }
        }
      });

      if (target) {
        lion.state = 'hunting';
        // Steer towards target
        const dx = target.x - lion.x;
        const dy = target.y - lion.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 5) {
          const runSpeed = 1.8;
          lion.vx = (dx / dist) * runSpeed;
          lion.vy = (dy / dist) * runSpeed;
          lion.x += lion.vx;
          lion.y += lion.vy;
          lion.angle = Math.atan2(lion.vy, lion.vx);

          // Pouncing particles/growl effects occasionally
          if (Math.random() < 0.1) {
            createSplashParticles(lion.x, lion.y, 1, 0.4, '#d4a359');
          }
        }

        // Bite / contact and remove from herd on contact!
        if (dist < 22 && lion.aggroCooldown <= 0) {
          // Mauled!
          playChomp();
          s.screenShake = 12;
          
          target.health = Math.max(0, target.health - 60); // severe damage!
          lion.aggroCooldown = 95; // brief pause to chew
          
          createSplashParticles(target.x, target.y, 12, 1.8, '#aa0000');

          if (target.health <= 0) {
            target.state = 'dead';
            
            if (target.type === 'lead') {
              s.redFlashTimer = 40;
              setStats(prev => ({
                ...prev,
                herdTotal: Math.max(0, prev.herdTotal - 1),
                herdLost: prev.herdLost + 1,
              }));

              s.waveLostCount++;

              const crossedAtDeath = s.waveCrossedCount;
              const lostAtDeath = s.waveLostCount;
              setPendingDeathAction(() => () => {
                onGameOver(crossedAtDeath, lostAtDeath);
              });

              setTimeout(() => {
                s.currentWaveActive = false;
                setPlayerDeathMessage("Mauled by a lion: A territorial predator ambushed you on the grassy starting banks.");
                setPlayerDeathTitle("Mauled");
              }, 1500);
            } else {
              // follower or ambient
              incrementLostCount();
            }
          }
        }
      } else {
        lion.state = 'patrolling';
        // Pacing up and down the bank boundaries
        lion.y += lion.vy;
        lion.angle = lion.vy > 0 ? Math.PI / 2 : -Math.PI / 2;

        if (lion.y < lion.patrolRangeY[0]) {
          lion.vy = Math.abs(lion.vy);
        } else if (lion.y > lion.patrolRangeY[1]) {
          lion.vy = -Math.abs(lion.vy);
        }
      }

      if (lion.aggroCooldown > 0) lion.aggroCooldown--;
    });
  };

  const updatePredators = () => {
    const s = stateRef.current;
    
    s.crocodiles.forEach(c => {
      // If sated (has killed a wildebeest), lock state & swim downstream carrying the carcass
      if (c.sated) {
        c.state = 'eating';
        c.jawAngle = 0.15; // slightly open to hold the carcass
        c.vx = 0;
        c.vy = 0.65 + (s.dayNumber * 0.02); // swims downstream with river current
        c.angle = Math.PI / 2; // turn to face downstream
        c.y += c.vy;
        return;
      }

      // 1. Patrolling lane crocodiles code
      if (c.type === 'lane') {
        c.y += c.vy;
        
        // Lane reversal at boundaries
        if (c.y < c.rangeY[0]) {
          c.vy = Math.abs(c.vy);
          c.angle = Math.PI / 2;
        } else if (c.y > c.rangeY[1]) {
          c.vy = -Math.abs(c.vy);
          c.angle = -Math.PI / 2;
        }

        // Closed normal float, opens mouth only when attempting to eat (near a swimming target < 95px)
        let nearbyTarget = false;
        const potentialPrey = [...s.followers, ...s.ambientWildebeests];
        if (s.alphaWildebeest) potentialPrey.push(s.alphaWildebeest);
        for (let prey of potentialPrey) {
          if (prey.state === 'swimming' && prey.state !== 'dead' && !prey.completed) {
            const d = Math.hypot(prey.x - c.x, prey.y - c.y);
            if (d < 95) {
              nearbyTarget = true;
              break;
            }
          }
        }

        if (nearbyTarget) {
          c.jawAngle = Math.abs(Math.sin(Date.now() * 0.015)) * 0.65;
        } else {
          c.jawAngle = 0; // completely closed
        }
      }

      // 2. Predator stalker hunting/patrolling (re-engineered to lie in waiting)
      else if (c.type === 'stalker') {
        const lead = s.alphaWildebeest!;

        // Get all living swimming herd members (including followers and ambient) to compute groupings correctly
        const swimmingHerd = [...s.followers, ...s.ambientWildebeests].filter(
          h => h.state === 'swimming' && h.state !== 'dead' && !h.completed
        );
        if (lead && lead.state === 'swimming' && lead.state !== 'dead' && !lead.completed) {
          swimmingHerd.push(lead);
        }

        // Helper to determine if a specific herd member strays from the group (no other neighbor within 110px)
        const getIsStray = (p: Wildebeest) => {
          if (swimmingHerd.length <= 1) return true; // alone/isolated
          let minNeighborDist = 9999;
          for (const other of swimmingHerd) {
            if (other.id !== p.id) {
              const d = Math.hypot(p.x - other.x, p.y - other.y);
              if (d < minNeighborDist) {
                minNeighborDist = d;
              }
            }
          }
          return minNeighborDist > 110;
        };

        // Find nearest swimming wildebeest to pursue based on stray status and proximity
        let target: Wildebeest | null = null;
        let bestDist = 9999;

        // Candidates include player and followers
        const candidates: Wildebeest[] = [...s.followers];
        if (lead && lead.state === 'swimming' && lead.state !== 'dead' && !lead.completed) {
          candidates.push(lead);
        }

        candidates.forEach(p => {
          const isStray = getIsStray(p);
          // Stalkers only stalk/hunt if the candidate strays from the group. Otherwise, they only attack if they come very close.
          const maxSenseDist = isStray ? 950 : 80;
          const d = Math.hypot(p.x - c.x, p.y - c.y);
          if (d < maxSenseDist && d < bestDist) {
            bestDist = d;
            target = p;
          }
        });

        // Handle states
        if (target) {
          // Hunt near active target (swimming speed slowed down so it is possible to escape)
          c.state = 'hunting';
          const dx = target.x - c.x;
          const dy = target.y - c.y;
          const dist = Math.hypot(dx, dy);
          
          let chaseSpeed = 0.40 + (s.dayNumber * 0.04);
          // If hunting an isolated target, crocodiles speed up slightly, but stay highly escapeable
          if (getIsStray(target)) {
            chaseSpeed *= 1.35; // balanced multiplier for escapeability (down from 2.95!)
          }
          c.vx = (dx / dist) * chaseSpeed;
          c.vy = (dy / dist) * chaseSpeed;
          c.angle = Math.atan2(c.vy, c.vx);
          
          c.x += c.vx;
          c.y += c.vy;

          // Menacingly snap jaw open/closed when chasing / attempting to eat
          c.jawAngle = Math.abs(Math.sin(Date.now() * 0.015)) * 0.65;
        } 
        else {
          // Peaceful passive pacing/floating in wait
          c.state = 'patrolling';
          const speed = 0.12 + (s.dayNumber * 0.01); // extremely slow cruising
          c.x += c.vx * speed;
          c.y += c.vy * speed;

          // Wrap around edges of river channel for stalkers
          if (c.x < 240) {
            c.vx = Math.abs(c.vx);
            c.angle = 0;
          } else if (c.x > 960) {
            c.vx = -Math.abs(c.vx);
            c.angle = Math.PI;
          }
          if (c.y < 30 || c.y > 640) {
            c.vy = -c.vy;
          }

          c.jawAngle = 0; // completely mouth closed when floating
        }
      }

      // 3. Sleepy stationary crocodiles (Log camouflaged / lying in wait)
      else if (c.type === 'sleeper') {
        const timeNow = Date.now();
        const cycle = (timeNow + c.wakeTimer) % 10000; // 10s cycles
        const sleepThreshold = Math.max(3000, 8000 - s.dayNumber * 550);

        if (cycle < sleepThreshold) { // stays sleeping longer on low days, wakes up much longer on high days
          // Floating sleeping
          c.state = 'sleeping';
          c.jawAngle = 0; // completely mouth closed
        } else {
          // Alarm biting state
          c.state = 'hunting';
          c.jawAngle = 0.8; // huge wide jaws open warning
          
          // periodic jaw snap bubble particles
          if (Math.random() < 0.1) {
            createSplashParticles(c.x, c.y, 1, 0.4);
          }
        }
      }
    });
  };

  const processCollisions = (up: Upgrades) => {
    const s = stateRef.current;
    
    // Safety check objects (Logs, Rocks)
    // Disabled - logs and rocks are now purely decorative scenic scenery elements
    const checkSafety = (w: Wildebeest) => {
      w.onLogId = null;
    };

    if (s.alphaWildebeest) checkSafety(s.alphaWildebeest);
    s.followers.forEach(f => checkSafety(f));

    // 3. Crocodile Attack / Bite Box Collisions
    s.crocodiles.forEach(c => {
      // Sated crocodiles are occupied feeding and do not attack anyone else
      if (c.sated) return;

      // Stunned or eating crocs cannot bite players
      if (c.snapCooldown > 0) {
        c.snapCooldown--;
        return;
      }

      // Snapping/hunting sleepers, or lane, or stalkers can bite
      const isDangerous = c.state === 'hunting' || c.type === 'lane' || c.type === 'stalker';
      if (!isDangerous) return;

      let biteHappened = false;

      // A. Collision with Alpha Leader?
      const lead = s.alphaWildebeest!;
      if (!biteHappened && lead && lead.state === 'swimming' && lead.state !== 'dead' && !lead.completed && !lead.onLogId) {
        const d = Math.hypot(lead.x - c.x, lead.y - c.y);
        if (d < 28) {
          biteHappened = true;
          if (lead.hopAirTime && lead.hopAirTime > 0) {
            // SUCCESSFUL HOpping LEAP DODGE!
            playCrocStun(); // splash/drench sound
            createSplashParticles(lead.x, lead.y, 8, 1.5, '#ffd700'); // beautiful spray
            lead.x = Math.min(1010, lead.x + 35); // hurdle past the crocodile!
            c.snapCooldown = Math.max(25, 75 - s.dayNumber * 5); // briefly confuses the croc
          } else if (up.hornDefense > 0 && lead.isDashing) {
            // Defend! Stun crocodile charge headbutt!
            playCrocStun();
            s.screenShake = 12;
            c.snapCooldown = Math.max(120, 310 - s.dayNumber * 20); // stun croc for ~4.5 seconds
            c.jawAngle = -0.35; // reverse upside down mouth
            createSplashParticles(c.x, c.y, 10, 2.5, '#ffd700'); // gold stun sparkles
          } else {
            // Apply health damage to Alpha instead of instant death
            const dmg = 45 * (1 - up.thickHides * 0.18);
            lead.health = Math.max(0, lead.health - dmg);

            if (lead.health <= 0) {
              // Devoured!
              lead.state = 'dead';
              lead.deathTimer = 0;
              createSplashParticles(lead.x, lead.y, 15, 3.0, '#cc0000'); // bleeding spray

              // Make crocodile full and start eating
              c.state = 'eating';
              c.sated = true;
              c.snapCooldown = 999999;
              s.killerCrocId = c.id;
              
              s.waveLostCount++;

              setStats(prev => {
                return {
                  ...prev,
                  herdTotal: Math.max(0, prev.herdTotal - 1),
                  herdLost: prev.herdLost + 1,
                };
              });

              const crossedAtDeath = s.waveCrossedCount;
              const lostAtDeath = s.waveLostCount;
              setPendingDeathAction(() => () => {
                onGameOver(crossedAtDeath, lostAtDeath);
              });

              // Allow the crocodile to swim downstream with him for 3s, then show the death tile
              setTimeout(() => {
                s.currentWaveActive = false;
                setPlayerDeathMessage("Eaten by a crocodile: A patient predator lying in wait dragged you into the deep.");
                setPlayerDeathTitle("Eaten");
              }, 3000);
            } else {
              // Survived! Flash screen, screenshake, play bite, push back Alpha
              playChomp();
              s.redFlashTimer = 20;
              s.screenShake = 8;
              createSplashParticles(lead.x, lead.y, 8, 1.8, '#b30000');
              lead.x = Math.max(100, lead.x - 70); // pushed back in river
              lead.vx = -1.5;
              
              // Crocodile rests/chews briefly after successful bite
              c.state = 'eating';
              c.snapCooldown = Math.max(80, 180 - s.dayNumber * 10);
            }
          }
        }
      }

      // B. Collision with Follower Wildebeests?
      if (!biteHappened) {
        s.followers.forEach(f => {
          if (biteHappened) return;
          if (f.state === 'swimming' && f.state !== 'dead' && !f.completed && !f.onLogId) {
            const d = Math.hypot(f.x - c.x, f.y - c.y);
            if (d < 25) {
              biteHappened = true;
              if (f.hopAirTime && f.hopAirTime > 0) {
                // Follower leaps over!
                playCrocStun();
                createSplashParticles(f.x, f.y, 6, 1.2, '#ffd700');
                f.x = Math.min(1010, f.x + 30);
                c.snapCooldown = Math.max(20, 50 - s.dayNumber * 3);
              } else {
                // Apply health damage to followers instead of instant death
                const dmg = 50 * (1 - up.thickHides * 0.18);
                f.health = Math.max(0, f.health - dmg);

                if (f.health <= 0) {
                  // Devour follower!
                  playChomp();
                  s.screenShake = 6;
                  f.state = 'dead';
                  incrementLostCount();
                  createSplashParticles(f.x, f.y, 12, 2.2, '#aa0000');
                  
                  // Crocodile rests and eats
                  c.state = 'eating';
                  c.sated = true;
                  c.snapCooldown = 999999;
                } else {
                  // Bite survived! Push follower back
                  playChomp();
                  createSplashParticles(f.x, f.y, 6, 1.4, '#aa0000');
                  f.x = Math.max(100, f.x - 65);
                  
                  c.state = 'eating';
                  c.snapCooldown = Math.max(70, 160 - s.dayNumber * 9); // sated crocodile
                }
              }
            }
          }
        });
      }

      // C. Collision with Ambient/Bystander Wildebeests?
      if (!biteHappened) {
        s.ambientWildebeests.forEach(w => {
          if (biteHappened) return;
          if (w.state === 'swimming' && w.state !== 'dead' && !w.completed && !w.onLogId) {
            const d = Math.hypot(w.x - c.x, w.y - c.y);
            if (d < 25) {
              biteHappened = true;

              const dmg = 50;
              w.health = Math.max(0, w.health - dmg);

              if (w.health <= 0) {
                playChomp();
                w.state = 'dead';
                createSplashParticles(w.x, w.y, 12, 2.2, '#aa0000');

                // Crocodile eats ambient wildebeest
                c.state = 'eating';
                c.sated = true;
                c.snapCooldown = 999999;

                incrementLostCount();
              } else {
                playChomp();
                createSplashParticles(w.x, w.y, 6, 1.4, '#aa0000');
                w.x = Math.max(100, w.x - 65);

                c.state = 'eating';
                c.snapCooldown = Math.max(70, 160 - s.dayNumber * 9);
              }
            }
          }
        });
      }
    });
  };

  const evaluateWaveProgress = () => {
    const s = stateRef.current;
    if (!s.currentWaveActive) return;

    const alpha = s.alphaWildebeest;
    // Single leader completes the level
    if (alpha && alpha.completed) {
      s.currentWaveActive = false;
      
      // Reward 25 gold corms for a successful single-player crossing
      const finalGoldEarned = 25;

      setStats(prev => {
        const nextCorms = prev.goldCorms + finalGoldEarned;
        s.goldCormsEarned = nextCorms;
        return {
          ...prev,
          goldCorms: nextCorms,
          herdTotal: Math.max(0, prev.herdTotal - s.waveTotalFollowersSpawning),
          herdCrossed: prev.herdCrossed + s.waveCrossedCount,
        };
      });

      // Show level upgrades screen / Next Wave Trigger after 1.5 seconds delay
      setTimeout(() => {
        const totalHerdLeft = stats.herdTotal - s.waveTotalFollowersSpawning;
        
        if (totalHerdLeft <= 0) {
          onGameOver(s.waveCrossedCount, s.waveLostCount);
        } else {
          onWaveComplete(s.waveCrossedCount, s.waveLostCount);
        }
      }, 1500);
    }
  };

  const drawGameOnly = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = stateRef.current;

    ctx.save();
    
    // Apply Screenshake from Crocodile attacks or stomps
    if (s.screenShake > 0.1) {
      const shakeX = (Math.random() - 0.5) * s.screenShake;
      const shakeY = (Math.random() - 0.5) * s.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // 1. DRAW SAFARI GRASSLANDS & BANKS
    // Left Serengeti Bank
    ctx.fillStyle = '#1e1a15'; // Deep dark warm brown/charcoal Left Bank
    ctx.fillRect(0, 0, 180, 675);

    // Left mud transition / short cliff drop-off (Y: 0 to 675)
    ctx.fillStyle = '#2d1f15'; // Deep dark soil
    ctx.fillRect(180, 0, 40, 675);
    // Draw some jagged rocky patterns representing a steep cliff height drop
    ctx.strokeStyle = '#18120e';
    ctx.lineWidth = 2.5;
    for (let cY = 10; cY < 670; cY += 30) {
      ctx.beginPath();
      ctx.moveTo(180, cY);
      ctx.lineTo(220, cY + (cY % 4 === 0 ? 8 : -8));
      ctx.stroke();
    }
    // Highlighting cliff edge lines
    ctx.strokeStyle = '#5a3d2c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(220, 0);
    ctx.lineTo(220, 675);
    ctx.stroke();

    // Right Masai Mara Bank
    ctx.fillStyle = '#24211a'; // Deep golden-hued dark charcoal Right Bank
    ctx.fillRect(1020, 0, 180, 675);

    // Right mud transition - Steep muddy cliffs by default
    ctx.fillStyle = '#1c130d'; // Deep steep dry vertical clay bank
    ctx.fillRect(980, 0, 40, 675);

    // Draw steep jagged rocky cliff horizontal lines/ridges
    ctx.strokeStyle = '#2d1f15';
    ctx.lineWidth = 3;
    for (let cliffY = 12; cliffY < 670; cliffY += 25) {
      // Skip ridges where safe exit channels are!
      const inExit = (cliffY >= 80 && cliffY <= 200) || (cliffY >= 460 && cliffY <= 580);
      if (!inExit) {
        ctx.beginPath();
        ctx.moveTo(980, cliffY);
        ctx.lineTo(1020, cliffY);
        ctx.stroke();
      }
    }

    // Gentle sand/grass exit ramps sloping into river within exit channels
    const rampGrad = ctx.createLinearGradient(980, 0, 1020, 0);
    rampGrad.addColorStop(0, '#5a784d'); // riverbank marsh green
    rampGrad.addColorStop(0.4, '#87694f'); // trampled sand transition
    rampGrad.addColorStop(1, '#9f8564'); // grass ramp rise to bank
    
    // Draw Exit Channel 1 Ramp (Y: 80 to 200)
    ctx.fillStyle = rampGrad;
    ctx.fillRect(980, 80, 40, 120);

    // Draw Exit Channel 2 Ramp (Y: 460 to 580)
    ctx.fillRect(980, 460, 40, 120);

    // Draw directional safety exit arrows inside the ramps
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    // Ramp 1 arrows
    ctx.moveTo(985, 140); ctx.lineTo(1015, 140);
    ctx.moveTo(1005, 130); ctx.lineTo(1015, 140); ctx.lineTo(1005, 150);
    // Ramp 2 arrows
    ctx.moveTo(985, 520); ctx.lineTo(1015, 520);
    ctx.moveTo(1005, 510); ctx.lineTo(1015, 520); ctx.lineTo(1005, 530);
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // Draw dynamic bottleneck indicators near exit zones if crowded
    const activeAtExit1 = [...s.followers, ...s.ambientWildebeests, ...(s.alphaWildebeest ? [s.alphaWildebeest] : [])].filter(
      other => !other.completed && other.state !== 'dead' && other.x >= 925 && other.x <= 985 && other.y >= 80 && other.y <= 200
    ).length;

    const activeAtExit2 = [...s.followers, ...s.ambientWildebeests, ...(s.alphaWildebeest ? [s.alphaWildebeest] : [])].filter(
      other => !other.completed && other.state !== 'dead' && other.x >= 925 && other.x <= 985 && other.y >= 460 && other.y <= 580
    ).length;

    if (activeAtExit1 >= 3) {
      // Glow background for Exit 1 Ramp
      ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
      ctx.fillRect(980, 80, 40, 120);
      
      ctx.fillStyle = '#ff7b7b';
      ctx.font = 'bold 10px Inter, system-ui, sans-serif';
      ctx.fillText('⚠️ BOTTLE-NECK!', 838, 145);
      
      ctx.strokeStyle = '#ef444b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(980, 80, 40, 120);
    }

    if (activeAtExit2 >= 3) {
      // Glow background for Exit 2 Ramp
      ctx.fillStyle = 'rgba(239, 68, 68, 0.28)';
      ctx.fillRect(980, 460, 40, 120);
      
      ctx.fillStyle = '#ff7b7b';
      ctx.font = 'bold 10px Inter, system-ui, sans-serif';
      ctx.fillText('⚠️ BOTTLE-NECK!', 838, 525);
      
      ctx.strokeStyle = '#ef444b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(980, 460, 40, 120);
    }

    // 2. DRAW FLOWING MARA RIVER BED with the Sophisticated Dark gradient
    const waterGrad = ctx.createLinearGradient(220, 0, 980, 0);
    waterGrad.addColorStop(0, '#1a1410');
    waterGrad.addColorStop(0.5, '#1c2e36');
    waterGrad.addColorStop(1, '#1a1410');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(220, 0, 760, 675);

    // Draw animated current flow lines matching white/15 opacity
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    const timeVal = Date.now() * 0.05;
    for (let c = 240; c < 970; c += 80) {
      ctx.beginPath();
      ctx.setLineDash([15, 35]);
      ctx.moveTo(c, 0);
      ctx.lineTo(c, 675);
      ctx.lineDashOffset = -timeVal * (0.8 + (c % 3) * 0.2);
      ctx.stroke();
    }
    ctx.setLineDash([]); // Reset line dash

    // 3. DRAW TRANSIENT ROCKS & ISLAND BULKS
    s.rocks.forEach(rock => {
      // Draw smooth rock shadow
      ctx.fillStyle = 'rgba(15, 23, 14, 0.4)';
      ctx.beginPath();
      ctx.arc(rock.x + 4, rock.y + 4, rock.radius, 0, Math.PI * 2);
      ctx.fill();

      // Rock core
      const grad = ctx.createRadialGradient(rock.x - 5, rock.y - 5, 2, rock.x, rock.y, rock.radius);
      grad.addColorStop(0, '#afb4b9'); // rock highlight
      grad.addColorStop(0.7, '#7e8387');
      grad.addColorStop(1, '#535659'); // dark wet bottom moss ring
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(rock.x, rock.y, rock.radius, 0, Math.PI * 2);
      ctx.fill();

      // Rock details / texture
      ctx.strokeStyle = '#5a5e61';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rock.x + 3, rock.y - 5, rock.radius * 0.6, 1.2, 3.2);
      ctx.stroke();
    });

    // 4. DRAW FLOATING LOGS (PLATFORMS)
    s.logs.forEach(log => {
      // Log shadow
      ctx.fillStyle = 'rgba(5, 10, 5, 0.35)';
      ctx.fillRect(log.x - log.width/2 + 5, log.y + 5, log.width, log.height);

      // Log bark skin
      ctx.fillStyle = '#5c4033'; // Rich dark log wood
      ctx.fillRect(log.x - log.width/2, log.y, log.width, log.height);

      // Moss patch highlight and details
      ctx.fillStyle = '#3c6e47'; // river green moss
      ctx.fillRect(log.x - log.width/2 + 2, log.y + log.height * 0.2, 12, 18);
      ctx.fillRect(log.x + log.width/2 - 14, log.y + log.height * 0.65, 12, 22);

      // Bark rings details lines
      ctx.strokeStyle = '#3e2a21';
      ctx.lineWidth = 2.5;
      for (let offset = 15; offset < log.height; offset += 20) {
        ctx.beginPath();
        ctx.moveTo(log.x - log.width/2 + 4, log.y + offset);
        ctx.lineTo(log.x + log.width/2 - 4, log.y + offset + (offset % 5));
        ctx.stroke();
      }
    });

    // 5. DRAW DISTRACTION SPLASH RIPPLES
    s.distractions.forEach(d => {
      const radiusProgress = (d.life / d.maxLife) * d.radius;
      const alphaVal = 1 - (d.life / d.maxLife);

      ctx.strokeStyle = `rgba(255, 255, 255, ${alphaVal * 0.7})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(d.x, d.y, radiusProgress, 0, Math.PI * 2);
      ctx.stroke();

      // inner ripple
      if (d.life > 30) {
        ctx.strokeStyle = `rgba(135, 206, 250, ${alphaVal * 0.5})`;
        ctx.beginPath();
        ctx.arc(d.x, d.y, radiusProgress * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // 6. DRAW WATER PARTICLES / BLOOD CHOMPS/ BUBLLES
    s.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0; // reset
    });

    // 7. DRAW PERSISTENT GRAZING DECORATIONS
    s.grazingHerd.forEach(g => {
      // Draw grazing cute shape facing rightward/upwards
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(Math.sin((Date.now() * 0.002) + g.animOffset) * 0.2); // slight head swing animation
      
      // Shadow
      ctx.fillStyle = 'rgba(20, 28, 15, 0.3)';
      ctx.ellipse(0, 0, g.size * 1.2, g.size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Torso
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.ellipse(0, -3, g.size * 1.1, g.size * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();

      // Neck and head grazing down
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.arc(g.size * 0.8, 2, g.size * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Beard
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(g.size * 0.7, 4);
      ctx.lineTo(g.size * 0.9, 8);
      ctx.stroke();

      ctx.restore();
    });

    // 8. DRAW ACTIVE PLAYERS (WILDEBEEST FOLLOWERS)
    s.followers.forEach(f => {
      if (f.state === 'dead' || f.completed) return;
      drawWildebeestSprite(ctx, f);
    });

    // 8b. DRAW AMBIENT BACKGROUND CONCURRENT CROSSING WILDEBEESTS
    s.ambientWildebeests.forEach(w => {
      if (w.state === 'dead' || w.completed) return;
      drawWildebeestSprite(ctx, w);
    });

    // 9. DRAW ALPHA LEADER (HERD CAPTAIN)
    if (s.alphaWildebeest && !s.alphaWildebeest.completed) {
      drawWildebeestSprite(ctx, s.alphaWildebeest);
    }

    // 10. DRAW CROCODILES (THE DANGEROUS REPTILES)
    s.crocodiles.forEach(c => {
      drawCrocodileSprite(ctx, c);
    });

    // 10b. DRAW LIONS (THE APEX BANK HUNTERS)
    s.lions.forEach(l => {
      drawLionSprite(ctx, l);
    });

    // 11. RED SCREEN FLASH ON BITING DAMAGE
    if (s.redFlashTimer > 0) {
      ctx.fillStyle = 'rgba(204, 0, 0, 0.28)';
      ctx.fillRect(0, 0, 1200, 675);
    }

    ctx.restore();
  };

  const drawLionSprite = (ctx: CanvasRenderingContext2D, l: any) => {
    ctx.save();
    ctx.translate(l.x, l.y);
    ctx.rotate(l.angle);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
    ctx.beginPath();
    ctx.ellipse(0, 4, l.size * 1.05, l.size * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body Torso
    ctx.fillStyle = l.color;
    ctx.beginPath();
    ctx.ellipse(-3, 0, l.size * 0.95, l.size * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fluffy mane
    ctx.fillStyle = '#4a2f13';
    ctx.beginPath();
    ctx.arc(l.size * 0.35, 0, l.size * 0.72, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = l.color;
    ctx.beginPath();
    ctx.arc(l.size * 0.6, 0, l.size * 0.38, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#412910';
    ctx.beginPath();
    ctx.arc(l.size * 0.48, -l.size * 0.38, 3.5, 0, Math.PI * 2);
    ctx.arc(l.size * 0.48, l.size * 0.38, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Angry eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(l.size * 0.7, -l.size * 0.12, 1.8, 0, Math.PI * 2);
    ctx.arc(l.size * 0.7, l.size * 0.12, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dd0000';
    ctx.beginPath();
    ctx.arc(l.size * 0.72, -l.size * 0.12, 0.9, 0, Math.PI * 2);
    ctx.arc(l.size * 0.72, l.size * 0.12, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Swaying tail
    ctx.strokeStyle = l.color;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-l.size, 0);
    ctx.quadraticCurveTo(-l.size * 1.35, Math.sin(Date.now() * 0.006) * 7, -l.size * 1.45, Math.sin(Date.now() * 0.006) * 11);
    ctx.stroke();

    ctx.fillStyle = '#412910';
    ctx.beginPath();
    ctx.arc(-l.size * 1.45, Math.sin(Date.now() * 0.006) * 11, 3.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const drawWildebeestSprite = (ctx: CanvasRenderingContext2D, w: Wildebeest) => {
    // Hop offset calculation
    let hopYOffset = 0;
    if (w.hopAirTime && w.hopAirTime > 0) {
      // 18 frame duration parabolic surge
      hopYOffset = Math.sin((18 - w.hopAirTime) / 18 * Math.PI) * 16;
    }

    const isWhiteBeard = true;
    const isHopActive = w.hopAirTime && w.hopAirTime > 0;

    // A. Stepping Shadows stationary at floor/water level
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.rotate(w.angle);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.23)';
    ctx.beginPath();
    // Shadow shrinks slightly as they rise further in the air
    const shadowScale = Math.max(0.4, 1 - (hopYOffset / 42));
    ctx.ellipse(0, 4, w.size * 1.15 * shadowScale, w.size * 0.7 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Underneath visual glowing ring indicator for player leader
    if (w.type === 'lead') {
      ctx.save();
      ctx.translate(w.x, w.y);
      const pulseRadius = w.size * (1.7 + 0.35 * Math.sin(Date.now() / 150));
      const pulseAlpha = 0.45 + 0.3 * Math.sin(Date.now() / 150);
      
      // Outer neon shadow glow
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 12;

      // Ring outer stroke
      ctx.strokeStyle = `rgba(255, 215, 0, ${pulseAlpha})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Soft filled dynamic halo
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 215, 0, 0.12)';
      ctx.beginPath();
      ctx.arc(0, 0, w.size * 0.95, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // B. Draw Legs & Torso body shifted UP by the hop translation
    ctx.save();
    ctx.translate(w.x, w.y - hopYOffset);
    ctx.rotate(w.angle);

    // Draw Legs (Moving cycle animation)
    ctx.strokeStyle = '#1b1c1d';
    ctx.lineWidth = 3.5;
    
    // Front Legs
    const frontLegOffset = Math.sin(w.legAngle) * 8;
    ctx.beginPath();
    ctx.moveTo(w.size * 0.5, -2);
    ctx.lineTo(w.size * 0.55 + frontLegOffset, -w.size * 0.6);
    ctx.moveTo(w.size * 0.5, 2);
    ctx.lineTo(w.size * 0.55 - frontLegOffset, w.size * 0.6);
    
    // Back Legs
    const backLegOffset = Math.sin(w.legAngle + Math.PI) * 7;
    ctx.beginPath();
    ctx.moveTo(-w.size * 0.5, -2);
    ctx.lineTo(-w.size * 0.6 + backLegOffset, -w.size * 0.5);
    ctx.moveTo(-w.size * 0.5, 2);
    ctx.lineTo(-w.size * 0.6 - backLegOffset, w.size * 0.5);
    ctx.stroke();

    if (w.isZebra) {
      // C. Zebra Main Torso Body
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, w.size * 1.1, w.size * 0.68, 0, 0, Math.PI * 2);
      ctx.fill();

      // Zebra Mane (black ridge along the neck/back)
      ctx.fillStyle = '#1b1c1d';
      ctx.beginPath();
      ctx.ellipse(w.size * 0.2, -w.size * 0.5, w.size * 0.8, w.size * 0.22, -Math.PI / 8, 0, Math.PI * 2);
      ctx.fill();

      // Body Stripes
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, 0, w.size * 1.1, w.size * 0.68, 0, 0, Math.PI * 2);
      ctx.clip();
      
      ctx.strokeStyle = '#1b1c1d';
      ctx.lineWidth = w.size * 0.16;
      for (let offset = -w.size * 0.9; offset <= w.size * 0.9; offset += w.size * 0.32) {
        ctx.beginPath();
        // Slanted lines for gorgeous zebra stripe appearance
        ctx.moveTo(offset - w.size * 0.3, -w.size * 0.75);
        ctx.lineTo(offset + w.size * 0.1, w.size * 0.75);
        ctx.stroke();
      }
      ctx.restore();

      // D. Neck & Elongated Head in white
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(w.size * 0.9, 0, w.size * 0.48, w.size * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();

      // Black muzzle/snout
      ctx.fillStyle = '#1b1c1d';
      ctx.beginPath();
      ctx.arc(w.size * 1.25, 0, w.size * 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Head Stripes
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(w.size * 0.9, 0, w.size * 0.48, w.size * 0.32, 0, 0, Math.PI * 2);
      ctx.clip();
      
      ctx.strokeStyle = '#1b1c1d';
      ctx.lineWidth = w.size * 0.08;
      for (let offset = w.size * 0.62; offset <= w.size * 1.2; offset += w.size * 0.2) {
        ctx.beginPath();
        ctx.moveTo(offset - w.size * 0.1, -w.size * 0.4);
        ctx.lineTo(offset, w.size * 0.4);
        ctx.stroke();
      }
      ctx.restore();

      // Zebra Ears (neat small perky triangles!)
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1b1c1d';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(w.size * 0.88, -w.size * 0.2);
      ctx.lineTo(w.size * 0.8, -w.size * 0.65);
      ctx.lineTo(w.size * 1.0, -w.size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // C. Wildebeest Main Torso Body
      ctx.fillStyle = w.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, w.size * 1.1, w.size * 0.68, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dark majestic fur shoulder hump
      ctx.fillStyle = '#1e1f21';
      ctx.beginPath();
      ctx.arc(w.size * 0.3, 0, w.size * 0.62, 0, Math.PI * 2);
      ctx.fill();

      // D. Neck & Elongated Head (Facing right or along rotate angle)
      ctx.fillStyle = w.color;
      ctx.beginPath();
      ctx.ellipse(w.size * 0.9, 0, w.size * 0.48, w.size * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();

      // E. Curved Antelope Wildebeest Horns
      ctx.strokeStyle = '#050505';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      // left horn curve back
      ctx.arc(w.size * 0.85, -w.size * 0.25, w.size * 0.25, Math.PI, Math.PI * 1.75);
      // right horn curve back
      ctx.arc(w.size * 0.85, w.size * 0.25, w.size * 0.25, Math.PI * 0.25, Math.PI);
      ctx.stroke();

      // F. Beard
      if (isWhiteBeard) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(w.size * 0.82, w.size * 0.18);
        ctx.lineTo(w.size * 0.7, w.size * 0.45);
        ctx.moveTo(w.size * 0.82, -w.size * 0.18);
        ctx.lineTo(w.size * 0.7, -w.size * 0.45);
        ctx.stroke();
      }
    }

    // G. Alpha leader Crown/Horns Glow indicator
    if (w.type === 'lead') {
      ctx.fillStyle = '#ffd700'; // alpha gold eye star glow
      ctx.beginPath();
      ctx.arc(w.size * 0.95, -w.size * 0.1, 2, 0, Math.PI * 2);
      ctx.arc(w.size * 0.95, w.size * 0.1, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // H. Hop ring ripples glow if mid-air (Only for player leader)
    if (isHopActive && w.type === 'lead') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, w.size * 1.7, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    // I. Draw Stamina & Health Bars above the wildebeest (follows the hop height!)
    // Strictly restrict overhead indicators to only the player-controlled Alpha leader (type === 'lead')
    const inWater = w.x > 210 && w.x < 995 && w.state !== 'dead' && !w.completed;
    if (inWater && w.type === 'lead') {
      const barWidth = w.size * 2.2;
      const barHeight = 2.5;
      const startX = w.x - barWidth / 2;
      const startY = w.y - hopYOffset - w.size - 12;

      // Draw background bounding frame
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(startX - 1, startY - 1, barWidth + 2, (barHeight * 2) + 3);

      // 1. Health Fill (Green / Orange / Red)
      const healthPct = Math.max(0, Math.min(100, w.health ?? 100)) / 100;
      ctx.fillStyle = (w.health ?? 100) > 50 ? '#4cd137' : (w.health ?? 100) > 25 ? '#fbc531' : '#e84118';
      ctx.fillRect(startX, startY, barWidth * healthPct, barHeight);

      // 2. Stamina Fill (Glowing Light-Blue)
      const staminaPct = Math.max(0, Math.min(100, w.stamina)) / 100;
      ctx.fillStyle = '#00a8ff'; // Beautiful bright water-blue/glowing-cyan stamina representation
      ctx.fillRect(startX, startY + barHeight + 1, barWidth * staminaPct, barHeight);
    }
  };

  const drawCrocodileSprite = (ctx: CanvasRenderingContext2D, c: Crocodile) => {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);

    const size = c.size;

    // A. underwater shadow
    ctx.fillStyle = 'rgba(5, 15, 6, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 3, size * 1.5, size * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // B. Scaly segmented ridges (Forest green theme)
    ctx.fillStyle = c.state === 'sleeping' ? '#3d4d3a' : '#223c21'; // logs camouflaged sleeper
    
    // Tail segments weaving back and forth
    const swing = Math.sin((Date.now() * 0.006) + (c.x * 0.1)) * 12;
    ctx.beginPath();
    ctx.moveTo(-size * 0.6, 0);
    ctx.quadraticCurveTo(-size * 1.1, swing / 2, -size * 1.6, swing);
    ctx.lineTo(-size * 0.6, -size * 0.2);
    ctx.closePath();
    ctx.fill();

    // C. Crocodile Central Rib Cage Torso
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.8, size * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    // D. Back armored boney ridges
    ctx.fillStyle = '#10220f';
    ctx.fillRect(-size * 0.5, -size * 0.15, size * 0.9, size * 0.3);

    // E. Snapping menacing wide reptile jaws
    ctx.save();
    ctx.translate(size * 0.5, 0);
    
    // Upper jaw segment
    ctx.save();
    ctx.rotate(-c.jawAngle);
    ctx.fillStyle = c.state === 'sleeping' ? '#3d4d3a' : '#223c21';
    ctx.beginPath();
    ctx.ellipse(size * 0.5, -size * 0.08, size * 0.6, size * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Teeth detailing (Upper row)
    ctx.fillStyle = '#ffffff';
    for (let t = 2; t < size * 1.1; t += 6) {
      ctx.beginPath();
      ctx.moveTo(t, 2);
      ctx.lineTo(t + 3, 5);
      ctx.lineTo(t + 4, 1);
      ctx.fill();
    }
    ctx.restore();

    // Lower jaw segment
    ctx.save();
    ctx.rotate(c.jawAngle);
    ctx.fillStyle = c.state === 'sleeping' ? '#3d3f2a' : '#142513';
    ctx.beginPath();
    ctx.ellipse(size * 0.5, size * 0.08, size * 0.55, size * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    // Teeth detailing (Lower row)
    ctx.fillStyle = '#ffffff';
    for (let t = 4; t < size * 1.0; t += 6) {
      ctx.beginPath();
      ctx.moveTo(t, -2);
      ctx.lineTo(t + 3, -5);
      ctx.lineTo(t + 4, -1);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();

    // If SATED (eating killed prey), draw captured wildebeest carcass details inside jaws
    if (c.sated) {
      // Draw captured wildebeest body held across the crocodile's mouth
      ctx.save();
      ctx.translate(size * 0.95, 0);

      // Blood clouds clouding the surrounding river water
      ctx.fillStyle = 'rgba(180, 20, 20, 0.55)';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.75, 0, Math.PI * 2);
      ctx.fill();

      // Muddy fur body
      ctx.fillStyle = '#41362e';
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.65, size * 0.32, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      // Limp wildebeest legs sticking out sideways
      ctx.strokeStyle = '#2d2520';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-size * 0.1, -size * 0.2);
      ctx.lineTo(-size * 0.4, -size * 0.6); // leg 1
      ctx.moveTo(size * 0.1, -size * 0.2);
      ctx.lineTo(size * 0.3, -size * 0.6); // leg 2
      ctx.stroke();

      // Dark snout/head
      ctx.fillStyle = '#221a15';
      ctx.beginPath();
      ctx.arc(size * 0.35, size * 0.2, size * 0.24, 0, Math.PI * 2);
      ctx.fill();

      // Small details: tiny black curved horn
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(size * 0.3, size * 0.1, size * 0.12, Math.PI * 1.2, Math.PI * 1.9);
      ctx.stroke();

      ctx.restore();
    }

    // F. Menacing Glowing Red/Yellow Eyes
    ctx.fillStyle = '#ffd700'; // yellow glow slit eyes
    ctx.beginPath();
    ctx.arc(size * 0.45, -size * 0.12, 1.8, 0, Math.PI * 2);
    ctx.arc(size * 0.45, size * 0.12, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff0000'; // red slit centers
    ctx.fillRect(size * 0.45 - 0.5, -size * 0.12 - 1.5, 1, 3);
    ctx.fillRect(size * 0.45 - 0.5, size * 0.12 - 1.5, 1, 3);

    // G. Swim/Claw flippers
    ctx.fillStyle = c.state === 'sleeping' ? '#2d3b2a' : '#132812';
    ctx.beginPath();
    ctx.ellipse(-size * 0.3, -size * 0.32, size * 0.28, size * 0.14, Math.PI/4, 0, Math.PI * 2);
    ctx.ellipse(-size * 0.3, size * 0.32, size * 0.28, size * 0.14, -Math.PI/4, 0, Math.PI * 2);
    ctx.fill();

    // H. If STUNNED/On Cooldown: display rotating dizzy starts indicators
    if (c.snapCooldown > 0) {
      ctx.fillStyle = '#ffd700';
      const offsetStarAngle = (Date.now() * 0.01);
      for (let s = 0; s < 3; s++) {
        const starX = Math.cos(offsetStarAngle + s * Math.PI * 0.6) * (size * 0.7);
        const starY = Math.sin(offsetStarAngle + s * Math.PI * 0.6) * (size * 0.4);
        ctx.beginPath();
        ctx.arc(starX, starY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  };

  const syncStats = () => {
    // Already synced dynamically through loop callbacks
  };

  return (
    <div 
      className="relative flex flex-col w-full h-full items-center justify-center p-2 rounded-sm bg-[#0a0a0a] overflow-hidden"
      ref={containerRef}
    >
      {/* HUD Panel overlaid on top of game */}
      <GameHUD
        day={stats.day}
        remainingInHerdWave={stats.herdTotal}
        activeFollowers={activeHUD.followersActiveCount}
        stamina={activeHUD.stamina}
        health={activeHUD.health}
        onTogglePause={() => {
          const s = stateRef.current;
          s.currentWaveActive = !s.currentWaveActive;
        }}
        onRestartWave={() => {
          playSelect();
          setupLevel();
        }}
        onResetGame={onResetGame}
        onSprintPressDown={() => {
          setActiveHUD(prev => ({ ...prev, isSprinting: true }));
        }}
        onSprintPressUp={() => {
          setActiveHUD(prev => ({ ...prev, isSprinting: false }));
        }}
        isSprinting={activeHUD.isSprinting}
        minHerdDistance={activeHUD.minHerdDistance}
      />

      {/* Primary Canvas with interaction listeners */}
      <canvas
        ref={canvasRef}
        width={1200}
        height={675}
        onClick={handleCanvasInteraction}
        onTouchStart={handleCanvasInteraction}
        onMouseMove={(e) => {
          // Track movements optionally for stone tracking previews
          const canvas = canvasRef.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const s = stateRef.current;
          s.targetInput = {
            x: ((e.clientX - rect.left) / rect.width) * 1200,
            y: ((e.clientY - rect.top) / rect.height) * 675,
          };
        }}
        className="w-full h-auto aspect-[16/9] bg-[#0d0d0d] border border-[#2a2a2a] rounded-sm max-w-[1200px] shadow-2xl transition-all cursor-crosshair select-none"
      />

      {activeHUD.isClimbingCliff && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-950/95 border border-red-700/60 rounded-sm text-red-100 font-mono text-[10px] tracking-widest uppercase animate-bounce pointer-events-none shadow-xl flex items-center gap-1.5 z-20">
          <span className="text-red-500 animate-pulse">⚠️</span> Impassable Mud Cliff! Swim to Green Exit Ramps!
        </div>
      )}

      {activeHUD.isCrowded && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-amber-950/90 border border-amber-600/50 rounded-sm text-amber-100 font-mono text-[10px] tracking-widest uppercase pointer-events-none shadow-xl flex items-center gap-1 z-20">
          <span className="text-amber-500 animate-pulse">🏃‍♂️</span> Stuck in Herd Stampede Crowd! Speed Slowed!
        </div>
      )}

      {playerDeathMessage && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0a0a0a]/95 p-6 text-center select-none">
          <div className="max-w-md bg-[#0d0d0d] border border-red-950/40 rounded p-8 flex flex-col items-center shadow-2xl relative">
            {/* Subtle red background glow */}
            <div className="absolute -top-16 -left-16 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />

            <h2 className="font-display text-2xl font-light tracking-widest text-red-500 uppercase pb-2">
              {playerDeathTitle}
            </h2>
            
            <p className="text-sm text-white/70 leading-relaxed font-sans mt-2 mb-8 px-2">
              {playerDeathMessage}
            </p>

            <button
              onClick={() => {
                if (pendingDeathAction) {
                  pendingDeathAction();
                } else {
                  onGameOver(stateRef.current.waveCrossedCount, stateRef.current.waveLostCount);
                }
              }}
              className="px-8 py-3.5 rounded-sm bg-[#a34d4d] hover:bg-[#b85b5b] font-sans text-xs font-semibold tracking-[0.2em] uppercase text-white shadow-md active:scale-[0.98] transition-all cursor-pointer inline-flex items-center justify-center gap-2 border-0"
            >
              CONTINUE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
