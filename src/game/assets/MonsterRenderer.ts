// =============================================================
// MONSTER RENDERER - Expressive 4-Frame Sprites & Epic Boss VFX
// =============================================================

export interface MonsterSpeciesMeta {
  id: string;
  name: string;
  title: string;
  element: 'fire' | 'ice' | 'void' | 'ghost' | 'poison' | 'nature' | 'dark' | 'holy' | 'water';
  isBoss: boolean;
  primaryColor: string;
  auraColor: string;
  secondaryColor: string;
}

export const REGULAR_MONSTER_SPECIES: MonsterSpeciesMeta[] = [
  { id: 'bat_purple', name: 'Dơi Tím Hắc Ám', title: 'Shadow Bat', element: 'dark', isBoss: false, primaryColor: '#8E44AD', auraColor: 'rgba(142, 68, 173, 0.45)', secondaryColor: '#BB8FCE' },
  { id: 'wisp_blue', name: 'Linh Hồn Lam Hỏa', title: 'Soul Wisp', element: 'ghost', isBoss: false, primaryColor: '#3498DB', auraColor: 'rgba(52, 152, 219, 0.45)', secondaryColor: '#85C1E9' },
  { id: 'demon_fire', name: 'Quỷ Lửa Dung Nham', title: 'Fire Fiend', element: 'fire', isBoss: false, primaryColor: '#E74C3C', auraColor: 'rgba(231, 76, 60, 0.45)', secondaryColor: '#F39C12' },
  { id: 'ghost_white', name: 'Ma Trơi Băng Hồn', title: 'Frost Specter', element: 'ice', isBoss: false, primaryColor: '#D6EAF8', auraColor: 'rgba(214, 234, 248, 0.55)', secondaryColor: '#AED6F1' },
  { id: 'spider_black', name: 'Nhện Độc Một Mắt', title: 'Cave Spider', element: 'poison', isBoss: false, primaryColor: '#2C3E50', auraColor: 'rgba(52, 73, 94, 0.45)', secondaryColor: '#E74C3C' },
  { id: 'jellyfish_blue', name: 'Sứa Biển Ma Thuật', title: 'Aether Jelly', element: 'water', isBoss: false, primaryColor: '#5DADE2', auraColor: 'rgba(93, 173, 226, 0.45)', secondaryColor: '#A569BD' },
  { id: 'crystal_purple', name: 'Mắt Pha Lê Tím', title: 'Void Shard', element: 'void', isBoss: false, primaryColor: '#9B59B6', auraColor: 'rgba(155, 89, 182, 0.45)', secondaryColor: '#E8DAEF' },
  { id: 'slime_green', name: 'Quái Slime Độc', title: 'Toxic Slime', element: 'poison', isBoss: false, primaryColor: '#2ECC71', auraColor: 'rgba(46, 204, 113, 0.45)', secondaryColor: '#F1C40F' },
  { id: 'skull_flame', name: 'Hộp Sọ Hỏa Ngục', title: 'Infernal Skull', element: 'fire', isBoss: false, primaryColor: '#AF7AC5', auraColor: 'rgba(175, 122, 197, 0.45)', secondaryColor: '#9B59B6' },
  { id: 'reaper_hooded', name: 'Tử Thần Áo Choàng', title: 'Grim Reaper', element: 'ghost', isBoss: false, primaryColor: '#34495E', auraColor: 'rgba(236, 64, 122, 0.45)', secondaryColor: '#EC407A' },
  { id: 'puffer_orange', name: 'Cá Gai Nổ Hỏa', title: 'Spike Puffer', element: 'fire', isBoss: false, primaryColor: '#E67E22', auraColor: 'rgba(230, 126, 34, 0.45)', secondaryColor: '#F39C12' },
  { id: 'angel_pink', name: 'Thiên Thần Thánh Hồn', title: 'Halo Spirit', element: 'holy', isBoss: false, primaryColor: '#F1948A', auraColor: 'rgba(241, 148, 138, 0.5)', secondaryColor: '#F9E79F' },
  { id: 'bat_shadow', name: 'Dơi Bóng Đêm', title: 'Night Bat', element: 'dark', isBoss: false, primaryColor: '#5B2C6F', auraColor: 'rgba(91, 44, 111, 0.45)', secondaryColor: '#A569BD' },
  { id: 'jellyfish_cyan', name: 'Sứa Xanh Phát Quang', title: 'Luminous Jelly', element: 'water', isBoss: false, primaryColor: '#48C9B0', auraColor: 'rgba(72, 201, 176, 0.45)', secondaryColor: '#5DADE2' },
  { id: 'demon_horned', name: 'Ác Quỷ Song Sừng', title: 'Horned Demon', element: 'fire', isBoss: false, primaryColor: '#C0392B', auraColor: 'rgba(192, 57, 43, 0.45)', secondaryColor: '#E74C3C' },
  { id: 'tentacle_green', name: 'Mắt Rừng Xúc Tu', title: 'Forest Gazer', element: 'nature', isBoss: false, primaryColor: '#27AE60', auraColor: 'rgba(39, 174, 96, 0.45)', secondaryColor: '#58D68D' },
  { id: 'wisp_spirit', name: 'Hồn Ma Lạc Lối', title: 'Lost Wisp', element: 'ghost', isBoss: false, primaryColor: '#AED6F1', auraColor: 'rgba(174, 214, 241, 0.5)', secondaryColor: '#EBF5FB' },
  { id: 'multi_eye_spiky', name: 'Quái Gai Đa Mắt', title: 'Spiky Cluster', element: 'void', isBoss: false, primaryColor: '#7D3C98', auraColor: 'rgba(125, 60, 152, 0.45)', secondaryColor: '#C39BD3' },
  { id: 'plant_sprout', name: 'Mầm Gai Ăn Thịt', title: 'Sproutling', element: 'nature', isBoss: false, primaryColor: '#52BE80', auraColor: 'rgba(82, 190, 128, 0.45)', secondaryColor: '#F4D03F' },
  { id: 'blood_demon', name: 'Huyết Ma Cánh Dơi', title: 'Blood Fiend', element: 'dark', isBoss: false, primaryColor: '#922B21', auraColor: 'rgba(146, 43, 33, 0.45)', secondaryColor: '#C0392B' },
  { id: 'angel_golden', name: 'Thánh Nhãn Hoàng Kim', title: 'Celestial Eye', element: 'holy', isBoss: false, primaryColor: '#F5B041', auraColor: 'rgba(245, 176, 65, 0.5)', secondaryColor: '#FAD7A0' },
  { id: 'frost_crystal', name: 'Băng Tinh Thạch', title: 'Frost Eye', element: 'ice', isBoss: false, primaryColor: '#5DADE2', auraColor: 'rgba(93, 173, 226, 0.5)', secondaryColor: '#D4E6F1' },
];

