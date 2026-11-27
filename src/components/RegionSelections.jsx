import { X } from '@phosphor-icons/react';
import { parseRegionSelection } from '../model.js';

export default function RegionSelections({ regions, district, onRemove, onClear }) {
  if (!regions.length) return null;
  return (
    <div className="selected-regions" role="group" aria-label="已选范围">
      <span className="selected-regions-label">已选范围</span>
      {regions.map((value) => {
        const selection = parseRegionSelection(value, district);
        if (!selection) return null;
        return (
          <button
            type="button"
            className="region-chip"
            key={value}
            aria-label={`移除${selection.label}`}
            onClick={() => onRemove(value)}
          >
            <span>{selection.label}</span>
            <X size={12} aria-hidden="true" />
          </button>
        );
      })}
      {onClear && (
        <button type="button" className="text-button" onClick={onClear}>
          一键清除
        </button>
      )}
    </div>
  );
}
