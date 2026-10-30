import React, { useState, useEffect, useRef } from 'react';
import {
  REGULAR_MONSTER_SPECIES,
  BOSS_MONSTER_SPECIES,
  MonsterSpeciesMeta,
  drawMonster,
} from '../game/assets/MonsterRenderer';
import { Zap, Target, Shield, Crown, Sparkles } from 'lucide-react';
import { getAssetUrl } from '../utils/assetUrl';

interface MonsterAlmanacViewProps {
  initialMonsterId?: string;
  compact?: boolean;
}

const ALL_MONSTERS: MonsterSpeciesMeta[] = [
  ...REGULAR_MONSTER_SPECIES,
  ...BOSS_MONSTER_SPECIES,
];

export const MonsterAlmanacView: React.FC<MonsterAlmanacViewProps> = ({
  initialMonsterId,
  compact = false,
}) => {
  const [selectedMonster, setSelectedMonster] = useState<MonsterSpeciesMeta>(
    () => ALL_MONSTERS.find((m) => m.id === initialMonsterId) || ALL_MONSTERS[0]
  );
  const [filter, setFilter] = useState<'all' | 'speedster' | 'shooter' | 'tank' | 'boss'>('all');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (initialMonsterId) {
      const match = ALL_MONSTERS.find((m) => m.id === initialMonsterId);
      if (match) setSelectedMonster(match);
    }
  }, [initialMonsterId]);

  // Animation loop for monster preview canvas
  useEffect(() => {
    let animId: number;
    let startTime = Date.now();

    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const elapsed = Date.now() - startTime;
          drawMonster(ctx, canvas.width / 2, canvas.height / 2 + 10, {
            speciesId: selectedMonster.id,
            isBoss: selectedMonster.isBoss,
            selected: true,
            animTime: elapsed,
            scale: selectedMonster.isBoss ? 1.25 : 1.45,
          });
        }
      }
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [selectedMonster]);

  const filteredMonsters = ALL_MONSTERS.filter((m) => {
    if (filter === 'all') return true;
    return m.archetype === filter;
  });

  const getArchetypeBadge = (m: MonsterSpeciesMeta) => {
    switch (m.archetype) {
      case 'speedster':
        return { label: 'Lao Nhanh', icon: Zap, color: '#E67E22', bg: '#FDEBD0' };
      case 'shooter':
        return { label: 'Bắn Đạn', icon: Target, color: '#C0392B', bg: '#FADBD8' };
      case 'tank':
        return { label: `${m.requiredWords} Từ Mới Chết`, icon: Shield, color: '#7D3C98', bg: '#EBDEF0' };
      case 'boss':
        return { label: 'Trùm Cuối', icon: Crown, color: '#D4AC0D', bg: '#FCF3CF' };
      default:
        return { label: 'Cơ Bản', icon: Sparkles, color: '#27AE60', bg: '#D5F5E3' };
    }
  };

  const currentBadge = getArchetypeBadge(selectedMonster);

  return (
    <div className={`almanac-view-wrapper ${compact ? 'compact' : ''}`}>
      {/* Filter bar */}
      <div className="almanac-filters">
        {[
          { id: 'all', label: 'Tất Cả (30)' },
          { id: 'speedster', label: '⚡ Lao Nhanh (5)' },
          { id: 'shooter', label: '🎯 Bắn Đạn (4)' },
          { id: 'tank', label: '🛡️ 2–3 Từ (4)' },
          { id: 'boss', label: '👑 Trùm Cuối (8)' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            className={`almanac-filter-btn ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id as any)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content Layout */}
      <div className="almanac-body">
        {/* Left Grid */}
        <div className="almanac-grid">
          {filteredMonsters.map((m) => {
            const badge = getArchetypeBadge(m);
            const isSelected = selectedMonster.id === m.id;
            return (
              <button
                key={m.id}
                type="button"
                className={`almanac-item-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedMonster(m)}
              >
                <div
                  className="almanac-item-avatar"
                  style={{ borderColor: m.primaryColor, backgroundColor: m.auraColor }}
                >
                  <img
                    src={getAssetUrl(`/assets/monsters/${m.id}.png`)}
                    alt={m.name}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <strong className="almanac-item-name">{m.name}</strong>
                <span
                  className="almanac-item-type-badge"
                  style={{ color: badge.color, backgroundColor: badge.bg }}
                >
                  {badge.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Showcase Panel */}
        <div className="almanac-detail">
          {/* 3D / Live Canvas Preview */}
          <div className="almanac-preview-box">
            <canvas
              ref={canvasRef}
              width={260}
              height={210}
              className="almanac-canvas"
            />
            <div
              className="almanac-element-pill"
              style={{ backgroundColor: selectedMonster.primaryColor }}
            >
              Hệ {selectedMonster.element.toUpperCase()}
            </div>
          </div>

          {/* Monster Info */}
          <div className="almanac-info">
            <div className="almanac-name-row">
              <h3>{selectedMonster.name}</h3>
              <small>{selectedMonster.title}</small>
            </div>

            {/* Stats Bar */}
            <div className="almanac-stats-row">
              <div
                className="almanac-badge-pill"
                style={{ color: currentBadge.color, backgroundColor: currentBadge.bg }}
              >
                <currentBadge.icon size={15} />
                <span>{currentBadge.label}</span>
              </div>
              <div className="almanac-danger-stars">
                <span>Độ nguy hiểm:</span>
                {'★'.repeat(selectedMonster.dangerLevel)}
                {'☆'.repeat(5 - selectedMonster.dangerLevel)}
              </div>
            </div>

            {/* Ability */}
            <div className="almanac-section-box">
              <strong>⚔️ Đặc Tính & Kỹ Năng:</strong>
              <p>{selectedMonster.abilityDescription}</p>
            </div>

            {/* PvZ Lore */}
            <div className="almanac-lore-box">
              <span className="almanac-lore-label">📜 Ghi Chép PVZ:</span>
              <p>"{selectedMonster.pvzLore}"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
