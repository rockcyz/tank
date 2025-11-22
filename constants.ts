
import { LevelConfig, WeaponType, TankConfig } from './types';

// Dynamic canvas size - responsive design
export const MAP_WIDTH = 1600;
export const MAP_HEIGHT = 1200;
export const RIVER_HEIGHT = 250;
export const FPS = 60;

export const OBSTACLE_HP = 200;

export const TANK_MODELS: TankConfig[] = [
  {
    id: 'sherman',
    name: 'M4 谢尔曼',
    description: '经典的二战老兵。装备标准穿甲弹，性能均衡。',
    weapon: WeaponType.STANDARD,
    // New URL: M4 Sherman at Latrun
    imageUrl: 'https://pic1.imgdb.cn/item/692068d13203f7be001d5a4a.jpg',
    stats: { power: 5, armor: 5, speed: 6 },
    visual: { bodyColor: '#5A6330', turretColor: '#4B5428', barrelLen: 30, turretShape: 'tall', hasSkirts: false, camo: false }
  },
  {
    id: 'tiger1',
    name: '虎式坦克',
    description: '二战传奇重坦。装备88毫米火炮与厚重装甲，移动堡垒。',
    weapon: WeaponType.HEAVY,
    // Reuse heavy tank image as placeholder
    imageUrl: 'https://pic1.imgdb.cn/item/692074873203f7be001d7b28.jpg', 
    stats: { power: 9, armor: 9, speed: 3 },
    visual: { bodyColor: '#686c5e', turretColor: '#505446', barrelLen: 42, turretShape: 'round', hasSkirts: false, camo: false }
  },
  {
    id: 'challenger2',
    name: '挑战者 2',
    description: '坚不可摧的堡垒。配备高爆破甲弹。',
    weapon: WeaponType.HEAVY,
    // Keep working URL
    imageUrl: 'https://pic1.imgdb.cn/item/692068d13203f7be001d5a49.jpg',
    stats: { power: 8, armor: 10, speed: 4 },
    visual: { bodyColor: '#C2B280', turretColor: '#AFA070', barrelLen: 45, turretShape: 'box', hasSkirts: true, camo: false }
  },
  {
    id: 'chieftain',
    name: '酋长式',
    description: '重型火炮平台。使用重型炮弹。',
    weapon: WeaponType.HEAVY,
    // New URL: Chieftain at Bovington
    imageUrl: 'https://pic1.imgdb.cn/item/692068d13203f7be001d5a50.jpg',
    stats: { power: 9, armor: 7, speed: 3 },
    visual: { bodyColor: '#4d5d33', turretColor: '#3d4a28', barrelLen: 50, turretShape: 'round', hasSkirts: true, camo: true }
  },
  {
    id: 'abrams',
    name: 'M1A2 艾布拉姆斯',
    description: '现代陆战之王。使用高速贫铀穿甲弹。',
    weapon: WeaponType.AP_SABOT,
    // New URL: M1A1 at Fort Hood (Cleaner URL)
    imageUrl: 'https://pic1.imgdb.cn/item/692068d13203f7be001d5a4c.jpg',
    stats: { power: 8, armor: 8, speed: 8 },
    visual: { bodyColor: '#D2B48C', turretColor: '#C1A37A', barrelLen: 45, turretShape: 'angular', hasSkirts: true, camo: false }
  },
  {
    id: 'renault',
    name: '雷诺 FT',
    description: '坦克鼻祖。装备速射机关炮。',
    weapon: WeaponType.RAPID,
    // New URL: Renault at Ordnance Museum
    imageUrl: 'https://pic1.imgdb.cn/item/692068d13203f7be001d5a4e.jpg',
    stats: { power: 3, armor: 3, speed: 4 }, 
    visual: { bodyColor: '#5D4C35', turretColor: '#4C3E28', barrelLen: 15, turretShape: 'tall', hasSkirts: false, camo: false }
  },
  {
    id: 'stuart',
    name: 'M3 斯图亚特',
    description: '轻型侦察坦克。高射速火炮适合游击。',
    weapon: WeaponType.RAPID,
    // New URL: M3 Stuart at Fort Knox
    imageUrl: 'https://pic1.imgdb.cn/item/692068403203f7be001d585e.jpg',
    stats: { power: 4, armor: 4, speed: 10 },
    visual: { bodyColor: '#556B2F', turretColor: '#485C26', barrelLen: 25, turretShape: 'box', hasSkirts: false, camo: false }
  },
  {
    id: 't90',
    name: 'T-90 主战坦克',
    description: '发射炮射导弹，威力巨大。',
    weapon: WeaponType.MISSILE,
    // New URL: T-90A Parade 2013
    imageUrl: 'https://pic1.imgdb.cn/item/692068403203f7be001d5861.jpg',
    stats: { power: 8, armor: 7, speed: 7 },
    visual: { bodyColor: '#3E4F32', turretColor: '#2F3F25', barrelLen: 45, turretShape: 'round', hasSkirts: true, camo: true }
  },
  {
    id: 't64',
    name: 'T-64',
    description: '苏系精锐。标准125mm滑膛炮。',
    weapon: WeaponType.STANDARD,
    // New URL: T-64AK Kiev 2014
    imageUrl: 'https://pic1.imgdb.cn/item/692068403203f7be001d5862.jpg',
    stats: { power: 7, armor: 6, speed: 6 },
    visual: { bodyColor: '#4F5D3E', turretColor: '#3F4D30', barrelLen: 42, turretShape: 'round', hasSkirts: false, camo: false }
  },
  {
    id: 't72',
    name: 'T-72',
    description: '可靠的钢铁洪流。装备重型炮弹。',
    weapon: WeaponType.HEAVY,
    // New URL: T-72 B3 Biathlon
    imageUrl: 'https://pic1.imgdb.cn/item/692068403203f7be001d5860.jpg',
    stats: { power: 6, armor: 6, speed: 6 },
    visual: { bodyColor: '#354A21', turretColor: '#2A3C18', barrelLen: 40, turretShape: 'round', hasSkirts: true, camo: false }
  },
  {
    id: 'leopard1',
    name: '豹 1',
    description: '极致机动，配备精准的脱壳穿甲弹。',
    weapon: WeaponType.AP_SABOT,
    // New URL: Leopard 1A4 Munster
    imageUrl: 'https://pic1.imgdb.cn/item/692068403203f7be001d5864.jpg',
    stats: { power: 9, armor: 4, speed: 9 },
    visual: { bodyColor: '#4B573E', turretColor: '#3C4730', barrelLen: 48, turretShape: 'angular', hasSkirts: false, camo: true }
  },
  {
    id: 'ztz99',
    name: 'ZTZ-99 式',
    description: '东方巨龙。配备激光压制与高能火炮。',
    weapon: WeaponType.LASER,
    // New URL: Type 99A Parade
    imageUrl: 'https://pic1.imgdb.cn/item/692069293203f7be001d5b8d.jpg',
    stats: { power: 9, armor: 9, speed: 7 },
    visual: { bodyColor: '#5D762B', turretColor: '#4D661B', barrelLen: 50, turretShape: 'angular', hasSkirts: true, camo: true }
  }
];

