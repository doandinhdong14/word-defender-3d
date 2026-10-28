/**
 * Pempom / Word Defender 3D - Procedural Audio Synthesizer Engine
 * Generates custom, distinct sound effects for each weapon (Missile, Shuriken, Kunai,
 * Laser, Fireball, Soccer, Basketball, Crystal, Frost Ice, Candy Default) using Web Audio API.
 */

import { BulletKind } from '../types/game';

export type SoundEffectType =
  | 'shoot'
  | 'hit'
  | 'wrong'
  | 'hurt'
  | 'clear'
  | 'boss_hit'
  | 'skill'
  | 'type';

let globalAudioContext: AudioContext | null = null;
let audioEnabled = true;
let masterVolume = 0.8;

/**
 * Get or initialize shared AudioContext safely
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!globalAudioContext || globalAudioContext.state === 'closed') {
      globalAudioContext = new AudioCtx();
    }
    if (globalAudioContext.state === 'suspended') {
      void globalAudioContext.resume().catch(() => undefined);
    }
    return globalAudioContext;
  } catch {
    return null;
  }
}

/**
 * Configure audio settings
 */
export function configureSoundSettings(enabled: boolean, volume = 0.8): void {
  audioEnabled = enabled;
  masterVolume = Math.max(0, Math.min(1, volume));
}

/**
 * Helper to generate white noise buffer
 */
function createNoiseBuffer(ctx: AudioContext, durationSec = 0.3): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const bufferSize = Math.max(1, Math.floor(sampleRate * durationSec));
  const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * Normalize bullet kind
 */
export function normalizeBulletKind(kind?: BulletKind | string): string {
  if (!kind) return 'bullet_default';
  if (kind === 'normal') return 'bullet_default';
  if (kind === 'skill_slow_shot') return 'slow_shot';
  return kind;
}

// ============================================================================
// WEAPON FIRING SOUNDS (BẮN VŨ KHÍ)
// ============================================================================

/**
 * Play distinct firing sound for each weapon
 */