export const BOSS_MONSTER_SPECIES: MonsterSpeciesMeta[] = [
  { id: 'boss_magma_demon', name: 'Lãnh Chúa Nham Thạch', title: 'Magma Demon Lord', element: 'fire', isBoss: true, primaryColor: '#E74C3C', auraColor: 'rgba(231, 76, 60, 0.65)', secondaryColor: '#F39C12' },
  { id: 'boss_lich_king', name: 'Vua Hài Cốt Lich King', title: 'Lich King Sovereign', element: 'ghost', isBoss: true, primaryColor: '#00D2D3', auraColor: 'rgba(0, 210, 211, 0.65)', secondaryColor: '#54A0FF' },
  { id: 'boss_void_kraken', name: 'Thủy Quái Hư Không', title: 'Eldritch Void Kraken', element: 'void', isBoss: true, primaryColor: '#A55EEA', auraColor: 'rgba(165, 94, 234, 0.65)', secondaryColor: '#D980FA' },
  { id: 'boss_stone_golem', name: 'Cự Nhân Hắc Nham', title: 'Obsidian Stone Titan', element: 'nature', isBoss: true, primaryColor: '#F39C12', auraColor: 'rgba(243, 156, 18, 0.65)', secondaryColor: '#BDC581' },
  { id: 'boss_shadow_knight', name: 'Kỵ Sĩ Hắc Ám', title: 'Shadow Dread Knight', element: 'dark', isBoss: true, primaryColor: '#EE5253', auraColor: 'rgba(238, 82, 83, 0.65)', secondaryColor: '#576574' },
  { id: 'boss_bramble_thorn', name: 'Bạo Chúa Gai Độc', title: 'Thorny Bramble Tyrant', element: 'poison', isBoss: true, primaryColor: '#10AC84', auraColor: 'rgba(16, 172, 132, 0.65)', secondaryColor: '#1DD1A1' },
  { id: 'boss_frost_emperor', name: 'Hoàng Đế Băng Giá', title: 'Frost Emperor', element: 'ice', isBoss: true, primaryColor: '#0ABDE3', auraColor: 'rgba(10, 189, 227, 0.7)', secondaryColor: '#48DBFB' },
  { id: 'boss_abyssal_overlord', name: 'Ma Vương Vực Thẳm', title: 'Abyssal Overlord', element: 'void', isBoss: true, primaryColor: '#8854D0', auraColor: 'rgba(136, 84, 208, 0.65)', secondaryColor: '#3867D6' },
];

