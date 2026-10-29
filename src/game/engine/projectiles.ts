import { BulletKind, BulletState, EnemyState, Particle } from '../../types/game';
import { GAME_BALANCE } from '../../config/balance';

export function createBullet(
  startX: number,
  startY: number,
  targetEnemyId: string,
  kind: BulletKind = 'normal',
  gameTimeMs: number,
  isFinishingBullet: boolean = false,
  matchedWord?: string
): BulletState {
  let speed: number = GAME_BALANCE.typedBulletSpeedPxPerSec;

  if (kind === 'slow_shot' || kind === 'bullet_slow') {
    speed = 520;
  } else if (kind === 'bullet_reveal') {
    speed = 640;
  } else if (kind === 'bullet_missile') {
    speed = 540; // High velocity rocket
  } else if (kind === 'bullet_shuriken') {
    speed = 640; // Rapid spinning ninja star
  } else if (kind === 'bullet_kunai') {
    speed = 660; // Fast straight ninja kunai knife
  } else if (kind === 'bullet_soccer') {
    speed = 580; // High velocity soccer kick
  } else if (kind === 'bullet_basketball') {
    speed = 550; // Slam-dunk basketball
  } else if (kind === 'bullet_laser') {
    speed = 680; // Ultra fast plasma bolt
  } else if (kind === 'bullet_fireball') {
    speed = 460;
  } else if (kind === 'bullet_crystal') {
    speed = 520;
  } else if (kind === 'normal' || kind === 'bullet_default') {
    speed = GAME_BALANCE.typedBulletSpeedPxPerSec;
  }

  return {
    id: `bullet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    x: startX,
    y: startY,
    targetEnemyId,
    kind,
    speed,
    spawnedAtGameMs: gameTimeMs,
    createdAt: Date.now(),
    angle: -Math.PI / 2,
    isFinishingBullet,
    matchedWord,
  };
}

export interface HitEnemyEvent {
  enemyId: string;
  kind: BulletKind;
  isFinishingBullet?: boolean;
  matchedWord?: string;
}

export interface ProjectileUpdateResult {
  remainingBullets: BulletState[];
  hitEnemyIds: HitEnemyEvent[];
  newParticles: Particle[];
}

export function updateProjectiles(
  bullets: BulletState[],
  enemies: EnemyState[],
  deltaMs: number,
  nowGameMs: number
): ProjectileUpdateResult {
  const dtSec = deltaMs / 1000;
  const remainingBullets: BulletState[] = [];
  const hitEnemyIds: HitEnemyEvent[] = [];
  const newParticles: Particle[] = [];

  const enemyMap = new Map(enemies.map((e) => [e.id, e]));

  for (const bullet of bullets) {
    const target = enemyMap.get(bullet.targetEnemyId);

    // If target was already destroyed, despawn bullet safely
    if (!target) {
      continue;
    }

    const dx = target.x - bullet.x;
    const dy = target.y - bullet.y;
    const dist = Math.hypot(dx, dy);

    // Update orientation angle to point directly at target!
    bullet.angle = Math.atan2(dy, dx);

    // Hit threshold
    const step = bullet.speed * dtSec;
    if (dist <= step || dist < GAME_BALANCE.hitRadiusPx) {
      hitEnemyIds.push({
        enemyId: bullet.targetEnemyId,
        kind: bullet.kind,
        isFinishingBullet: bullet.isFinishingBullet,
        matchedWord: bullet.matchedWord,
      });

      // Generate custom impact explosion particles based on bullet kind
      if (bullet.kind === 'bullet_missile') {
        // Dramatic rocket explosion
        for (let i = 0; i < 14; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 60 + Math.random() * 110;
          const isCore = i < 4;
          newParticles.push({
            id: `p_${Date.now()}_${Math.random()}`,
            x: target.x,
            y: target.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: isCore ? '#FFEE58' : i % 2 === 0 ? '#FF5722' : '#FF9800',
            size: isCore ? 4 + Math.random() * 3 : 2.5 + Math.random() * 2.5,
            alpha: 1.0,
            decay: 2.8,
            shape: 'circle',
          });
        }
      } else if (bullet.kind === 'bullet_shuriken') {
        // Metallic ninja shuriken spark burst
        for (let i = 0; i < 10; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 50 + Math.random() * 100;
          newParticles.push({
            id: `p_${Date.now()}_${Math.random()}`,
            x: target.x,
            y: target.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: i % 2 === 0 ? '#FFFFFF' : '#424242',
            size: 2.5 + Math.random() * 2,
            alpha: 1.0,
            decay: 3.2,
            shape: 'spark',
          });
        }
      } else if (bullet.kind === 'bullet_kunai') {
        // Sharp blade metal sparks
        for (let i = 0; i < 10; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 55 + Math.random() * 95;
          newParticles.push({
            id: `p_${Date.now()}_${Math.random()}`,
            x: target.x,
            y: target.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: i % 3 === 0 ? '#FFFFFF' : i % 3 === 1 ? '#78909C' : '#37474F',
            size: 2 + Math.random() * 2.5,
            alpha: 1.0,
            decay: 3.0,
            shape: 'spark',
          });
        }
      } else if (bullet.kind === 'bullet_soccer') {
        // Soccer bounce puff & star sparks
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 45 + Math.random() * 85;
          newParticles.push({
            id: `p_${Date.now()}_${Math.random()}`,
            x: target.x,
            y: target.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: i % 2 === 0 ? '#FFFFFF' : '#263238',
            size: 3 + Math.random() * 2.5,
            alpha: 1.0,
            decay: 2.6,
            shape: 'circle',
          });
        }
      } else if (bullet.kind === 'bullet_basketball') {
        // Basketball slam dunk orange sparks
        for (let i = 0; i < 10; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 50 + Math.random() * 100;
          newParticles.push({
            id: `p_${Date.now()}_${Math.random()}`,
            x: target.x,
            y: target.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: i % 2 === 0 ? '#FF6D00' : '#FFD54F',
            size: 3 + Math.random() * 2.5,
            alpha: 1.0,
            decay: 2.8,
            shape: 'circle',
          });
        }
      } else if (bullet.kind === 'bullet_laser') {
        // Cyan electric flash
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const speed = 70 + Math.random() * 60;
          newParticles.push({
            id: `p_${Date.now()}_${Math.random()}`,
            x: target.x,
            y: target.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: i % 2 === 0 ? '#FFFFFF' : '#00E5FF',
            size: 2 + Math.random() * 2.5,
            alpha: 1.0,
            decay: 3.5,
            shape: 'spark',
          });
        }
      } else if (bullet.kind === 'bullet_fireball') {
        // Fiery embers burst
        for (let i = 0; i < 10; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 50 + Math.random() * 90;
          newParticles.push({
            id: `p_${Date.now()}_${Math.random()}`,
            x: target.x,
            y: target.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: Math.random() > 0.5 ? '#FF9800' : '#E64A19',
            size: 3 + Math.random() * 2,
            alpha: 1.0,
            decay: 2.5,
            shape: 'circle',
          });
        }
      } else if (bullet.kind === 'bullet_crystal') {
        // Prismatic diamond sparkles
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 40 + Math.random() * 70;
          newParticles.push({
            id: `p_${Date.now()}_${Math.random()}`,
            x: target.x,
            y: target.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: i % 2 === 0 ? '#FFFFFF' : '#CE93D8',
            size: 2.5 + Math.random() * 2,
            alpha: 1.0,
            decay: 3.0,
            shape: 'spark',
          });
        }
      } else {
        // Standard impact particles (pink candy orb, slow frost, or golden reveal)
        const bKind = bullet.kind as string;
        const particleColor =
          bKind === 'slow_shot' || bKind === 'bullet_slow'
            ? '#70B9E1'
            : bKind === 'bullet_reveal'
            ? '#FFD54F'
            : '#F58AB0';
        for (let i = 0; i < 6; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 40 + Math.random() * 80;
          newParticles.push({
            id: `p_${Date.now()}_${Math.random()}`,
            x: target.x,
            y: target.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: particleColor,
            size: 2 + Math.random() * 3,
            alpha: 1.0,
            decay: 2.5,
          });
        }
      }
    } else {
      // Move bullet towards target
      bullet.x += (dx / dist) * step;
      bullet.y += (dy / dist) * step;

      // In-flight trails
      if (bullet.kind === 'bullet_missile') {
        const nozzleDist = 12; // Behind missile nozzle
        const nx = bullet.x - (dx / dist) * nozzleDist;
        const ny = bullet.y - (dy / dist) * nozzleDist;

        // Orange flame spark
        newParticles.push({
          id: `p_tr_${Date.now()}_${Math.random()}`,
          x: nx + (Math.random() - 0.5) * 2.5,
          y: ny + (Math.random() - 0.5) * 2.5,
          vx: -(dx / dist) * (20 + Math.random() * 30) + (Math.random() - 0.5) * 14,
          vy: -(dy / dist) * (20 + Math.random() * 30) + (Math.random() - 0.5) * 14,
          color: Math.random() > 0.4 ? '#FF9800' : '#FFEE58',
          size: 1.8 + Math.random() * 1.8,
          alpha: 0.85,
          decay: 4.5,
          shape: 'circle',
        });

        // Grey smoke puff
        if (Math.random() > 0.6) {
          newParticles.push({
            id: `p_smk_${Date.now()}_${Math.random()}`,
            x: nx,
            y: ny,
            vx: -(dx / dist) * 10 + (Math.random() - 0.5) * 7,
            vy: -(dy / dist) * 10 + (Math.random() - 0.5) * 7,
            color: 'rgba(189, 189, 189, 0.45)',
            size: 2.5 + Math.random() * 2.5,
            alpha: 0.6,
            decay: 2.2,
            shape: 'circle',
          });
        }
      } else if (bullet.kind === 'bullet_shuriken' && Math.random() > 0.6) {
        // Silver glint
        newParticles.push({
          id: `p_shk_${Date.now()}_${Math.random()}`,
          x: bullet.x,
          y: bullet.y,
          vx: (Math.random() - 0.5) * 12,
          vy: (Math.random() - 0.5) * 12,
          color: '#E0E0E0',
          size: 1.5 + Math.random(),
          alpha: 0.6,
          decay: 4.0,
          shape: 'spark',
        });
      } else if (bullet.kind === 'bullet_basketball' && Math.random() > 0.6) {
        // Orange trail spark
        newParticles.push({
          id: `p_bb_${Date.now()}_${Math.random()}`,
          x: bullet.x,
          y: bullet.y,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          color: '#FFA726',
          size: 1.5 + Math.random(),
          alpha: 0.6,
          decay: 3.5,
          shape: 'circle',
        });
      } else if (bullet.kind === 'bullet_laser' && Math.random() > 0.5) {
        // Cyan plasma spark trail
        newParticles.push({
          id: `p_lz_${Date.now()}_${Math.random()}`,
          x: bullet.x,
          y: bullet.y,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          color: '#80D8FF',
          size: 1.5 + Math.random() * 1.5,
          alpha: 0.7,
          decay: 4.0,
          shape: 'spark',
        });
      } else if (bullet.kind === 'bullet_fireball' && Math.random() > 0.4) {
        // Ember spark trail
        newParticles.push({
          id: `p_fb_${Date.now()}_${Math.random()}`,
          x: bullet.x + (Math.random() - 0.5) * 4,
          y: bullet.y + (Math.random() - 0.5) * 4,
          vx: -(dx / dist) * 15 + (Math.random() - 0.5) * 10,
          vy: -(dy / dist) * 15 + (Math.random() - 0.5) * 10,
          color: Math.random() > 0.5 ? '#FF5722' : '#FFC107',
          size: 1.5 + Math.random() * 2,
          alpha: 0.8,
          decay: 3.5,
          shape: 'circle',
        });
      } else if ((bullet.kind === 'normal' || bullet.kind === 'bullet_default') && Math.random() > 0.6) {
        // Pink sugar trail
        newParticles.push({
          id: `p_df_${Date.now()}_${Math.random()}`,
          x: bullet.x,
          y: bullet.y,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          color: '#F8BBD0',
          size: 1.5 + Math.random(),
          alpha: 0.7,
          decay: 3.5,
          shape: 'circle',
        });
      }

      remainingBullets.push(bullet);
    }
  }

  return { remainingBullets, hitEnemyIds, newParticles };
}