export function playWeaponShootSound(
  weaponKind?: BulletKind | string,
  isFinishing = false,
  volumeOverride?: number
): void {
  if (!audioEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const vol = (volumeOverride ?? masterVolume) * (isFinishing ? 1.0 : 0.85);
  const now = ctx.currentTime;
  const kind = normalizeBulletKind(weaponKind);

  try {
    switch (kind) {
      // 1. TÊN LỬA HỎA TIỄN (Rocket Missile): Roaring thruster launch whoosh + accelerating roar
      case 'bullet_missile': {
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.28);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(260, now);
        filter.frequency.exponentialRampToValueAtTime(1100, now + 0.24);
        filter.Q.setValueAtTime(2.2, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.01, now);
        noiseGain.gain.linearRampToValueAtTime(0.24 * vol, now + 0.04);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.26);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.28);

        // Rocket engine combustion saw wave
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.22);

        const oscFilter = ctx.createBiquadFilter();
        oscFilter.type = 'lowpass';
        oscFilter.frequency.setValueAtTime(500, now);

        oscGain.gain.setValueAtTime(0.01, now);
        oscGain.gain.linearRampToValueAtTime(0.16 * vol, now + 0.04);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

        osc.connect(oscFilter);
        oscFilter.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.24);
        break;
      }

      // 2. PHI TIÊU NINJA (Shuriken): High-speed spinning metallic blades slicing through air!
      case 'bullet_shuriken': {
        // Highpass spinning whoosh with tremolo (spinning blades)
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.16);

        const hpFilter = ctx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.setValueAtTime(2400, now);
        hpFilter.Q.setValueAtTime(2.0, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.01, now);
        noiseGain.gain.linearRampToValueAtTime(0.22 * vol, now + 0.02);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        // Tremolo amplitude modulation (spinning blade flutter: ~36Hz)
        const tremolo = ctx.createOscillator();
        tremolo.frequency.setValueAtTime(36, now);
        const tremoloGain = ctx.createGain();
        tremoloGain.gain.setValueAtTime(0.08 * vol, now);
        tremolo.connect(noiseGain.gain);
        tremolo.start(now);
        tremolo.stop(now + 0.16);

        noise.connect(hpFilter);
        hpFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.16);

        // Sharp metallic whistling tone (shing-whistle)
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1420, now);
        osc.frequency.exponentialRampToValueAtTime(980, now + 0.14);

        oscGain.gain.setValueAtTime(0.01, now);
        oscGain.gain.linearRampToValueAtTime(0.14 * vol, now + 0.01);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
        break;
      }

      // 3. DAO GĂM KUNAI (Kunai): Sharp, swift aerodynamic knife flick
      case 'bullet_kunai': {
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.1);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1900, now);
        filter.frequency.exponentialRampToValueAtTime(3400, now + 0.09);
        filter.Q.setValueAtTime(3.5, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.01, now);
        noiseGain.gain.linearRampToValueAtTime(0.2 * vol, now + 0.01);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.1);

        // Blade flick resonance
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1620, now + 0.06);

        oscGain.gain.setValueAtTime(0.12 * vol, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }

      // 4. TIA SÉT LAZE PLASMA (Laser Plasma): Futuristic sci-fi plasma chirp
      case 'bullet_laser': {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2400, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.11);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3200, now);
        filter.Q.setValueAtTime(3.0, now);

        oscGain.gain.setValueAtTime(0.18 * vol, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);

        osc.connect(filter);
        filter.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      // 5. CẦU LỬA SAO BĂNG (Fireball): Combustion roar & flame whoosh
      case 'bullet_fireball': {
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.2);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(260, now);
        filter.frequency.linearRampToValueAtTime(780, now + 0.08);
        filter.frequency.exponentialRampToValueAtTime(150, now + 0.19);
        filter.Q.setValueAtTime(1.8, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.01, now);
        noiseGain.gain.linearRampToValueAtTime(0.22 * vol, now + 0.03);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.19);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.2);

        // Low flame ignition pop
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.06);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.16);

        oscGain.gain.setValueAtTime(0.15 * vol, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.17);
        break;
      }

      // 6. TRÁI BÓNG ĐÁ (Soccer): Heavy football kick thump + ball spin whoosh
      case 'bullet_soccer': {
        // Solid cleat impact thump
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(210, now);
        osc.frequency.exponentialRampToValueAtTime(68, now + 0.09);

        oscGain.gain.setValueAtTime(0.25 * vol, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.11);

        // Aerodynamic ball roll whoosh
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.14);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.01, now);
        noiseGain.gain.linearRampToValueAtTime(0.14 * vol, now + 0.02);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.13);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.14);
        break;
      }

      // 7. TRÁI BÓNG RỔ (Basketball): Elastic court flick & orange ball swoosh
      case 'bullet_basketball': {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(175, now + 0.09);

        oscGain.gain.setValueAtTime(0.22 * vol, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.11);

        // Swish wind
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.12);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(700, now);
        filter.Q.setValueAtTime(2.0, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.01, now);
        noiseGain.gain.linearRampToValueAtTime(0.12 * vol, now + 0.02);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.12);
        break;
      }

      // 8. PHI TIÊU KIM CƯƠNG (Crystal): Crystalline magic chime sparkle
      case 'bullet_crystal': {
        const frequencies = [1174, 1480, 1760, 2350];
        frequencies.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.015);

          oscGain.gain.setValueAtTime(0.01, now + idx * 0.015);
          oscGain.gain.linearRampToValueAtTime((0.1 / (idx + 1)) * vol, now + idx * 0.015 + 0.01);
          oscGain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.015 + 0.15);

          osc.connect(oscGain);
          oscGain.connect(ctx.destination);
          osc.start(now + idx * 0.015);
          osc.stop(now + idx * 0.015 + 0.16);
        });
        break;
      }

      // 9. ĐẠN BĂNG LÀM CHẬM (Slow Frost Shot): Chilled glacial frost gust
      case 'slow_shot':
      case 'skill_slow_shot': {
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.18);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(850, now);
        filter.frequency.exponentialRampToValueAtTime(1450, now + 0.16);
        filter.Q.setValueAtTime(3.2, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.01, now);
        noiseGain.gain.linearRampToValueAtTime(0.2 * vol, now + 0.02);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.17);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.18);

        // Frosty whistling tone
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(720, now);
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.15);

        oscGain.gain.setValueAtTime(0.12 * vol, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
        break;
      }

      // 10. ĐẠN KẸO TRÒN MẶC ĐỊNH (Candy Default): Playful bouncy bubble pop
      case 'bullet_default':
      default: {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);

        gain.gain.setValueAtTime(0.15 * vol, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }
    }
  } catch {
    // Graceful fallback if Web Audio is blocked or restricted
  }
}

