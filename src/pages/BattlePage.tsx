import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../app/appStore';
import { GameEngine } from '../game/engine/gameEngine';
import { playSoundEffect, configureSoundSettings } from '../utils/soundEffects';
import { selectSessionWords } from '../learning/sessionSelector';
import { logAttempt } from '../learning/attempts';
import { drawAlienPurple, drawPonpi } from '../game/assets/PonpiRenderer';
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
} from 'lucide-react';
import { DefeatedWordEffect, RunSummary } from '../types/game';
import { GameMapId, getActiveMapId, setActiveMapId, MAP_CONFIGS } from '../config/maps';
import { drawSvgMapBackground } from '../game/assets/SvgMapBackground';

export const BattlePage: React.FC = () => {
  const {
    selectedSetId,
    selectedMode,
    selectedDifficulty,
    selectedMap,
    setSelectedMap,
    inventory,
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

  const isPortrait = windowDimensions.height > windowDimensions.width;
  const isMobile = windowDimensions.width < 900;
  const isMobilePortrait = isMobile && isPortrait;
  const isShortMobile = isMobilePortrait && windowDimensions.height < 720;
  const mobileControlsHeight = isMobilePortrait
    ? Math.min(260, Math.max(224, Math.round(windowDimensions.height * 0.3)))
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
      // Select 15 words according to spaced repetition logic
      const sessionWords = await selectSessionWords(selectedSetId, GAME_BALANCE.sessionWords);
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
        equippedSkills: inventory?.equippedSkillIds || ['skill_slow_shot'],
        equippedOutfitId: inventory?.equippedOutfitId || null,
        equippedHatId: inventory?.equippedHatId || null,
        equippedShirtId: inventory?.equippedShirtId || null,
        equippedStyleId: inventory?.equippedStyleId || 'style_yellow',
        equippedBulletId: inventory?.equippedBulletId || 'bullet_missile',
        maxConcurrentEnemies: isMobile ? 3 : GAME_BALANCE.maxConcurrentEnemies,
        onAttempt: (params) => {
          logAttempt(params);
        },
        onRunFinished: (summary: RunSummary) => {
          setLastRunSummary(summary);
          navigateTo('results');
        },
        onSoundEffect: (type, weaponKind, isFinishing) => {
          playSynthSound(type, weaponKind, isFinishing);
        },
      });

      engineRef.current = engine;

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

    // 4. Draw Enemies (Single species: Alien Purple, Boss in wave 3 - scaled down)
    for (const enemy of eng.enemies) {
      const isSlow = (enemy.statusEffects.slowUntilGameMs || 0) > eng.gameTimeMs;
      const isFrozen = (enemy.statusEffects.freezeUntilGameMs || 0) > eng.gameTimeMs;

      drawAlienPurple(ctx, mapX(enemy.x), mapY(enemy.y), {
        selected: enemy.id === eng.selectedEnemyId,
        isSlowed: isSlow,
        isFrozen: isFrozen,
        animTime: eng.gameTimeMs,
        boss: enemy.isBoss,
        scale: 0.58 * visualScale,
      });
    }

    // 5. Draw Bullets (custom rocket missiles, laser, fireballs, crystals, slow shots)
    for (const bullet of eng.bullets) {
      drawBullet(ctx, bullet, mapX(bullet.x), mapY(bullet.y), visualScale, eng.gameTimeMs);
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
      ctx.font = `900 ${Math.max(28, Math.min(48, width / 12))}px 'Comic Sans MS', 'Comic Sans', 'Comic Neue', cursive, sans-serif`;
      ctx.fillStyle = '#25232B';
      ctx.textAlign = 'center';
      ctx.fillText('WAVE CLEAR!', width / 2, height / 2 - 20);
      ctx.font = `700 ${Math.max(13, Math.min(20, width / 32))}px 'Be Vietnam Pro', 'Inter', 'Segoe UI', sans-serif`;
      ctx.fillStyle = '#6E6A72';
      ctx.fillText('Chuẩn bị đợt quái tiếp theo...', width / 2, height / 2 + 25);
      ctx.restore();
    }
  };

  const handleEnemyTagClick = (enemyId: string) => {
    if (engineRef.current) {
      engineRef.current.selectTarget(enemyId);
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
      {/* Hidden input to capture native mobile keyboard input if user prefers */}
      <input
        ref={hiddenInputRef}
        type="text"
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        style={{
          position: 'fixed',
          top: '-100px',
          left: '-100px',
          opacity: 0,
          pointerEvents: 'none',
          width: '1px',
          height: '1px',
        }}
        onChange={(e) => {
          const val = e.target.value;
          if (val && engineRef.current) {
            for (const char of val) {
              engineRef.current.handleCharacterInput(char);
            }
          }
          e.target.value = '';
        }}
        onKeyDown={(e) => {
          if (e.key === 'Backspace') {
            engineRef.current?.handleBackspace();
          }
        }}
      />

      {/* The play field fills every available pixel; the renderer keeps sprites proportional. */}
      <div
        ref={containerRef}
        className="battle-viewport-container"
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
                    ? `clamp(${enemy.isBoss ? 68 : 40}px, ${leftPct}%, calc(100% - ${enemy.isBoss ? 68 : 40}px))`
                    : `${leftPct}%`,
                  top: `${topPct + (enemy.isBoss ? 4.8 : 3.2)}%`,
                  transform: 'translate(-50%, 0)',
                  pointerEvents: 'auto',
                  opacity: enemy.pendingDefeat ? 0.9 : 1,
                }}
              >
                <WordTag
                  promptText={enemy.promptText}
                  expectedWord={enemy.word}
                  meaningText={enemy.meaningText}
                  typedBuffer={currentBuffer}
                  isSelected={isSelected}
                  mode={selectedMode}
                  isBoss={enemy.isBoss}
                  bossSegmentsRemaining={enemy.bossSegmentsRemaining}
                  bossMaxSegments={enemy.bossMaxSegments}
                  compact={isMobile}
                  onClick={() => !enemy.pendingDefeat && handleEnemyTagClick(enemy.id)}
                />
              </div>
            );
          })}
        </div>

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
                backgroundColor: '#FFFFFF',
                border: 'var(--border-ink)',
                borderRadius: 'var(--radius-full)',
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: isMobile ? '0.72rem' : '0.82rem',
                boxShadow: 'var(--shadow-sticker-sm)',
                whiteSpace: 'nowrap',
              }}
            >
              {engineState.wave === 3 ? (isMobile ? 'W3: TRÙM' : 'WAVE 3: TRÙM CUỐI (BOSS)') : `${isMobile ? 'ĐỢT' : 'ĐỢT'} ${engineState.wave}/${engineState.totalWaves}`}
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
                  {selectedMap === 'forest-mountain' ? '↺ Chuyển về Map Mặc Định' : '🌲 Thử nghiệm Map: Phong Cảnh Núi Rừng'}
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
            }}
          >
            {selectedEnemy ? (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--color-muted-ink)', fontWeight: 600 }}>
                  {selectedMode === 'copy' && 'Nấc 1 (Gõ từ): '}
                  {selectedMode === 'recall' && 'Nấc 2 (Nhớ nghĩa): '}
                  {selectedMode === 'listen' && 'Nấc 3 (Nghe & gõ): '}
                  <span
                    style={{
                      fontWeight: 800,
                      color: 'var(--color-ink)',
                      fontFamily: selectedMode === 'copy' ? 'var(--font-english)' : 'var(--font-vietnamese)',
                    }}
                  >
                    {selectedMode === 'copy' ? selectedEnemy.word : selectedEnemy.promptText}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-english)', fontWeight: 800, fontSize: '1.15rem', marginTop: '2px', letterSpacing: '1px' }}>
                  {(() => {
                    const typedLen = Math.min(engineState.typedBuffer.length, selectedEnemy.word.length);
                    const typedPart = selectedEnemy.word.slice(0, typedLen);
                    const remainingPart = selectedEnemy.word.slice(typedLen);

                    if (selectedMode === 'copy') {
                      return (
                        <>
                          <span style={{ color: '#16A34A', textDecoration: 'underline' }}>{typedPart}</span>
                          <span style={{ color: '#DC2626' }}>{remainingPart}</span>
                        </>
                      );
                    }

                    const remainingSlots = Math.max(0, selectedEnemy.word.length - typedLen);
                    return (
                      <>
                        {typedPart.length > 0 && (
                          <span style={{ color: '#16A34A', textDecoration: 'underline' }}>{typedPart}</span>
                        )}
                        <span style={{ color: '#9CA3AF' }}>{' _'.repeat(remainingSlots)}</span>
                      </>
                    );
                  })()}
                </div>
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

          {/* Mobile On-Screen Sticker Keyboard */}
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

            {/* Bottom Keyboard Controls: Space Bar & System Keyboard toggle */}
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
                onClick={() => hiddenInputRef.current?.focus()}
                title="Mở bàn phím hệ thống"
                style={{
                  padding: '0 12px',
                  height: `${isShortMobile ? 27 : 30}px`,
                  backgroundColor: '#FFFFFF',
                  color: 'var(--color-ink)',
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
                <Keyboard size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
