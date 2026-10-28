import React, { useEffect, useRef, useState } from 'react';
import { BulletKind, BulletState, PoseId } from '../types/game';
import { drawPonpi } from '../game/assets/PonpiRenderer';
import { drawBullet } from '../game/assets/BulletRenderer';
import { PONPI_RIG } from '../game/assets/ponpiRig';
import { StickerButton } from './StickerButton';

interface PonpiPreviewProps {
  styleId?: string;
  outfitId?: string | null;
  hatId?: string | null;
  shirtId?: string | null;
  bulletId?: string | null;
  scale?: number;
  showPoseSelector?: boolean;
  width?: number;
  height?: number;
  initialPose?: PoseId;
  frameless?: boolean;
}

interface FlyingBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  kind: BulletKind;
  lifeMs: number;
  maxLifeMs: number;
}

export const PonpiPreview: React.FC<PonpiPreviewProps> = ({
  styleId = 'style_yellow',
  outfitId = null,
  hatId = null,
  shirtId = null,
  bulletId = 'bullet_missile',
  scale = 1.3,
  showPoseSelector = true,
  width = 240,
  height = 240,
  initialPose = 'idle',
  frameless = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [pose, setPose] = useState<PoseId>(initialPose);
  const [muzzleFlash, setMuzzleFlash] = useState(0);
  const bulletsRef = useRef<FlyingBullet[]>([]);

  useEffect(() => {
    let animId: number;
    let startTime = performance.now();
    let lastTime = startTime;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const now = performance.now();
      const delta = Math.min(32, now - lastTime);
      lastTime = now;
      const elapsed = now - startTime;

      ctx.clearRect(0, 0, width, height);

      // Draw pempom
      const centerX = width / 2;
      const centerY = height / 2 + 10;
      drawPonpi(ctx, centerX, centerY, {
        pose,
        styleId,
        outfitId,
        hatId,
        shirtId,
        scale,
        muzzleFlashMs: muzzleFlash,
        breathingTime: elapsed,
      });

      // Update & Draw Preview Flying Bullets
      const activeBullets: FlyingBullet[] = [];
      for (const b of bulletsRef.current) {
        b.x += (b.vx * delta) / 1000;
        b.y += (b.vy * delta) / 1000;
        b.lifeMs += delta;

        if (b.lifeMs < b.maxLifeMs && b.x >= -30 && b.x <= width + 30 && b.y >= -30 && b.y <= height + 30) {
          activeBullets.push(b);

          const mockState: BulletState = {
            id: 'preview_bullet',
            x: b.x,
            y: b.y,
            targetEnemyId: '',
            speed: 300,
            spawnedAtGameMs: 0,
            createdAt: 0,
            kind: b.kind,
            angle: b.angle,
          };

          drawBullet(ctx, mockState, b.x, b.y, 0.7 * (scale / 1.3), elapsed);
        }
      }
      bulletsRef.current = activeBullets;

      if (muzzleFlash > 0) {
        setMuzzleFlash((prev) => Math.max(0, prev - 16));
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [pose, styleId, outfitId, hatId, shirtId, scale, width, height, muzzleFlash, bulletId]);

  const handlePoseClick = (newPose: PoseId) => {
    setPose(newPose);
    setMuzzleFlash(160);

    // Compute aim direction and spawn preview bullet
    const rig = PONPI_RIG[newPose] || PONPI_RIG.idle;
    const centerX = width / 2;
    const centerY = height / 2 + 10;
    const startX = centerX + rig.muzzleAnchor.x * scale;
    const startY = centerY + rig.muzzleAnchor.y * scale;

    let aimAngle = -Math.PI / 2;
    if (newPose === 'fire_left') aimAngle = -Math.PI * 0.92;
    else if (newPose === 'fire_right') aimAngle = -Math.PI * 0.08;
    else if (newPose === 'fire_up_left') aimAngle = -Math.PI * 0.75;
    else if (newPose === 'fire_up_right') aimAngle = -Math.PI * 0.25;
    else if (newPose === 'fire_up') aimAngle = -Math.PI / 2;

    const speed = 260;
    const kind = ((bulletId === 'slow_shot' ? 'slow_shot' : bulletId) as BulletKind) || 'bullet_missile';

    bulletsRef.current.push({
      x: startX,
      y: startY,
      vx: Math.cos(aimAngle) * speed,
      vy: Math.sin(aimAngle) * speed,
      angle: aimAngle,
      kind,
      lifeMs: 0,
      maxLifeMs: 900,
    });
  };

  const poses: { id: PoseId; label: string }[] = [
    { id: 'fire_left', label: '← Trái' },
    { id: 'fire_up_left', label: '↖ Chéo trái' },
    { id: 'fire_up', label: '↑ Thẳng' },
    { id: 'fire_up_right', label: '↗ Chéo phải' },
    { id: 'fire_right', label: '→ Phải' },
    { id: 'idle', label: '● Thư giãn' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div
        className={frameless ? 'character-preview' : 'notebook-grid-bg'}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          border: frameless ? 'none' : 'var(--border-ink)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: frameless ? 'none' : 'var(--shadow-sticker)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <canvas ref={canvasRef} width={width} height={height} />
      </div>

      {showPoseSelector && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', maxWidth: '340px' }}>
          {poses.map((p) => (
            <StickerButton
              key={p.id}
              size="sm"
              variant={pose === p.id ? 'primary' : 'default'}
              onClick={() => handlePoseClick(p.id)}
            >
              {p.label}
            </StickerButton>
          ))}
        </div>
      )}
    </div>
  );
};