// ============================================================================
// WEAPON IMPACT / HIT SOUNDS (ĐẠN TRÚNG YÊU QUÁI)
// ============================================================================

/**
 * Play distinct impact / explosion sound when a weapon hits an enemy
 */
export function playWeaponHitSound(
  weaponKind?: BulletKind | string,
  volumeOverride?: number
): void {
  if (!audioEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const vol = volumeOverride ?? masterVolume;
  const now = ctx.currentTime;
  const kind = normalizeBulletKind(weaponKind);

  try {
    switch (kind) {
      // 1. TÊN LỬA (Rocket): Heavy sub-bass explosion BOOM + blast debris
      case 'bullet_missile': {
        // Sub-bass concussion punch
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(140, now);
        sub.frequency.exponentialRampToValueAtTime(32, now + 0.3);

        subGain.gain.setValueAtTime(0.32 * vol, now);
        subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.32);

        sub.connect(subGain);
        subGain.connect(ctx.destination);
        sub.start(now);
        sub.stop(now + 0.33);

        // Lowpass explosion noise blast
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.35);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1600, now);
        filter.frequency.exponentialRampToValueAtTime(70, now + 0.32);
        filter.Q.setValueAtTime(1.5, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.28 * vol, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.34);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.35);
        break;
      }

      // 2. PHI TIÊU NINJA (Shuriken): Crisp steel clink + slicing blade bite
      case 'bullet_shuriken': {
        // High-Q metallic ring (dual frequencies)
        [2850, 4200].forEach((freq) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);

          oscGain.gain.setValueAtTime(0.18 * vol, now);
          oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

          osc.connect(oscGain);
          oscGain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.11);
        });

        // Sharp blade slicing transient
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.08);

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(3500, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.18 * vol, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.07);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.08);
        break;
      }

      // 3. DAO GĂM KUNAI (Kunai): Sharp clink + solid target puncture thud
      case 'bullet_kunai': {
        // Metal ring
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1950, now);

        oscGain.gain.setValueAtTime(0.16 * vol, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);

        // Solid puncture thud
        const thud = ctx.createOscillator();
        const thudGain = ctx.createGain();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(160, now);
        thud.frequency.exponentialRampToValueAtTime(55, now + 0.12);

        thudGain.gain.setValueAtTime(0.22 * vol, now);
        thudGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        thud.connect(thudGain);
        thudGain.connect(ctx.destination);
        thud.start(now);
        thud.stop(now + 0.13);
        break;
      }

      // 4. TIA SÉT LAZE (Laser): Electric arc sizzle & plasma discharge
      case 'bullet_laser': {
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.16);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2200, now);
        filter.frequency.exponentialRampToValueAtTime(800, now + 0.14);
        filter.Q.setValueAtTime(4.0, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.22 * vol, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.16);

        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.12);

        oscGain.gain.setValueAtTime(0.12 * vol, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);
        break;
      }

      // 5. CẦU LỬA (Fireball): Fiery burst & ember crackle
      case 'bullet_fireball': {
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'triangle';
        sub.frequency.setValueAtTime(110, now);
        sub.frequency.exponentialRampToValueAtTime(42, now + 0.22);

        subGain.gain.setValueAtTime(0.24 * vol, now);
        subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

        sub.connect(subGain);
        subGain.connect(ctx.destination);
        sub.start(now);
        sub.stop(now + 0.23);

        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.26);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, now);
        filter.frequency.exponentialRampToValueAtTime(180, now + 0.24);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.2 * vol, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.26);
        break;
      }

      // 6. TRÁI BÓNG ĐÁ (Soccer): Heavy leather ball smack
      case 'bullet_soccer': {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(155, now);
        osc.frequency.exponentialRampToValueAtTime(52, now + 0.12);

        oscGain.gain.setValueAtTime(0.26 * vol, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.13);

        // Slap transient
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.05);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(550, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.18 * vol, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.05);
        break;
      }

      // 7. TRÁI BÓNG RỔ (Basketball): Resonant backboard / court bounce thud
      case 'bullet_basketball': {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(175, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.14);

        oscGain.gain.setValueAtTime(0.24 * vol, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }

      // 8. PHI TIÊU KIM CƯƠNG (Crystal): Cascading crystal shattering chime
      case 'bullet_crystal': {
        [3200, 4000, 4800].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const oscGain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.02);

          oscGain.gain.setValueAtTime(0.12 * vol, now + idx * 0.02);
          oscGain.gain.exponentialRampToValueAtTime(0.005, now + idx * 0.02 + 0.12);

          osc.connect(oscGain);
          oscGain.connect(ctx.destination);
          osc.start(now + idx * 0.02);
          osc.stop(now + idx * 0.02 + 0.13);
        });
        break;
      }

      // 9. ĐẠN BĂNG LÀM CHẬM (Slow Frost Shot): Ice cracking & frost freeze
      case 'slow_shot':
      case 'skill_slow_shot': {
        const sub = ctx.createOscillator();
        const subGain = ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(115, now);
        sub.frequency.exponentialRampToValueAtTime(50, now + 0.16);

        subGain.gain.setValueAtTime(0.22 * vol, now);
        subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

        sub.connect(subGain);
        subGain.connect(ctx.destination);
        sub.start(now);
        sub.stop(now + 0.17);

        // Ice shatter noise
        const noise = ctx.createBufferSource();
        noise.buffer = createNoiseBuffer(ctx, 0.15);

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2600, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.18 * vol, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.15);
        break;
      }

      // 10. ĐẠN KẸO TRÒN (Default Candy): Sweet candy plop / splat
      case 'bullet_default':
      default: {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);

        gain.gain.setValueAtTime(0.16 * vol, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }
    }
  } catch {
    // Graceful fallback
  }
}

