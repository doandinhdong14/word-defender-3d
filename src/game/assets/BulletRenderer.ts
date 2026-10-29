import { BulletState } from '../../types/game';
import missileUrl from './items/bullet_missile.png';
import shurikenUrl from './items/bullet_shuriken.png';
import kunaiUrl from './items/bullet_kunai.png';
import soccerUrl from './items/bullet_soccer.png';
import basketballUrl from './items/bullet_basketball.png';

let missileImg: HTMLImageElement | null = null;
let shurikenImg: HTMLImageElement | null = null;
let kunaiImg: HTMLImageElement | null = null;
let soccerImg: HTMLImageElement | null = null;
let basketballImg: HTMLImageElement | null = null;

function loadImage(src: string): HTMLImageElement {
  const img = new Image();
  img.src = src;
  return img;
}

export function preloadBulletImages(): void {
  if (typeof window === 'undefined') return;
  if (!missileImg) missileImg = loadImage(missileUrl);
  if (!shurikenImg) shurikenImg = loadImage(shurikenUrl);
  if (!kunaiImg) kunaiImg = loadImage(kunaiUrl);
  if (!soccerImg) soccerImg = loadImage(soccerUrl);
  if (!basketballImg) basketballImg = loadImage(basketballUrl);
}

// Auto preload on browser load
if (typeof window !== 'undefined') {
  preloadBulletImages();
}

/**
 * Draws any bullet with custom sprites, orientations, animations (spin/aim) and VFX
 */
