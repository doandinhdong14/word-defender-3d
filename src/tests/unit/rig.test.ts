import { describe, it, expect } from 'vitest';
import { PONPI_RIG, getPoseFromAngle } from '../../game/assets/ponpiRig';
import { PoseId } from '../../types/game';

describe('pempom Rig and Poses', () => {
  const allPoses: PoseId[] = [
    'idle',
    'fire_up',
    'fire_up_left',
    'fire_up_right',
    'fire_left',
    'fire_right',
  ];

  it('defines valid hatAnchor, shirtAnchor, muzzleAnchor, and hatRotationDeg for all 5 poses plus idle', () => {
    for (const pose of allPoses) {
      const config = PONPI_RIG[pose];
      expect(config).toBeDefined();
      expect(typeof config.hatAnchor.x).toBe('number');
      expect(typeof config.hatAnchor.y).toBe('number');
      expect(typeof config.shirtAnchor.x).toBe('number');
      expect(typeof config.shirtAnchor.y).toBe('number');
      expect(typeof config.muzzleAnchor.x).toBe('number');
      expect(typeof config.muzzleAnchor.y).toBe('number');
      expect(typeof config.hatRotationDeg).toBe('number');
    }
  });

  it('correctly maps target angles to the corresponding pose', () => {
    // Straight up (-PI/2)
    expect(getPoseFromAngle(-Math.PI / 2)).toBe('fire_up');

    // Diagonal top-left (-3*PI/4 = -135 deg)
    expect(getPoseFromAngle((-3 * Math.PI) / 4)).toBe('fire_up_left');

    // Diagonal top-right (-PI/4 = -45 deg)
    expect(getPoseFromAngle(-Math.PI / 4)).toBe('fire_up_right');

    // Left (-PI)
    expect(getPoseFromAngle(-Math.PI)).toBe('fire_left');

    // Right (0)
    expect(getPoseFromAngle(0)).toBe('fire_right');
  });
});
