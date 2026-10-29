import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/appStore';
import { GameEngine } from '../game/engine/gameEngine';
import { playSoundEffect, configureSoundSettings } from '../utils/soundEffects';
import { selectSessionWords } from '../learning/sessionSelector';
import { logAttempt } from '../learning/attempts';
import { drawPonpi } from '../game/assets/PonpiRenderer';
import { drawMonster } from '../game/assets/MonsterRenderer';
import { drawBullet } from '../game/assets/BulletRenderer';
import { WordTag } from '../components/WordTag';
import { StickerButton } from '../components/StickerButton';
import { GAME_BALANCE } from '../config/balance';
import {
  Heart,
  Pause,
  Play,
  RotateCcw,
  Home,
  HelpCircle,
  Shield,
  Snowflake,
  Sparkles,
  Volume2,
  Delete,
  Crosshair,
  Keyboard,
  Smartphone,
  LayoutGrid,
} from 'lucide-react';
import { DefeatedWordEffect, RunSummary } from '../types/game';
import { GameMapId, getActiveMapId, setActiveMapId, MAP_CONFIGS } from '../config/maps';
import { drawSvgMapBackground } from '../game/assets/SvgMapBackground';
import { useAuth } from '../auth/AuthContext';
import { BASIC_MAP_ID, BASIC_MODE, createGuestInventory, getBasicWords, isBasicSet } from '../config/access';

