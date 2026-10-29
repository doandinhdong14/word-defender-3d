const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR_PUBLIC = path.resolve(__dirname, '../public/assets/monsters');
const OUTPUT_DIR_BUILD = path.resolve(__dirname, '../build/assets/monsters');
if (!fs.existsSync(OUTPUT_DIR_PUBLIC)) fs.mkdirSync(OUTPUT_DIR_PUBLIC, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR_BUILD)) fs.mkdirSync(OUTPUT_DIR_BUILD, { recursive: true });

function findValley(profile, approxX, radius) {
  let minV = Infinity, bestX = approxX;
  const start = Math.max(0, approxX - radius);
  const end = Math.min(profile.length - 1, approxX + radius);
  for (let x = start; x <= end; x++) {
    if (profile[x] < minV) {
      minV = profile[x];
      bestX = x;
    }
  }
  return bestX;
}

function getRowSplits(data, fullW, y0, y1) {
  const prof = new Array(fullW).fill(0);
  for (let x = 0; x < fullW; x++) {
    for (let y = y0; y < y1; y++) {
      const idx = (y * fullW + x) * 3;
      prof[x] += data[idx] + data[idx + 1] + data[idx + 2];
    }
  }

  const midSplit = findValley(prof, 512, 45);

  const leftW = midSplit / 4;
  const s1 = findValley(prof, Math.round(leftW * 1), Math.round(leftW * 0.35));
  const s2 = findValley(prof, Math.round(leftW * 2), Math.round(leftW * 0.35));
  const s3 = findValley(prof, Math.round(leftW * 3), Math.round(leftW * 0.35));
  const leftSplits = [0, s1, s2, s3, midSplit];

  const rightW = (fullW - midSplit) / 4;
  const s5 = findValley(prof, Math.round(midSplit + rightW * 1), Math.round(rightW * 0.35));
  const s6 = findValley(prof, Math.round(midSplit + rightW * 2), Math.round(rightW * 0.35));
  const s7 = findValley(prof, Math.round(midSplit + rightW * 3), Math.round(rightW * 0.35));
  const rightSplits = [midSplit, s5, s6, s7, fullW];

  return { leftSplits, rightSplits };
}

