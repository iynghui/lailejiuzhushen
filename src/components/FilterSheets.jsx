import { useMemo, useRef, useState } from 'react';
import { Check, ArrowRight } from '@phosphor-icons/react';
import { DISTRICTS, communityKey, money, selectedRegions, parseRegionSelection } from '../model.js';
import { allCommunities, coverageByDistrict } from '../catalog.js';
import Modal from './Modal.jsx';
import RegionSelections from './RegionSelections.jsx';

export function RegionSheet({ filters, onApply, onClose }) {
  const optionsPanel = useRef();
  const [district, setDistrict] = useState(filters.district);
  const [regions, setRegions] = useState(() =>
    selectedRegions(filters.region)
      .map((value) => parseRegionSelection(value, filters.district)?.key)
      .filter(Boolean),
  );
  const [mode, setMode] = useState(
    parseRegionSelection(selectedRegions(filters.region)[0] || '', filters.district)?.type ===
      'street'
      ? 'street'
      : 'area',
  );
  const availableCount = useMemo(
    () => allCommunities.filter((g) => g.district === district).length,
    [district],
  );
  const { local, areas } = coverageByDistrict[district];
  const options = mode === 'street' ? DISTRICTS[district].map((x) => `${x}街道`) : areas;
  const counts = useMemo(() => {
    const grouped = new Map();
    for (const record of local) {
      const value = mode === 'street' ? record.street : record.area_label;
      if (!grouped.has(value)) grouped.set(value, new Set());
      grouped.get(value).add(communityKey(record));
    }
    return grouped;
  }, [local, mode]);
  return (
    <Modal title="按区域寻找" onClose={onClose} wide kind="region">
      {(dismiss) => (
        <>
          <div className="region-body">
            <div className="region-layout">
              <div className="district-options" role="group" aria-label="行政区">
                {Object.keys(DISTRICTS).map((d) => (
                  <button
                    key={d}
                    className={district === d ? 'selected' : ''}
                    aria-pressed={district === d}
                    onClick={() => {
                      if (d !== district) {
                        setDistrict(d);
                        optionsPanel.current?.scrollTo({ top: 0, behavior: 'instant' });
                      }
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="region-options" ref={optionsPanel}>
                <div className="mode-tabs">
                  <button
                    className={mode === 'street' ? 'selected' : ''}
                    aria-pressed={mode === 'street'}
                    onClick={() => {
                      setMode('street');
                      optionsPanel.current?.scrollTo({ top: 0, behavior: 'instant' });
                    }}
                  >
                    行政街道
                  </button>
                  <button
                    className={mode === 'area' ? 'selected' : ''}
                    aria-pressed={mode === 'area'}
                    onClick={() => {
                      setMode('area');
                      optionsPanel.current?.scrollTo({ top: 0, behavior: 'instant' });
                    }}
                  >
                    片区
                  </button>
                </div>
                <button
                  aria-pressed={regions.includes(`${district}|all:`) || !regions.length}
                  className={`region-option ${regions.includes(`${district}|all:`) || !regions.length ? 'selected' : ''}`}
                  onClick={() =>
                    setRegions((current) => [
                      ...current.filter(
                        (value) => parseRegionSelection(value)?.district !== district,
                      ),
                      `${district}|all:`,
                    ])
                  }
                >
                  <span>全区</span>
                  <span>
                    {availableCount} 个小区{' '}
                    {(regions.includes(`${district}|all:`) || !regions.length) && (
                      <Check size={16} />
                    )}
                  </span>
                </button>
                {options.map((value) => {
                  const id = `${district}|${mode}:${value}`;
                  return (
                    <button
                      key={id}
                      className={`region-option ${regions.includes(id) ? 'selected' : ''}`}
                      aria-pressed={regions.includes(id)}
                      onClick={() =>
                        setRegions((current) =>
                          current.includes(id)
                            ? current.filter((value) => value !== id)
                            : [...current.filter((value) => value !== `${district}|all:`), id],
                        )
                      }
                    >
                      <span>{value}</span>
                      <span>
                        {counts.get(value)?.size || 0} {regions.includes(id) && <Check size={16} />}
                      </span>
                    </button>
                  );
                })}
                {options.length === 0 && <p className="subtle">这个区域的片区记录还在整理中。</p>}
              </div>
            </div>
            <RegionSelections
              regions={regions}
              district={district}
              onRemove={(id) => setRegions((current) => current.filter((value) => value !== id))}
            />
            {!regions.length && <p className="region-selection">当前查看{district}全区</p>}
            <p className="sheet-note">
              支持跨区多选，符合任一已选范围即显示。“全区”仅替换当前区的细分范围；一键清除可移除全部选择。
            </p>
          </div>
          <div className="sheet-actions">
            <button className="text-button" onClick={() => setRegions([])}>
              一键清除
            </button>
            <button
              className="primary"
              onClick={() => dismiss(() => onApply({ district, region: regions }))}
            >
              查看结果
              <ArrowRight size={18} />
            </button>
          </div>
        </>
      )}
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