export const ALL_SPECIES_META: Record<string, MonsterSpeciesMeta> = {};
for (const s of REGULAR_MONSTER_SPECIES) ALL_SPECIES_META[s.id] = s;
for (const s of BOSS_MONSTER_SPECIES) ALL_SPECIES_META[s.id] = s;

// Cache for loaded images
const imageCache: Record<string, HTMLImageElement> = {};

function getMonsterImage(speciesId: string): HTMLImageElement {
  if (!imageCache[speciesId]) {
    const img = new Image();
    img.src = `/assets/monsters/${speciesId}.png`;
    imageCache[speciesId] = img;
  }
  return imageCache[speciesId];
}

export function preloadAllMonsters(): void {
  if (typeof window === 'undefined') return;
  for (const s of REGULAR_MONSTER_SPECIES) {
    getMonsterImage(s.id);
  }
  for (const s of BOSS_MONSTER_SPECIES) {
    getMonsterImage(s.id);
  }
}

// Automatically start preload in browser
if (typeof window !== 'undefined') {
  preloadAllMonsters();
}

export interface MonsterRenderOptions {
  speciesId?: string;
  isBoss?: boolean;
  selected?: boolean;
  isSlowed?: boolean;
  isFrozen?: boolean;
  animTime?: number;
  lastHitTimeMs?: number;
  bossSegmentsRemaining?: number;
  bossMaxSegments?: number;
  pendingDefeat?: boolean;
  scale?: number;
}

/**
 * Draws any monster (regular or epic boss) with natural organic animations:
 * - 4 expressive facial states (Idle -> Blink -> Squint/Target -> Roar/Tongue)
 * - Hover wobble & breathing squash/stretch
 * - Rich elemental aura, rotating halo & floating motes for Bosses
 * - Hit flash and damage reactions
 * - Frozen ice crust / slow trails
 */
