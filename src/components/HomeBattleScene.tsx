import React, { useEffect, useRef } from 'react';
import { drawPonpi } from '../game/assets/PonpiRenderer';
import { drawMonster, REGULAR_MONSTER_SPECIES, MonsterSpeciesMeta } from '../game/assets/MonsterRenderer';
import { drawBullet } from '../game/assets/BulletRenderer';
import { BulletState, PoseId } from '../types/game';
import { playSoundEffect } from '../utils/soundEffects';

interface FallingEnemy {
  id: string;
  x: number;
  y: number;
  vy: number;
  seed: number;
  species: MonsterSpeciesMeta;
  word: string;
  hp: number;
  maxHp: number;
  lastHitTime: number;
  scale: number;
}

interface BattleBullet {
  id: string;
  x: number;
  y: number;
  targetId: string;
  targetX: number;
  targetY: number;
  speed: number;
  angle: number;
  kind: 'bullet_default' | 'bullet_missile' | 'bullet_shuriken' | 'bullet_kunai';
}

interface HitParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

const SAMPLE_WORDS = [
  'DEFEND', 'HERO', 'STRIKE', 'MAGIC', 'SHADOW',
  'POWER', 'SWORD', 'BLAST', 'SHIELD', 'SPELL',
  'SPEED', 'VICTORY', 'COMBO', 'FOCUS', 'BRAVE',
];

