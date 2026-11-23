import { useState } from 'react';
import { Check, ArrowRight } from '@phosphor-icons/react';
import { DISTRICTS, communityKey, money, selectedRegions } from '../model.js';
import { allCommunities, coverageByDistrict } from '../catalog.js';
import Modal from './Modal.jsx';

export function RegionSheet({ filters, onApply, onClose }) {
  const [district, setDistrict] = useState(filters.district);
  const [regions, setRegions] = useState(() => selectedRegions(filters.region));
  const [mode, setMode] = useState(
    selectedRegions(filters.region)[0]?.startsWith('street:') ? 'street' : 'area',
  );
  const available = allCommunities.filter((g) => g.district === district);
  const { local, areas } = coverageByDistrict[district];
  const options = mode === 'street' ? DISTRICTS[district].map((x) => `${x}街道`) : areas;
  const count = (value) =>
    new Set(
      local
        .filter((r) => (mode === 'street' ? r.street === value : r.area_label === value))
        .map(communityKey),
    ).size;
  return (
    <Modal title="按区域寻找" onClose={onClose} wide>
      <div className="region-layout">
        <div className="district-options" role="group" aria-label="行政区">
          {Object.keys(DISTRICTS).map((d) => (
            <button
              key={d}
              className={district === d ? 'selected' : ''}
              onClick={() => {
                if (d !== district) {
                  setDistrict(d);
                  setRegions([]);
                }
              }}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="region-options">
          <div className="mode-tabs">
            <button
              className={mode === 'street' ? 'selected' : ''}
              onClick={() => setMode('street')}
            >
              行政街道
            </button>
            <button className={mode === 'area' ? 'selected' : ''} onClick={() => setMode('area')}>
              片区
            </button>
          </div>
          <button
            aria-pressed={!regions.length}
            className={`region-option ${!regions.length ? 'selected' : ''}`}
            onClick={() => setRegions([])}
          >
            <span>全区</span>
            <span>
              {available.length} 个小区 {!regions.length && <Check size={16} />}
            </span>
          </button>
          {options.map((value) => {
            const id = `${mode}:${value}`;
            return (
              <button
                key={id}
                className={`region-option ${regions.includes(id) ? 'selected' : ''}`}
                aria-pressed={regions.includes(id)}
                onClick={() =>
                  setRegions((current) =>
                    current.includes(id)
                      ? current.filter((value) => value !== id)
                      : [...current, id],
                  )
                }
              >
                <span>{value}</span>
                <span>
                  {count(value)} {regions.includes(id) && <Check size={16} />}
                </span>
              </button>
            );
          })}
          {options.length === 0 && <p className="subtle">这个区域的片区记录还在整理中。</p>}
        </div>
      </div>
      <p className="sheet-note">
        街道和片区均可多选，符合任一已选范围即显示。选“全区”可清空细分条件。
      </p>
      <div className="sheet-actions">
        <button className="text-button" onClick={() => setRegions([])}>
          一键清除
        </button>
        <button className="primary" onClick={() => onApply({ district, region: regions })}>
          查看结果
          <ArrowRight size={18} />
        </button>
      </div>
    </Modal>
  );
}
export function BudgetSheet({ filters, onApply, onClose }) {
  const [min, setMin] = useState(filters.min),
    [max, setMax] = useState(filters.max);
  const invalid =
    (min !== '' && Number(min) < 0) ||
    (max !== '' && Number(max) < 0) ||
    (min !== '' && max !== '' && Number(min) > Number(max));
  const presets = [
    ['不限', '', ''],
    ['3,000 元以下', '', '3000'],
    ['3,000 至 5,000 元', '3000', '5000'],
    ['5,000 至 8,000 元', '5000', '8000'],
    ['8,000 元以上', '8000', ''],
  ];
  return (
    <Modal title="月租金范围" onClose={onClose}>
      <div className="choice-list">
        {presets.map(([label, a, b]) => (
          <button
            key={label}
            className={min === a && max === b ? 'selected' : ''}
            onClick={() => {
              setMin(a);
              setMax(b);
            }}
          >
            <span>{label}</span>
            {min === a && max === b && <Check size={18} />}
          </button>
        ))}
      </div>
      <div className="budget-inputs">
        <label>
          最低月租
          <input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="不限"
            value={min}
            onChange={(e) => setMin(e.target.value)}
          />
        </label>
        <span>至</span>
        <label>
          最高月租
          <input
            type="number"
            min="0"
            inputMode="numeric"
            placeholder="不限"
            value={max}
            onChange={(e) => setMax(e.target.value)}
          />
        </label>
      </div>
      {invalid && (
        <p className="error" role="alert">
          请输入有效范围，最低租金不能高于最高租金。
        </p>
      )}
      <div className="sheet-actions">
        <span className="subtle">单位：元 / 月</span>
        <button className="primary" disabled={invalid} onClick={() => onApply({ min, max })}>
          应用筛选
          <ArrowRight size={18} />
        </button>
      </div>
    </Modal>
  );
}
export function ChoiceSheet({ title, options, value, onSelect, onClose }) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="choice-list">
        {options.map(([v, label]) => (
          <button className={value === v ? 'selected' : ''} key={v} onClick={() => onSelect(v)}>
            <span>{label}</span>
            {value === v && <Check size={18} />}
          </button>
        ))}
      </div>
    </Modal>
  );
}
