import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MAP_WIDTH, MAP_HEIGHT, LEVELS, WEAPON_CONFIG, TANK_MODELS, OBSTACLE_HP, RIVER_HEIGHT } from '../constants';
import { Tank, Projectile, Enemy, WeaponType, Particle, Obstacle, Battleship, Turret, PowerUp, FloatingText } from '../types';
import { playShootSound, playExplosionSound, playImpactSound, playCollisionSound } from '../services/audioService';
import { Pause, Play, LogOut, Zap, Skull, Crosshair, ShieldAlert } from 'lucide-react';

interface GameCanvasProps {
  onGameOver: (score: number, win: boolean) => void;
  selectedTankId: string;
  currentLevel: number;
  onLevelComplete: () => void;
  onExitLevel: () => void;
  minimapRef?: React.RefObject<HTMLCanvasElement | null>;
  onQuestUpdate?: (destroyed: number, total: number) => void;
}

const mulberry32 = (a: number) => {
    return () => {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  onGameOver, 
  selectedTankId, 
  currentLevel, 
  onLevelComplete,
  onExitLevel,
  minimapRef,
  onQuestUpdate
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number>(0); // Track animation frame ID
  
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(100);
  const [shipHp, setShipHp] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const [shockwaves, setShockwaves] = useState(2);
  // Use ref for HUD updates to avoid re-rendering whole canvas on every tick
  const venomHudRef = useRef<{timer: number, cooldown: number}>({timer: 0, cooldown: 0});
  const [venomStatus, setVenomStatus] = useState({ active: false, timer: 0, cooldown: 0 });

  // Mobile Control State References (to avoid re-renders)
  const joystickRef = useRef<{
      move: { active: boolean, x: number, y: number, originX: number, originY: number, currentX: number, currentY: number, id: number | null },
      aim: { active: boolean, x: number, y: number, originX: number, originY: number, currentX: number, currentY: number, id: number | null },
      isFiring: boolean
  }>({
      move: { active: false, x: 0, y: 0, originX: 0, originY: 0, currentX: 0, currentY: 0, id: null },
      aim: { active: false, x: 0, y: 0, originX: 0, originY: 0, currentX: 0, currentY: 0, id: null },
      isFiring: false
  });

  // Game State Refs
  const gameState = useRef({
    player: {
      id: 'player',
      modelId: selectedTankId,
      x: MAP_WIDTH / 2,
      y: MAP_HEIGHT - 200,
      width: 46,
      height: 64,
      rotation: -Math.PI / 2,
      turretRotation: -Math.PI / 2,
      color: '#4d5d33',
      active: true,
      hp: 100,
      maxHp: 100,
      weapon: WeaponType.STANDARD,
      damageBoost: 1.0,
      cooldown: 0,
      speed: 4,
      originalWeapon: WeaponType.STANDARD,
      venomState: { active: false, timer: 0, cooldown: 0 }
    } as Tank,
    camera: { x: 0, y: 0 },
    obstacles: [] as Obstacle[],
    projectiles: [] as Projectile[],
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    powerUps: [] as PowerUp[],
    floatingTexts: [] as FloatingText[],
    battleship: {
      id: 'boss-ship',
      x: MAP_WIDTH / 2,
      y: 100, 
      width: 600,
      height: 120,
      rotation: 0,
      color: '#555',
      active: true,
      sunk: false,
      vx: 0.5,
      moveTimer: 0,
      turrets: [] as Turret[]
    } as Battleship,
    keys: {
      w: false, a: false, s: false, d: false, v: false,
      ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false, Space: false,
    },
    mouse: { x: 0, y: 0, down: false },
    levelFrameCount: 0,
    enemiesSpawned: 0,
    isRunning: true,
    shockwavesAvailable: 2,
    score: 0, // Track score internally to avoid closure staleness
    lastCollisionTime: 0 // Cooldown for collision sound/effect
  });

  // Responsive Canvas
  useEffect(() => {
      const handleResize = () => {
          if (containerRef.current) {
              const { clientWidth, clientHeight } = containerRef.current;
              // Only update if changed significantly to avoid loop
              setCanvasSize(prev => {
                  if (prev.width !== clientWidth || prev.height !== clientHeight) {
                       return { width: clientWidth, height: clientHeight };
                  }
                  return prev;
              });
          }
      };

      handleResize();
      
      // Use ResizeObserver for robust container resizing
      const resizeObserver = new ResizeObserver(() => handleResize());
      if (containerRef.current) resizeObserver.observe(containerRef.current);

      return () => {
          resizeObserver.disconnect();
      };
  }, []);

  // Initialize Background Canvas
  useEffect(() => {
    if (!bgCanvasRef.current) {
        const bg = document.createElement('canvas');
        bg.width = MAP_WIDTH;
        bg.height = MAP_HEIGHT;
        const ctx = bg.getContext('2d');
        if (ctx) {
            // Water
            ctx.fillStyle = '#2b6e8f';
            ctx.fillRect(0, 0, MAP_WIDTH, RIVER_HEIGHT);
            ctx.fillStyle = '#3582a6';
            for(let i=0; i<200; i++) {
              ctx.fillRect(Math.random()*MAP_WIDTH, Math.random()*RIVER_HEIGHT, Math.random()*40+20, 2);
            }

            // Land
            ctx.fillStyle = '#3B3024'; 
            ctx.fillRect(0, RIVER_HEIGHT, MAP_WIDTH, MAP_HEIGHT - RIVER_HEIGHT);
            
            ctx.fillStyle = '#4e4230';
            ctx.fillRect(0, RIVER_HEIGHT, MAP_WIDTH, 20);

            // Ground texture
            for(let i=0; i<30000; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? '#463A2E' : '#2F251A';
                ctx.fillRect(Math.random() * MAP_WIDTH, RIVER_HEIGHT + Math.random() * (MAP_HEIGHT - RIVER_HEIGHT), 4, 4);
            }
            
            // Craters / Pockmarks (Reduced count and no overlap)
            const craters: {x: number, y: number, r: number}[] = [];
            let attempts = 0;
            while(craters.length < 25 && attempts < 200) {
                attempts++;
                const cx = Math.random() * MAP_WIDTH;
                const cy = RIVER_HEIGHT + 50 + Math.random() * (MAP_HEIGHT - RIVER_HEIGHT - 50);
                const r = 20 + Math.random() * 30;
                
                // Check overlap
                let overlap = false;
                for (const c of craters) {
                    if (Math.hypot(cx - c.x, cy - c.y) < (r + c.r + 10)) {
                        overlap = true;
                        break;
                    }
                }
                
                if (!overlap) {
                    craters.push({x: cx, y: cy, r});
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI*2);
                    ctx.fillStyle = '#241C12';
                    ctx.fill();
                    ctx.strokeStyle = '#4A3F30';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }
        }
        bgCanvasRef.current = bg;
    }
  }, []);

  // Initialize Level Data
  const initLevel = useCallback(() => {
    const state = gameState.current;
    state.enemies = [];
    state.projectiles = [];
    state.particles = [];
    state.powerUps = [];
    state.floatingTexts = [];
    state.levelFrameCount = 0;
    state.enemiesSpawned = 0;
    state.shockwavesAvailable = 2;
    state.score = 0;
    state.isRunning = true;
    state.lastCollisionTime = 0;
    
    setScore(0);
    setShockwaves(2);
    setIsPaused(false);
    
    // Always restore battleship in the next level (every level start)
    // This ensures if it was beaten, it comes back.
    state.battleship.sunk = false;
    state.battleship.x = MAP_WIDTH / 2; // Reset position
    state.battleship.vx = 0.5; // Reset speed
    
    const turretHpMult = 1 + (currentLevel * 0.2);
    state.battleship.turrets = [
      { id: 't1', x: 0, y: 0, width: 30, height: 30, rotation: 0, color: '#444', active: true, hp: 2000 * turretHpMult, maxHp: 2000 * turretHpMult, cooldown: 0, destroyed: false, angleOffset: -200 },
      { id: 't2', x: 0, y: 0, width: 40, height: 40, rotation: 0, color: '#444', active: true, hp: 3000 * turretHpMult, maxHp: 3000 * turretHpMult, cooldown: 0, destroyed: false, angleOffset: 0 },
      { id: 't3', x: 0, y: 0, width: 30, height: 30, rotation: 0, color: '#444', active: true, hp: 2000 * turretHpMult, maxHp: 2000 * turretHpMult, cooldown: 0, destroyed: false, angleOffset: 180 },
    ];
    
    if (onQuestUpdate) {
        onQuestUpdate(0, 3);
    }

    const tankConfig = TANK_MODELS.find(t => t.id === selectedTankId) || TANK_MODELS[0];
    state.player.modelId = selectedTankId;
    state.player.maxHp = 100 + (tankConfig.stats.armor * 20);
    state.player.hp = state.player.maxHp;
    state.player.speed = 2 + (tankConfig.stats.speed * 0.4);
    state.player.weapon = tankConfig.weapon; 
    state.player.originalWeapon = tankConfig.weapon;
    state.player.damageBoost = 1.0;
    // Reset venom state on new level or keep it? Let's reset to avoid exploits
    state.player.venomState = { active: false, timer: 0, cooldown: 0 };

    setHp(state.player.maxHp);
    setVenomStatus({active: false, timer: 0, cooldown: 0});
    state.player.x = MAP_WIDTH / 2;
    state.player.y = MAP_HEIGHT - 150;
    state.player.rotation = -Math.PI/2; 

    const rng = mulberry32(currentLevel * 9999);
    const obs: Obstacle[] = [];
    
    let mapStyle = 'wilderness';
    if (currentLevel >= 6 && currentLevel <= 10) mapStyle = 'city';
    else if (currentLevel >= 11 && currentLevel <= 15) mapStyle = 'fortress';
    else if (currentLevel >= 16) mapStyle = 'maze';

    if (mapStyle === 'wilderness') {
        const count = 25 + rng() * 10;
        for (let i = 0; i < count; i++) {
            const w = 80 + rng() * 40;
            const h = 60 + rng() * 40;
            const x = rng() * (MAP_WIDTH - w);
            const y = RIVER_HEIGHT + 50 + rng() * (MAP_HEIGHT - RIVER_HEIGHT - 100);
            if (Math.hypot(x - MAP_WIDTH/2, y - (MAP_HEIGHT-150)) < 250) continue;

            const variantRand = rng();
            let variant: Obstacle['variant'] = 'concrete';
            if (variantRand < 0.5) variant = 'brick';
            else if (variantRand < 0.8) variant = 'facility';

            obs.push({
                id: `obs-${i}`, x, y, width: w, height: h, rotation: 0, color: '#555', active: true,
                type: 'wall', variant, hp: OBSTACLE_HP, maxHp: OBSTACLE_HP, destructible: true, deathTimer: 0
            });
        }
    } else if (mapStyle === 'city') {
        const blockSize = 160;
        for (let x = 50; x < MAP_WIDTH - 50; x += blockSize) {
            for (let y = RIVER_HEIGHT + 50; y < MAP_HEIGHT - 100; y += blockSize) {
                if (rng() > 0.45) continue; 
                if (Math.hypot(x - MAP_WIDTH/2, y - (MAP_HEIGHT-150)) < 300) continue; 

                const variant = rng() > 0.5 ? 'brick' : 'concrete';
                obs.push({
                    id: `city-${x}-${y}`, x, y, width: blockSize - 40, height: blockSize - 40, rotation: 0, color: '#666', active: true,
                    type: 'wall', variant, hp: OBSTACLE_HP * 1.5, maxHp: OBSTACLE_HP * 1.5, destructible: true, deathTimer: 0
                });
            }
        }
    } else if (mapStyle === 'fortress') {
         const count = 30;
         for (let i = 0; i < count; i++) {
            const w = 90;
            const h = 70;
            const x = rng() * (MAP_WIDTH - w);
            const y = RIVER_HEIGHT + 50 + rng() * (MAP_HEIGHT - RIVER_HEIGHT - 100);
            if (Math.hypot(x - MAP_WIDTH/2, y - (MAP_HEIGHT-150)) < 250) continue;

            const isSteel = rng() > 0.6;
            obs.push({
                id: `fort-${i}`, x, y, width: isSteel ? w : 70, height: isSteel ? 60 : 70, rotation: 0, color: isSteel ? '#444' : '#555', active: true,
                type: 'wall', variant: isSteel ? 'concrete' : 'facility', 
                hp: isSteel ? 9999 : OBSTACLE_HP * 2, maxHp: isSteel ? 9999 : OBSTACLE_HP * 2, 
                destructible: !isSteel, deathTimer: 0
            });
         }
    } else if (mapStyle === 'maze') {
        const cellS = 200;
        for (let x = 0; x < MAP_WIDTH; x += cellS) {
            for (let y = RIVER_HEIGHT; y < MAP_HEIGHT; y += cellS) {
                if (Math.hypot(x - MAP_WIDTH/2, y - (MAP_HEIGHT-150)) < 300) continue;
                if (rng() > 0.5) {
                    obs.push({
                        id: `mz-h-${x}-${y}`, x: x, y: y + cellS/2, width: cellS + 20, height: 30, rotation: 0, color: '#333', active: true,
                        type: 'wall', variant: 'concrete', hp: 9999, maxHp: 9999, destructible: false, deathTimer: 0
                    });
                } else {
                     obs.push({
                        id: `mz-v-${x}-${y}`, x: x + cellS/2, y: y, width: 30, height: cellS + 20, rotation: 0, color: '#333', active: true,
                        type: 'wall', variant: 'concrete', hp: 9999, maxHp: 9999, destructible: false, deathTimer: 0
                    });
                }
            }
        }
    }

    state.obstacles = obs;
  }, [currentLevel, selectedTankId, onQuestUpdate]);

  // Initialize Effect (Runs on level change)
  useEffect(() => {
    initLevel();
  }, [initLevel]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
        setIsPaused(p => !p);
        return;
    }
    
    let key = e.key;
    
    // Normalize space
    if (key === ' ') key = 'Space';
    
    // Special handling to ensure Arrow keys are not lowercased
    const specialKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Control', 'Shift', 'Alt', 'Enter'];
    
    // Only lowercase single letters (w, a, s, d, v, etc)
    if (!specialKeys.includes(key) && key.length === 1) {
        key = key.toLowerCase();
    }
    
    if (Object.prototype.hasOwnProperty.call(gameState.current.keys, key)) {
      (gameState.current.keys as any)[key] = true;
    }
  };
  
  const handleKeyUp = (e: KeyboardEvent) => {
    let key = e.key;
    if (key === ' ') key = 'Space';
    
    const specialKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
    if (!specialKeys.includes(key) && key.length === 1) {
        key = key.toLowerCase();
    }
    
    if (Object.prototype.hasOwnProperty.call(gameState.current.keys, key)) {
      (gameState.current.keys as any)[key] = false;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    gameState.current.mouse.x = e.clientX - rect.left;
    gameState.current.mouse.y = e.clientY - rect.top;
  };
  const handleMouseDown = () => { gameState.current.mouse.down = true; };
  const handleMouseUp = () => { gameState.current.mouse.down = false; };

  // --- Touch Controls Logic ---
  const handleTouchStart = (e: React.TouchEvent, type: 'move' | 'aim') => {
      e.preventDefault(); // Prevent default touch behavior (scroll/zoom)
      const touch = e.changedTouches[0];
      // CRITICAL FIX: Use currentTarget to get the bounding box of the JOYSTICK CONTAINER, not the inner knob
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      // Touch coordinates relative to the container
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      if (type === 'move') {
          joystickRef.current.move = {
              active: true,
              id: touch.identifier,
              originX: centerX, originY: centerY,
              currentX: x, currentY: y,
              x: (x - centerX) / (rect.width/2),
              y: (y - centerY) / (rect.height/2)
          };
      } else {
          joystickRef.current.aim = {
              active: true,
              id: touch.identifier,
              originX: centerX, originY: centerY,
              currentX: x, currentY: y,
              x: (x - centerX) / (rect.width/2),
              y: (y - centerY) / (rect.height/2)
          };
      }
  };

  const handleTouchMove = (e: React.TouchEvent, type: 'move' | 'aim') => {
      e.preventDefault();
      const j = type === 'move' ? joystickRef.current.move : joystickRef.current.aim;
      if (!j.active) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === j.id) {
              const touch = e.changedTouches[i];
              // Ensure we reference the container
              const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
              
              // Limit distance to radius
              const dx = touch.clientX - rect.left - j.originX;
              const dy = touch.clientY - rect.top - j.originY;
              const dist = Math.hypot(dx, dy);
              const maxDist = rect.width / 2;
              
              let finalX = dx;
              let finalY = dy;
              
              if (dist > maxDist) {
                  finalX = (dx / dist) * maxDist;
                  finalY = (dy / dist) * maxDist;
              }

              if (type === 'move') {
                   joystickRef.current.move.currentX = j.originX + finalX;
                   joystickRef.current.move.currentY = j.originY + finalY;
                   joystickRef.current.move.x = finalX / maxDist;
                   joystickRef.current.move.y = finalY / maxDist;
              } else {
                   joystickRef.current.aim.currentX = j.originX + finalX;
                   joystickRef.current.aim.currentY = j.originY + finalY;
                   joystickRef.current.aim.x = finalX / maxDist;
                   joystickRef.current.aim.y = finalY / maxDist;
              }
          }
      }
  };

  const handleTouchEnd = (e: React.TouchEvent, type: 'move' | 'aim') => {
      e.preventDefault();
      const j = type === 'move' ? joystickRef.current.move : joystickRef.current.aim;
      for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === j.id) {
              if (type === 'move') {
                  joystickRef.current.move = { ...joystickRef.current.move, active: false, x: 0, y: 0, currentX: j.originX, currentY: j.originY };
              } else {
                  joystickRef.current.aim = { ...joystickRef.current.aim, active: false, x: 0, y: 0, currentX: j.originX, currentY: j.originY };
              }
          }
      }
  };

  const activateVenom = () => {
     // Explicitly enable venom directly in game state to ensure it triggers even if keyup happens too fast
     // or just simulate the key press
     if (!gameState.current.player.venomState.active && gameState.current.player.venomState.cooldown <= 0) {
        gameState.current.keys.v = true;
        // Release key after a short delay to simulate a press
        setTimeout(() => { gameState.current.keys.v = false; }, 200);
     }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const updateScore = (val: number) => {
      gameState.current.score += val;
      setScore(gameState.current.score);
  };

  const spawnParticles = (x: number, y: number, type: 'impact' | 'explosion' | 'rubble' | 'shockwave' | 'smoke', count: number, colorOverride?: string) => {
    const state = gameState.current;
    if (type === 'shockwave') {
        state.particles.push({
            id: Math.random().toString(),
            x, y, width: 10, height: 10, color: colorOverride || '#00FFFF',
            rotation: 0, vx: 0, vy: 0, life: 40, maxLife: 40, active: true,
            growth: 30 // Expand rate
        });
        return;
    }

    for(let i=0; i<count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = type === 'smoke' ? Math.random() * 1 : Math.random() * (type === 'explosion' ? 5 : 2);
      let life = type === 'explosion' ? 30 + Math.random() * 20 : 15 + Math.random() * 10;
      if (type === 'smoke') life = 40 + Math.random() * 20;

      let color = colorOverride || '#fff';
      if (type === 'rubble') color = '#8B7355';
      if (type === 'smoke') color = Math.random() > 0.5 ? '#333' : '#555';

      state.particles.push({
        id: Math.random().toString(),
        x, y,
        width: type === 'smoke' ? Math.random() * 8 + 4 : Math.random() * 4 + 2,
        height: type === 'smoke' ? Math.random() * 8 + 4 : Math.random() * 4 + 2,
        color: color, 
        rotation: Math.random() * Math.PI * 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === 'smoke' ? 0.5 : 0), // Smoke floats up
        life: life,
        maxLife: 50,
        active: true
      });
    }
  };

  const triggerCollisionEffect = (x: number, y: number) => {
      const state = gameState.current;
      const now = Date.now();
      if (now - state.lastCollisionTime > 400) { // Rate limit collision effects
          playCollisionSound();
          spawnParticles(x, y, 'smoke', 4, '#8B7355'); // Brown dust
          state.lastCollisionTime = now;
      }
  };

  const addFloatingText = (x: number, y: number, text: string, color: string) => {
      gameState.current.floatingTexts.push({
          id: Math.random().toString(),
          x, y, text, color, life: 60, vy: -1
      });
  };

  const triggerShockwave = () => {
      const state = gameState.current;
      if (state.shockwavesAvailable > 0 && !isPaused) {
          state.shockwavesAvailable--;
          setShockwaves(state.shockwavesAvailable);
          
          // Visuals
          spawnParticles(state.player.x, state.player.y, 'shockwave', 1, '#00FFFF');
          playExplosionSound(true);

          // Logic: Destroy all VISIBLE enemies
          let hitCount = 0;
          const cam = state.camera;
          const width = canvasRef.current ? canvasRef.current.width : 800;
          const height = canvasRef.current ? canvasRef.current.height : 600;
          
          state.enemies.forEach(e => {
              if (!e.active) return;
              // Simple viewport check
              if (e.x >= cam.x && e.x <= cam.x + width &&
                  e.y >= cam.y && e.y <= cam.y + height) {
                      e.hp = 0;
                      e.active = false;
                      spawnParticles(e.x, e.y, 'explosion', 20);
                      const killScore = e.type === 'boss' ? 500 : 50;
                      updateScore(killScore);
                      addFloatingText(e.x, e.y - 20, `SHOCKWAVE!`, "#00FFFF");
                      hitCount++;
                  }
          });

          if (hitCount > 0) {
             playExplosionSound(true);
          }
      }
  };

  // --- Drawing Helpers ---
  
  const drawPlayerTank = (ctx: CanvasRenderingContext2D, tank: Tank) => {
    const config = TANK_MODELS.find(t => t.id === tank.modelId) || TANK_MODELS[0];
    const { visual } = config;
    const isVenom = tank.venomState.active;

    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.save();
    ctx.rotate(tank.rotation + Math.PI / 2);
    
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-24, -28, 48, 60);

    // Tracks
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-24, -30, 12, 60); 
    ctx.fillRect(12, -30, 12, 60);
    
    ctx.fillStyle = '#333';
    const treadOffset = (Date.now() / 50) % 6;
    for(let i=-30 + treadOffset; i<30; i+=6) {
        ctx.fillRect(-24, i, 12, 2);
        ctx.fillRect(12, i, 12, 2);
    }

    // Hull
    ctx.fillStyle = isVenom ? '#2a4a2a' : visual.bodyColor; // Darker green if venom
    ctx.beginPath();
    ctx.moveTo(-12, -28); ctx.lineTo(12, -28);
    ctx.lineTo(12, 28); ctx.lineTo(-12, 28);
    ctx.fill();
    
    // Venom Glow Effect
    if (isVenom) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#39FF14';
        ctx.strokeStyle = '#39FF14';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(-10, -28, 20, 10);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-8, 18, 16, 8);
    for(let i=18; i<26; i+=2) {
         ctx.fillStyle = '#111';
         ctx.fillRect(-6, i, 12, 1);
    }

    if (visual.hasSkirts) {
        ctx.fillStyle = isVenom ? '#2a4a2a' : visual.bodyColor;
        ctx.fillRect(-26, -25, 4, 50);
        ctx.fillRect(22, -25, 4, 50);
    }

    if (visual.camo) {
       ctx.fillStyle = 'rgba(0,0,0,0.3)';
       ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(5, -5); ctx.lineTo(-5, 10); ctx.fill();
       ctx.beginPath(); ctx.moveTo(8, 10); ctx.lineTo(0, 20); ctx.lineTo(12, 25); ctx.fill();
    }
    
    ctx.restore(); 

    ctx.rotate(tank.turretRotation);
    ctx.translate(0, 0); 

    // Barrel
    ctx.fillStyle = '#222';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.fillRect(0, -4, visual.barrelLen, 8); 
    ctx.strokeRect(0, -4, visual.barrelLen, 8);

    if (visual.barrelLen > 40) {
        ctx.fillStyle = '#111';
        ctx.fillRect(visual.barrelLen - 2, -5, 4, 10);
    }
    
    ctx.fillStyle = isVenom ? '#1a3a1a' : visual.turretColor;
    if (visual.turretShape === 'round') {
        ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI*2); ctx.fill();
        ctx.strokeRect(-10, -8, 15, 16); 
    } else if (visual.turretShape === 'box') {
        ctx.fillRect(-12, -14, 24, 28);
        ctx.strokeRect(-12, -14, 24, 28);
    } else if (visual.turretShape === 'angular') {
        ctx.beginPath();
        ctx.moveTo(10, -8); ctx.lineTo(20, 0); ctx.lineTo(10, 8); 
        ctx.lineTo(-15, 12); ctx.lineTo(-20, 0); ctx.lineTo(-15, -12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    } else { 
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillRect(-8, -8, 16, 16);
    }

    if (isVenom) {
        ctx.fillStyle = '#39FF14';
        ctx.beginPath(); ctx.arc(0,0, 5, 0, Math.PI*2); ctx.fill();
    } else {
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath(); ctx.arc(-5, -5, 5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#4a5a3a';
        ctx.beginPath(); ctx.arc(-5, -5, 3, 0, Math.PI*2); ctx.fill();
    }

    ctx.restore();
  };

  const drawEnemyTank = (ctx: CanvasRenderingContext2D, enemy: Enemy) => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.save();
      ctx.rotate(enemy.rotation + Math.PI / 2);

      const w = enemy.width;
      const h = enemy.height;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-w/2 + 2, -h/2 + 2, w, h);

      let mainColor = '#4a3b32'; 
      let detailColor = '#2f241e';
      
      if (enemy.type === 'fast') {
          mainColor = '#6b4c35'; detailColor = '#422d1e';
      } else if (enemy.type === 'tank') {
          mainColor = '#2d3e30'; detailColor = '#1a261d';
      } else if (enemy.type === 'boss') {
          mainColor = '#3d1e1e'; detailColor = '#1f0d0d';
      }

      ctx.fillStyle = '#111';
      ctx.fillRect(-w/2, -h/2, w/4, h);
      ctx.fillRect(w/4, -h/2, w/4, h);

      ctx.fillStyle = mainColor;
      ctx.fillRect(-w/4, -h/2 + 2, w/2, h - 4);
      ctx.fillStyle = detailColor;
      ctx.fillRect(-w/6, h/4, w/3, h/6);
      ctx.restore();

      const angleToPlayer = Math.atan2(gameState.current.player.y - enemy.y, gameState.current.player.x - enemy.x);
      ctx.rotate(angleToPlayer);

      ctx.fillStyle = '#111';
      ctx.fillRect(0, -3, w * 0.6, 6);

      ctx.fillStyle = enemy.type === 'tank' ? detailColor : mainColor;
      if (enemy.type === 'tank') {
          ctx.fillRect(-w/4, -w/4, w/2, w/2); 
      } else if (enemy.type === 'fast') {
          ctx.beginPath(); ctx.arc(0,0, w/4, 0, Math.PI*2); ctx.fill(); 
      } else {
          ctx.beginPath(); ctx.arc(0,0, w/3, 0, Math.PI*2); ctx.fill(); 
      }
      
      ctx.fillStyle = 'red';
      ctx.fillRect(0, -1, 4, 2);

      ctx.rotate(-angleToPlayer); 
      ctx.translate(0, -h);
      ctx.fillStyle = 'black';
      ctx.fillRect(-15, -5, 30, 4);
      ctx.fillStyle = 'red';
      ctx.fillRect(-15, -5, 30 * (enemy.hp / enemy.maxHp), 4);

      ctx.restore();
  };

  const drawObstacle = (ctx: CanvasRenderingContext2D, obs: Obstacle) => {
     const zHeight = 35; // Standard visual height
     const isBurning = (obs.deathTimer && obs.deathTimer > 0) || false;
     
     ctx.save();
     ctx.translate(obs.x, obs.y);

     // Shadow
     if (!isBurning) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(10, 10, obs.width, obs.height);
     }

     // Determine Colors based on style
     let wallColor = '#555';
     let roofColor = '#444';
     let detailColor = '#333';
     let windowColor = '#4a5e6b'; // Dark unlit window

     if (obs.variant === 'brick') {
        // House style
        wallColor = '#8B4513'; // SaddleBrown
        roofColor = '#A0522D'; // Sienna
        detailColor = '#654321';
        windowColor = '#ADD8E6'; // LightBlue (lit)
     } else if (obs.variant === 'concrete') {
        // Warehouse style
        wallColor = '#708090'; // SlateGray
        roofColor = '#778899'; // LightSlateGray
        detailColor = '#2F4F4F';
     } else if (obs.variant === 'facility') {
        // Factory style
        wallColor = '#5F9EA0'; // CadetBlue
        roofColor = '#556B2F'; // DarkOliveGreen
        detailColor = '#2F4F4F';
        windowColor = '#FFD700'; // Gold (active)
     }

     if (isBurning) {
         wallColor = '#2a2a2a';
         roofColor = '#1a1a1a';
         detailColor = '#000';
         windowColor = '#cc5500'; // Fire inside
         
         // Shake effect
         ctx.translate(Math.random()*2-1, Math.random()*2-1);
     }

     // Draw Front Face (Side)
     ctx.fillStyle = wallColor;
     ctx.fillRect(0, obs.height - zHeight, obs.width, zHeight);
     
     // Draw Roof
     if (obs.variant === 'brick') {
         // Pitched Roof
         ctx.fillStyle = roofColor;
         ctx.beginPath();
         ctx.moveTo(0, -zHeight);
         ctx.lineTo(obs.width, -zHeight);
         ctx.lineTo(obs.width, obs.height - zHeight);
         ctx.lineTo(0, obs.height - zHeight);
         ctx.fill();

         // Add roof ridge
         ctx.fillStyle = 'rgba(255,255,255,0.1)';
         ctx.beginPath();
         ctx.moveTo(0, -zHeight);
         ctx.lineTo(obs.width/2, -zHeight - 15); // Peak
         ctx.lineTo(obs.width, -zHeight);
         ctx.lineTo(obs.width, obs.height - zHeight);
         ctx.lineTo(obs.width/2, obs.height - zHeight - 15); // Peak bottom
         ctx.lineTo(0, obs.height - zHeight);
         ctx.fill();
         
         // Windows on front
         ctx.fillStyle = windowColor;
         if (obs.width > 50) {
             ctx.fillRect(10, obs.height - zHeight + 10, 15, 15);
             ctx.fillRect(obs.width - 25, obs.height - zHeight + 10, 15, 15);
         } else {
             ctx.fillRect(obs.width/2 - 7, obs.height - zHeight + 10, 14, 15);
         }

     } else if (obs.variant === 'concrete') {
         // Flat roof with skylights
         ctx.fillStyle = roofColor;
         ctx.fillRect(0, -zHeight, obs.width, obs.height);
         
         // Warehouse lines
         ctx.fillStyle = detailColor;
         for(let i=10; i<obs.width; i+=20) {
             ctx.fillRect(i, obs.height - zHeight, 2, zHeight);
         }
         
         // Large Door
         ctx.fillStyle = '#222';
         ctx.fillRect(obs.width/2 - 15, obs.height - 25, 30, 25);

         // Skylights
         ctx.fillStyle = '#87CEEB';
         ctx.globalAlpha = 0.3;
         ctx.fillRect(10, -zHeight + 10, obs.width-20, 10);
         ctx.fillRect(10, obs.height - zHeight - 20, obs.width-20, 10);
         ctx.globalAlpha = 1.0;

     } else {
         // Factory
         ctx.fillStyle = roofColor;
         ctx.fillRect(0, -zHeight, obs.width, obs.height);
         
         // Smokestacks
         ctx.fillStyle = '#333';
         ctx.fillRect(obs.width - 20, -zHeight - 20, 10, 30);
         ctx.fillRect(obs.width - 35, -zHeight - 15, 8, 25);
         
         // Hazard stripes
         ctx.fillStyle = 'yellow';
         ctx.fillRect(0, obs.height - 5, obs.width, 5);
         ctx.fillStyle = 'black';
         for(let i=0; i<obs.width; i+=10) {
             ctx.beginPath(); ctx.moveTo(i, obs.height-5); ctx.lineTo(i+5, obs.height); ctx.lineTo(i, obs.height); ctx.fill();
         }

         if (!isBurning && obs.active) {
             // Static smoke (simple visual)
             ctx.fillStyle = 'rgba(200,200,200,0.5)';
             ctx.beginPath(); ctx.arc(obs.width-15, -zHeight-25, 5, 0, Math.PI*2); ctx.fill();
         }
     }

     // Damage overlay
     if (isBurning) {
         ctx.fillStyle = 'rgba(255, 69, 0, 0.3)';
         ctx.fillRect(0, -zHeight - 20, obs.width, obs.height + zHeight + 20);
     } else {
         const damageRatio = obs.hp / obs.maxHp;
         if (damageRatio < 1 && obs.destructible) {
             ctx.strokeStyle = '#111';
             ctx.lineWidth = 1;
             ctx.beginPath();
             ctx.moveTo(10, -zHeight + 10); ctx.lineTo(25, -zHeight + 30);
             ctx.stroke();
         }
     }

     ctx.restore();
  };

  const drawBattleship = (ctx: CanvasRenderingContext2D, ship: Battleship) => {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    
    if (ship.sunk) {
        ctx.globalAlpha = 0.5;
    }

    // Hull
    ctx.fillStyle = ship.color;
    ctx.beginPath();
    const w = ship.width;
    const h = ship.height;
    
    ctx.moveTo(-w/2, -h/3);
    ctx.lineTo(w/2 - 50, -h/2);
    ctx.lineTo(w/2, 0);
    ctx.lineTo(w/2 - 50, h/2);
    ctx.lineTo(-w/2, h/3);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#333';
    ctx.fillRect(-w/2 + 40, -h/4, w - 120, h/2);

    ship.turrets.forEach(t => {
        ctx.save();
        ctx.translate(t.angleOffset, 0);
        
        if (t.destroyed) {
            ctx.fillStyle = '#222';
            ctx.beginPath(); ctx.arc(0, 0, t.width/2, 0, Math.PI*2); ctx.fill();
        } else {
            ctx.rotate(t.rotation);
            ctx.fillStyle = '#111';
            ctx.fillRect(0, -5, t.width * 1.2, 10);
            
            ctx.fillStyle = t.color;
            ctx.beginPath(); ctx.arc(0, 0, t.width/2, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.restore();
    });

    ctx.restore();
  };

  const checkRectCollision = (r1: {x: number, y: number, w: number, h: number}, r2: {x: number, y: number, w: number, h: number}) => {
    return (r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y);
  };

  const loop = useCallback(() => {
    if (!gameState.current.isRunning || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    const state = gameState.current;
    const player = state.player;
    const levelConfig = LEVELS[currentLevel - 1] || LEVELS[LEVELS.length - 1];
    const tankConfig = TANK_MODELS.find(t => t.id === player.modelId) || TANK_MODELS[0];

    // 0. Venom Logic
    // Activation
    if (state.keys.v) {
        if (!player.venomState.active && player.venomState.cooldown <= 0) {
             player.venomState.active = true;
             // Random 2s to 10s (120 to 600 frames at 60fps)
             player.venomState.timer = 120 + Math.random() * 480; 
             player.originalWeapon = player.weapon; // Backup current
             player.weapon = WeaponType.VENOM;
             addFloatingText(player.x, player.y - 40, "VENOM ACTIVATE!", "#39FF14");
        }
    }

    // Timer Updates
    if (player.venomState.active) {
        player.venomState.timer--;
        if (player.venomState.timer <= 0) {
            player.venomState.active = false;
            player.venomState.cooldown = 600; // 10s cooldown
            player.weapon = player.originalWeapon; // Restore
            addFloatingText(player.x, player.y - 40, "SYSTEM OVERHEAT", "#ff4444");
        }
    } else if (player.venomState.cooldown > 0) {
        player.venomState.cooldown--;
    }

    // Update React state for HUD (throttled usually, but simple here)
    if (state.levelFrameCount % 10 === 0) {
        setVenomStatus({
            active: player.venomState.active,
            timer: player.venomState.timer,
            cooldown: player.venomState.cooldown
        });
    }


    // 1. Player Movement
    let dx = 0; let dy = 0;
    if (state.keys.w || state.keys.ArrowUp) dy -= 1;
    if (state.keys.s || state.keys.ArrowDown) dy += 1;
    if (state.keys.a || state.keys.ArrowLeft) dx -= 1;
    if (state.keys.d || state.keys.ArrowRight) dx += 1;
    
    // Mobile Joystick Override
    if (joystickRef.current.move.active) {
        dx = joystickRef.current.move.x;
        dy = joystickRef.current.move.y;
    }

    if (dx !== 0 || dy !== 0) {
      // Normalize if both inputs active (clamped to speed later)
      // Joystick is already -1 to 1. Keyboard is -1, 0, 1.
      const length = Math.sqrt(dx * dx + dy * dy);
      // Cap length at 1 for joystick
      const norm = length > 1 ? 1 : length;
      
      const vx = (dx / length) * player.speed * norm;
      const vy = (dy / length) * player.speed * norm;
      
      const targetHullAngle = Math.atan2(dy, dx);
      player.rotation = targetHullAngle; 

      // Check Unit Collision (Player vs Enemies)
      const checkUnitCollision = (nextX: number, nextY: number, isPlayer: boolean) => {
          const unitRadius = 35; // Approximate radius for collision
          
          // vs Enemies
          for(const e of state.enemies) {
              if (!e.active) continue;
              if (isPlayer) {
                  const dist = Math.hypot(nextX - e.x, nextY - e.y);
                  if (dist < unitRadius + e.width/2) return true; // Collide
              } else {
                  // For enemy vs enemy, handled in enemy loop
              }
          }
          
          // vs Player (if this was enemy logic calling)
          if (!isPlayer) {
              const dist = Math.hypot(nextX - player.x, nextY - player.y);
              if (dist < unitRadius + 30) return true;
          }
          return false;
      };

      const nextX = Math.max(25, Math.min(MAP_WIDTH - 25, player.x + vx));
      let canMoveX = true;
      let collisionOccurred = false;
      
      // Obstacle Check X
      const pRectX = { x: nextX - 20, y: player.y - 20, w: 40, h: 40 };
      for (const obs of state.obstacles) {
          if (!obs.active || (obs.deathTimer && obs.deathTimer > 0)) continue; // Ignore burning buildings
          if (checkRectCollision(pRectX, { x: obs.x, y: obs.y, w: obs.width, h: obs.height })) { 
              canMoveX = false; 
              collisionOccurred = true;
              break; 
          }
      }
      // Unit Check X
      if (canMoveX && checkUnitCollision(nextX, player.y, true)) {
          canMoveX = false;
          collisionOccurred = true;
      }

      if (canMoveX) {
          player.x = nextX;
      } else if (collisionOccurred) {
          triggerCollisionEffect(nextX + (dx > 0 ? 20 : -20), player.y);
      }

      const nextY = Math.max(RIVER_HEIGHT + 25, Math.min(MAP_HEIGHT - 25, player.y + vy));
      let canMoveY = true;
      collisionOccurred = false;
      
      // Obstacle Check Y
      const pRectY = { x: player.x - 20, y: nextY - 20, w: 40, h: 40 };
      for (const obs of state.obstacles) {
           if (!obs.active || (obs.deathTimer && obs.deathTimer > 0)) continue; // Ignore burning buildings
          if (checkRectCollision(pRectY, { x: obs.x, y: obs.y, w: obs.width, h: obs.height })) { 
              canMoveY = false; 
              collisionOccurred = true;
              break; 
          }
      }
      // Unit Check Y
      if (canMoveY && checkUnitCollision(player.x, nextY, true)) {
          canMoveY = false;
          collisionOccurred = true;
      }

      if (canMoveY) {
          player.y = nextY;
      } else if (collisionOccurred) {
          triggerCollisionEffect(player.x, nextY + (dy > 0 ? 20 : -20));
      }
    }
    
    // Camera
    let targetCamX = player.x - width / 2;
    let targetCamY = player.y - height / 2;
    
    // Clamp camera logic updated to handle resizable canvas
    if (width > MAP_WIDTH) {
        targetCamX = -(width - MAP_WIDTH) / 2;
    } else {
        targetCamX = Math.max(0, Math.min(targetCamX, MAP_WIDTH - width));
    }

    if (height > MAP_HEIGHT) {
        targetCamY = -(height - MAP_HEIGHT) / 2;
    } else {
        targetCamY = Math.max(0, Math.min(targetCamY, MAP_HEIGHT - height));
    }
    
    state.camera.x += (targetCamX - state.camera.x) * 0.1;
    state.camera.y += (targetCamY - state.camera.y) * 0.1;

    // Aiming
    if (joystickRef.current.aim.active) {
        player.turretRotation = Math.atan2(joystickRef.current.aim.y, joystickRef.current.aim.x);
    } else {
        const worldMouseX = state.mouse.x + state.camera.x;
        const worldMouseY = state.mouse.y + state.camera.y;
        player.turretRotation = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);
    }

    // 2. Shooting
    if (player.cooldown > 0) player.cooldown--;
    
    const isShooting = state.mouse.down || state.keys.Space || joystickRef.current.isFiring;

    if (isShooting && player.cooldown <= 0) {
       const config = WEAPON_CONFIG[player.weapon];
       player.cooldown = config.cooldown;
       playShootSound(player.weapon);
       
       const fireProjectile = (offsetAngle = 0) => {
         const angle = player.turretRotation + offsetAngle; 
         const muzzleX = player.x + Math.cos(angle)*45;
         const muzzleY = player.y + Math.sin(angle)*45;
         spawnParticles(muzzleX, muzzleY, 'impact', 3);
         
         const damageMod = (tankConfig.stats.power / 5) * player.damageBoost; 

         let duration = config.duration;
         if (player.weapon === WeaponType.VENOM) {
             // Random duration between 2s (120 frames) and 10s (600 frames)
             duration = 120 + Math.random() * 480;
         }

         state.projectiles.push({
           id: Math.random().toString(),
           x: muzzleX, y: muzzleY,
           width: player.weapon === WeaponType.MISSILE ? 20 : (player.weapon === WeaponType.VENOM ? 12 : 6),
           height: player.weapon === WeaponType.MISSILE ? 20 : (player.weapon === WeaponType.VENOM ? 18 : 14),
           rotation: angle,
           color: config.color,
           active: true,
           type: player.weapon,
           damage: config.damage * damageMod,
           vx: Math.cos(angle) * config.speed,
           vy: Math.sin(angle) * config.speed,
           duration: duration * (player.weapon === WeaponType.LASER ? 1 : 1.5), 
           maxDuration: duration,
           source: 'player'
         });
       };

       if (player.weapon === WeaponType.SHOTGUN) {
         fireProjectile(0); fireProjectile(0.12); fireProjectile(-0.12);
       } else {
         fireProjectile(0);
       }
    }

    // 3. Battleship Logic
    const ship = state.battleship;
    if (!ship.sunk) {
        // Battleship Movement
        ship.x += ship.vx;
        ship.moveTimer--;
        
        if (ship.moveTimer <= 0 || ship.x < ship.width/2 || ship.x > MAP_WIDTH - ship.width/2) {
            ship.moveTimer = 120 + Math.random() * 200; // Change every 2-5 seconds
            
            // Randomize speed and direction
            const dir = Math.random() > 0.5 ? 1 : -1;
            const speed = 0.5 + Math.random() * 1.5; // 0.5 to 2.0
            ship.vx = dir * speed;
            
            // Keep in bounds logic
            if (ship.x < ship.width/2) {
                ship.x = ship.width/2;
                ship.vx = Math.abs(speed);
            } else if (ship.x > MAP_WIDTH - ship.width/2) {
                ship.x = MAP_WIDTH - ship.width/2;
                ship.vx = -Math.abs(speed);
            }
        }

        let activeTurrets = 0;
        let totalShipHp = 0;
        let maxShipHp = 0;

        ship.turrets.forEach(t => {
            maxShipHp += t.maxHp;
            totalShipHp += Math.max(0, t.hp);
            if (t.destroyed) return;
            activeTurrets++;

            const tx = ship.x + t.angleOffset;
            const ty = ship.y;
            const angleToPlayer = Math.atan2(player.y - ty, player.x - tx);
            const diff = angleToPlayer - t.rotation;
            t.rotation += Math.max(-0.02, Math.min(0.02, diff));

            if (t.cooldown > 0) t.cooldown--;
            if (t.cooldown <= 0 && Math.abs(diff) < 0.5 && Math.hypot(player.x-tx, player.y-ty) < 800) {
                t.cooldown = 120 + Math.random() * 100;
                playShootSound('BULLET');
                state.projectiles.push({
                   id: Math.random().toString(),
                   x: tx + Math.cos(t.rotation)*40, y: ty + Math.sin(t.rotation)*40,
                   width: 10, height: 10, rotation: t.rotation, color: '#ff4444', active: true,
                   type: WeaponType.BULLET, damage: 25,
                   vx: Math.cos(t.rotation) * 8, vy: Math.sin(t.rotation) * 8,
                   duration: 50, maxDuration: 50, source: 'boss'
                });
            }
        });
        
        setShipHp(Math.floor((totalShipHp / maxShipHp) * 100));

        if (activeTurrets === 0 && !ship.sunk) {
            ship.sunk = true;
            playExplosionSound(true);
            for(let i=0; i<20; i++) {
                setTimeout(() => {
                   spawnParticles(ship.x - 200 + Math.random()*400, ship.y, 'explosion', 20);
                }, i * 100);
            }
            updateScore(5000);
            addFloatingText(ship.x, ship.y, "战舰已沉默!", "#FFD700");
        }
    }

    // 4. Enemies Spawning
    state.levelFrameCount++;
    if (state.enemiesSpawned < levelConfig.enemyCount && state.levelFrameCount % levelConfig.spawnRate === 0) {
      const type = levelConfig.enemyTypes[Math.floor(Math.random() * levelConfig.enemyTypes.length)];
      let ex = 0, ey = 0;
      let validSpawn = false;
      
      for(let i=0; i<10; i++) {
          ex = Math.random() * MAP_WIDTH;
          ey = RIVER_HEIGHT + 50 + Math.random() * (MAP_HEIGHT - RIVER_HEIGHT - 100);
          // Don't spawn too close to player
          if (Math.hypot(ex - player.x, ey - player.y) > 500) { 
             // Don't spawn on obstacles
             let onObs = false;
             for(const o of state.obstacles) {
                 if(o.active && ex > o.x && ex < o.x+o.width && ey > o.y && ey < o.y+o.height) { onObs = true; break; }
             }
             if (!onObs) { validSpawn = true; break; }
          }
      }

      if (validSpawn) {
          let eHp = 30; let eSpeed = 2; let eSize = 30;
          if (type === 'tank') { eHp = 80; eSpeed = 1.2; eSize = 44; }
          if (type === 'fast') { eHp = 20; eSpeed = 3.0; eSize = 28; }
          if (type === 'boss') { eHp = 600; eSpeed = 0.8; eSize = 70; }

          const levelScaler = 1 + (currentLevel * 0.1);
          eHp *= levelScaler;

          state.enemies.push({
            id: Math.random().toString(),
            x: ex, y: ey, width: eSize, height: eSize, rotation: 0, color: 'red', active: true,
            hp: eHp, maxHp: eHp, type, speed: eSpeed,
            cooldown: Math.random() * 100, turretRotation: 0
          });
          state.enemiesSpawned++;
      }
    }

    // Move Enemies & Shoot
    state.enemies.forEach((enemy, idx) => {
      const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      enemy.rotation = angle; 
      
      const nextEx = enemy.x + Math.cos(angle) * enemy.speed;
      const nextEy = enemy.y + Math.sin(angle) * enemy.speed;

      let canMove = true;
      const eRect = { x: nextEx - enemy.width/2, y: nextEy - enemy.height/2, w: enemy.width, h: enemy.height };
      
      // Obstacle collision
      for(const obs of state.obstacles) {
          if (!obs.active || (obs.deathTimer && obs.deathTimer > 0)) continue;
           if (checkRectCollision(eRect, { x: obs.x, y: obs.y, w: obs.width, h: obs.height })) { canMove = false; break; }
      }
      // Unit vs Unit collision for Enemies
      if (canMove) {
          // Check vs Player
          if (Math.hypot(nextEx - player.x, nextEy - player.y) < (enemy.width/2 + 30)) canMove = false;
          
          // Check vs other Enemies
          for(let j=0; j<state.enemies.length; j++) {
              if (idx === j) continue;
              const other = state.enemies[j];
              if (!other.active) continue;
              if (Math.hypot(nextEx - other.x, nextEy - other.y) < (enemy.width/2 + other.width/2)) {
                  canMove = false; break;
              }
          }
      }

      if (nextEy < RIVER_HEIGHT) canMove = false;

      if(canMove) { enemy.x = nextEx; enemy.y = nextEy; }

      if (enemy.cooldown > 0) enemy.cooldown--;
      
      if (enemy.cooldown <= 0) {
          const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
          if (dist < 500) { 
              const wConfig = WEAPON_CONFIG[WeaponType.BULLET];
              const duration = wConfig.duration * 0.6; 

              state.projectiles.push({
                  id: Math.random().toString(),
                  x: enemy.x + Math.cos(angle)*30, y: enemy.y + Math.sin(angle)*30,
                  width: 8, height: 8, rotation: angle, color: 'orange', active: true,
                  type: WeaponType.BULLET, damage: 10 + (currentLevel * 1), vx: Math.cos(angle)*6, vy: Math.sin(angle)*6,
                  duration: duration, maxDuration: duration, source: 'enemy'
              });
              playShootSound('BULLET');
              enemy.cooldown = 60 + Math.random() * 120;
          }
      }
    });

    // 5. Powerups Logic
    state.powerUps.forEach(p => {
        p.pulse += 0.1;
        if (Math.hypot(player.x - p.x, player.y - p.y) < 40) {
            p.active = false;
            playShootSound('AP_SABOT'); 
            if (p.effectType === 'HEALTH') {
                const heal = 50;
                player.hp = Math.min(player.maxHp, player.hp + heal);
                setHp(player.hp);
                addFloatingText(player.x, player.y - 20, "+50 HP", "#48bb78");
            } else if (p.effectType === 'DAMAGE') {
                player.damageBoost = 2.0;
                setTimeout(() => { gameState.current.player.damageBoost = 1.0; }, 10000); 
                addFloatingText(player.x, player.y - 20, "火力增强!", "#f56565");
            }
        }
    });
    state.powerUps = state.powerUps.filter(p => p.active);

    // 6. Projectiles Logic
    state.projectiles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.duration--;
      if (p.duration <= 0) p.active = false;
      if (p.x < 0 || p.x > MAP_WIDTH || p.y < 0 || p.y > MAP_HEIGHT) p.active = false;

      for(const obs of state.obstacles) {
          if (!p.active || !obs.active) continue;
          if (obs.deathTimer && obs.deathTimer > 0) continue; // Projectiles pass through burning ruins

          if (p.x > obs.x && p.x < obs.x + obs.width && p.y > obs.y && p.y < obs.y + obs.height) {
              p.active = false;
              spawnParticles(p.x, p.y, 'impact', 3);
              playImpactSound();
              
              if (obs.destructible) {
                  obs.hp -= p.damage;
                  if (obs.hp <= 0) {
                      obs.hp = 0;
                      obs.deathTimer = 120; // Start burning (2 seconds)
                      spawnParticles(obs.x + obs.width/2, obs.y + obs.height/2, 'rubble', 15);
                      playExplosionSound(false);
                      
                      if (Math.random() < 0.2) {
                          const type = Math.random() > 0.5 ? 'HEALTH' : 'DAMAGE';
                          state.powerUps.push({
                              id: Math.random().toString(),
                              x: obs.x + obs.width/2, y: obs.y + obs.height/2,
                              width: 30, height: 30, rotation: 0, color: type === 'HEALTH' ? 'green' : 'red',
                              active: true, effectType: type, pulse: 0
                          });
                      }
                  }
              } else {
                  spawnParticles(p.x, p.y, 'impact', 5, '#ccc');
              }
          }
      }

      if (p.source === 'player' && !ship.sunk && p.y < RIVER_HEIGHT + 50) {
           ship.turrets.forEach(t => {
               if (!p.active || t.destroyed) return;
               const tx = ship.x + t.angleOffset;
               if (Math.hypot(p.x - tx, p.y - ship.y) < 30) { 
                   p.active = false;
                   t.hp -= p.damage;
                   spawnParticles(p.x, p.y, 'impact', 4, 'orange');
                   if (t.hp <= 0) {
                       t.destroyed = true;
                       playExplosionSound(true);
                       spawnParticles(tx, ship.y, 'explosion', 15);
                       updateScore(1000);
                       addFloatingText(tx, ship.y - 20, "+1000", "#ffd700");
                       
                       // Quest Update
                       const destroyedCount = ship.turrets.filter(turret => turret.destroyed).length;
                       if (onQuestUpdate) {
                           onQuestUpdate(destroyedCount, ship.turrets.length);
                       }
                   }
               }
           });
      }

      if (p.source === 'player') {
        state.enemies.forEach(e => {
            if (!p.active || !e.active) return;
            if (Math.hypot(p.x - e.x, p.y - e.y) < (p.width + e.width/2)) {
              e.hp -= p.damage;
              spawnParticles(p.x, p.y, 'impact', 3, 'red');
              if (p.type !== WeaponType.MISSILE && p.type !== WeaponType.LASER && p.type !== WeaponType.VENOM) p.active = false;
              if (e.hp <= 0) {
                e.active = false;
                playExplosionSound(false);
                const killScore = e.type === 'boss' ? 500 : 50;
                updateScore(killScore);
                addFloatingText(e.x, e.y - 10, `+${killScore}`, "#fff");
                spawnParticles(e.x, e.y, 'explosion', 15);
              }
            }
        });
      }

      if (p.source !== 'player') {
          if (Math.hypot(p.x - player.x, p.y - player.y) < 30) {
              p.active = false;
              player.hp -= p.damage / (tankConfig.stats.armor * 0.5); 
              setHp(Math.floor(player.hp));
              spawnParticles(player.x, player.y, 'impact', 5, 'yellow');
              if (player.hp <= 0) {
                  state.isRunning = false;
                  onGameOver(state.score, false);
              }
          }
      }
    });
    
    // Obstacle burning logic
    state.obstacles.forEach(obs => {
        if (obs.deathTimer && obs.deathTimer > 0) {
            obs.deathTimer--;
            if (Math.random() > 0.8) {
                spawnParticles(obs.x + Math.random()*obs.width, obs.y + Math.random()*obs.height, 'smoke', 1);
            }
            if (Math.random() > 0.9) {
                spawnParticles(obs.x + Math.random()*obs.width, obs.y + Math.random()*obs.height, 'impact', 1, 'orange');
            }
            if (obs.deathTimer <= 0) {
                obs.active = false;
            }
        }
    });

    state.floatingTexts.forEach(t => {
        t.y += t.vy;
        t.life--;
    });
    state.floatingTexts = state.floatingTexts.filter(t => t.life > 0);

    state.projectiles = state.projectiles.filter(p => p.active);
    state.enemies = state.enemies.filter(e => e.active);
    state.obstacles = state.obstacles.filter(o => o.active); // Burning obstacles are still active until timer hits 0
    state.particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; 
      if (p.growth) {
          // Shockwave rendering
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(0, 0, p.width/2, 0, Math.PI*2);
          ctx.stroke();
          ctx.restore();
      }
      p.life--;
      if (p.life <= 0) p.active = false;
    });
    state.particles = state.particles.filter(p => p.active);

    if (state.enemiesSpawned >= levelConfig.enemyCount && state.enemies.length === 0) {
      state.isRunning = false;
      onLevelComplete();
    }

    // --- Rendering ---
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(-state.camera.x, -state.camera.y);

    if (bgCanvasRef.current) ctx.drawImage(bgCanvasRef.current, 0, 0);

    state.powerUps.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        const scale = 1 + Math.sin(p.pulse) * 0.1;
        ctx.scale(scale, scale);
        ctx.fillStyle = p.effectType === 'HEALTH' ? '#48bb78' : '#f56565';
        ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.effectType === 'HEALTH' ? '+' : 'UP', 0, 1);
        ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
    });

    drawBattleship(ctx, ship);

    const allEntities = [
        ...state.obstacles.map(o => ({ ...o, type: 'obstacle', sortY: o.y + o.height })),
        ...state.enemies.map(e => ({ ...e, type: 'enemy', sortY: e.y })),
        { ...player, type: 'player', sortY: player.y },
        ...state.projectiles.map(p => ({...p, type: 'projectile', sortY: p.y}))
    ];
    allEntities.sort((a, b) => a.sortY - b.sortY);

    allEntities.forEach((e: any) => {
        if (e.type === 'obstacle') {
            drawObstacle(ctx, e as Obstacle);
        } else if (e.type === 'enemy') {
            drawEnemyTank(ctx, e as Enemy);
        } else if (e.type === 'player') {
            drawPlayerTank(ctx, e);
        } else if (e.type === 'projectile') {
            const p = e as Projectile;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.width/2, 0, Math.PI*2); ctx.fill();
        }
    });

    // Particles
    state.particles.forEach(p => {
      if (!p.growth) {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life / p.maxLife;
          ctx.fillRect(p.x, p.y, p.width, p.height); 
          ctx.globalAlpha = 1.0;
      }
    });

    state.floatingTexts.forEach(t => {
        ctx.fillStyle = t.color;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeText(t.text, t.x, t.y);
        ctx.fillText(t.text, t.x, t.y);
    });

    ctx.restore();

    // --- Minimap Rendering ---
    if (minimapRef?.current) {
        const mCanvas = minimapRef.current;
        const mCtx = mCanvas.getContext('2d');
        
        if (mCtx) {
            const scaleX = mCanvas.width / MAP_WIDTH;
            const scaleY = mCanvas.height / MAP_HEIGHT;

            // Background
            mCtx.fillStyle = '#0f1510'; // Very dark green/black
            mCtx.fillRect(0, 0, mCanvas.width, mCanvas.height);
            
            // River
            mCtx.fillStyle = '#1e3a4a';
            mCtx.fillRect(0, 0, mCanvas.width, RIVER_HEIGHT * scaleY);

            // Obstacles
            mCtx.fillStyle = '#333';
            state.obstacles.forEach(o => {
                 if (!o.active && o.deathTimer !== undefined && o.deathTimer <= 0) return;
                 mCtx.fillRect(o.x * scaleX, o.y * scaleY, o.width * scaleX, o.height * scaleY);
            });

            // Enemies
            state.enemies.forEach(e => {
                 if (!e.active) return;
                 mCtx.fillStyle = e.type === 'boss' ? '#ff0000' : '#ff5555';
                 const size = e.type === 'boss' ? 4 : 2;
                 mCtx.beginPath();
                 mCtx.arc(e.x * scaleX, e.y * scaleY, size, 0, Math.PI*2);
                 mCtx.fill();
            });

            // Battleship
            if (!state.battleship.sunk) {
                 mCtx.fillStyle = '#ff0000';
                 mCtx.fillRect(
                     (state.battleship.x - state.battleship.width/2) * scaleX,
                     (state.battleship.y - state.battleship.height/2) * scaleY,
                     state.battleship.width * scaleX,
                     state.battleship.height * scaleY
                 );
            }

            // Player
            mCtx.fillStyle = '#00ff00';
            mCtx.beginPath();
            mCtx.arc(state.player.x * scaleX, state.player.y * scaleY, 3, 0, Math.PI*2);
            mCtx.fill();
            
            // Viewport Frame
            mCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            mCtx.lineWidth = 1;
            mCtx.strokeRect(state.camera.x * scaleX, state.camera.y * scaleY, width * scaleX, height * scaleY);
        }
    }

    // HUD Gradient
    const grad = ctx.createRadialGradient(width/2, height/2, height/2, width/2, height/2, height);
    grad.addColorStop(0, 'transparent'); grad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = grad; ctx.fillRect(0,0, width, height);
    
    // Request Next Frame
    requestRef.current = requestAnimationFrame(loop);
  }, [currentLevel, onGameOver, onLevelComplete, selectedTankId, canvasSize, onQuestUpdate]);

  // Start/Stop Loop based on Paused State
  useEffect(() => {
    if (!isPaused && gameState.current.isRunning) {
      requestRef.current = requestAnimationFrame(loop);
    }
    return () => {
      if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPaused, loop]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden touch-none select-none">
      <canvas 
        ref={canvasRef} 
        width={canvasSize.width} 
        height={canvasSize.height}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        className="block"
        style={{ width: '100%', height: '100%' }}
      />
      
      {/* Mobile Virtual Controls Layer (Visible on touch screens/smaller screens) */}
      <div className="absolute inset-0 pointer-events-none lg:hidden">
          {/* Left Joystick Zone (Movement) */}
          <div 
            className="absolute bottom-8 left-8 w-32 h-32 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm pointer-events-auto flex items-center justify-center"
            onTouchStart={(e) => handleTouchStart(e, 'move')}
            onTouchMove={(e) => handleTouchMove(e, 'move')}
            onTouchEnd={(e) => handleTouchEnd(e, 'move')}
          >
              <div 
                className="w-12 h-12 rounded-full bg-white/50 shadow-lg"
                style={{ 
                    transform: `translate(${joystickRef.current.move.currentX - joystickRef.current.move.originX}px, ${joystickRef.current.move.currentY - joystickRef.current.move.originY}px)`,
                    transition: joystickRef.current.move.active ? 'none' : 'transform 0.1s ease-out'
                }}
              ></div>
          </div>

           {/* Right Joystick Zone (Aim) */}
           <div 
            className="absolute bottom-8 right-32 w-32 h-32 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm pointer-events-auto flex items-center justify-center"
            onTouchStart={(e) => handleTouchStart(e, 'aim')}
            onTouchMove={(e) => handleTouchMove(e, 'aim')}
            onTouchEnd={(e) => handleTouchEnd(e, 'aim')}
          >
              <Crosshair className="absolute text-white/30 w-16 h-16" />
              <div 
                className="w-12 h-12 rounded-full bg-red-500/50 shadow-lg z-10"
                style={{ 
                    transform: `translate(${joystickRef.current.aim.currentX - joystickRef.current.aim.originX}px, ${joystickRef.current.aim.currentY - joystickRef.current.aim.originY}px)`,
                    transition: joystickRef.current.aim.active ? 'none' : 'transform 0.1s ease-out'
                }}
              ></div>
          </div>

          {/* Fire Button - Bottom Right Corner */}
          <div className="absolute bottom-10 right-4 pointer-events-auto">
               <button 
                 className={`w-20 h-20 rounded-full border-4 shadow-lg transition-transform active:scale-90 flex items-center justify-center ${joystickRef.current.isFiring ? 'bg-red-500 border-red-300' : 'bg-red-600/80 border-red-400'}`}
                 onTouchStart={(e) => { e.preventDefault(); joystickRef.current.isFiring = true; }}
                 onTouchEnd={(e) => { e.preventDefault(); joystickRef.current.isFiring = false; }}
               >
                   <div className="w-12 h-12 rounded-full bg-white/20"></div>
               </button>
          </div>

          {/* Venom Button - Above Fire Button */}
          <div className="absolute bottom-36 right-6 pointer-events-auto">
               <button 
                 className={`w-16 h-16 rounded-full border-2 shadow-lg transition-transform active:scale-90 flex items-center justify-center ${venomStatus.active ? 'bg-[#39FF14] border-white animate-pulse' : (venomStatus.cooldown > 0 ? 'bg-gray-600 border-gray-500 opacity-50' : 'bg-green-700/80 border-green-500')}`}
                 onTouchStart={(e) => { e.preventDefault(); activateVenom(); }}
               >
                   <ShieldAlert className={`w-8 h-8 ${venomStatus.active ? 'text-black' : 'text-white'}`} />
               </button>
          </div>

          {/* Shockwave Button - Above Left Joystick */}
          <div className="absolute bottom-40 left-10 pointer-events-auto">
             <button 
                onClick={triggerShockwave}
                disabled={shockwaves <= 0 || isPaused}
                className={`w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-lg border-2 transition-transform active:scale-95 ${shockwaves > 0 ? 'bg-yellow-600 hover:bg-yellow-500 border-yellow-400 text-white' : 'bg-gray-700 border-gray-600 text-gray-400 grayscale'}`}
            >
                <Zap size={24} className={shockwaves > 0 ? "animate-pulse" : ""} />
                <span className="text-xs font-bold">{shockwaves}</span>
            </button>
          </div>
      </div>

      {/* Pause Overlay */}
      {isPaused && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm z-20">
              <div className="bg-gray-800 p-6 rounded-lg border border-gray-600 flex flex-col gap-4 shadow-2xl min-w-[200px]">
                  <h2 className="text-2xl font-bold text-white text-center mb-2">PAUSED</h2>
                  <button onClick={() => setIsPaused(false)} className="bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded flex items-center justify-center gap-2">
                      <Play size={18} /> 继续游戏
                  </button>
                  <button onClick={onExitLevel} className="bg-red-700 hover:bg-red600 text-white py-2 px-4 rounded flex items-center justify-center gap-2">
                      <LogOut size={18} /> 退出关卡
                  </button>
              </div>
          </div>
      )}

      {/* Controls HUD */}
      <div className="absolute top-0 right-0 p-4 pointer-events-auto">
          <button onClick={() => setIsPaused(!isPaused)} className="bg-gray-900/80 hover:bg-gray-700 p-2 rounded border border-gray-600 text-white">
              {isPaused ? <Play size={24} /> : <Pause size={24} />}
          </button>
      </div>

      {/* Shockwave Button Desktop (Hidden on Mobile) */}
      <div className="absolute bottom-4 right-4 pointer-events-auto hidden lg:block">
          <button 
            onClick={triggerShockwave}
            disabled={shockwaves <= 0 || isPaused}
            className={`w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-lg border-4 transition-transform active:scale-95 ${shockwaves > 0 ? 'bg-yellow-600 hover:bg-yellow-500 border-yellow-400 text-white' : 'bg-gray-700 border-gray-600 text-gray-400 grayscale'}`}
          >
              <Zap size={32} className={shockwaves > 0 ? "animate-pulse" : ""} />
              <span className="text-xs font-bold mt-1">{shockwaves}/2</span>
          </button>
      </div>

      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2 md:gap-4">
          
          {/* Desktop HUD: Bars (Hidden on small/vertical screens) */}
          <div className="hidden lg:block">
              {/* HP Bar */}
              <div className="bg-gray-900/80 p-2 rounded border border-green-800 w-64 backdrop-blur-sm mb-4">
                <div className="flex justify-between text-xs text-green-500 mb-1 uppercase font-mono">
                    <span>装甲状态</span> <span>{Math.max(0, Math.ceil(hp))}</span>
                </div>
                <div className="h-3 bg-gray-800 rounded-sm overflow-hidden">
                    <div className={`h-full ${hp < 30 ? 'bg-red-600 animate-pulse' : 'bg-green-600'}`} style={{ width: `${Math.max(0, (hp / gameState.current.player.maxHp) * 100)}%` }}></div>
                </div>
              </div>
              
              {/* Venom Cannon Status */}
              <div className={`bg-gray-900/80 p-2 rounded border w-64 backdrop-blur-sm transition-colors mb-4 ${venomStatus.active ? 'border-[#39FF14] shadow-[0_0_10px_#39FF14]' : 'border-gray-700'}`}>
                <div className="flex justify-between text-xs mb-1 uppercase font-mono font-bold">
                    <span className={venomStatus.active ? "text-[#39FF14]" : "text-gray-400"}>
                        {venomStatus.active ? '⚠ 毒液炮激活 ⚠' : '毒液系统 [V]'}
                    </span> 
                    <span className="text-gray-300">
                        {venomStatus.active ? `${Math.ceil(venomStatus.timer/60)}s` : (venomStatus.cooldown > 0 ? `CD: ${Math.ceil(venomStatus.cooldown/60)}s` : 'READY')}
                    </span>
                </div>
                <div className="h-3 bg-gray-800 rounded-sm overflow-hidden">
                    {venomStatus.active ? (
                        <div className="h-full bg-[#39FF14]" style={{ width: `${(venomStatus.timer / 600) * 100}%` }}></div>
                    ) : (
                        <div className={`h-full ${venomStatus.cooldown > 0 ? 'bg-red-900' : 'bg-gray-600'}`} style={{ width: venomStatus.cooldown > 0 ? `${100 - (venomStatus.cooldown / 600) * 100}%` : '100%' }}></div>
                    )}
                </div>
              </div>

              {/* Battleship HP */}
              {!gameState.current.battleship.sunk && (
                  <div className="bg-gray-900/80 p-2 rounded border border-red-900 w-64 backdrop-blur-sm">
                    <div className="flex justify-between text-xs text-red-500 mb-1 uppercase font-mono">
                        <span>⚠ 敌方战舰 ⚠</span> <span>{shipHp}%</span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-sm overflow-hidden">
                        <div className="h-full bg-red-600" style={{ width: `${shipHp}%` }}></div>
                    </div>
                  </div>
              )}
          </div>

          {/* Mobile HUD: Compact Text (Visible only on small/vertical screens) */}
          <div className="lg:hidden flex flex-col gap-1 items-start bg-black/60 p-3 rounded backdrop-blur-md border border-white/10">
              <div className={`text-base font-bold font-mono ${hp < 30 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
                  HP: {Math.max(0, Math.ceil(hp))}%
              </div>
              
              {venomStatus.active ? (
                  <div className="text-base font-bold font-mono text-[#39FF14] animate-pulse">
                      毒液: {Math.ceil(venomStatus.timer/60)}s
                  </div>
              ) : (
                  <div className={`text-sm font-bold font-mono ${venomStatus.cooldown > 0 ? 'text-gray-500' : 'text-green-600'}`}>
                      毒液: {venomStatus.cooldown > 0 ? `CD ${Math.ceil(venomStatus.cooldown/60)}` : '就绪'}
                  </div>
              )}

              {!gameState.current.battleship.sunk && (
                  <div className="text-sm font-bold font-mono text-red-500">
                      BOSS: {shipHp}%
                  </div>
              )}
          </div>

        </div>

        <div className="flex flex-col items-end pr-14"> 
           <div className="text-2xl md:text-3xl font-black text-yellow-500 font-mono">{score.toString().padStart(6, '0')}</div>
           <div className="text-xs md:text-lg font-bold text-gray-400 uppercase">区域 {currentLevel} / {LEVELS.length}</div>
        </div>
      </div>
    </div>
  );
};

export default GameCanvas;