// Range is estimated in pixels. Speed * Duration
// Increased duration to improve range across the larger map (1600px width)
export const WEAPON_CONFIG = {
  [WeaponType.BULLET]:   { cooldown: 30, damage: 15, speed: 10, duration: 100, color: '#FFD700', range: 1000 }, 
  [WeaponType.STANDARD]: { cooldown: 25, damage: 30, speed: 14, duration: 120, color: '#FFD700', range: 1680 }, 
  [WeaponType.RAPID]:    { cooldown: 8,  damage: 10, speed: 16, duration: 100, color: '#FFA500', range: 1600 }, 
  [WeaponType.HEAVY]:    { cooldown: 50, damage: 60, speed: 12, duration: 140, color: '#FF4500', range: 1680 }, 
  [WeaponType.AP_SABOT]: { cooldown: 40, damage: 45, speed: 22, duration: 90, color: '#00FFFF', range: 1980 }, 
  [WeaponType.LASER]:    { cooldown: 70, damage: 90, speed: 30, duration: 15,  color: '#00FF00', range: 450 }, 
  [WeaponType.MISSILE]:  { cooldown: 55, damage: 70, speed: 9,  duration: 200, color: '#FF00FF', range: 1800 }, 
  [WeaponType.SHOTGUN]:  { cooldown: 45, damage: 12, speed: 14, duration: 60, color: '#FF8C00', range: 840 }, 
  [WeaponType.VENOM]:    { cooldown: 10, damage: 80, speed: 24, duration: 90, color: '#39FF14', range: 2160 }, // Special Venom Cannon
};

