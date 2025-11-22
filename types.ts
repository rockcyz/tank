
export enum WeaponType {
  STANDARD = 'STANDARD',   // Balanced (Sherman)
  RAPID = 'RAPID',         // Fast fire, low dmg (Stuart, Renault)
  HEAVY = 'HEAVY',         // Slow fire, high dmg (Chieftain, T72)
  AP_SABOT = 'AP_SABOT',   // Fast velocity, high dmg (Abrams, Leo, Challenger)
  LASER = 'LASER',         // Instant, beam (ZTZ-99)
  MISSILE = 'MISSILE',     // Slow velocity, high dmg (T90)
  BULLET = 'BULLET',       // Generic Enemy Projectile
  SHOTGUN = 'SHOTGUN',     // Spread fire
  VENOM = 'VENOM'          // Special ability
}

export interface GameStats {
  power: number;
  armor: number;
  speed: number;
  description: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface GameObject {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  active: boolean;
}

export interface Obstacle extends GameObject {
  type: 'wall' | 'water'; 
  variant: 'brick' | 'concrete' | 'facility'; // Visual style
  hp: number;
  maxHp: number;
  destructible: boolean;
  deathTimer?: number; // If > 0, obstacle is burning down
}

export interface TankConfig {
  id: string;
  name: string;
  description: string;
  weapon: WeaponType;
  imageUrl: string; // Real photo URL
  stats: {
    power: number;
    armor: number;
    speed: number;
  };
  visual: {
    bodyColor: string;
    turretColor: string;
    barrelLen: number;
    turretShape: 'round' | 'box' | 'angular' | 'tall';
    hasSkirts: boolean;
    camo: boolean;
  }
}

export interface Tank extends GameObject {
  modelId: string;
  hp: number;
  maxHp: number;
  weapon: WeaponType;
  damageBoost: number; // From powerups
  cooldown: number;
  speed: number;
  turretRotation: number; // Separate from hull rotation
  
  // New Venom Cannon Mechanics
  originalWeapon: WeaponType; // Store original weapon when Venom is active
  venomState: {
    active: boolean;
    timer: number;    // Frames remaining for active duration (10s * 60 = 600)
    cooldown: number; // Frames remaining for cooldown (10s * 60 = 600)
  };
}

export interface Turret extends GameObject {
  hp: number;
  maxHp: number;
  cooldown: number;
  destroyed: boolean;
  angleOffset: number;
}

export interface Battleship extends GameObject {
  turrets: Turret[];
  sunk: boolean;
  vx: number; // Velocity X
  moveTimer: number; // Timer to change direction/speed
}

export interface Projectile extends GameObject {
  type: WeaponType;
  vx: number;
  vy: number;
  damage: number;
  duration: number;
  maxDuration: number;
  source: 'player' | 'enemy' | 'boss';
}

export interface Enemy extends GameObject {
  hp: number;
  maxHp: number;
  type: 'basic' | 'fast' | 'tank' | 'boss';
  speed: number;
  cooldown: number; // Fire cooldown
  turretRotation: number;
}

export interface Particle extends GameObject {
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  color: string;
  growth?: number; // If present, particle grows in size (shockwave)
}

export type PowerUpType = 'HEALTH' | 'DAMAGE' | 'SPEED';

export interface PowerUp extends GameObject {
  effectType: PowerUpType;
  pulse: number; // For animation
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  vy: number;
}

export interface LevelConfig {
  levelNumber: number;
  enemyCount: number;
  spawnRate: number;
  enemyTypes: ('basic' | 'fast' | 'tank' | 'boss')[];
  boss?: boolean;
  title: string;
}
