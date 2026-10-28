import { GAME_BALANCE } from '../../config/balance';

/**
 * Generic SVG Map Background Renderer
 *
 * Supports rendering any custom hand-drawn SVG vector background:
 * - Phong Cảnh Núi Rừng (/phong_canh_nui_rung_1920x1080.svg)
 * - Thung Lũng Băng Tuyết (/map_02_bang_tuyet.svg)
 * - Rừng Ma Ám (/map_03_rung_ma_am.svg)
 * - Sa Mạc Cổ Đại (/map_04_sa_mac.svg)
 *
 * Features:
 * - Scaled to cover canvas without distortion (responsive across mobile portrait, landscape, desktop, square)
 * - Full clarity (no dimming/fog overlay)
 * - Retains classic notebook grid lines on top ("vẫn giữ ô ly cũ")
 * - Retains dashed defense perimeter line near pempom
 */

import { getAssetUrl } from '../../utils/assetUrl';

export interface SvgMapRenderOptions {
  reduceMotion?: boolean;
  defenseLineY?: number;
  opacity?: number;
}

const imageCache: Record<string, HTMLImageElement> = {};
const loadedCache: Record<string, boolean> = {};

export function getSvgMapImage(svgUrl: string): HTMLImageElement | null {
  if (typeof window === 'undefined') return null;

  if (!imageCache[svgUrl]) {
    const img = new Image();
    img.src = getAssetUrl(svgUrl);
    img.onload = () => {
      loadedCache[svgUrl] = true;
    };
    imageCache[svgUrl] = img;
  }

  return imageCache[svgUrl];
}

// Preload all SVG map assets immediately when running in browser
if (typeof window !== 'undefined') {
  const PRELOAD_SVGS = [
    '/phong_canh_nui_rung_1920x1080.svg',
    '/map_02_bang_tuyet.svg',
    '/map_03_rung_ma_am.svg',
    '/map_04_sa_mac.svg',
    '/map_06_san_bong.svg',
    '/map_07_bao_tuyet.svg',
    '/map_08_rung_xanh.svg',
    '/map_09_rung_nhiet_doi.svg',
    '/map_10_dong_que.svg',
  ];
  PRELOAD_SVGS.forEach((url) => getSvgMapImage(url));
}

/**
 * Draws an SVG vector map background onto the canvas with notebook grid overlay.
 */
export function drawSvgMapBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  visualScale: number,
  svgUrl: string,
  options: SvgMapRenderOptions = {}
): void {
  if (width <= 0 || height <= 0) return;

  // 1. Base Paper Fill (#FBF8F0)
  ctx.fillStyle = '#FBF8F0';
  ctx.fillRect(0, 0, width, height);

  // 2. Draw SVG Background Image
  const img = getSvgMapImage(svgUrl);
  const isReady = img && (img.complete || loadedCache[svgUrl]) && img.naturalWidth > 0;

  if (isReady && img) {
    const imgW = img.naturalWidth || 1920;
    const imgH = img.naturalHeight || 1080;
    const imgAspect = imgW / imgH;
    const canvasAspect = width / height;

    let drawW = width;
    let drawH = height;
    let drawX = 0;
    let drawY = 0;

    // "cover" scaling: fill entire canvas, crop edges gracefully
    if (canvasAspect > imgAspect) {
      drawW = width;
      drawH = width / imgAspect;
      drawY = (height - drawH) / 2;
    } else {
      drawH = height;
      drawW = height * imgAspect;
      drawX = (width - drawW) / 2;
    }

    ctx.save();
    // Render SVG image at full clarity without dimming layer
    const alpha = typeof options.opacity === 'number' ? options.opacity : 1.0;
    if (alpha < 1.0) {
      ctx.globalAlpha = alpha;
    }
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  // 3. Classic Notebook Grid Overlay ("vẫn giữ ô ly cũ")
  const gridSize = Math.max(11, (GAME_BALANCE.gridSize || 14) * visualScale);
  ctx.strokeStyle = GAME_BALANCE.gridColor;
  ctx.lineWidth = Math.max(0.5, GAME_BALANCE.gridLineWidth * Math.max(1, visualScale));
  ctx.beginPath();
  for (let x = 0; x <= width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y <= height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // 4. Defensive Line (Subtle dotted line near pempom)
  if (typeof options.defenseLineY === 'number') {
    ctx.save();
    ctx.strokeStyle = 'rgba(239, 110, 120, 0.45)';
    ctx.lineWidth = Math.max(1.25, 2 * visualScale);
    ctx.setLineDash([Math.max(5, 8 * visualScale), Math.max(5, 8 * visualScale)]);
    ctx.beginPath();
    ctx.moveTo(0, options.defenseLineY);
    ctx.lineTo(width, options.defenseLineY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}
