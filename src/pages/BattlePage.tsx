import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/appStore';
import { GameEngine } from '../game/engine/gameEngine';
import { NativeTypingInput } from '../game/engine/nativeTyping';
import { normalizeInput, typingAnswers } from '../game/engine/typing';
import { playSoundEffect, configureSoundSettings } from '../utils/soundEffects';
import { selectSessionWords } from '../learning/sessionSelector';
import { logAttempt } from '../learning/attempts';
import { batchSaveLearningProgress } from '../learning/scheduler';
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
    isShuffleWords,
    inventory,
    refreshUserData,
    settings,
    navigateTo,
    setLastRunSummary,
  } = useApp();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nativeTypingRef = useRef(new NativeTypingInput());
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

      // Select words with Spaced Repetition (SRS) prioritizing due and new words (randomized by default)
      const sessionWords = await selectSessionWords(selectedSetId, {
        targetCount: wordCount,
        chunkIndex: selectedChunkIndex !== null ? selectedChunkIndex : undefined,
        chunkSize: wordCount,
        shuffle: isShuffleWords,
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
        shuffleWords: isShuffleWords,
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
          void logAttempt(params);
        },
        onRunFinished: (summary: RunSummary) => {
          setLastRunSummary(summary);
          // Automatically save all attempted words to the account/database
          if (summary.wordResults && summary.wordResults.length > 0) {
            void batchSaveLearningProgress(
              summary.wordResults.map((w) => ({
                entryId: w.entryId,
                isMastered: w.isMastered,
                mode: 'recall', // 3-round battle includes recall testing, advancing Spaced Repetition stages
                hadHint: w.hadHint,
              }))
            );
          }
          navigateTo('results');
        },
        onRoundChanged: (round, phase) => {
          if (phase === 'boss') {
            setRoundBanner({
              round,
              phase: 'boss',
              title: round === 3 ? '💀 FINAL BOSS' : `💀 BOSS R${round}`,
              subtitle: '',
            });
          } else {
            setRoundBanner({
              round,
              phase: 'mobs',
              title: `ROUND ${round}`,
              subtitle: '',
            });
          }
        },
        onSoundEffect: (type, weaponKind, isFinishing) => {
          playSynthSound(type, weaponKind, isFinishing);
        },
      });

      engineRef.current = engine;
      syncNativeInput();
      setRoundBanner({
        round: 1,
        phase: 'mobs',
        title: 'ROUND 1',
        subtitle: '',
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
      if (e.defaultPrevented || (e.target instanceof HTMLElement &&
          e.target.closest('input, textarea, select, [contenteditable="true"]'))) return;
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
        scale: visualScale * (enemy.scale || 1.0),
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

  };

  const handleEnemyTagClick = (enemyId: string) => {
    if (engineRef.current) {
      engineRef.current.selectTarget(enemyId);
      syncNativeInput();
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
      syncNativeInput();
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

  const syncNativeInput = () => {
    if (engineRef.current && nativeInputRef.current) {
      nativeInputRef.current.value = nativeTypingRef.current.reset(engineRef.current);
    }
  };

  const handleNativeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!engineRef.current) return;
    e.currentTarget.value = nativeTypingRef.current.change(
      engineRef.current, e.currentTarget.value, e.nativeEvent as InputEvent
    );
  };

  const handleNativeInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Text has exactly one owner: input/composition. Never also send its
    // keydown to the global game listener, even with a physical keyboard.
    e.stopPropagation();
    if (e.repeat) { e.preventDefault(); return; }
    if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
    nativeTypingRef.current.startKey();
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      engineRef.current?.cycleTargetNext();
      syncNativeInput();
    } else if (['Escape', 'Tab', 'F1', 'F2', '1', '2', '3'].includes(e.key)) {
      e.preventDefault();
      engineRef.current?.handleKeyDown(e.nativeEvent);
      syncNativeInput();
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
            const displayedAnswer = typingAnswers(enemy.word, enemy.acceptedAnswers, enemy.mode)
              .find((answer) => normalizeInput(answer).startsWith(currentBuffer)) || enemy.word;

            return (
              <div
                key={enemy.id}
                data-enemy-id={enemy.id}
                data-selected={isSelected}
                style={{
                  position: 'absolute',
                  left: isMobile
                    ? `clamp(${enemy.isBoss ? 90 : 68}px, ${leftPct}%, calc(100% - ${enemy.isBoss ? 90 : 68}px))`
                    : `${leftPct}%`,
                  top: `${topPct + (enemy.isBoss ? 7.2 : (enemy.scale && enemy.scale < 1 ? 2.5 : 3.6))}%`,
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
                  expectedWord={displayedAnswer}
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

        {/* Wave Clear Announcement */}
        {engineState.status === 'WAVE_CLEAR' && (
          <div
            style={{
              position: 'absolute',
              top: '24%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 42,
              pointerEvents: 'none',
              padding: isMobile ? '6px 16px' : '10px 24px',
              background: '#15803D',
              color: '#FFFFFF',
              borderRadius: '999px',
              border: '2px solid #FFFFFF',
              boxShadow: '0 8px 24px rgba(22, 163, 74, 0.35)',
              textAlign: 'center',
              animation: 'popFloatUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: isMobile ? '0.9rem' : '1.25rem',
              letterSpacing: '1px',
              whiteSpace: 'nowrap',
            }}
          >
            ✓ CLEAR • ROUND {engineState.wave}
          </div>
        )}

        {/* Round Transition Announcement */}
        {roundBanner && (
          <div
            style={{
              position: 'absolute',
              top: '22%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 40,
              pointerEvents: 'none',
              padding: isMobile ? '6px 16px' : '10px 24px',
              background: roundBanner.phase === 'boss'
                ? '#B91C1C'
                : roundBanner.round === 2
                ? '#0D9488'
                : roundBanner.round === 3
                ? '#7C3AED'
                : '#1E293B',
              color: '#FFFFFF',
              borderRadius: '999px',
              border: '2px solid #FFFFFF',
              boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              textAlign: 'center',
              animation: 'popFloatUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: isMobile ? '0.9rem' : '1.3rem',
              letterSpacing: '1px',
              whiteSpace: 'nowrap',
            }}
          >
            {roundBanner.title}
          </div>
        )}

        {/* Floating Word Popups (Defeated / Missed Answer) */}
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
            const isMissed = effect.isMissed;

            return (
              <div
                key={effect.id}
                style={{
                  position: 'absolute',
                  left: isMobile
                    ? `clamp(75px, ${leftPct}%, calc(100% - 75px))`
                    : `${leftPct}%`,
                  top: `${topPct}%`,
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                  animation: 'popFloatUp 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  backgroundColor: isMissed ? '#FEF2F2' : '#FFFFFF',
                  border: isMissed ? '2px solid #EF4444' : '2px solid var(--color-ink)',
                  borderRadius: '10px',
                  boxShadow: isMissed
                    ? '0 6px 18px rgba(239, 68, 68, 0.4), 2px 2px 0 #DC2626'
                    : '0 6px 16px rgba(0,0,0,0.15), 2px 2px 0 var(--color-ink)',
                  padding: isMobile ? '4px 10px' : '5px 12px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  zIndex: isMissed ? 50 : 35,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ color: isMissed ? '#DC2626' : '#16A34A', fontWeight: 900, fontSize: '0.85rem' }}>
                    {isMissed ? '✕' : '✓'}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-english)',
                      fontWeight: 900,
                      color: isMissed ? '#DC2626' : '#16A34A',
                      fontSize: isMobile ? '0.85rem' : '0.98rem',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {effect.word}
                  </span>
                </div>
                {effect.meaning && (
                  <div
                    style={{
                      fontFamily: 'var(--font-vietnamese)',
                      fontWeight: 700,
                      color: isMissed ? '#991B1B' : 'var(--color-ink)',
                      fontSize: isMobile ? '0.74rem' : '0.84rem',
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

        {/* HUD Top Bar (Lives, Wave, Ammo, Score, Pause) */}
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
          {/* Left: Lives + Wave + Ammo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '6px' }}>
            {/* Lives */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                padding: isMobile ? '3px 6px' : '4px 8px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid var(--color-ink)',
                borderRadius: '999px',
                boxShadow: '1px 1.5px 0px var(--color-ink)',
              }}
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart
                  key={i}
                  size={isMobile ? 13 : 16}
                  fill={i < engineState.lives ? '#EF4444' : '#E2E8F0'}
                  color={i < engineState.lives ? '#EF4444' : '#94A3B8'}
                />
              ))}
            </div>

            {/* Wave / Boss indicator */}
            <div
              style={{
                padding: isMobile ? '3px 7px' : '4px 10px',
                backgroundColor: engineState.status === 'BOSS_PLAYING' ? '#FEF2F2' : '#FFFFFF',
                border: '1.5px solid var(--color-ink)',
                borderRadius: '999px',
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: isMobile ? '0.72rem' : '0.8rem',
                boxShadow: '1px 1.5px 0px var(--color-ink)',
                whiteSpace: 'nowrap',
                color: engineState.status === 'BOSS_PLAYING' ? '#DC2626' : 'var(--color-ink)',
                letterSpacing: '0.5px',
              }}
            >
              {engineState.status === 'BOSS_PLAYING' ? `💀 BOSS` : `R${engineState.wave}`}
            </div>

            {/* Ammo */}
            <div
              style={{
                padding: isMobile ? '3px 6px' : '4px 8px',
                backgroundColor: '#EFF6FF',
                border: '1.5px solid var(--color-ink)',
                borderRadius: '999px',
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: isMobile ? '0.7rem' : '0.76rem',
                boxShadow: '1px 1.5px 0px var(--color-ink)',
                whiteSpace: 'nowrap',
                color: '#2563EB',
              }}
            >
              {inventory?.equippedBulletId === 'bullet_slow'
                ? `❄️ ${(inventory?.ammoCounts?.['bullet_slow'] ?? 0)}`
                : inventory?.equippedBulletId === 'bullet_reveal'
                ? `👁️ ${(inventory?.ammoCounts?.['bullet_reveal'] ?? 0)}`
                : '✨ ∞'}
            </div>
          </div>

          {/* Center: Score & Combo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div
              style={{
                padding: isMobile ? '3px 8px' : '4px 12px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid var(--color-ink)',
                borderRadius: '999px',
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: isMobile ? '0.78rem' : '0.95rem',
                boxShadow: '1px 1.5px 0px var(--color-ink)',
                whiteSpace: 'nowrap',
                letterSpacing: '0.5px',
              }}
            >
              {engineState.score.toLocaleString()}
            </div>

            {engineState.combo > 1 && (
              <div
                style={{
                  padding: isMobile ? '3px 6px' : '4px 8px',
                  backgroundColor: '#FEF08A',
                  border: '1.5px solid var(--color-ink)',
                  borderRadius: '999px',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: isMobile ? '0.7rem' : '0.78rem',
                  boxShadow: '1px 1.5px 0px var(--color-ink)',
                  whiteSpace: 'nowrap',
                }}
              >
                🔥x{engineState.combo}
              </div>
            )}
          </div>

          {/* Right: Pause */}
          <button
            type="button"
            onClick={handleTogglePause}
            aria-label="Pause"
            style={{
              width: isMobile ? '28px' : '34px',
              height: isMobile ? '28px' : '34px',
              borderRadius: '999px',
              backgroundColor: '#FFFFFF',
              border: '1.5px solid var(--color-ink)',
              boxShadow: '1px 1.5px 0px var(--color-ink)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <Pause size={isMobile ? 13 : 16} />
          </button>
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
            {/* Skill Slots */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {skillsRuntime.map((skill, index) => {
                const hotkey = index + 1;
                const hasCharges = skill.remainingCharges > 0;
                const isCoolingDown = (engineRef.current?.gameTimeMs || 0) < skill.readyAtGameMs;

                let icon = <Snowflake size={15} />;
                if (skill.itemId === 'skill_shield_bubble') icon = <Shield size={15} />;

                return (
                  <button
                    key={skill.itemId}
                    type="button"
                    onClick={() => handleActivateSkill(index)}
                    disabled={!hasCharges || isCoolingDown}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: hasCharges && !isCoolingDown ? '#FFFFFF' : '#E2E8F0',
                      border: '1.5px solid var(--color-ink)',
                      borderRadius: '8px',
                      boxShadow: hasCharges && !isCoolingDown ? '1.5px 2px 0px var(--color-ink)' : 'none',
                      cursor: hasCharges && !isCoolingDown ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      opacity: hasCharges && !isCoolingDown ? 1 : 0.5,
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      fontSize: '0.74rem',
                    }}
                  >
                    <span style={{ opacity: 0.5 }}>{hotkey}</span>
                    {icon}
                    <span>{skill.remainingCharges}</span>
                  </button>
                );
              })}
            </div>

            {/* Hint & Listen mode replay */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {selectedMode === 'listen' && (
                <button
                  type="button"
                  onClick={handleReplayAudio}
                  title="Nghe lại [F2]"
                  style={{
                    padding: '5px 9px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--color-ink)',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '1.5px 2px 0px var(--color-ink)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                  }}
                >
                  <Volume2 size={15} /> F2
                </button>
              )}
              <button
                type="button"
                onClick={handleHintClick}
                title="Gợi ý [F1]"
                style={{
                  padding: '5px 9px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--color-ink)',
                  backgroundColor: '#FFF9E6',
                  boxShadow: '1.5px 2px 0px var(--color-ink)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                }}
              >
                <HelpCircle size={15} /> F1
              </button>
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
              backgroundColor: 'rgba(15, 23, 42, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 200,
            }}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '2px solid var(--color-ink)',
                borderRadius: '16px',
                boxShadow: '4px 6px 0px var(--color-ink)',
                padding: '24px 28px',
                width: '88%',
                maxWidth: '320px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, margin: '0 0 6px 0' }}>
                PAUSE
              </h2>

              <StickerButton
                variant="primary"
                size="md"
                onClick={handleTogglePause}
                icon={<Play fill="var(--color-ink)" size={16} />}
              >
                Tiếp Tục [Esc]
              </StickerButton>

              <StickerButton size="md" onClick={handleRestart} icon={<RotateCcw size={16} />}>
                Chơi Lại
              </StickerButton>

              <StickerButton size="md" variant="danger" onClick={handleQuit} icon={<Home size={16} />}>
                Về Trang Chủ
              </StickerButton>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontWeight: 800,
                            color: isCopy ? '#15803D' : '#B91C1C',
                            fontFamily: isCopy ? 'var(--font-english)' : 'var(--font-vietnamese)',
                            fontSize: '0.82rem',
                          }}
                        >
                          {isCopy ? selectedEnemy.word : (selectedEnemy.meaningText || selectedEnemy.promptText)}
                        </span>
                        {isCopy && selectedEnemy.meaningText && (
                          <span style={{ color: '#64748B', fontWeight: 600, fontSize: '0.74rem' }}>
                            ({selectedEnemy.meaningText})
                          </span>
                        )}
                      </div>

                      <div style={{ fontFamily: 'var(--font-english)', fontWeight: 800, fontSize: '1.1rem', marginTop: '2px', letterSpacing: '1px' }}>
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
              <div style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', color: 'var(--color-muted-ink)' }}>
                {engineState.status === 'BOSS_PLAYING' ? '💀 BOSS' : 'Chạm quái để nhắm'}
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
                    padding: isShortMobile ? '4px 3px' : '5px 4px',
                    backgroundColor: hasCharges && !isCoolingDown ? '#FFFFFF' : '#E2E8F0',
                    border: '1.5px solid var(--color-ink)',
                    borderRadius: '8px',
                    boxShadow: hasCharges && !isCoolingDown ? '1.5px 2px 0px var(--color-ink)' : 'none',
                    cursor: hasCharges && !isCoolingDown ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    opacity: hasCharges && !isCoolingDown ? 1 : 0.5,
                  }}
                >
                  {icon}
                  <span style={{ fontWeight: 800, fontSize: '0.75rem' }}>{skill.remainingCharges}</span>
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
                aria-label="Gõ từ tiếng Anh"
                defaultValue=""
                onFocus={syncNativeInput}
                onChange={handleNativeInputChange}
                onKeyDown={handleNativeInputKeyDown}
                onCompositionStart={() => nativeTypingRef.current.startComposition()}
                onCompositionEnd={(e) => {
                  if (engineRef.current) {
                    e.currentTarget.value = nativeTypingRef.current.endComposition(
                      engineRef.current, e.currentTarget.value
                    );
                  }
                }}
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
                    letterSpacing: '0.5px',
                  }}
                >
                  SPACE
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
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