export const LEVELS: LevelConfig[] = [
  // Phase 1: Recon
  { levelNumber: 1, enemyCount: 5, spawnRate: 120, enemyTypes: ['basic'], title: "河岸侦察" },
  { levelNumber: 2, enemyCount: 8, spawnRate: 110, enemyTypes: ['basic', 'fast'], title: "遭遇战" },
  { levelNumber: 3, enemyCount: 10, spawnRate: 100, enemyTypes: ['basic', 'tank'], title: "重装突袭" },
  { levelNumber: 4, enemyCount: 12, spawnRate: 90, enemyTypes: ['fast', 'tank'], title: "封锁线" },
  { levelNumber: 5, enemyCount: 15, spawnRate: 80, enemyTypes: ['basic', 'fast', 'tank'], title: "机械虫群" },
  
  // Phase 2: Escalation
  { levelNumber: 6, enemyCount: 1, spawnRate: 1, enemyTypes: ['boss'], boss: true, title: "精英机甲" },
  { levelNumber: 7, enemyCount: 18, spawnRate: 75, enemyTypes: ['basic', 'fast'], title: "火力过载" },
  { levelNumber: 8, enemyCount: 16, spawnRate: 70, enemyTypes: ['tank', 'fast'], title: "装甲核心" },
  { levelNumber: 9, enemyCount: 22, spawnRate: 60, enemyTypes: ['basic', 'fast', 'tank'], title: "全面战争" },
  { levelNumber: 10, enemyCount: 2, spawnRate: 300, enemyTypes: ['boss'], boss: true, title: "双子星" },

  // Phase 3: Fortress
  { levelNumber: 11, enemyCount: 25, spawnRate: 60, enemyTypes: ['basic', 'fast'], title: "钢铁迷宫" },
  { levelNumber: 12, enemyCount: 20, spawnRate: 55, enemyTypes: ['tank', 'tank', 'fast'], title: "重型防线" },
  { levelNumber: 13, enemyCount: 28, spawnRate: 50, enemyTypes: ['basic', 'tank'], title: "围城" },
  { levelNumber: 14, enemyCount: 30, spawnRate: 45, enemyTypes: ['fast', 'fast', 'tank'], title: "极速突围" },
  { levelNumber: 15, enemyCount: 35, spawnRate: 40, enemyTypes: ['basic', 'fast', 'tank'], title: "蜂巢" },

  // Phase 4: Apocalypse
  { levelNumber: 16, enemyCount: 3, spawnRate: 400, enemyTypes: ['boss'], boss: true, title: "泰坦陨落" },
  { levelNumber: 17, enemyCount: 40, spawnRate: 35, enemyTypes: ['basic', 'fast'], title: "无尽浪潮" },
  { levelNumber: 18, enemyCount: 30, spawnRate: 30, enemyTypes: ['tank', 'boss'], title: "地狱火" },
  { levelNumber: 19, enemyCount: 50, spawnRate: 25, enemyTypes: ['basic', 'fast', 'tank'], title: "末日审判" },
  { levelNumber: 20, enemyCount: 1, spawnRate: 1, enemyTypes: ['boss'], boss: true, title: "最终决战" },
];