export const BattlePage: React.FC = () => {
  const { account } = useAuth();
  const {
    selectedSetId,
    selectedMode,
    selectedDifficulty,
    selectedMap,
    setSelectedMap,
    selectedWordCount,
    selectedChunkIndex,
    inventory,
    refreshUserData,
    settings,
    navigateTo,
    setLastRunSummary,
  } = useApp();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const activeMapRef = useRef<GameMapId>(selectedMap);
  activeMapRef.current = selectedMap;

  const handleToggleMap = (nextMap: GameMapId) => {
    setSelectedMap(nextMap);
  };

  const [engineState, setEngineState] = useState<{
    lives: number;
    score: number;
    combo: number;
    wave: number;
    totalWaves: number;
    status: string;
    shieldActive: boolean;
    typedBuffer: string;
    selectedEnemyId: string | null;
  }>({
    lives: 3,
    score: 0,
    combo: 0,
    wave: 1,
    totalWaves: 3,
    status: 'READY',
    shieldActive: false,
    typedBuffer: '',
    selectedEnemyId: null,
  });

  const [skillsRuntime, setSkillsRuntime] = useState<any[]>([]);
  const [enemiesList, setEnemiesList] = useState<any[]>([]);
  const [defeatedEffects, setDefeatedEffects] = useState<DefeatedWordEffect[]>([]);
  const [runVersion, setRunVersion] = useState(0);

  const [roundBanner, setRoundBanner] = useState<{
    round: number;
    phase: 'mobs' | 'boss';
    title: string;
    subtitle: string;
  } | null>({
    round: 1,
    phase: 'mobs',
    title: '✨ VÒNG 1: KHỞI ĐỘNG GÕ TỪ',
    subtitle: 'Nhìn tiếng Anh gõ tiếng Anh (Kèm phụ đề nghĩa)',
  });

  useEffect(() => {
    if (roundBanner) {
      const timer = setTimeout(() => {
        setRoundBanner(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [roundBanner]);

  // Responsive window tracking
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  });
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const [mobileKeyboardMode, setMobileKeyboardMode] = useState<'native' | 'virtual'>('native');
  const isPortrait = windowDimensions.height > windowDimensions.width;
  const isMobile = windowDimensions.width < 900;
  const isMobilePortrait = isMobile && isPortrait;
  const isShortMobile = isMobilePortrait && windowDimensions.height < 720;
  const mobileControlsHeight = isMobilePortrait
    ? (mobileKeyboardMode === 'native'
        ? (isShortMobile ? 122 : 138)
        : Math.min(260, Math.max(224, Math.round(windowDimensions.height * 0.3))))
    : 0;
  const mobileKeyHeight = isShortMobile ? 27 : 32;

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    configureSoundSettings(
      settings?.audioEnabled ?? true,
      settings?.volume ?? 0.8
    );
  }, [settings?.audioEnabled, settings?.volume]);

  // Sound effect handler using dedicated procedural sound engine
  const playSynthSound = (type: any, weaponKind?: string, isFinishing?: boolean) => {
    playSoundEffect(
      type,
      weaponKind,
      isFinishing,
      settingsRef.current?.volume,
      settingsRef.current?.audioEnabled
    );
  };

  // Initialize Game Session
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let isMounted = true;

    const initEngine = async () => {
      if (!account && (!isBasicSet(selectedSetId) || selectedMap !== BASIC_MAP_ID)) {
        navigateTo('account');
        return;
      }
      const loadout = account ? inventory : createGuestInventory();
      const wordCount = selectedWordCount || 30;

      // Select words with Spaced Repetition (SRS) prioritizing due and new words, avoiding mastered words
      const sessionWords = await selectSessionWords(selectedSetId, {
        targetCount: wordCount,
        chunkIndex: selectedChunkIndex !== null ? selectedChunkIndex : undefined,
        chunkSize: wordCount,
      });

      if (!isMounted) return;

      if (sessionWords.length === 0) {
        alert('Bộ từ này chưa có từ vựng nào. Đang quay lại thư viện.');
        navigateTo('library');
        return;
      }

      const engine = new GameEngine({
        setId: selectedSetId,
        mode: selectedMode,
        difficulty: selectedDifficulty,
        words: sessionWords,
        equippedSkills: loadout?.equippedSkillIds || [],
        equippedOutfitId: loadout?.equippedOutfitId || null,
        equippedHatId: loadout?.equippedHatId || null,
        equippedShirtId: loadout?.equippedShirtId || null,
        equippedStyleId: loadout?.equippedStyleId || 'style_yellow',
        equippedBulletId: loadout?.equippedBulletId || 'bullet_default',
        ammoCounts: loadout?.ammoCounts || {},
        maxConcurrentEnemies: isMobile ? 3 : GAME_BALANCE.maxConcurrentEnemies,
        onAmmoConsumed: (ammoId, remaining) => {
          if (account && loadout) {
            loadout.ammoCounts = loadout.ammoCounts || {};
            loadout.ammoCounts[ammoId] = remaining;
            void import('../data/db').then(({ db }) => {
              void db.inventories.update(account.id, { ammoCounts: loadout.ammoCounts });
            });
          }
        },
        onAttempt: (params) => {
          if (account) void logAttempt(params);
        },
        onRunFinished: (summary: RunSummary) => {
          setLastRunSummary(summary);
          navigateTo('results');
        },
        onRoundChanged: (round, phase) => {
          if (phase === 'boss') {
            setRoundBanner({
              round,
              phase: 'boss',
              title: round === 3 ? '💀 ĐẠI TRÙM CUỐI XUẤT HIỆN!' : `🔥 TRÙM VÒNG ${round}`,
              subtitle: round >= 2 ? 'Gõ các từ tiếng Anh tương ứng để chém máu Trùm!' : 'Tập trung triệt hạ Trùm quái vật!',
            });
          } else if (round === 2) {
            setRoundBanner({
              round: 2,
              phase: 'mobs',
              title: '🔥 VÒNG 2: THỬ THÁCH NHỚ NGHĨA',
              subtitle: 'HIỆN TIẾNG VIỆT ➔ GÕ TIẾNG ANH! (Hãy tự nhớ từ vựng)',
            });
          } else if (round === 3) {
            setRoundBanner({
              round: 3,
              phase: 'mobs',
              title: '⚡ VÒNG 3: ĐẠI CHIẾN PHẢN XẠ',
              subtitle: 'Quái tốc độ & Trùm Cuối! Hiện Tiếng Việt ➔ Gõ Tiếng Anh!',
            });
          } else {
            setRoundBanner({
              round: 1,
              phase: 'mobs',
              title: '✨ VÒNG 1: KHỞI ĐỘNG GÕ TỪ',
              subtitle: 'Nhìn tiếng Anh gõ tiếng Anh (Kèm phụ đề dịch nghĩa)',
            });
          }
        },
        onSoundEffect: (type, weaponKind, isFinishing) => {
          playSynthSound(type, weaponKind, isFinishing);
        },
      });

      engineRef.current = engine;
      setRoundBanner({
        round: 1,
        phase: 'mobs',
        title: '✨ VÒNG 1: GÕ THEO CHỮ CÓ SẴN',
        subtitle: 'Nhìn tiếng Anh gõ tiếng Anh (Kèm phụ đề dịch nghĩa)',
      });

      // Game Loop
      const loop = (currentTime: number) => {
        if (!isMounted) return;
        const deltaMs = currentTime - lastTime;
        lastTime = currentTime;

        if (engineRef.current) {
          const eng = engineRef.current;
          eng.update(deltaMs);

          // Render canvas
          renderCanvas(eng);

          // Update React HUD state
          setEngineState({
            lives: eng.lives,
            score: eng.score,
            combo: eng.combo,
            wave: eng.currentWave,
            totalWaves: eng.totalWaves,
            status: eng.status,
            shieldActive: eng.shieldActive,
            typedBuffer: eng.typedBuffer,
            selectedEnemyId: eng.selectedEnemyId,
          });

          setSkillsRuntime([...eng.skills]);
          setEnemiesList([...eng.enemies]);
          setDefeatedEffects([...eng.defeatedWordEffects]);
        }

        animId = requestAnimationFrame(loop);
      };

      lastTime = performance.now();
      animId = requestAnimationFrame(loop);
    };

    initEngine();

    return () => {
      isMounted = false;
      cancelAnimationFrame(animId);
      engineRef.current = null;
    };
    // Inventory refreshes create new object identities and must not restart (or
    // prematurely finish) a run. runVersion changes only for an explicit retry.
  }, [runVersion]);

  // Global Keyboard Listener for Battle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (engineRef.current) {
        engineRef.current.handleKeyDown(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Canvas Renderer
  const renderCanvas = (eng: GameEngine) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * pixelRatio);
    const pixelHeight = Math.round(height * pixelRatio);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const scaleX = width / GAME_BALANCE.stageWidth;
    const scaleY = height / GAME_BALANCE.stageHeight;
    const fittedScale = Math.min(scaleX, scaleY);
    const visualScale = isMobile
      ? Math.max(0.58, fittedScale)
      : fittedScale;
    const mapX = (x: number) => x * scaleX;
    const mapY = (y: number) => y * scaleY;

    // 1. Draw Background
    const currentMap = activeMapRef.current;
    const currentMapConfig = MAP_CONFIGS[currentMap];
    if (currentMap !== 'default' && currentMapConfig?.previewImage) {
      drawSvgMapBackground(
        ctx,
        width,
        height,
        visualScale,
        currentMapConfig.previewImage,
        {
          reduceMotion: settingsRef.current?.reduceMotion,
          defenseLineY: mapY(GAME_BALANCE.defenseLineY),
        }
      );
    } else {
      // 1. Draw a subtle full-stage notebook grid background (Default).
      ctx.fillStyle = '#FBF8F0';
      ctx.fillRect(0, 0, width, height);

      const gridSize = Math.max(11, (GAME_BALANCE.gridSize || 14) * visualScale);
      ctx.strokeStyle = GAME_BALANCE.gridColor;
      ctx.lineWidth = Math.max(0.5, GAME_BALANCE.gridLineWidth * Math.max(1, visualScale));
      ctx.beginPath();
      // Vertical grid lines
      for (let x = 0; x <= width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      // Horizontal grid lines
      for (let y = 0; y <= height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Defensive line (subtle dotted red line near pempom)
      ctx.strokeStyle = 'rgba(239, 110, 120, 0.45)';
      ctx.lineWidth = Math.max(1.25, 2 * visualScale);
      ctx.setLineDash([Math.max(5, 8 * visualScale), Math.max(5, 8 * visualScale)]);
      ctx.beginPath();
      ctx.moveTo(0, mapY(GAME_BALANCE.defenseLineY));
      ctx.lineTo(width, mapY(GAME_BALANCE.defenseLineY));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Draw Shield Bubble around pempom if active
    if (eng.shieldActive) {
      ctx.save();
      ctx.translate(mapX(GAME_BALANCE.ponpiCenterX), mapY(GAME_BALANCE.ponpiCenterY));
      ctx.beginPath();
      ctx.arc(0, 0, 42 * visualScale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(169, 221, 195, 0.25)';
      ctx.fill();
      ctx.lineWidth = Math.max(1.5, 2.5 * visualScale);
      ctx.strokeStyle = '#25232B';
      ctx.setLineDash([Math.max(4, 6 * visualScale), Math.max(4, 6 * visualScale)]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // 3. Draw pempom (Positioned lower, scaled smaller for open field feel)
    drawPonpi(ctx, mapX(GAME_BALANCE.ponpiCenterX), mapY(GAME_BALANCE.ponpiCenterY), {
      pose: eng.currentPose,
      styleId: eng.equippedStyleId,
      outfitId: eng.equippedOutfitId,
      hatId: eng.equippedHatId,
      shirtId: eng.equippedShirtId,
      scale: 0.68 * visualScale,
      muzzleFlashMs: eng.muzzleFlashMs,
      breathingTime: eng.gameTimeMs,
    });

    // 4. Draw Enemies (All 30 rich monster species + epic Bosses with natural animation)
    for (const enemy of eng.enemies) {
      const isSlow = (enemy.statusEffects.slowUntilGameMs || 0) > eng.gameTimeMs;
      const isFrozen = (enemy.statusEffects.freezeUntilGameMs || 0) > eng.gameTimeMs;

      drawMonster(ctx, mapX(enemy.x), mapY(enemy.y), {
        speciesId: enemy.speciesId,
        isBoss: enemy.isBoss,
        selected: enemy.id === eng.selectedEnemyId,
        isSlowed: isSlow,
        isFrozen: isFrozen,
        animTime: eng.gameTimeMs,
        lastHitTimeMs: enemy.lastHitGameMs,
        bossSegmentsRemaining: enemy.bossSegmentsRemaining,
        bossMaxSegments: enemy.bossMaxSegments,
        pendingDefeat: enemy.pendingDefeat,
        scale: visualScale,
      });
    }

    // 5. Draw Player Bullets
    for (const bullet of eng.bullets) {
      drawBullet(ctx, bullet, mapX(bullet.x), mapY(bullet.y), visualScale, eng.gameTimeMs);
    }

    // 5b. Draw Enemy Bullets (Shooters)
    for (const eb of eng.enemyBullets) {
      ctx.save();
      const bX = mapX(eb.x);
      const bY = mapY(eb.y);
      const bRad = 7 * visualScale;
      // Glowing aura
      ctx.beginPath();
      ctx.arc(bX, bY, bRad * 1.8, 0, Math.PI * 2);
      ctx.fillStyle = (eb.color || '#E74C3C') + '44';
      ctx.fill();
      // Main fireball / energy orb
      ctx.beginPath();
      ctx.arc(bX, bY, bRad, 0, Math.PI * 2);
      ctx.fillStyle = eb.color || '#E74C3C';
      ctx.strokeStyle = '#25232B';
      ctx.lineWidth = Math.max(1.5, 2 * visualScale);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 6. Draw Particles (Paper confetti explosion)
    for (const p of eng.particles) {
      ctx.save();
      const particleX = mapX(p.x);
      const particleY = mapY(p.y);
      const particleSize = Math.max(1.5, p.size * visualScale);
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#25232B';
      ctx.lineWidth = Math.max(0.75, visualScale);
      if (p.shape === 'square') {
        ctx.fillRect(particleX - particleSize / 2, particleY - particleSize / 2, particleSize, particleSize);
        ctx.strokeRect(particleX - particleSize / 2, particleY - particleSize / 2, particleSize, particleSize);
      } else {
        ctx.beginPath();
        ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    // 7. Wave Clear Announcement Overlay
    if (eng.status === 'WAVE_CLEAR') {
      ctx.save();
      ctx.font = `900 ${Math.max(28, Math.min(48, width / 12))}px 'Mali', 'Itim', cursive, sans-serif`;
      ctx.fillStyle = '#25232B';
      ctx.textAlign = 'center';
      ctx.fillText(`🎉 HOÀN THÀNH ROUND ${eng.currentWave}!`, width / 2, height / 2 - 20);
      ctx.font = `700 ${Math.max(13, Math.min(20, width / 32))}px 'Mali', 'Comfortaa', sans-serif`;
      ctx.fillStyle = '#4B5563';
      ctx.restore();
    }
  };

  const handleEnemyTagClick = (enemyId: string) => {
    if (engineRef.current) {
      engineRef.current.selectTarget(enemyId);
      if (isMobilePortrait && mobileKeyboardMode === 'native') {
        nativeInputRef.current?.focus();
      }
    }
  };

  const handleActivateSkill = (index: number) => {
    if (engineRef.current) {
      engineRef.current.activateSkillByIndex(index);
    }
  };

  const handleHintClick = () => {
    if (engineRef.current) {
      engineRef.current.useHint();
    }
  };

  const handleTogglePause = () => {
    if (engineRef.current) {
      engineRef.current.togglePause();
    }
  };

  const handleRestart = () => {
    if (window.confirm('Bạn có chắc chắn muốn chơi lại trận này?')) {
      engineRef.current = null;
      setEnemiesList([]);
      setSkillsRuntime([]);
      setEngineState({
        lives: GAME_BALANCE.maxLives,
        score: 0,
        combo: 0,
        wave: 1,
        totalWaves: GAME_BALANCE.wavesPerRun,
        status: 'READY',
        shieldActive: false,
        typedBuffer: '',
        selectedEnemyId: null,
      });
      setRunVersion((version) => version + 1);
    }
  };

  const handleQuit = () => {
    if (window.confirm('Thoát trận chiến và quay về trang chủ?')) {
      if (engineRef.current) {
        engineRef.current.finishRun('quit');
      }
      navigateTo('home');
    }
  };

  const selectedEnemy = enemiesList.find((e) => e.id === engineState.selectedEnemyId);

  const handleVirtualKey = (key: string, e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (engineRef.current) {
      engineRef.current.handleCharacterInput(key);
    }
  };

  const handleVirtualBackspace = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (engineRef.current) {
      engineRef.current.handleBackspace();
    }
  };

  const handleVirtualSpace = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (engineRef.current) {
      engineRef.current.handleCharacterInput(' ');
    }
  };

  const handleVirtualCycleTarget = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (engineRef.current) {
      engineRef.current.cycleTargetNext();
    }
  };

  const handleReplayAudio = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (engineRef.current) {
      engineRef.current.replayTargetAudio();
    }
  };

  const nativeInputRef = useRef<HTMLInputElement | null>(null);

  const handleNativeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = e.target.value;
    if (!engineRef.current) return;

    const currentBuffer = engineRef.current.typedBuffer;

    if (incoming.length > currentBuffer.length) {
      // User typed characters from their phone keyboard
      const addedChars = incoming.slice(currentBuffer.length);
      for (const rawChar of addedChars) {
        // Strip Vietnamese accents if user is using Telex/VNI keyboard on their phone
        const clean = rawChar
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/Đ/g, 'd')
          .toLowerCase();
        for (const c of clean) {
          engineRef.current.handleCharacterInput(c);
        }
      }
    } else if (incoming.length < currentBuffer.length) {
      // User pressed Backspace on phone keyboard
      const diff = currentBuffer.length - incoming.length;
      for (let i = 0; i < diff; i++) {
        engineRef.current.handleBackspace();
      }
    } else {
      // Same length - could be IME accent substitution (e.g., typing 's' converted 'a' to 'á')
      const nativeEvt = e.nativeEvent as InputEvent;
      if (nativeEvt && nativeEvt.data) {
        const clean = nativeEvt.data
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/đ/g, 'd')
          .replace(/Đ/g, 'd')
          .toLowerCase();
        for (const c of clean) {
          engineRef.current.handleCharacterInput(c);
        }
      }
    }

    // Keep DOM input value synced with engine's validated buffer
    if (nativeInputRef.current) {
      nativeInputRef.current.value = engineRef.current.typedBuffer;
    }
  };

  const handleNativeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && engineRef.current?.typedBuffer.length === 0) {
      return;
    }
    if (e.key === 'Escape') {
      engineRef.current?.handleEscape();
    } else if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      engineRef.current?.cycleTargetNext();
    }
  };

  // Keep phone native keyboard focused whenever target changes or mode is native
  useEffect(() => {
    if (isMobilePortrait && mobileKeyboardMode === 'native') {
      const timer = setTimeout(() => {
        nativeInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [engineState.selectedEnemyId, mobileKeyboardMode, isMobilePortrait]);

  const KEYBOARD_ROWS = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ];

  return (
    <div
      className="notebook-grid-bg"
      style={{
        width: '100dvw',
        height: '100dvh',
        backgroundColor: 'var(--color-paper)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        overflow: 'hidden',
        position: 'fixed',
        inset: 0,
        userSelect: 'none',
      }}
    >

      {/* The play field fills every available pixel; the renderer keeps sprites proportional. */}
      <div
        ref={containerRef}
        className="battle-viewport-container"
        onClick={() => {
          if (isMobilePortrait && mobileKeyboardMode === 'native') {
            nativeInputRef.current?.focus();
          }
        }}
        style={{
          width: '100%',
          maxWidth: 'none',
          height: isMobilePortrait
            ? `calc(100dvh - ${mobileControlsHeight}px - env(safe-area-inset-bottom))`
            : '100dvh',
          maxHeight: 'none',
          position: 'relative',
          overflow: 'hidden',
          flex: '0 0 auto',
          boxShadow: 'none',
          backgroundColor: 'var(--color-paper)',
        }}
      >
        {/* Game Canvas */}
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />

        {/* Floating Word Tags over enemies */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          {enemiesList.map((enemy) => {
            const leftPct = (enemy.x / GAME_BALANCE.stageWidth) * 100;
            const topPct = (enemy.y / GAME_BALANCE.stageHeight) * 100;

            const isSelected = enemy.id === engineState.selectedEnemyId;
            const currentBuffer = enemy.pendingDefeat ? enemy.word : (isSelected ? engineState.typedBuffer : '');

            return (
              <div
                key={enemy.id}
                style={{
                  position: 'absolute',
                  left: isMobile
                    ? `clamp(${enemy.isBoss ? 90 : 68}px, ${leftPct}%, calc(100% - ${enemy.isBoss ? 90 : 68}px))`
                    : `${leftPct}%`,
                  top: `${topPct + (enemy.isBoss ? 7.2 : 3.6)}%`,
                  transform: 'translate(-50%, 0)',
                  width: 'max-content',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'auto',
                  opacity: enemy.pendingDefeat ? 0.9 : 1,
                  zIndex: isSelected ? 25 : 10,
                }}
              >
                <WordTag
                  promptText={enemy.promptText}
                  expectedWord={enemy.word}
                  meaningText={enemy.meaningText}
                  typedBuffer={currentBuffer}
                  isSelected={isSelected}
                  mode={enemy.mode || (engineRef.current?.currentRoundMode || selectedMode)}
                  isBoss={enemy.isBoss}
                  bossSegmentsRemaining={enemy.bossSegmentsRemaining}
                  bossMaxSegments={enemy.bossMaxSegments}
                  isRevealed={(enemy.revealedUntilGameMs || 0) > (engineRef.current?.gameTimeMs || 0)}
                  archetype={enemy.archetype}
                  hp={enemy.hp}
                  maxHp={enemy.maxHp}
                  compact={isMobile}
                  onClick={() => !enemy.pendingDefeat && handleEnemyTagClick(enemy.id)}
                />
              </div>
            );
          })}
        </div>

        {/* Round Transition Announcement Banner */}
        {roundBanner && (
          <div
            style={{
              position: 'absolute',
              top: '22%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 40,
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: isMobile ? '10px 18px' : '14px 28px',
              background: roundBanner.phase === 'boss'
                ? 'linear-gradient(135deg, #7F1D1D 0%, #B91C1C 100%)'
                : roundBanner.round === 2
                ? 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)'
                : roundBanner.round === 3
                ? 'linear-gradient(135deg, #6B21A8 0%, #8B5CF6 100%)'
                : 'linear-gradient(135deg, #1E293B 0%, #334155 100%)',
              color: '#FFFFFF',
              borderRadius: '16px',
              border: '3px solid #FFFFFF',
              boxShadow: '0 12px 32px rgba(0,0,0,0.35), 0 0 0 3px var(--color-ink)',
              textAlign: 'center',
              animation: 'popFloatUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: isMobile ? '1.05rem' : '1.4rem', letterSpacing: '0.5px' }}>
              {roundBanner.title}
            </div>
            <div style={{ fontFamily: 'var(--font-vietnamese)', fontWeight: 700, fontSize: isMobile ? '0.78rem' : '0.95rem', marginTop: '4px', opacity: 0.95 }}>
              {roundBanner.subtitle}
            </div>
          </div>
        )}

        {/* Floating Defeated Word Meaning Popups */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 35,
          }}
        >
          {defeatedEffects.map((effect) => {
            const leftPct = (effect.x / GAME_BALANCE.stageWidth) * 100;
            const topPct = (effect.y / GAME_BALANCE.stageHeight) * 100;

            return (
              <div
                key={effect.id}
                style={{
                  position: 'absolute',
                  left: isMobile
                    ? `clamp(65px, ${leftPct}%, calc(100% - 65px))`
                    : `${leftPct}%`,
                  top: `${topPct}%`,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                  animation: 'popFloatUp 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  backgroundColor: '#FFFFFF',
                  border: '2.5px solid var(--color-ink)',
                  borderRadius: '12px',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.2), 3px 3px 0 var(--color-ink)',
                  padding: isMobile ? '4px 10px' : '6px 14px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: '#16A34A', fontWeight: 900, fontSize: '0.85rem' }}>✓</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-english)',
                      fontWeight: 800,
                      color: '#16A34A',
                      fontSize: isMobile ? '0.82rem' : '0.96rem',
                    }}
                  >
                    {effect.word}
                  </span>
                </div>
                {effect.meaning && (
                  <div
                    style={{
                      fontFamily: 'var(--font-vietnamese)',
                      fontWeight: 800,
                      color: 'var(--color-ink)',
                      fontSize: isMobile ? '0.76rem' : '0.88rem',
                      lineHeight: 1.2,
                    }}
                  >
                    {effect.meaning}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* HUD Top Bar (Lives, Waves, Score, Pause) */}
        <div
          style={{
            position: 'absolute',
            top: isMobile ? 'max(6px, env(safe-area-inset-top))' : '10px',
            left: isMobile ? 'max(8px, env(safe-area-inset-left))' : '12px',
            right: isMobile ? 'max(8px, env(safe-area-inset-right))' : '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pointerEvents: 'auto',
            zIndex: 10,
          }}
        >
          {/* Left: Hearts & Lives + Wave indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '6px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: isMobile ? '3px 7px' : '4px 10px',
                backgroundColor: '#FFFFFF',
                border: 'var(--border-ink)',
                borderRadius: 'var(--radius-full)',
                boxShadow: 'var(--shadow-sticker-sm)',
              }}
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart
                  key={i}
                  size={isMobile ? 14 : 18}
                  fill={i < engineState.lives ? 'var(--color-danger)' : '#E0E0E0'}
                  color={i < engineState.lives ? 'var(--color-danger)' : 'var(--color-muted-ink)'}
                />
              ))}
            </div>

            <div
              style={{
                padding: isMobile ? '3px 8px' : '4px 10px',
                backgroundColor: engineState.status === 'BOSS_PLAYING' ? '#FEE2E2' : '#FFFFFF',
                border: 'var(--border-ink)',
                borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: isMobile ? '0.72rem' : '0.82rem',
                boxShadow: 'var(--shadow-sticker-sm)',
                whiteSpace: 'nowrap',
                color: engineState.status === 'BOSS_PLAYING' ? '#B91C1C' : 'var(--color-ink)',
              }}
            >
              {engineState.status === 'BOSS_PLAYING'
                ? `🔥 TRÙM R${engineState.wave}`
                : engineState.wave === 1
                ? `Vòng 1: Gõ Mẫu (1/3)`
                : engineState.wave === 2
                ? `🔥 Vòng 2: Việt➔Anh (2/3)`
                : `⚡ Vòng 3: Thử Thách & Trùm (3/3)`}
            </div>

            <div
              style={{
                padding: isMobile ? '3px 6px' : '4px 9px',
                backgroundColor: '#EFF6FF',
                border: 'var(--border-ink)',
                borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: isMobile ? '0.68rem' : '0.78rem',
                boxShadow: 'var(--shadow-sticker-sm)',
                whiteSpace: 'nowrap',
                color: '#1D4ED8',
              }}
            >
              {inventory?.equippedBulletId === 'bullet_slow'
                ? `❄️ Băng: ${(inventory?.ammoCounts?.['bullet_slow'] ?? 0)}`
                : inventory?.equippedBulletId === 'bullet_reveal'
                ? `👁️ Soi: ${(inventory?.ammoCounts?.['bullet_reveal'] ?? 0)}`
                : '✨ Vô hạn'}
            </div>
          </div>

          {/* Center: Score & Combo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div
              style={{
                padding: isMobile ? '3px 8px' : '4px 14px',
                backgroundColor: '#FFF9E6',
                border: 'var(--border-ink)',
                borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: isMobile ? '0.78rem' : '1rem',
                boxShadow: 'var(--shadow-sticker-sm)',
                whiteSpace: 'nowrap',
              }}
            >
              {isMobile ? engineState.score.toLocaleString() : `Điểm: ${engineState.score.toLocaleString()}`}
            </div>

            {engineState.combo > 1 && (
              <div
                style={{
                  padding: isMobile ? '3px 6px' : '4px 10px',
                  backgroundColor: 'var(--color-accent-yellow)',
                  border: 'var(--border-ink)',
                  borderRadius: 'var(--radius-full)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: isMobile ? '0.7rem' : '0.8rem',
                  boxShadow: 'var(--shadow-sticker-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <Sparkles size={isMobile ? 12 : 16} /> x{engineState.combo}!
              </div>
            )}
          </div>

          {/* Right: Pause Button */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <StickerButton
              size="sm"
              onClick={handleTogglePause}
              icon={<Pause size={isMobile ? 14 : 16} />}
              style={isMobile ? { padding: '4px 8px', fontSize: '0.75rem' } : undefined}
            >
              {isMobile ? 'Dừng' : 'Tạm Dừng [Esc]'}
            </StickerButton>
          </div>
        </div>

        {/* Desktop/Landscape HUD Bottom Bar (Skills & Actions) */}
        {!isMobilePortrait && (
          <div
            style={{
              position: 'absolute',
              bottom: isMobile ? 'max(8px, env(safe-area-inset-bottom))' : '10px',
              left: isMobile ? 'max(8px, env(safe-area-inset-left))' : '12px',
              right: isMobile ? 'max(8px, env(safe-area-inset-right))' : '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              pointerEvents: 'auto',
              zIndex: 10,
            }}
          >
            {/* Skill Slots (Hotkeys 1, 2, 3) */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {skillsRuntime.map((skill, index) => {
                const hotkey = index + 1;
                const hasCharges = skill.remainingCharges > 0;
                const isCoolingDown = (engineRef.current?.gameTimeMs || 0) < skill.readyAtGameMs;

                let icon = <Snowflake size={18} />;
                if (skill.itemId === 'skill_shield_bubble') icon = <Shield size={18} />;

                return (
                  <div
                    key={skill.itemId}
                    onClick={() => handleActivateSkill(index)}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: hasCharges && !isCoolingDown ? '#FFFFFF' : '#EAEAEA',
                      border: 'var(--border-ink)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: hasCharges && !isCoolingDown ? 'var(--shadow-sticker)' : 'none',
                      cursor: hasCharges && !isCoolingDown ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: hasCharges && !isCoolingDown ? 1 : 0.6,
                    }}
                  >
                    <div
                      style={{
                        width: '21px',
                        height: '21px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--color-accent-yellow)',
                        border: '1.5px solid var(--color-ink)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 900,
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                      }}
                    >
                      {hotkey}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.76rem' }}>{skill.title}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-muted-ink)' }}>
                        {hasCharges ? `${skill.remainingCharges} lượt` : 'Hết lượt'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hint & Listen mode replay */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {selectedMode === 'listen' && (
                <StickerButton size="sm" onClick={handleReplayAudio} icon={<Volume2 size={16} />}>
                  Nghe Lại [R]
                </StickerButton>
              )}
              <StickerButton size="sm" onClick={handleHintClick} icon={<HelpCircle size={16} />}>
                Gợi Ý [H]
              </StickerButton>
            </div>
          </div>
        )}

        {/* Pause Overlay Modal */}
        {engineState.status === 'PAUSED' && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(37, 35, 43, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 200,
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: 'var(--border-ink)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-sticker-lg)',
                padding: 'clamp(20px, 4vw, 30px)',
                width: '90%',
                maxWidth: '380px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900 }}>
                TẠM DỪNG
              </h2>
              <p style={{ color: 'var(--color-muted-ink)', fontSize: '0.9rem' }}>
                Trò chơi đang dừng. Quái và kỹ năng được giữ nguyên.
              </p>

              <StickerButton
                variant="primary"
                size="lg"
                onClick={handleTogglePause}
                icon={<Play fill="var(--color-ink)" size={20} />}
              >
                Tiếp Tục Chơi [Esc]
              </StickerButton>

              <StickerButton onClick={handleRestart} icon={<RotateCcw size={18} />}>
                Chơi Lại Trận Này
              </StickerButton>

              <StickerButton variant="danger" onClick={handleQuit} icon={<Home size={18} />}>
                Thoát Về Trang Chủ
              </StickerButton>

              {/* Developer Map Preview Switcher */}
              <div
                style={{
                  marginTop: '6px',
                  paddingTop: '8px',
                  borderTop: '1px dashed var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <div style={{ fontSize: '0.74rem', color: 'var(--color-muted-ink)' }}>
                  Chủ đề Map: <strong>{selectedMap === 'forest-mountain' ? 'Phong Cảnh Núi Rừng' : 'Tập Vở Ô Ly (Mặc định)'}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleMap(selectedMap === 'forest-mountain' ? 'default' : 'forest-mountain')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-ink)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: '3px 6px',
                  }}
                >
                  {!account ? 'Đăng nhập Google để mở thêm map' : selectedMap === 'forest-mountain' ? '↺ Chuyển về Map Mặc Định' : '🌲 Thử nghiệm Map: Phong Cảnh Núi Rừng'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE PORTRAIT DASHBOARD & VIRTUAL KEYBOARD */}
      {isMobilePortrait && (
        <div
          className="notebook-grid-bg"
          style={{
            flex: `0 0 calc(${mobileControlsHeight}px + env(safe-area-inset-bottom))`,
            height: `calc(${mobileControlsHeight}px + env(safe-area-inset-bottom))`,
            width: '100%',
            maxWidth: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '4px max(6px, env(safe-area-inset-right)) max(4px, env(safe-area-inset-bottom)) max(6px, env(safe-area-inset-left))',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {/* Active Target Info Card */}
          <div
            onClick={() => {
              if (mobileKeyboardMode === 'native') {
                nativeInputRef.current?.focus();
              }
            }}
            style={{
              backgroundColor: '#FFFFFF',
              border: 'var(--border-ink)',
              borderRadius: 'var(--radius-md)',
              padding: isShortMobile ? '3px 7px' : '5px 9px',
              boxShadow: 'var(--shadow-sticker-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px',
              cursor: mobileKeyboardMode === 'native' ? 'text' : 'default',
            }}
          >
            {selectedEnemy ? (
              <div style={{ flex: 1, minWidth: 0 }}>
                {(() => {
                  const enemyMode = selectedEnemy.mode || (engineState.wave === 1 ? 'copy' : 'recall');
                  const isCopy = enemyMode === 'copy';
                  const typedLen = Math.min(engineState.typedBuffer.length, selectedEnemy.word.length);
                  const typedPart = selectedEnemy.word.slice(0, typedLen);
                  const remainingPart = selectedEnemy.word.slice(typedLen);
                  const remainingSlots = Math.max(0, selectedEnemy.word.length - typedLen);

                  return (
                    <>
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-muted-ink)', fontWeight: 600 }}>
                        {isCopy ? (
                          <>
                            VÒNG 1 (Gõ chữ mẫu):{' '}
                            <span
                              style={{
                                fontWeight: 800,
                                color: 'var(--color-ink)',
                                fontFamily: 'var(--font-english)',
                              }}
                            >
                              {selectedEnemy.word}
                            </span>
                            {selectedEnemy.meaningText && (
                              <span style={{ marginLeft: '6px', color: '#64748B', fontWeight: 600, fontSize: '0.72rem' }}>
                                ({selectedEnemy.meaningText})
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            VÒNG {engineState.wave} (Hiện tiếng Việt ➔ Bấm tiếng Anh):{' '}
                            <span
                              style={{
                                fontWeight: 900,
                                color: '#B91C1C',
                                fontFamily: 'var(--font-vietnamese)',
                                fontSize: '0.86rem',
                              }}
                            >
                              {selectedEnemy.meaningText || selectedEnemy.promptText}
                            </span>
                          </>
                        )}
                      </div>

                      <div style={{ fontFamily: 'var(--font-english)', fontWeight: 800, fontSize: '1.15rem', marginTop: '2px', letterSpacing: '1px' }}>
                        {isCopy ? (
                          <>
                            <span style={{ color: '#16A34A', textDecoration: 'underline' }}>{typedPart}</span>
                            <span style={{ color: '#DC2626' }}>{remainingPart}</span>
                          </>
                        ) : (
                          <>
                            {typedPart.length > 0 && (
                              <span style={{ color: '#16A34A', textDecoration: 'underline' }}>{typedPart}</span>
                            )}
                            <span style={{ color: '#9CA3AF' }}>{' _'.repeat(remainingSlots)}</span>
                          </>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div style={{ flex: 1, minWidth: 0, fontSize: isShortMobile ? '0.72rem' : '0.8rem', color: 'var(--color-muted-ink)', fontStyle: 'italic' }}>
                {isShortMobile ? 'Chạm quái để chọn mục tiêu' : 'Chạm vào quái hoặc gõ ký tự để nhắm bắn!'}
              </div>
            )}

            {/* Quick target actions */}
            <div style={{ display: 'flex', flexShrink: 0, gap: '4px' }}>
              {selectedMode === 'listen' && (
                <button
                  type="button"
                  onClick={handleReplayAudio}
                  title="Nghe lại"
                  style={{
                    padding: isShortMobile ? '3px 6px' : '5px 8px',
                    borderRadius: '6px',
                    border: '1.5px solid var(--color-ink)',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '1px 1px 0px var(--color-ink)',
                    cursor: 'pointer',
                  }}
                >
                  <Volume2 size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={handleHintClick}
                title="Gợi ý"
                style={{
                  padding: isShortMobile ? '3px 6px' : '5px 8px',
                  borderRadius: '6px',
                  border: '1.5px solid var(--color-ink)',
                  backgroundColor: '#FFF9E6',
                  boxShadow: '1px 1px 0px var(--color-ink)',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '0.72rem',
                  whiteSpace: 'nowrap',
                }}
              >
                Gợi ý
              </button>
              <button
                type="button"
                onClick={handleVirtualCycleTarget}
                title="Đổi mục tiêu"
                style={{
                  padding: isShortMobile ? '3px 6px' : '5px 8px',
                  borderRadius: '6px',
                  border: '1.5px solid var(--color-ink)',
                  backgroundColor: '#FFFFFF',
                  boxShadow: '1px 1px 0px var(--color-ink)',
                  cursor: 'pointer',
                }}
              >
                <Crosshair size={16} />
              </button>
            </div>
          </div>

          {/* Mobile Skills Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', marginBottom: '4px' }}>
            {skillsRuntime.map((skill, index) => {
              const hasCharges = skill.remainingCharges > 0;
              const isCoolingDown = (engineRef.current?.gameTimeMs || 0) < skill.readyAtGameMs;

              let icon = <Snowflake size={14} />;
              if (skill.itemId === 'skill_shield_bubble') icon = <Shield size={14} />;

              return (
                <button
                  type="button"
                  key={skill.itemId}
                  onClick={() => handleActivateSkill(index)}
                  disabled={!hasCharges || isCoolingDown}
                  style={{
                    padding: isShortMobile ? '3px 2px' : '4px 3px',
                    backgroundColor: hasCharges && !isCoolingDown ? '#FFFFFF' : '#EAEAEA',
                    border: '1.5px solid var(--color-ink)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: hasCharges && !isCoolingDown ? '1.5px 2px 0px var(--color-ink)' : 'none',
                    cursor: hasCharges && !isCoolingDown ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    opacity: hasCharges && !isCoolingDown ? 1 : 0.6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {icon}
                    <span style={{ fontWeight: 800, fontSize: '0.72rem' }}>{skill.title}</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-muted-ink)' }}>
                    {hasCharges ? `${skill.remainingCharges} lượt` : 'Hết lượt'}
                  </span>
                </button>
              );
            })}
          </div>

          {mobileKeyboardMode === 'native' ? (
            /* Native Phone Keyboard Typing Bar */
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: 'var(--border-ink)',
                borderRadius: 'var(--radius-md)',
                padding: '5px 7px',
                boxShadow: 'var(--shadow-sticker-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: '#2563EB',
                  padding: '2px',
                  flexShrink: 0,
                }}
                title="Đang dùng bàn phím điện thoại của bạn"
              >
                <Smartphone size={20} />
              </div>

              <input
                ref={nativeInputRef}
                type="text"
                inputMode="text"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                spellCheck="false"
                lang="en"
                enterKeyHint="next"
                value={engineState.typedBuffer}
                onChange={handleNativeInputChange}
                onKeyDown={handleNativeInputKeyDown}
                placeholder={
                  selectedEnemy
                    ? (engineState.wave >= 2
                        ? `Gõ tiếng Anh (${selectedEnemy.word.length} chữ)...`
                        : `Gõ: ${selectedEnemy.word}...`)
                    : 'Chạm quái hoặc gõ tại đây...'
                }
                style={{
                  flex: 1,
                  minWidth: 0,
                  height: isShortMobile ? '35px' : '38px',
                  fontSize: isShortMobile ? '0.98rem' : '1.1rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-english)',
                  letterSpacing: '1px',
                  backgroundColor: '#F8FAFC',
                  color: '#15803D',
                  border: '1.5px solid var(--color-ink)',
                  borderRadius: '6px',
                  padding: '0 8px',
                  outline: 'none',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
                }}
              />

              <button
                type="button"
                onClick={handleVirtualSpace}
                title="Dấu cách (Space)"
                style={{
                  height: isShortMobile ? '35px' : '38px',
                  padding: '0 8px',
                  backgroundColor: '#FFFFFF',
                  color: 'var(--color-ink)',
                  border: '1.5px solid var(--color-ink)',
                  borderRadius: '6px',
                  boxShadow: '1px 1.5px 0px var(--color-ink)',
                  fontWeight: 700,
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  touchAction: 'manipulation',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                Space
              </button>

              <button
                type="button"
                onClick={handleVirtualBackspace}
                title="Xóa ký tự (Backspace)"
                style={{
                  height: isShortMobile ? '35px' : '38px',
                  padding: '0 7px',
                  backgroundColor: '#FFE8E8',
                  color: 'var(--color-danger)',
                  border: '1.5px solid var(--color-ink)',
                  borderRadius: '6px',
                  boxShadow: '1px 1.5px 0px var(--color-ink)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  touchAction: 'manipulation',
                  flexShrink: 0,
                }}
              >
                <Delete size={17} />
              </button>

              <button
                type="button"
                onClick={() => setMobileKeyboardMode('virtual')}
                title="Đổi sang bàn phím nổi"
                style={{
                  height: isShortMobile ? '35px' : '38px',
                  padding: '0 6px',
                  backgroundColor: '#EEF2FF',
                  color: '#4338CA',
                  border: '1.5px solid var(--color-ink)',
                  borderRadius: '6px',
                  boxShadow: '1px 1.5px 0px var(--color-ink)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  touchAction: 'manipulation',
                  whiteSpace: 'nowrap',
                  gap: '1px',
                  flexShrink: 0,
                }}
              >
                <Keyboard size={14} />
                <span>Phím ảo</span>
              </button>
            </div>
          ) : (
            /* Mobile On-Screen Sticker Keyboard */
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: 'var(--border-ink)',
                borderRadius: 'var(--radius-md)',
                padding: isShortMobile ? '3px 3px' : '4px 3px',
                boxShadow: 'var(--shadow-sticker-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '3px',
              }}
            >
              {KEYBOARD_ROWS.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '2px',
                  }}
                >
                  {row.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={(e) => handleVirtualKey(k, e)}
                      style={{
                        flex: 1,
                        maxWidth: '42px',
                        height: `${mobileKeyHeight}px`,
                        padding: 0,
                        backgroundColor: '#FFFFFF',
                        color: 'var(--color-ink)',
                        border: '1.5px solid var(--color-ink)',
                        borderRadius: '5px',
                        boxShadow: '1px 1.5px 0px var(--color-ink)',
                        fontFamily: 'var(--font-english)',
                        fontWeight: 800,
                        fontSize: isShortMobile ? '0.88rem' : '1rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        touchAction: 'manipulation',
                      }}
                    >
                      {k.toUpperCase()}
                    </button>
                  ))}

                  {/* Backspace button on row 3 */}
                  {rowIdx === 2 && (
                    <button
                      type="button"
                      onClick={handleVirtualBackspace}
                      style={{
                        flex: 1.5,
                        maxWidth: '52px',
                        height: `${mobileKeyHeight}px`,
                        backgroundColor: '#FFE8E8',
                        color: 'var(--color-danger)',
                        border: '1.5px solid var(--color-ink)',
                        borderRadius: '5px',
                        boxShadow: '1px 1.5px 0px var(--color-ink)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        touchAction: 'manipulation',
                      }}
                    >
                      <Delete size={18} />
                    </button>
                  )}
                </div>
              ))}

              {/* Bottom Keyboard Controls: Space Bar & Switch back to phone keyboard */}
              <div style={{ display: 'flex', gap: '4px', marginTop: '1px', padding: '0 3px' }}>
                <button
                  type="button"
                  onClick={handleVirtualSpace}
                  style={{
                    flex: 1,
                    height: `${isShortMobile ? 27 : 30}px`,
                    backgroundColor: 'var(--color-paper)',
                    color: 'var(--color-muted-ink)',
                    border: '1.5px solid var(--color-ink)',
                    borderRadius: '5px',
                    boxShadow: '1px 1.5px 0px var(--color-ink)',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    touchAction: 'manipulation',
                  }}
                >
                  KHOẢNG CÁCH (SPACE)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileKeyboardMode('native');
                    setTimeout(() => nativeInputRef.current?.focus(), 50);
                  }}
                  title="Dùng bàn phím điện thoại của bạn"
                  style={{
                    padding: '0 10px',
                    height: `${isShortMobile ? 27 : 30}px`,
                    backgroundColor: '#ECFDF5',
                    color: '#065F46',
                    border: '1.5px solid var(--color-ink)',
                    borderRadius: '5px',
                    boxShadow: '1px 1.5px 0px var(--color-ink)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    touchAction: 'manipulation',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Smartphone size={15} />
                  <span>Phím điện thoại</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