export function drawMonster(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  options: MonsterRenderOptions = {}
): void {
  const {
    speciesId = 'bat_purple',
    isBoss = false,
    selected = false,
    isSlowed = false,
    isFrozen = false,
    animTime = 0,
    lastHitTimeMs = 0,
    bossSegmentsRemaining = 5,
    bossMaxSegments = 5,
    pendingDefeat = false,
    scale: customScale = 1.0,
  } = options;

  // Resolve metadata (fallback to purple bat if unknown)
  const meta: MonsterSpeciesMeta =
    ALL_SPECIES_META[speciesId] ||
    (isBoss ? BOSS_MONSTER_SPECIES[0] : REGULAR_MONSTER_SPECIES[0]);

  const img = getMonsterImage(meta.id);
  const isLoaded = img.complete && img.naturalWidth > 0;

  // Frame size: 128 for regular mobs, 160 for bosses
  const frameSize = meta.isBoss ? 160 : 128;

  // Visual base size on canvas:
  // Regular mobs: 84px base. Bosses: 165px base (Noticeably bigger & impressive!)
  const baseSize = meta.isBoss ? 168 : 86;
  const scale = customScale * (meta.isBoss ? 1.0 : 0.95);

  // 1. Natural Organic Motion
  // Hover vertical floating wobble
  const wobbleSpeed = meta.isBoss ? 0.0022 : 0.0035;
  const wobbleAmp = meta.isBoss ? 4.5 : 3.5;
  const hoverY = Math.sin((animTime + centerX * 3) * wobbleSpeed) * wobbleAmp;

  // Breathing squash & stretch
  const breathCycle = Math.sin((animTime + centerX) * 0.004);
  const stretchX = 1.0 + breathCycle * 0.025;
  const stretchY = 1.0 - breathCycle * 0.025;

  // 2. Expressive Frame Determination
  // Semantic frames:
  // 0: Idle (open eye)
  // 1: Squint (focus / typing)
  // 2: Hurt / Blink (closed eye)
  // 3: Roar / Tongue (boss roar / taunt / defeat)
  let frameIndex = 0;

  const hitElapsed = animTime - lastHitTimeMs;
  const isHitRecently = hitElapsed >= 0 && hitElapsed < 260;

  if (pendingDefeat) {
    // Defeated: tongue out / roaring in surprise!
    frameIndex = 3;
  } else if (isHitRecently) {
    // Bullet just impacted: eyes squeezed shut in pain
    frameIndex = 2;
  } else if (isFrozen) {
    // Frozen solid: shivering eye shut
    frameIndex = 2;
  } else if (meta.isBoss && Math.sin(animTime * 0.0016 + centerX) > 0.86) {
    // Boss periodically roars with wide mouth & tongue out!
    frameIndex = 3;
  } else if (selected) {
    // Target active: glaring focused squint at the player
    frameIndex = 1;
  } else {
    // Normal idle: natural periodic eye blinking
    const blinkCycle = (animTime + Math.floor(centerX * 19)) % 3800;
    if (blinkCycle < 110) {
      frameIndex = 1; // half-closing
    } else if (blinkCycle < 220) {
      frameIndex = 2; // fully closed
    } else if (blinkCycle < 310) {
      frameIndex = 1; // half-opening
    } else {
      frameIndex = 0; // wide open idle
    }
  }

  ctx.save();
  ctx.translate(centerX, centerY + hoverY);
  ctx.scale(scale * stretchX, scale * stretchY);

  // -----------------------------------------------------------
  // LAYER 1: BOSS AURA & AMBIENT ELEMENTAL EFFECTS
  // -----------------------------------------------------------
  if (meta.isBoss) {
    drawBossAura(ctx, meta, animTime, baseSize);
  }

  // -----------------------------------------------------------
  // LAYER 2: TARGETING BRACKETS & SELECTION PULSE
  // -----------------------------------------------------------
  if (selected) {
    drawTargetReticle(ctx, meta, animTime, baseSize);
  }

  // -----------------------------------------------------------
  // LAYER 3: SPRITE RENDERING
  // -----------------------------------------------------------
  if (isLoaded) {
    const drawSize = baseSize;
    const drawHalf = drawSize / 2;

    // Hit flash tint
    if (isHitRecently) {
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 24;
    }

    ctx.drawImage(
      img,
      frameIndex * frameSize,
      0,
      frameSize,
      frameSize,
      -drawHalf,
      -drawHalf,
      drawSize,
      drawSize
    );

    // Reset shadow
    if (isHitRecently) {
      ctx.shadowBlur = 0;
    }
  } else {
    // Vector fallback if sprite sheet is loading
    drawFallbackMonster(ctx, meta, frameIndex, baseSize);
  }

  // -----------------------------------------------------------
  // LAYER 4: STATUS EFFECTS OVERLAY (FROZEN / SLOW)
  // -----------------------------------------------------------
  if (isFrozen) {
    drawFrozenOverlay(ctx, baseSize, animTime);
  } else if (isSlowed) {
    drawSlowOverlay(ctx, baseSize, animTime);
  }

  // -----------------------------------------------------------
  // LAYER 5: BOSS CROWN & SEGMENT BADGE
  // -----------------------------------------------------------
  if (meta.isBoss) {
    drawBossHealthOrbs(ctx, bossSegmentsRemaining, bossMaxSegments, baseSize);
  }

  ctx.restore();
}