export const HomeBattleScene: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();
    const startTime = lastTime;
    let lastShotTime = 0;
    let muzzleFlash = 0;
    let currentPose: PoseId = 'fire_up';

    let enemies: FallingEnemy[] = [];
    let bullets: BattleBullet[] = [];
    let particles: HitParticle[] = [];
    let floatingTexts: FloatingText[] = [];

    // Resize canvas dynamically to fit container
    const updateCanvasSize = () => {
      const container = containerRef.current;
      if (!container || !canvas) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(180, Math.floor(rect.width));
      const h = Math.max(160, Math.floor(rect.height));

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Helper: spawn one falling enemy
    const spawnEnemy = (yOffset = -50): FallingEnemy => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const speciesList = REGULAR_MONSTER_SPECIES.length > 0 ? REGULAR_MONSTER_SPECIES : [
        {
          id: 'bat_purple',
          name: 'Dơi Tím',
          title: 'Bat',
          element: 'dark' as const,
          isBoss: false,
          archetype: 'speedster' as const,
          speedMultiplier: 1.0,
          requiredWords: 1,
          dangerLevel: 2 as const,
          abilityDescription: '',
          pvzLore: '',
          primaryColor: '#8E44AD',
          auraColor: 'rgba(142,68,173,0.4)',
          secondaryColor: '#BB8FCE',
        },
      ];
      const species = speciesList[Math.floor(Math.random() * speciesList.length)];
      const word = SAMPLE_WORDS[Math.floor(Math.random() * SAMPLE_WORDS.length)];
      const minX = 70;
      const maxX = Math.max(minX + 80, w - 70);
      const x = minX + Math.random() * (maxX - minX);

      return {
        id: `mob_${Date.now()}_${Math.random()}`,
        x,
        y: yOffset,
        vy: 24 + Math.random() * 22,
        seed: Math.random() * 100,
        species,
        word,
        hp: 2,
        maxHp: 2,
        lastHitTime: 0,
        scale: 0.85,
      };
    };

    // Pre-populate 3 falling enemies at staggered heights
    enemies = [
      spawnEnemy(40),
      spawnEnemy(120),
      spawnEnemy(-20),
    ];

    // Trigger hit burst VFX
    const triggerHitVFX = (x: number, y: number, color: string, isDefeat = false) => {
      const count = isDefeat ? 20 : 10;
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = (isDefeat ? 80 : 50) + Math.random() * (isDefeat ? 140 : 80);
        particles.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          color,
          size: 3 + Math.random() * (isDefeat ? 6 : 3),
          life: 0,
          maxLife: isDefeat ? 500 : 350,
        });
      }

      floatingTexts.push({
        x: x + (Math.random() * 20 - 10),
        y: y - 10,
        text: isDefeat ? '+250' : '+100',
        color: isDefeat ? '#FFD47D' : '#FFFFFF',
        life: 0,
        maxLife: 600,
      });
    };

    // User click/touch to manually shoot
    const handleCanvasPointer = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const targetX = clientX - rect.left;
      const targetY = clientY - rect.top;

      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      const ponpiX = w / 2;
      const ponpiY = h - 68;

      const dx = targetX - ponpiX;
      const dy = targetY - ponpiY;
      const angle = Math.atan2(dy, dx);

      muzzleFlash = 160;
      playSoundEffect('shoot', 'bullet_missile', false, 0.25);
      bullets.push({
        id: `click_bullet_${Date.now()}_${Math.random()}`,
        x: ponpiX,
        y: ponpiY - 30,
        targetId: '',
        targetX,
        targetY,
        speed: 460,
        angle,
        kind: 'bullet_missile',
      });
    };

    canvas.addEventListener('mousedown', handleCanvasPointer);
    canvas.addEventListener('touchstart', handleCanvasPointer, { passive: true });

    // Main animation loop
    const render = () => {
      const now = performance.now();
      const deltaMs = Math.min(33, now - lastTime);
      lastTime = now;
      const elapsed = now - startTime;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const isMobile = width < 520;
      const ponpiScale = isMobile ? 1.08 : 1.35;
      const ponpiX = width / 2;
      const ponpiY = Math.max(80, height - (isMobile ? 46 : 58));

      // 1. UPDATE ENEMIES
      const activeEnemies: FallingEnemy[] = [];
      for (const e of enemies) {
        e.y += (e.vy * deltaMs) / 1000;
        e.x += Math.sin((elapsed + e.seed * 300) * 0.003) * 0.6;

        // Reset if reached defense line without being hit
        if (e.y > ponpiY - 50) {
          triggerHitVFX(e.x, e.y, '#EE7772', false);
          // respawn at top
          activeEnemies.push(spawnEnemy(-40));
        } else {
          activeEnemies.push(e);
        }
      }

      // Keep minimum 3 enemies
      while (activeEnemies.length < 3) {
        activeEnemies.push(spawnEnemy(-30 - Math.random() * 80));
      }
      enemies = activeEnemies;

      // 2. AUTO-AIM AND SHOOT AT NEAREST ENEMY
      let targetEnemy: FallingEnemy | null = null;
      let maxY = -999;
      for (const e of enemies) {
        if (e.y > maxY && e.y < ponpiY - 40) {
          maxY = e.y;
          targetEnemy = e;
        }
      }

      if (targetEnemy) {
        const dx = targetEnemy.x - ponpiX;
        const dy = targetEnemy.y - (ponpiY - 20);
        const aimAngle = Math.atan2(dy, dx);

        // Map angle to Ponpi pose
        if (aimAngle < -2.4) currentPose = 'fire_left';
        else if (aimAngle < -1.8) currentPose = 'fire_up_left';
        else if (aimAngle < -1.3) currentPose = 'fire_up';
        else if (aimAngle < -0.7) currentPose = 'fire_up_right';
        else currentPose = 'fire_right';

        // Auto-fire cadence every 480ms
        if (now - lastShotTime > 480) {
          lastShotTime = now;
          muzzleFlash = 160;

          const bulletKinds: BattleBullet['kind'][] = [
            'bullet_default', 'bullet_missile', 'bullet_shuriken', 'bullet_kunai',
          ];
          const chosenKind = bulletKinds[Math.floor(Math.random() * bulletKinds.length)];

          bullets.push({
            id: `auto_bullet_${now}`,
            x: ponpiX,
            y: ponpiY - 30,
            targetId: targetEnemy.id,
            targetX: targetEnemy.x,
            targetY: targetEnemy.y,
            speed: 420,
            angle: aimAngle,
            kind: chosenKind,
          });
        }
      }

      // 3. UPDATE & DRAW BULLETS
      const activeBullets: BattleBullet[] = [];
      for (const b of bullets) {
        // Track target enemy if still alive
        const enemy = enemies.find((e) => e.id === b.targetId);
        if (enemy) {
          b.targetX = enemy.x;
          b.targetY = enemy.y;
          const dx = b.targetX - b.x;
          const dy = b.targetY - b.y;
          b.angle = Math.atan2(dy, dx);
        }

        b.x += Math.cos(b.angle) * ((b.speed * deltaMs) / 1000);
        b.y += Math.sin(b.angle) * ((b.speed * deltaMs) / 1000);

        // Check collision with any enemy
        let hitEnemy: FallingEnemy | null = null;
        for (const e of enemies) {
          const dist = Math.hypot(e.x - b.x, e.y - b.y);
          if (dist < 40) {
            hitEnemy = e;
            break;
          }
        }

        if (hitEnemy) {
          hitEnemy.hp -= 1;
          hitEnemy.lastHitTime = now;
          hitEnemy.y -= 8; // slight recoil upward

          if (hitEnemy.hp <= 0) {
            playSoundEffect('hit', undefined, true, 0.3);
            triggerHitVFX(hitEnemy.x, hitEnemy.y, hitEnemy.species.primaryColor, true);
            // Replace with a new enemy at top
            enemies = enemies.filter((e) => e.id !== hitEnemy!.id);
            enemies.push(spawnEnemy(-40));
          } else {
            playSoundEffect('hit', undefined, false, 0.2);
            triggerHitVFX(b.x, b.y, '#FFD47D', false);
          }
        } else if (b.x >= -40 && b.x <= width + 40 && b.y >= -40 && b.y <= height + 40) {
          activeBullets.push(b);

          // Draw bullet
          const mockBulletState: BulletState = {
            id: b.id,
            x: b.x,
            y: b.y,
            targetEnemyId: b.targetId,
            speed: b.speed,
            spawnedAtGameMs: 0,
            createdAt: 0,
            kind: b.kind,
            angle: b.angle,
          };
          drawBullet(ctx, mockBulletState, b.x, b.y, 0.9, elapsed);
        }
      }
      bullets = activeBullets;

      // 4. DRAW FALLING ENEMIES + WORD BADGES
      for (const e of enemies) {
        // Draw enemy sprite
        drawMonster(ctx, e.x, e.y, {
          speciesId: e.species.id,
          isBoss: false,
          selected: e.id === targetEnemy?.id,
          animTime: elapsed,
          lastHitTimeMs: e.lastHitTime,
          scale: e.scale,
        });

        // Floating Word Pill Tag above monster
        ctx.save();
        const tagY = e.y - 42;
        const tagText = e.word;
        ctx.font = 'bold 12px "Mali", "Nunito", sans-serif';
        const metrics = ctx.measureText(tagText);
        const tagW = metrics.width + 16;
        const tagH = 20;

        // Background pill
        ctx.fillStyle = e.id === targetEnemy?.id ? '#FFF8E1' : '#FFFFFF';
        ctx.strokeStyle = e.id === targetEnemy?.id ? '#B52C27' : '#302D26';
        ctx.lineWidth = e.id === targetEnemy?.id ? 2.2 : 1.6;

        ctx.beginPath();
        ctx.roundRect(e.x - tagW / 2, tagY - tagH / 2, tagW, tagH, 10);
        ctx.fill();
        ctx.stroke();

        // Word text
        ctx.fillStyle = e.id === targetEnemy?.id ? '#B52C27' : '#302D26';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tagText, e.x, tagY);
        ctx.restore();
      }

      // 5. DRAW DEFENDER PLATFORM & PONPI AT BOTTOM
      // Soft defense pedestal
      const pedW = isMobile ? 65 : 85;
      const pedH = isMobile ? 16 : 21;
      const pedY = ponpiY + (isMobile ? 16 : 20);

      ctx.save();
      ctx.fillStyle = 'rgba(175, 203, 134, 0.45)';
      ctx.strokeStyle = '#302D26';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(ponpiX, pedY, pedW, pedH, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Pedestal inner glow ring
      ctx.strokeStyle = '#AFCB86';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(ponpiX, pedY, pedW * 0.85, pedH * 0.75, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Draw Ponpi
      if (muzzleFlash > 0) {
        muzzleFlash = Math.max(0, muzzleFlash - deltaMs);
      }
      drawPonpi(ctx, ponpiX, ponpiY, {
        pose: currentPose,
        styleId: 'style_yellow',
        outfitId: null,
        scale: ponpiScale,
        muzzleFlashMs: muzzleFlash,
        breathingTime: elapsed,
      });

      // 6. DRAW PARTICLES
      const activeParticles: HitParticle[] = [];
      for (const p of particles) {
        p.x += (p.vx * deltaMs) / 1000;
        p.y += (p.vy * deltaMs) / 1000;
        p.life += deltaMs;

        if (p.life < p.maxLife) {
          activeParticles.push(p);
          const progress = p.life / p.maxLife;
          const alpha = 1 - progress;
          const curSize = p.size * (1 - progress * 0.5);

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, curSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      particles = activeParticles;

      // 7. DRAW FLOATING TEXT POPUPS
      const activePopups: FloatingText[] = [];
      for (const ft of floatingTexts) {
        ft.y -= (35 * deltaMs) / 1000;
        ft.life += deltaMs;

        if (ft.life < ft.maxLife) {
          activePopups.push(ft);
          const progress = ft.life / ft.maxLife;
          const alpha = 1 - progress;

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.font = '900 14px "Mali", "Nunito", sans-serif';
          ctx.fillStyle = ft.color;
          ctx.strokeStyle = '#282623';
          ctx.lineWidth = 3;
          ctx.textAlign = 'center';
          ctx.strokeText(ft.text, ft.x, ft.y);
          ctx.fillText(ft.text, ft.x, ft.y);
          ctx.restore();
        }
      }
      floatingTexts = activePopups;

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateCanvasSize);
      canvas.removeEventListener('mousedown', handleCanvasPointer);
      canvas.removeEventListener('touchstart', handleCanvasPointer);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="home-battle-container"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'crosshair',
        touchAction: 'manipulation',
      }}
      title="Chạm vào màn hình để nã đạn!"
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          touchAction: 'none',
        }}
      />
    </div>
  );
};
