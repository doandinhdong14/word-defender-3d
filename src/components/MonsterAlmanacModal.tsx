import React from 'react';
import { X } from 'lucide-react';
import { MonsterAlmanacView } from './MonsterAlmanacView';

interface MonsterAlmanacModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMonsterId?: string;
}

export const MonsterAlmanacModal: React.FC<MonsterAlmanacModalProps> = ({
  isOpen,
  onClose,
  initialMonsterId,
}) => {
  if (!isOpen) return null;

  return (
    <div className="almanac-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="almanac-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="almanac-header">
          <div className="almanac-title-wrap">
            <span className="almanac-stamp">PVZ STYLE BESTIARY</span>
            <h2>📖 Sách Yêu Quái (Monster Almanac)</h2>
          </div>
          <button className="almanac-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={22} />
          </button>
        </div>

        {/* Reusable View */}
        <MonsterAlmanacView initialMonsterId={initialMonsterId} />
      </div>
    </div>
  );
};