/**
 * Draws majestic multi-layered aura, rotating runic ring and floating particles for Bosses
 */
function drawBossAura(
  ctx: CanvasRenderingContext2D,
  meta: MonsterSpeciesMeta,
  animTime: number,
  baseSize: number
): void {
  const radius = baseSize * 0.58;

  // 1. Soft Pulsating Radiant Glow
  const pulse = 1.0 + Math.sin(animTime * 0.005) * 0.12;
  const grad = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius * 1.35 * pulse);
  grad.addColorStop(0, meta.auraColor);
  grad.addColorStop(0.65, meta.auraColor);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.35 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Rotating Celestial Runic Halo
  ctx.save();
  ctx.rotate(animTime * 0.0008);
  ctx.strokeStyle = meta.primaryColor;
  ctx.lineWidth = 2.2;
  ctx.globalAlpha = 0.55 + Math.sin(animTime * 0.004) * 0.2;

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.98, 0, Math.PI * 2);
  ctx.stroke();

  // 6 orbiting celestial glyphs on the halo
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI * 2) / 6;
    const gx = Math.cos(angle) * (radius * 0.98);
    const gy = Math.sin(angle) * (radius * 0.98);
    ctx.fillStyle = meta.secondaryColor;
    ctx.beginPath();
    ctx.arc(gx, gy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 3. Ambient Floating Elemental Motes / Sparks
  ctx.save();
  const moteCount = 5;
  for (let i = 0; i < moteCount; i++) {
    const t = animTime * 0.0012 + i * (Math.PI * 2 / moteCount);
    const dist = radius * (0.85 + Math.sin(t * 1.7) * 0.3);
    const mx = Math.cos(t) * dist;
    const my = Math.sin(t * 0.9) * (dist * 0.7) - 15;
    const mSize = 2.5 + Math.sin(t * 2) * 1.5;

    ctx.fillStyle = meta.secondaryColor;
    ctx.globalAlpha = 0.65 + Math.sin(t * 3) * 0.3;
    ctx.beginPath();
    ctx.arc(mx, my, mSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Modern stylized targeting brackets with animated corner reticles
 */
function drawTargetReticle(
  ctx: CanvasRenderingContext2D,
  meta: MonsterSpeciesMeta,
  animTime: number,
  baseSize: number
): void {
  const pad = baseSize * 0.52;
  const cornerLen = Math.max(10, baseSize * 0.16);
  const breath = Math.sin(animTime * 0.008) * 3;
  const boxR = pad + breath;

  ctx.save();
  ctx.strokeStyle = meta.primaryColor;
  ctx.lineWidth = 2.8;
  ctx.lineCap = 'round';
  ctx.shadowColor = meta.primaryColor;
  ctx.shadowBlur = 10;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(-boxR, -boxR + cornerLen);
  ctx.lineTo(-boxR, -boxR);
  ctx.lineTo(-boxR + cornerLen, -boxR);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(boxR - cornerLen, -boxR);
  ctx.lineTo(boxR, -boxR);
  ctx.lineTo(boxR, -boxR + cornerLen);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(-boxR, boxR - cornerLen);
  ctx.lineTo(-boxR, boxR);
  ctx.lineTo(-boxR + cornerLen, boxR);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(boxR - cornerLen, boxR);
  ctx.lineTo(boxR, boxR);
  ctx.lineTo(boxR, boxR - cornerLen);
  ctx.stroke();

  ctx.restore();
}

/**
 * Boss Health Orbs / Segments remaining display above head
 */
function drawBossHealthOrbs(
  ctx: CanvasRenderingContext2D,
  remaining: number,
  max: number,
  baseSize: number
): void {
  const orbY = -baseSize * 0.54;
  const orbSpacing = 16;
  const totalW = (max - 1) * orbSpacing;
  const startX = -totalW / 2;

  ctx.save();
  for (let i = 0; i < max; i++) {
    const ox = startX + i * orbSpacing;
    const isLit = i < remaining;

    // Orb background
    ctx.beginPath();
    ctx.arc(ox, orbY, 6, 0, Math.PI * 2);
    ctx.fillStyle = isLit ? '#FF4757' : 'rgba(40, 40, 50, 0.65)';
    ctx.strokeStyle = '#25232B';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // Heart or gem highlight on active orbs
    if (isLit) {
      ctx.beginPath();
      ctx.arc(ox - 1.8, orbY - 1.8, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFA502';
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Frozen ice crystal crust overlay
 */
function drawFrozenOverlay(ctx: CanvasRenderingContext2D, baseSize: number, _animTime: number): void {
  const r = baseSize * 0.44;
  ctx.save();
  ctx.fillStyle = 'rgba(164, 219, 255, 0.38)';
  ctx.strokeStyle = '#E0F7FA';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Jagged ice crystal shards
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + 0.3;
    const ix = Math.cos(angle) * (r * 0.8);
    const iy = Math.sin(angle) * (r * 0.8);
    ctx.beginPath();
    ctx.moveTo(ix, iy - 6);
    ctx.lineTo(ix + 4, iy);
    ctx.lineTo(ix, iy + 6);
    ctx.lineTo(ix - 4, iy);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#0288D1';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('❄ FROZEN', 0, r + 14);
  ctx.restore();
}

/**
 * Slow ripple overlay
 */
function drawSlowOverlay(ctx: CanvasRenderingContext2D, baseSize: number, animTime: number): void {
  const r = baseSize * 0.44;
  ctx.save();
  ctx.strokeStyle = 'rgba(79, 195, 247, 0.7)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = -animTime * 0.02;
  ctx.beginPath();
  ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#0288D1';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ SLOW', 0, r + 14);
  ctx.restore();
}

/**
 * Clean vector fallback if sprite image is still being loaded
 */
function drawFallbackMonster(
  ctx: CanvasRenderingContext2D,
  meta: MonsterSpeciesMeta,
  frameIndex: number,
  baseSize: number
): void {
  const r = baseSize * 0.36;
  ctx.save();

  // Body
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = meta.primaryColor;
  ctx.strokeStyle = '#25232B';
  ctx.lineWidth = 3;
  ctx.fill();
  ctx.stroke();

  // Big Eye
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.stroke();

  // Eye pupil based on frame
  if (frameIndex === 0) {
    // Open pupil
    ctx.beginPath();
    ctx.arc(0, 2, r * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = '#25232B';
    ctx.fill();
  } else if (frameIndex === 1) {
    // Squint
    ctx.beginPath();
    ctx.ellipse(0, 2, r * 0.25, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#25232B';
    ctx.fill();
  } else if (frameIndex === 2) {
    // Closed line
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, 0);
    ctx.lineTo(r * 0.3, 0);
    ctx.stroke();
  } else {
    // Roar tongue
    ctx.beginPath();
    ctx.arc(0, 4, r * 0.2, 0, Math.PI);
    ctx.fillStyle = '#FF4757';
    ctx.fill();
  }

  ctx.restore();
}