async function processCell(rawImg, fullW, fullH, x0, y0, x1, y1, targetSize) {
  const cw = x1 - x0;
  const ch = y1 - y0;

  const cellBuf = Buffer.alloc(cw * ch * 3);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const srcIdx = ((y0 + y) * fullW + (x0 + x)) * 3;
      const dstIdx = (y * cw + x) * 3;
      cellBuf[dstIdx] = rawImg[srcIdx];
      cellBuf[dstIdx + 1] = rawImg[srcIdx + 1];
      cellBuf[dstIdx + 2] = rawImg[srcIdx + 2];
    }
  }

  // Remove small stray components touching top/bottom boundaries (< 220 px)
  const visitedComp = new Uint8Array(cw * ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const idx = y * cw + x;
      const rgb = idx * 3;
      if (!visitedComp[idx] && (cellBuf[rgb] > 20 || cellBuf[rgb + 1] > 20 || cellBuf[rgb + 2] > 20)) {
        const comp = [];
        const q = [idx];
        visitedComp[idx] = 1;
        let head = 0;
        let touchesBoundary = false;
        while (head < q.length) {
          const curr = q[head++];
          comp.push(curr);
          const cx = curr % cw;
          const cy = Math.floor(curr / cw);
          if (cy <= 1 || cy >= ch - 2) touchesBoundary = true;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = cx + dx, ny = cy + dy;
              if (nx >= 0 && nx < cw && ny >= 0 && ny < ch) {
                const nidx = ny * cw + nx;
                const nrgb = nidx * 3;
                if (!visitedComp[nidx] && (cellBuf[nrgb] > 20 || cellBuf[nrgb + 1] > 20 || cellBuf[nrgb + 2] > 20)) {
                  visitedComp[nidx] = 1;
                  q.push(nidx);
                }
              }
            }
          }
        }
        if (touchesBoundary && comp.length < 220) {
          for (const cidx of comp) {
            cellBuf[cidx * 3] = 0;
            cellBuf[cidx * 3 + 1] = 0;
            cellBuf[cidx * 3 + 2] = 0;
          }
        }
      }
    }
  }

  // Find tight bounding box
  let minX = cw, maxX = 0, minY = ch, maxY = 0;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const idx = (y * cw + x) * 3;
      if (cellBuf[idx] > 20 || cellBuf[idx + 1] > 20 || cellBuf[idx + 2] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (minX > maxX || minY > maxY) {
    return sharp({
      create: { width: targetSize, height: targetSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    }).png().toBuffer();
  }

  const sw = maxX - minX + 1;
  const sh = maxY - minY + 1;
  const spriteCrop = Buffer.alloc(sw * sh * 3);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const srcIdx = ((minY + y) * cw + (minX + x)) * 3;
      const dstIdx = (y * sw + x) * 3;
      spriteCrop[dstIdx] = cellBuf[srcIdx];
      spriteCrop[dstIdx + 1] = cellBuf[srcIdx + 1];
      spriteCrop[dstIdx + 2] = cellBuf[srcIdx + 2];
    }
  }

  // Flood fill transparency from outside
  const visitedBg = new Uint8Array(sw * sh);
  const qBg = [];
  for (let x = 0; x < sw; x++) {
    qBg.push(0 * sw + x);
    qBg.push((sh - 1) * sw + x);
    visitedBg[0 * sw + x] = 1;
    visitedBg[(sh - 1) * sw + x] = 1;
  }
  for (let y = 0; y < sh; y++) {
    qBg.push(y * sw + 0);
    qBg.push(y * sw + (sw - 1));
    visitedBg[y * sw + 0] = 1;
    visitedBg[y * sw + (sw - 1)] = 1;
  }

  const T_SOLID = 12, T_EDGE = 42;
  let head = 0;
  while (head < qBg.length) {
    const curr = qBg[head++];
    const cx = curr % sw, cy = Math.floor(curr / sw);
    const nbs = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
    for (const [nx, ny] of nbs) {
      if (nx >= 0 && nx < sw && ny >= 0 && ny < sh) {
        const nidx = ny * sw + nx;
        if (!visitedBg[nidx]) {
          const rgbIdx = nidx * 3;
          const maxV = Math.max(spriteCrop[rgbIdx], spriteCrop[rgbIdx + 1], spriteCrop[rgbIdx + 2]);
          if (maxV <= T_EDGE) {
            visitedBg[nidx] = 1;
            qBg.push(nidx);
          }
        }
      }
    }
  }

  const rgba = Buffer.alloc(sw * sh * 4);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const idx = y * sw + x;
      const rgbIdx = idx * 3;
      const rgbaIdx = idx * 4;
      const r = spriteCrop[rgbIdx], g = spriteCrop[rgbIdx + 1], b = spriteCrop[rgbIdx + 2];
      const maxV = Math.max(r, g, b);
      if (visitedBg[idx] === 1) {
        if (maxV <= T_SOLID) {
          rgba[rgbaIdx] = 0; rgba[rgbaIdx + 1] = 0; rgba[rgbaIdx + 2] = 0; rgba[rgbaIdx + 3] = 0;
        } else {
          const a = Math.min(255, Math.max(0, Math.round(((maxV - T_SOLID) / (T_EDGE - T_SOLID)) * 255)));
          const factor = 255 / Math.max(1, a);
          rgba[rgbaIdx] = Math.min(255, Math.round(r * factor));
          rgba[rgbaIdx + 1] = Math.min(255, Math.round(g * factor));
          rgba[rgbaIdx + 2] = Math.min(255, Math.round(b * factor));
          rgba[rgbaIdx + 3] = a;
        }
      } else {
        rgba[rgbaIdx] = r; rgba[rgbaIdx + 1] = g; rgba[rgbaIdx + 2] = b; rgba[rgbaIdx + 3] = 255;
      }
    }
  }

  const pad = 4;
  const maxDim = targetSize - pad * 2;
  const fitScale = Math.min(1.0, maxDim / Math.max(sw, sh));
  const newW = Math.round(sw * fitScale);
  const newH = Math.round(sh * fitScale);

  const resized = await sharp(rgba, { raw: { width: sw, height: sh, channels: 4 } })
    .resize(newW, newH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const left = Math.round((targetSize - newW) / 2);
  const top = Math.round((targetSize - newH) / 2);

  return await sharp({
    create: { width: targetSize, height: targetSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([{ input: resized, left, top }]).png().toBuffer();
}

async function processMonster(rawImg, fullW, fullH, y0, y1, splits, frameOrder, targetSize, speciesId) {
  const frames = [];
  for (let i = 0; i < 4; i++) {
    const origIdx = frameOrder[i];
    const x0 = splits[origIdx], x1 = splits[origIdx + 1];
    const f = await processCell(rawImg, fullW, fullH, x0, y0, x1, y1, targetSize);
    frames.push({ input: f, left: i * targetSize, top: 0 });
  }

  const strip = await sharp({
    create: { width: targetSize * 4, height: targetSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite(frames).png().toBuffer();

  const pPath = path.join(OUTPUT_DIR_PUBLIC, speciesId + '.png');
  const bPath = path.join(OUTPUT_DIR_BUILD, speciesId + '.png');
  fs.writeFileSync(pPath, strip);
  fs.writeFileSync(bPath, strip);
  console.log('Saved monster:', speciesId, '(' + targetSize * 4 + 'x' + targetSize + ')');
}

async function run() {
  const f1 = 'C:/Users/Dong/.gemini/antigravity-ide/brain/28a51f64-71d2-4cce-b3e6-e626ac47e2b9/.user_uploaded/media_1793254425789.jpg';
  const f2 = 'C:/Users/Dong/.gemini/antigravity-ide/brain/28a51f64-71d2-4cce-b3e6-e626ac47e2b9/.user_uploaded/media_1793254437460.jpg';
  const f3 = 'C:/Users/Dong/.gemini/antigravity-ide/brain/28a51f64-71d2-4cce-b3e6-e626ac47e2b9/.user_uploaded/media_1793254445151.jpg';

  const img1 = await sharp(f1).raw().toBuffer({ resolveWithObject: true });
  const img2 = await sharp(f2).raw().toBuffer({ resolveWithObject: true });
  const img3 = await sharp(f3).raw().toBuffer({ resolveWithObject: true });

  // 1. Image 1 (6 rows, 128x128)
  const cuts1 = [0, 109, 235, 347, 458, 564, 682];
  const list1 = [
    { left: 'bat_purple', right: 'wisp_blue' },
    { left: 'demon_fire', right: 'ghost_white' },
    { left: 'spider_black', right: 'jellyfish_blue' },
    { left: 'crystal_purple', right: 'slime_green' },
    { left: 'skull_flame', right: 'reaper_hooded' },
    { left: 'puffer_orange', right: 'angel_pink' },
  ];
  for (let r = 0; r < 6; r++) {
    const y0 = cuts1[r], y1 = cuts1[r + 1];
    const { leftSplits, rightSplits } = getRowSplits(img1.data, 1024, y0, y1);
    await processMonster(img1.data, 1024, 682, y0, y1, leftSplits, [0, 1, 2, 3], 128, list1[r].left);
    await processMonster(img1.data, 1024, 682, y0, y1, rightSplits, [0, 1, 2, 3], 128, list1[r].right);
  }

  // 2. Image 2 (5 rows, 128x128)
  const cuts2 = [0, 129, 262, 397, 529, 682];
  const list2 = [
    { left: 'bat_shadow', right: 'jellyfish_cyan' },
    { left: 'demon_horned', right: 'tentacle_green' },
    { left: 'wisp_spirit', right: 'multi_eye_spiky' },
    { left: 'plant_sprout', right: 'blood_demon' },
    { left: 'angel_golden', right: 'frost_crystal' },
  ];
  for (let r = 0; r < 5; r++) {
    const y0 = cuts2[r], y1 = cuts2[r + 1];
    const { leftSplits, rightSplits } = getRowSplits(img2.data, 1024, y0, y1);
    await processMonster(img2.data, 1024, 682, y0, y1, leftSplits, [0, 1, 2, 3], 128, list2[r].left);
    await processMonster(img2.data, 1024, 682, y0, y1, rightSplits, [0, 1, 2, 3], 128, list2[r].right);
  }

  // 3. Image 3 (4 rows, 160x160 - BOSSES)
  // Boss frame order: original cols are [0=open, 1=half, 2=tongue, 3=closed]
  // We map to semantic [0, 1, 3, 2] so frame 2 is closed, frame 3 is tongue!
  const cuts3 = [0, 187, 353, 508, 682];
  const list3 = [
    { left: 'boss_magma_demon', right: 'boss_lich_king' },
    { left: 'boss_void_kraken', right: 'boss_stone_golem' },
    { left: 'boss_shadow_knight', right: 'boss_bramble_thorn' },
    { left: 'boss_frost_emperor', right: 'boss_abyssal_overlord' },
  ];
  for (let r = 0; r < 4; r++) {
    const y0 = cuts3[r], y1 = cuts3[r + 1];
    const { leftSplits, rightSplits } = getRowSplits(img3.data, 1024, y0, y1);
    await processMonster(img3.data, 1024, 682, y0, y1, leftSplits, [0, 1, 3, 2], 160, list3[r].left);
    await processMonster(img3.data, 1024, 682, y0, y1, rightSplits, [0, 1, 3, 2], 160, list3[r].right);
  }

  console.log('COMPLETE! Generated all 30 monster sprite sheets.');
}

run();
