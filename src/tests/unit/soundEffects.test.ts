import { describe, expect, it, vi } from 'vitest';
import { GameEngine } from '../../game/engine/gameEngine';
import {
  normalizeBulletKind,
  playSoundEffect,
  playWeaponHitSound,
  playWeaponShootSound,
  configureSoundSettings,
} from '../../utils/soundEffects';

describe('Weapon Sound Effects Engine', () => {
  it('normalizes bullet kinds correctly', () => {
    expect(normalizeBulletKind('normal')).toBe('bullet_default');
    expect(normalizeBulletKind(undefined)).toBe('bullet_default');
    expect(normalizeBulletKind('skill_slow_shot')).toBe('slow_shot');
    expect(normalizeBulletKind('bullet_missile')).toBe('bullet_missile');
    expect(normalizeBulletKind('bullet_shuriken')).toBe('bullet_shuriken');
    expect(normalizeBulletKind('bullet_kunai')).toBe('bullet_kunai');
  });

  it('runs playSoundEffect and weapon sound functions safely without crashing in headless environment', () => {
    configureSoundSettings(true, 0.8);

    // Test all weapons shoot
    expect(() => playWeaponShootSound('bullet_missile', true)).not.toThrow();
    expect(() => playWeaponShootSound('bullet_shuriken', true)).not.toThrow();
    expect(() => playWeaponShootSound('bullet_kunai', true)).not.toThrow();
    expect(() => playWeaponShootSound('bullet_laser', true)).not.toThrow();
    expect(() => playWeaponShootSound('bullet_fireball', true)).not.toThrow();
    expect(() => playWeaponShootSound('bullet_soccer', true)).not.toThrow();
    expect(() => playWeaponShootSound('bullet_basketball', true)).not.toThrow();
    expect(() => playWeaponShootSound('bullet_crystal', true)).not.toThrow();
    expect(() => playWeaponShootSound('slow_shot', true)).not.toThrow();
    expect(() => playWeaponShootSound('bullet_default', true)).not.toThrow();

    // Test all weapons hit
    expect(() => playWeaponHitSound('bullet_missile')).not.toThrow();
    expect(() => playWeaponHitSound('bullet_shuriken')).not.toThrow();
    expect(() => playWeaponHitSound('bullet_kunai')).not.toThrow();
    expect(() => playWeaponHitSound('bullet_laser')).not.toThrow();
    expect(() => playWeaponHitSound('bullet_fireball')).not.toThrow();
    expect(() => playWeaponHitSound('bullet_soccer')).not.toThrow();
    expect(() => playWeaponHitSound('bullet_basketball')).not.toThrow();
    expect(() => playWeaponHitSound('bullet_crystal')).not.toThrow();
    expect(() => playWeaponHitSound('slow_shot')).not.toThrow();
    expect(() => playWeaponHitSound('bullet_default')).not.toThrow();

    // Test general effects
    expect(() => playSoundEffect('skill', 'skill_freeze_pulse')).not.toThrow();
    expect(() => playSoundEffect('skill', 'skill_shield_bubble')).not.toThrow();
    expect(() => playSoundEffect('wrong')).not.toThrow();
    expect(() => playSoundEffect('hurt')).not.toThrow();
    expect(() => playSoundEffect('clear')).not.toThrow();
    expect(() => playSoundEffect('boss_hit')).not.toThrow();
  });

  it('GameEngine emits distinct weapon sounds on keystrokes and word completion for Shuriken', () => {
    const soundEvents: Array<{ type: string; weaponKind?: string; isFinishing?: boolean }> = [];

    const engine = new GameEngine({
      setId: 'test_set',
      mode: 'recall',
      difficulty: 'normal',
      words: [
        {
          id: 'w_test',
          setId: 'test_set',
          english: 'star',
          vietnamese: 'ngôi sao',
          acceptedAnswers: ['star'],
          createdAt: '',
          updatedAt: '',
        },
      ],
      equippedSkills: [],
      equippedStyleId: 'style_yellow',
      equippedBulletId: 'bullet_shuriken',
      onSoundEffect: (type, weaponKind, isFinishing) => {
        soundEvents.push({ type, weaponKind, isFinishing });
      },
    });

    for (let i = 0; i < 40; i++) {
      engine.update(50);
    }

    const enemy = engine.enemies[0];
    expect(enemy).toBeDefined();
    engine.selectTarget(enemy.id);

    // Type 's' -> non-finishing bullet with bullet_shuriken sound
    engine.handleCharacterInput('s');
    expect(soundEvents).toHaveLength(1);
    expect(soundEvents[0]).toEqual({
      type: 'shoot',
      weaponKind: 'bullet_shuriken',
      isFinishing: false,
    });

    // Type 't', 'a'
    engine.handleCharacterInput('t');
    engine.handleCharacterInput('a');
    expect(soundEvents).toHaveLength(3);

    // Type 'r' -> completes the word! Must fire lethal finishing bullet with isFinishing=true
    engine.handleCharacterInput('r');
    expect(soundEvents).toHaveLength(4);
    expect(soundEvents[3]).toEqual({
      type: 'shoot',
      weaponKind: 'bullet_shuriken',
      isFinishing: true,
    });
  });

  it('GameEngine emits distinct weapon sounds on keystrokes and word completion for Rocket Missile', () => {
    const soundEvents: Array<{ type: string; weaponKind?: string; isFinishing?: boolean }> = [];

    const engine = new GameEngine({
      setId: 'test_set',
      mode: 'recall',
      difficulty: 'normal',
      words: [
        {
          id: 'w_test',
          setId: 'test_set',
          english: 'go',
          vietnamese: 'đi',
          acceptedAnswers: ['go'],
          createdAt: '',
          updatedAt: '',
        },
      ],
      equippedSkills: [],
      equippedStyleId: 'style_yellow',
      equippedBulletId: 'bullet_missile',
      onSoundEffect: (type, weaponKind, isFinishing) => {
        soundEvents.push({ type, weaponKind, isFinishing });
      },
    });

    for (let i = 0; i < 40; i++) {
      engine.update(50);
    }

    const enemy = engine.enemies[0];
    expect(enemy).toBeDefined();
    engine.selectTarget(enemy.id);

    engine.handleCharacterInput('g');
    expect(soundEvents[0]).toEqual({
      type: 'shoot',
      weaponKind: 'bullet_missile',
      isFinishing: false,
    });

    engine.handleCharacterInput('o');
    expect(soundEvents[1]).toEqual({
      type: 'shoot',
      weaponKind: 'bullet_missile',
      isFinishing: true,
    });
  });

  it('GameEngine emits distinct weapon hit sound when bullet reaches monster', () => {
    const soundEvents: Array<{ type: string; weaponKind?: string }> = [];

    const engine = new GameEngine({
      setId: 'test_set',
      mode: 'recall',
      difficulty: 'normal',
      words: [
        {
          id: 'w_test',
          setId: 'test_set',
          english: 'up',
          vietnamese: 'lên',
          acceptedAnswers: ['up'],
          createdAt: '',
          updatedAt: '',
        },
      ],
      equippedSkills: [],
      equippedStyleId: 'style_yellow',
      equippedBulletId: 'bullet_missile',
      onSoundEffect: (type, weaponKind) => {
        soundEvents.push({ type, weaponKind });
      },
    });

    for (let i = 0; i < 40; i++) {
      engine.update(50);
    }

    const enemy = engine.enemies[0];
    engine.selectTarget(enemy.id);
    engine.handleCharacterInput('u');
    engine.handleCharacterInput('p');

    // Step forward until missile hits enemy
    for (let i = 0; i < 50; i++) {
      engine.update(50);
      const hitEvent = soundEvents.find((e) => e.type === 'hit');
      if (hitEvent) {
        expect(hitEvent.weaponKind).toBe('bullet_missile');
        break;
      }
    }

    const hitEvent = soundEvents.find((e) => e.type === 'hit');
    expect(hitEvent).toBeDefined();
    expect(hitEvent?.weaponKind).toBe('bullet_missile');
  });
});