// ============================================================================
// GENERAL GAME SOUND EFFECTS (CÁC HIỆU ỨNG ÂM THANH CHUNG)
// ============================================================================

/**
 * Unified sound effect dispatcher for GameEngine and UI
 */
export function playSoundEffect(
  type: SoundEffectType,
  weaponKind?: BulletKind | string,
  isFinishing = false,
  volumeOverride?: number,
  enabledOverride?: boolean
): void {
  if (enabledOverride === false || (!enabledOverride && !audioEnabled)) {
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) return;

  const vol = volumeOverride ?? masterVolume;
  const now = ctx.currentTime;

  try {
    switch (type) {
      case 'shoot': {
        playWeaponShootSound(weaponKind, isFinishing, vol);
        break;
      }

      case 'hit': {
        playWeaponHitSound(weaponKind, vol);
        break;
      }

      case 'skill': {
        if (weaponKind === 'skill_freeze_pulse' || weaponKind === 'freeze_pulse') {
          // Massive screen freeze wave: low sweep + cold wind
          const sub = ctx.createOscillator();
          const subGain = ctx.createGain();
          sub.type = 'sine';
          sub.frequency.setValueAtTime(180, now);
          sub.frequency.exponentialRampToValueAtTime(45, now + 0.35);

          subGain.gain.setValueAtTime(0.24 * vol, now);
          subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

          sub.connect(subGain);
          subGain.connect(ctx.destination);
          sub.start(now);
          sub.stop(now + 0.36);

          const noise = ctx.createBufferSource();
          noise.buffer = createNoiseBuffer(ctx, 0.4);
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1200, now);
          filter.Q.setValueAtTime(3.0, now);

          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.2 * vol, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.38);

          noise.connect(filter);
          filter.connect(noiseGain);
          noiseGain.connect(ctx.destination);
          noise.start(now);
          noise.stop(now + 0.4);
        } else if (weaponKind === 'skill_shield_bubble') {
          // Protective bubble shield hum & chime
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.linearRampToValueAtTime(580, now + 0.18);

          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.18 * vol, now + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.26);
        } else if (weaponKind) {
          playWeaponShootSound(weaponKind, true, vol);
        } else {
          // Generic skill chime
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.18);

          gain.gain.setValueAtTime(0.15 * vol, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.18);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.18);
        }
        break;
      }

      case 'wrong': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(130, now + 0.1);

        gain.gain.setValueAtTime(0.14 * vol, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }

      case 'hurt': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(145, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.25);

        gain.gain.setValueAtTime(0.22 * vol, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }

      case 'clear': {
        // Victorious ascending arpeggio chord (C5 - E5 - G5 - C6)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);

          gain.gain.setValueAtTime(0.01, now + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.14 * vol, now + idx * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.28);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.3);
        });
        break;
      }

      case 'boss_hit': {
        // Armored metallic clang on boss segment
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);

        oscGain.gain.setValueAtTime(0.22 * vol, now);
        oscGain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.19);
        break;
      }

      default:
        break;
    }
  } catch {
    // Graceful fallback
  }
}