export function drawBullet(
  ctx: CanvasRenderingContext2D,
  bullet: BulletState,
  bulletX: number,
  bulletY: number,
  visualScale: number,
  gameTimeMs: number
): void {
  ctx.save();
  ctx.translate(bulletX, bulletY);

  const angle = bullet.angle ?? -Math.PI / 2;

  switch (bullet.kind) {
    case 'bullet_missile': {
      // 1. ROCKET MISSILE (Rotates nose directly towards enemy)
      ctx.rotate(angle + Math.PI / 2);

      const isLoaded = missileImg && missileImg.complete && missileImg.naturalWidth > 0;
      const missileH = Math.max(15, 24 * visualScale);
      const missileW = (168 / 706) * missileH;

      if (isLoaded) {
        const pivotY = -missileH * 0.35;
        ctx.drawImage(missileImg!, -missileW / 2, pivotY, missileW, missileH);

        // Glowing booster pulse at nozzle
        const nozzleY = pivotY + missileH * 0.62;
        const pulse = 1.0 + Math.sin(gameTimeMs * 0.05) * 0.25;

        // Outer orange jet flare
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 152, 0, 0.65)';
        ctx.ellipse(0, nozzleY, missileW * 0.6 * pulse, missileH * 0.22 * pulse, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner yellow jet core
        ctx.beginPath();
        ctx.fillStyle = '#FFEE58';
        ctx.ellipse(0, nozzleY, missileW * 0.35, missileH * 0.12 * pulse, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        drawFallbackVectorMissile(ctx, missileW, missileH);
      }
      break;
    }

    case 'bullet_shuriken': {
      // 2. NINJA SHURIKEN (Rapidly spins in flight)
      const spinAngle = (gameTimeMs * 0.02) % (Math.PI * 2);
      ctx.rotate(spinAngle);

      const isLoaded = shurikenImg && shurikenImg.complete && shurikenImg.naturalWidth > 0;
      const size = Math.max(12, 19.5 * visualScale);

      if (isLoaded) {
        ctx.drawImage(shurikenImg!, -size / 2, -size / 2, size, size);
      } else {
        // Fallback 4-point ninja star vector
        drawFallbackShuriken(ctx, size);
      }
      break;
    }

    case 'bullet_kunai': {
      // 3. KUNAI KNIFE (Flies straight with sharp tip pointing directly at monster)
      ctx.rotate(angle + Math.PI / 2);

      const isLoaded = kunaiImg && kunaiImg.complete && kunaiImg.naturalWidth > 0;
      const kunaiH = Math.max(15, 25 * visualScale);
      const kunaiW = (96 / 214) * kunaiH;

      if (isLoaded) {
        // Pivot around blade center so tip leads forward
        const pivotY = -kunaiH * 0.42;
        ctx.drawImage(kunaiImg!, -kunaiW / 2, pivotY, kunaiW, kunaiH);

        // Subtle wind slash line behind ring handle
        ctx.beginPath();
        ctx.moveTo(0, pivotY + kunaiH * 0.95);
        ctx.lineTo(0, pivotY + kunaiH * 1.25);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = Math.max(1, 1.5 * visualScale);
        ctx.stroke();
      } else {
        drawFallbackKunai(ctx, kunaiW, kunaiH);
      }
      break;
    }

    case 'bullet_soccer': {
      // 4. SOCCER BALL (Spins continuously in flight)
      const spinAngle = (gameTimeMs * 0.014) % (Math.PI * 2);
      ctx.rotate(spinAngle);

      const isLoaded = soccerImg && soccerImg.complete && soccerImg.naturalWidth > 0;
      const size = Math.max(11, 18 * visualScale);

      if (isLoaded) {
        ctx.drawImage(soccerImg!, -size / 2, -size / 2, size, size);
      } else {
        drawFallbackBall(ctx, size, '#FFFFFF', '#263238');
      }
      break;
    }

    case 'bullet_basketball': {
      // 5. BASKETBALL (Spins continuously in flight)
      const spinAngle = (gameTimeMs * 0.014) % (Math.PI * 2);
      ctx.rotate(spinAngle);

      const isLoaded = basketballImg && basketballImg.complete && basketballImg.naturalWidth > 0;
      const size = Math.max(11, 18 * visualScale);

      if (isLoaded) {
        ctx.drawImage(basketballImg!, -size / 2, -size / 2, size, size);
      } else {
        drawFallbackBall(ctx, size, '#FF6D00', '#25232B');
      }
      break;
    }

    case 'bullet_laser': {
      // 6. PLASMA BOLT
      ctx.rotate(angle);
      const boltLength = Math.max(11, 17.5 * visualScale);
      const boltWidth = Math.max(2.8, 4.0 * visualScale);

      ctx.beginPath();
      ctx.fillStyle = 'rgba(0, 229, 255, 0.35)';
      ctx.ellipse(0, 0, boltLength * 0.7, boltWidth * 1.6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = '#00E5FF';
      ctx.roundRect(-boltLength / 2, -boltWidth / 2, boltLength, boltWidth, boltWidth / 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = '#FFFFFF';
      ctx.roundRect(-boltLength * 0.38, -boltWidth * 0.25, boltLength * 0.76, boltWidth * 0.5, boltWidth / 4);
      ctx.fill();
      break;
    }

    case 'bullet_fireball': {
      // 7. FIREBALL METEOR
      const spinAngle = (gameTimeMs * 0.02) % (Math.PI * 2);
      ctx.rotate(spinAngle);
      const r = Math.max(4.0, 6.2 * visualScale);

      ctx.beginPath();
      ctx.fillStyle = 'rgba(255, 87, 34, 0.35)';
      ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = '#FF5722';
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = '#25232B';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = '#FFEB3B';
      ctx.fill();
      break;
    }

    case 'bullet_crystal': {
      // 8. CRYSTAL DART
      ctx.rotate(angle);
      const len = Math.max(9.5, 14.5 * visualScale);
      const h = Math.max(3.0, 4.5 * visualScale);

      ctx.beginPath();
      ctx.moveTo(-len / 2, 0);
      ctx.lineTo(0, -h);
      ctx.lineTo(len / 2, 0);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = '#CE93D8';
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = '#25232B';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-len * 0.2, 0);
      ctx.lineTo(0, -h * 0.5);
      ctx.lineTo(len * 0.2, 0);
      ctx.lineTo(0, h * 0.5);
      ctx.closePath();
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      break;
    }

    case 'slow_shot':
    case 'bullet_slow': {
      // 9. ICE FROST SLOW SHOT
      ctx.rotate(angle);
      const r = Math.max(3.5, 5.4 * visualScale);

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const d = i % 2 === 0 ? r : r * 0.55;
        const px = Math.cos(a) * d;
        const py = Math.sin(a) * d;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = '#B2EBF2';
      ctx.fill();
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = '#25232B';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      break;
    }

    case 'bullet_reveal': {
      // REVEAL GOLDEN EYE SHOT
      ctx.rotate(angle);
      const r = Math.max(3.8, 5.6 * visualScale);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD54F';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#25232B';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#FFF';
      ctx.fill();
      break;
    }

    case 'normal':
    case 'bullet_default':
    default: {
      // 10. PINK CANDY ORB (Default bullet)
      const r = Math.max(2.8, 4.5 * visualScale);

      // Pink candy body
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = '#F58AB0';
      ctx.fill();
      ctx.lineWidth = Math.max(1, 1.6 * visualScale);
      ctx.strokeStyle = '#25232B';
      ctx.stroke();

      // Glossy highlight
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.3, r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

function drawFallbackVectorMissile(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h * 0.35, w, h * 0.65, 4);
  ctx.fillStyle = '#B2EBF2';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#25232B';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, -h * 0.35, w / 2, Math.PI, 0);
  ctx.fillStyle = '#FFEB3B';
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-w / 2, h * 0.3);
  ctx.lineTo(0, h * 0.6);
  ctx.lineTo(w / 2, h * 0.3);
  ctx.closePath();
  ctx.fillStyle = '#FF5722';
  ctx.fill();
}

function drawFallbackShuriken(ctx: CanvasRenderingContext2D, size: number): void {
  const r = size / 2;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const d = i % 2 === 0 ? r : r * 0.35;
    const px = Math.cos(a) * d;
    const py = Math.sin(a) * d;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = '#424242';
  ctx.fill();
  ctx.strokeStyle = '#25232B';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.stroke();
}

function drawFallbackKunai(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.45);
  ctx.lineTo(-w / 2, -h * 0.1);
  ctx.lineTo(-w * 0.2, h * 0.2);
  ctx.lineTo(w * 0.2, h * 0.2);
  ctx.lineTo(w / 2, -h * 0.1);
  ctx.closePath();
  ctx.fillStyle = '#78909C';
  ctx.fill();
  ctx.strokeStyle = '#25232B';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawFallbackBall(ctx: CanvasRenderingContext2D, size: number, color: string, stroke: string): void {
  const r = size / 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
}
