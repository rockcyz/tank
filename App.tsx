
import React, { useState, useRef, useEffect, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import { WeaponType } from './types';
import { LEVELS, WEAPON_CONFIG, TANK_MODELS } from './constants';
import { ChevronRight, RefreshCw, Target, User } from 'lucide-react';
import { generateAuthorAvatar } from './services/geminiService';

enum AppState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.MENU);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [selectedTankId, setSelectedTankId] = useState<string>(TANK_MODELS[0].id);
  const [authorAvatar, setAuthorAvatar] = useState<string | null>(null);
  const [questProgress, setQuestProgress] = useState({ current: 0, total: 3 });
  const minimapRef = useRef<HTMLCanvasElement>(null);

  // Load Author Avatar on Mount
  useEffect(() => {
      const loadAvatar = async () => {
          // Simple check to avoid re-fetching if we already have it (though component mount resets state)
          // In a real app we might cache this in localStorage to save API calls.
          const avatar = await generateAuthorAvatar();
          if (avatar) setAuthorAvatar(avatar);
      };
      loadAvatar();
  }, []);

  const startGame = () => {
    setCurrentLevel(1);
    setScore(0);
    setAppState(AppState.PLAYING);
  };

  const handleLevelComplete = () => {
    if (currentLevel >= LEVELS.length) {
      setAppState(AppState.VICTORY);
    } else {
      setAppState(AppState.LEVEL_COMPLETE);
    }
  };

  const handleNextLevel = () => {
    setCurrentLevel(prev => prev + 1);
    setAppState(AppState.PLAYING);
  };

  const handleExitLevel = () => {
      setAppState(AppState.MENU);
  };

  const handleGameOver = (finalScore: number, win: boolean) => {
    setScore(finalScore);
    setAppState(win ? AppState.VICTORY : AppState.GAME_OVER);
  };

  // Wrap in useCallback to ensure stable reference, preventing GameCanvas from re-initializing level
  const handleQuestUpdate = useCallback((destroyed: number, total: number) => {
      setQuestProgress({ current: destroyed, total });
  }, []);

  const getWeaponName = (type: WeaponType) => {
    switch(type) {
      case WeaponType.STANDARD: return "标准穿甲弹";
      case WeaponType.RAPID: return "速射机关炮";
      case WeaponType.HEAVY: return "重型高爆弹";
      case WeaponType.AP_SABOT: return "脱壳穿甲弹";
      case WeaponType.LASER: return "激光压制";
      case WeaponType.MISSILE: return "炮射导弹";
      case WeaponType.BULLET: return "普通弹药";
      case WeaponType.VENOM: return "毒液加农炮";
      default: return type;
    }
  };

  const renderMenu = () => (
    <div className="flex flex-col h-screen bg-[#121212] text-gray-200 overflow-hidden relative">
      <header className="bg-[#1a1a1a] p-4 border-b border-gray-700 flex justify-between items-center shadow-lg z-10">
          <div>
              <h1 className="text-2xl md:text-3xl font-black text-[#8b9bb4] uppercase tracking-tighter">天蝎行动 <span className="text-yellow-600">II</span></h1>
              <p className="text-xs text-gray-500 tracking-widest">装甲指挥官：机库检修</p>
          </div>
          <button 
            onClick={startGame}
            className="bg-yellow-700 hover:bg-yellow-600 text-white text-lg font-bold py-2 px-8 rounded shadow-lg uppercase tracking-wider transition-transform active:scale-95"
          >
            出击
          </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pb-20">
        <div className="w-full max-w-[1800px] mx-auto">
            <h2 className="text-xl font-bold text-gray-400 mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-yellow-500"/> 选择你的载具
            </h2>
            
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
                {TANK_MODELS.map((tank) => {
                    const isSelected = selectedTankId === tank.id;
                    const weaponName = getWeaponName(tank.weapon);
                    return (
                        <div 
                            key={tank.id}
                            onClick={() => setSelectedTankId(tank.id)}
                            className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all group ${isSelected ? 'bg-[#2d3748] border-yellow-500 shadow-[0_0_15px_rgba(236,201,75,0.3)]' : 'bg-[#222] border-gray-700 hover:border-gray-500'}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className={`font-bold text-lg ${isSelected ? 'text-yellow-400' : 'text-gray-300'}`}>{tank.name}</h3>
                                {isSelected && <div className="w-3 h-3 bg-yellow-500 rounded-full shadow-[0_0_5px_orange]"></div>}
                            </div>
                            
                            {/* Visual Preview (Real Image) */}
                            <div className="h-40 w-full bg-[#000] rounded mb-4 overflow-hidden relative border border-gray-800 group-hover:border-gray-500 transition-colors">
                                <img 
                                  src={tank.imageUrl} 
                                  alt={tank.name}
                                  className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (target.getAttribute('data-tried-fallback') === 'true') return;
                                    
                                    target.setAttribute('data-tried-fallback', 'true');
                                    if (target.src.endsWith('.webp')) {
                                        target.src = target.src.replace('.webp', '.jpg');
                                    } else if (target.src.endsWith('.jpg')) {
                                        target.src = target.src.replace('.jpg', '.webp');
                                    }
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                                <div className="absolute bottom-2 left-2 text-xs font-mono text-gray-300 text-shadow">
                                    MK-{tank.id.toUpperCase().slice(0,3)}
                                </div>
                            </div>
                            
                            <div className="mb-3 flex items-center gap-2">
                                <span className="text-[10px] uppercase bg-gray-800 text-gray-400 px-1 rounded border border-gray-700">Weapon System</span>
                                <span className="text-xs font-bold text-yellow-500">{weaponName}</span>
                            </div>

                            <p className="text-base text-gray-100 mb-4 h-14 line-clamp-3 leading-snug font-medium">{tank.description}</p>

                            <div className="space-y-2">
                                <div className="flex items-center text-xs font-mono">
                                    <span className="w-12 text-red-400">火力</span>
                                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-600" style={{ width: `${tank.stats.power * 10}%` }}></div>
                                    </div>
                                </div>
                                <div className="flex items-center text-xs font-mono">
                                    <span className="w-12 text-blue-400">装甲</span>
                                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-600" style={{ width: `${tank.stats.armor * 10}%` }}></div>
                                    </div>
                                </div>
                                <div className="flex items-center text-xs font-mono">
                                    <span className="w-12 text-green-400">机动</span>
                                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-600" style={{ width: `${tank.stats.speed * 10}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
      </div>
      
      {/* Author Badge */}
      <div className="absolute bottom-6 right-6 flex items-center gap-3 bg-gray-900/90 p-2 pr-4 rounded-full border border-gray-700 shadow-xl backdrop-blur-sm z-20 transition-all hover:scale-105 hover:border-yellow-600">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-800 border-2 border-yellow-600 relative shrink-0">
              {authorAvatar ? (
                  <img src={authorAvatar} alt="Allen" className="w-full h-full object-cover" />
              ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                      <User size={20} className="animate-pulse"/>
                  </div>
              )}
          </div>
          <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider leading-tight">Designed by</span>
              <span className="text-lg font-bold text-yellow-500 leading-tight font-sans">Allen</span>
          </div>
      </div>

    </div>
  );

  const renderGame = () => {
    // Get current tank info for HUD
    const tank = TANK_MODELS.find(t => t.id === selectedTankId) || TANK_MODELS[0];
    const weaponName = getWeaponName(tank.weapon);

    return (
      <div className="flex flex-col md:flex-row h-screen bg-[#121212] overflow-hidden select-none">
        {/* Main Game Area - Takes remaining space, min-h-0 for flex scrolling fix */}
        <div className="flex-1 relative overflow-hidden bg-black order-1 md:order-1 min-h-0">
          <GameCanvas 
            onGameOver={handleGameOver} 
            selectedTankId={selectedTankId}
            currentLevel={currentLevel}
            onLevelComplete={handleLevelComplete}
            onExitLevel={handleExitLevel}
            minimapRef={minimapRef}
            onQuestUpdate={handleQuestUpdate}
          />
        </div>

        {/* HUD / Sidebar - Bottom on mobile, Right on desktop */}
        <div className="w-full md:w-[300px] flex-none bg-[#222] border-t md:border-t-0 md:border-l border-gray-700 flex flex-col gap-2 md:gap-4 p-2 md:p-4 order-2 md:order-2 z-10 shadow-xl">
          <h3 className="text-gray-400 font-bold text-center border-b border-gray-700 pb-2 tracking-widest text-sm hidden md:block">作战参数</h3>
          
          <div className="flex md:flex-col gap-2 md:gap-4 overflow-x-auto md:overflow-visible">
              <div className="bg-[#1a1a1a] p-3 rounded border border-gray-800 relative overflow-hidden min-w-[150px] md:min-w-0 flex-1 md:flex-none">
                <img 
                src={tank.imageUrl} 
                className="absolute inset-0 w-full h-full object-cover opacity-20" 
                alt="bg"
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.getAttribute('data-tried-fallback') === 'true') return;
                    
                    target.setAttribute('data-tried-fallback', 'true');
                    if (target.src.endsWith('.webp')) {
                        target.src = target.src.replace('.webp', '.jpg');
                    } else if (target.src.endsWith('.jpg')) {
                        target.src = target.src.replace('.jpg', '.webp');
                    }
                }}
                />
                <div className="relative z-10">
                    <p className="text-xs text-gray-500 uppercase mb-1">当前载具</p>
                    <p className="text-white font-bold text-sm whitespace-nowrap">{tank.name}</p>
                </div>
              </div>

              <div className="bg-[#1a1a1a] p-3 rounded border border-gray-800 min-w-[150px] md:min-w-0 flex-1 md:flex-none">
                <p className="text-xs text-gray-500 uppercase mb-1">武器系统</p>
                <p className="text-yellow-500 font-bold text-sm whitespace-nowrap">{weaponName}</p>
              </div>
          </div>

          {/* Minimap Display Area */}
          <div className="bg-[#1a1a1a] p-1 rounded border border-red-900/50 relative aspect-[4/3] shadow-inner hidden md:block">
             <p className="absolute top-2 left-2 text-[10px] text-gray-400 uppercase font-mono z-10 pointer-events-none bg-black/50 px-1 rounded">TACTICAL RADAR</p>
             <canvas 
               ref={minimapRef} 
               width={300} 
               height={225} 
               className="w-full h-full object-contain bg-[#0f1510]"
             />
             <div className="absolute inset-0 border border-red-900/30 pointer-events-none"></div>
             {/* Crosshair overlay */}
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                 <div className="w-full h-px bg-red-500"></div>
             </div>
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                 <div className="h-full w-px bg-red-500"></div>
             </div>
          </div>

          <div className="bg-[#1a1a1a] p-4 rounded-sm mt-auto border border-gray-800 hidden md:block">
            <h4 className="text-yellow-700 text-xs font-bold mb-2 uppercase tracking-widest">任务目标</h4>
            <p className="text-gray-400 text-xs font-mono mb-2">1. 摧毁敌方装甲单位</p>
            <p className="text-red-400 text-xs font-mono font-bold animate-pulse">
                2. 摧毁河岸战舰炮塔 ({questProgress.current}/{questProgress.total})
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderGameOver = (victory: boolean) => (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">
       <div className={`p-8 rounded text-center max-w-md w-full border-2 ${victory ? 'bg-gray-900 border-yellow-600' : 'bg-gray-900 border-red-900'}`}>
         <h2 className={`text-4xl font-black mb-2 tracking-tighter ${victory ? 'text-yellow-500' : 'text-red-600'}`}>
           {victory ? '全面胜利' : '行动失败'}
         </h2>
         <div className="text-6xl mb-6 mt-4">{victory ? '🚢💥' : '☠️'}</div>
         <p className="text-white text-3xl font-bold mb-8 font-mono">SCORE: {score}</p>
         <p className="text-gray-500 mb-8 text-sm">
             {victory ? "敌方战舰已沉没，制河权已夺取！" : "天蝎号已被击毁..."}
         </p>
         <button 
           onClick={() => setAppState(AppState.MENU)}
           className="bg-gray-800 hover:bg-gray-700 text-gray-200 text-lg font-bold py-3 px-8 rounded w-full shadow-lg flex items-center justify-center gap-2 border border-gray-600 uppercase"
         >
           <RefreshCw className="w-5 h-5" /> 返回机库
         </button>
       </div>
    </div>
  );

  return (
    <div className="font-sans select-none text-gray-100">
      {appState === AppState.MENU && renderMenu()}
      {appState === AppState.PLAYING && renderGame()}
      {appState === AppState.LEVEL_COMPLETE && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-[#2d2d2d] p-8 rounded border border-gray-600 text-center max-w-md w-full">
                <h2 className="text-3xl font-black text-yellow-500 mb-4">区域肃清</h2>
                <button onClick={handleNextLevel} className="bg-blue-700 hover:bg-blue-600 text-white text-lg font-bold py-3 px-8 rounded w-full">下一区域 <ChevronRight className="inline"/></button>
            </div>
          </div>
      )}
      {(appState === AppState.GAME_OVER || appState === AppState.VICTORY) && renderGameOver(appState === AppState.VICTORY)}
    </div>
  );
};

export default App;
