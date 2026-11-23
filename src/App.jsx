import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MagnifyingGlass,
  BookmarkSimple,
  CaretDown,
  ArrowRight,
  X,
  Check,
  Info,
  SlidersHorizontal,
} from '@phosphor-icons/react';
import records from './data/records.json';
import {
  DISTRICTS,
  INITIAL,
  SORT_OPTIONS,
  money,
  monthLabel,
  filterRecords,
  selectedRegions,
  groupCommunities,
} from './model.js';
import { compareCommunityRent } from './rentComparison.js';
import {
  comparableRents,
  allCommunities,
  monthlyRecordCount,
  totalMonthlyRecords,
  resolveCommunityKey,
  districtCount,
  months,
  layouts,
  areaCount,
  coverageMonths,
} from './catalog.js';
import Modal from './components/Modal.jsx';
import Bookmark from './components/Bookmark.jsx';
import RentRange from './components/RentRange.jsx';
import CommunityDetail from './components/CommunityDetail.jsx';
import { RegionSheet, BudgetSheet, ChoiceSheet } from './components/FilterSheets.jsx';

const getHash = () => {
  try {
    return resolveCommunityKey(decodeURIComponent(location.hash.slice(1)));
  } catch {
    return '';
  }
};
function readSaved() {
  try {
    const v = JSON.parse(localStorage.getItem('residential-index:saved') || '[]');
    return Array.isArray(v) ? [...new Set(v.map(resolveCommunityKey))] : [];
  } catch {
    return [];
  }
}

const comparisonLabels = { high: '高于同类', near: '接近同类', low: '低于同类' };
const comparisonPercent = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

function IndexRent({ community }) {
  const comparison = compareCommunityRent(community, comparableRents);
  const label = comparison && comparisonLabels[comparison.tone];
  const explanation =
    comparison &&
    `同类参考月租 ¥${money(comparison.reference)}，比较 ${comparison.peerCount} 个小区。`;
  return (
    <div className="row-quote" data-tone={comparison?.tone} title={explanation || undefined}>
      <RentRange min={community.min} max={community.max} className="row-price" label="月租" />
      {label && (
        <span className="rent-comparison-label">
          {label} {comparisonPercent.format(comparison.variation)}%
        </span>
      )}
    </div>
  );
}

export function App() {
  const [filters, setFilters] = useState(INITIAL);
  const [saved, setSaved] = useState(readSaved);
  const [savedOnly, setSavedOnly] = useState(false);
  const [sheet, setSheet] = useState('');
  const [selected, setSelected] = useState(getHash);
  const [toast, setToast] = useState('');
  const [queryFocused, setQueryFocused] = useState(false);
  const searchRef = useRef();
  const listRef = useRef();
  const regions = selectedRegions(filters.region);
  const regionLabel =
    regions.length > 2
      ? `已选 ${regions.length} 项`
      : regions.map((value) => value.slice(value.indexOf(':') + 1)).join('、');
  const closeSheet = useCallback(() => setSheet(''), []);
  const update = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const apply = (patch) => {
    update(patch);
    setSheet('');
  };
  useEffect(() => {
    const change = () => {
      setSelected(getHash());
      window.scrollTo({ top: 0, behavior: 'instant' });
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('residential-index:saved', JSON.stringify(saved));
    } catch {
      setToast('浏览器未允许保存，收藏仅在本次打开期间有效。');
    }
  }, [saved]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(timer);
  }, [toast]);
  const toggle = (key, name) => {
    const exists = saved.includes(key);
    setSaved((s) => (exists ? s.filter((x) => x !== key) : [...s, key]));
    setToast(exists ? `已取消收藏 ${name}` : `已收藏 ${name}`);
  };
  const filtered = useMemo(
    () => filterRecords(records, filters, savedOnly, saved),
    [filters, savedOnly, saved],
  );
  const groups = useMemo(() => groupCommunities(filtered, filters.sort), [filtered, filters.sort]);
  const detail = allCommunities.find((g) => g.key === selected);
  const suggestions = filters.query.trim()
    ? allCommunities
        .filter((g) => g.name.toLowerCase().includes(filters.query.trim().toLowerCase()))
        .slice(0, 5)
    : [];
  const openDetail = (key) => {
    setQueryFocused(false);
    location.hash = encodeURIComponent(key);
  };
  const back = () => {
    history.replaceState(null, '', location.pathname + location.search);
    setSelected('');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const reset = () => {
    setFilters({ ...INITIAL, district: filters.district || INITIAL.district, layout: '' });
    setSavedOnly(false);
  };
  const budgetLabel =
    filters.min !== '' || filters.max !== ''
      ? filters.min && filters.max
        ? `${money(filters.min)}至${money(filters.max)}`
        : filters.min
          ? `${money(filters.min)}以上`
          : `${money(filters.max)}以下`
      : '租金';
  const showSaved = () => {
    back();
    setSavedOnly((v) => !v);
    update({ query: '', region: [], district: '', layout: '', min: '', max: '', month: '' });
  };
  return (
    <div className="app-shell">
      <header className="masthead">
        <button
          className="brand"
          onClick={() => {
            back();
            setSavedOnly(false);
            setFilters(INITIAL);
          }}
          aria-label="来了就住深首页"
        >
          来了就住深
        </button>
        <span className="brand-en">
          SHENZHEN /<br />
          RENTAL INDEX
        </span>
        <span className="header-caption">一份关于深圳居住的价格档案</span>
        <button
          className={`icon-button collection-button ${savedOnly ? 'is-saved' : ''}`}
          onClick={showSaved}
          aria-label={savedOnly ? '返回全部小区' : '我的收藏'}
          aria-pressed={savedOnly}
        >
          <BookmarkSimple size={25} weight={savedOnly ? 'fill' : 'light'} />
          {saved.length > 0 && <span className="saved-count">{saved.length}</span>}
          <span className="desktop-only">{savedOnly ? '全部小区' : '我的收藏'}</span>
        </button>
      </header>
      {detail ? (
        <CommunityDetail
          key={detail.key}
          group={detail}
          onBack={back}
          saved={saved.includes(detail.key)}
          toggle={() => toggle(detail.key, detail.name)}
          onToast={setToast}
        />
      ) : (
        <main className="index-layout">
          <aside className="intro">
            <p className="eyebrow desktop-only">AN INDEX OF PLACES TO LIVE</p>
            <h1 className={savedOnly ? undefined : 'brand-headline'}>
              {savedOnly ? (
                <>
                  心仪的小区，
                  <br />
                  留在这里。
                </>
              ) : (
                <>
                  来了就是深圳人，
                  <br />
                  租房也得有点才。
                </>
              )}
            </h1>
            <p className="intro-copy">
              {savedOnly ? (
                <>
                  收藏值得关注的小区，
                  <br />
                  慢慢找到适合自己的住处。
                </>
              ) : (
                <>
                  深圳人才，
                  <br />
                  签合同前先瞄准市场实际成交数据
                </>
              )}
            </p>
            <div className="intro-foot desktop-only">
              <span>SHENZHEN</span>
              <span>住宅 / 价格 / 生活</span>
              <p>
                从一条记录开始，
                <br />
                让下一次选择更有依据。
              </p>
            </div>
          </aside>
          <section className="workspace">
            <div className="filter-sticky">
              <div className="search-wrapper">
                <form
                  className="search-field"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setQueryFocused(false);
                    searchRef.current.blur();
                    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  <MagnifyingGlass size={24} weight="light" />
                  <input
                    ref={searchRef}
                    type="search"
                    aria-label="搜索小区或公寓"
                    placeholder="搜索小区或公寓"
                    value={filters.query}
                    autoComplete="off"
                    onChange={(e) => update({ query: e.target.value })}
                    onFocus={() => setQueryFocused(true)}
                    onBlur={() => setTimeout(() => setQueryFocused(false), 160)}
                  />
                  {filters.query && (
                    <button
                      className="icon-button"
                      type="button"
                      aria-label="清除搜索"
                      onClick={() => {
                        update({ query: '' });
                        searchRef.current.focus();
                      }}
                    >
                      <X size={18} />
                    </button>
                  )}
                  <button type="submit" className="search-submit desktop-only" aria-label="搜索">
                    <ArrowRight size={22} />
                  </button>
                </form>
                {queryFocused && suggestions.length > 0 && (
                  <div className="suggestions" role="listbox" aria-label="匹配的小区">
                    {suggestions.map((g) => (
                      <button
                        type="button"
                        role="option"
                        aria-selected="false"
                        key={g.key}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => openDetail(g.key)}
                      >
                        <span>{g.name}</span>
                        <small>
                          {g.district} · {g.areas.join(' / ')}
                        </small>
                        <ArrowRight size={16} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="district-tabs" role="group" aria-label="选择行政区">
                {Object.keys(DISTRICTS).map((d) => (
                  <button
                    className={filters.district === d ? 'active' : ''}
                    aria-pressed={filters.district === d}
                    onClick={() => update({ district: d, region: [] })}
                    key={d}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <div className="filter-bar">
                <button
                  className={regions.length ? 'has-value' : ''}
                  title={regions.map((value) => value.slice(value.indexOf(':') + 1)).join('、')}
                  onClick={() => setSheet('region')}
                >
                  <span>{regionLabel || '街道 / 片区'}</span>
                  <CaretDown size={15} />
                </button>
                <button
                  className={filters.layout ? 'has-value' : ''}
                  onClick={() => setSheet('layout')}
                >
                  <span className={filters.layout ? 'filter-highlight' : ''}>
                    {filters.layout || '户型'}
                  </span>
                  <CaretDown size={15} />
                </button>
                <button
                  className={budgetLabel !== '租金' ? 'has-value' : ''}
                  onClick={() => setSheet('budget')}
                  title={budgetLabel}
                >
                  <span>{budgetLabel}</span>
                  <CaretDown size={15} />
                </button>
                <button
                  className={filters.month ? 'has-value' : ''}
                  onClick={() => setSheet('month')}
                >
                  {filters.month ? `${Number(filters.month.slice(5))}月` : '月份'}
                  <CaretDown size={15} />
                </button>
              </div>
            </div>
            <div className="results-heading" ref={listRef}>
              <div>
                <h2>{savedOnly ? '我的收藏' : '小区索引'}</h2>
                <span className="result-count">
                  {groups.length} 个小区 · {monthlyRecordCount(groups)} 条月度记录
                </span>
              </div>
              <button className="sort-button" onClick={() => setSheet('sort')}>
                {SORT_OPTIONS.find(([value]) => value === filters.sort)[1]}
                <CaretDown size={15} />
              </button>
            </div>
            <p className="tag-legend">
              <Info size={14} />
              高于同类 / 接近同类 /
              低于同类：与本片区、同月、同户型、面积相近的其他小区成交价中位数相比，偏离超过 ±10%
              才标色。
            </p>
            <div
              className="community-list"
              key={JSON.stringify([
                filters.district,
                filters.region,
                filters.layout,
                filters.month,
                filters.sort,
                filters.min,
                filters.max,
                savedOnly,
              ])}
              aria-live="polite"
            >
              {groups.map((g, i) => (
                <article
                  className="community-row"
                  key={g.key}
                  style={{ '--entry-delay': `${Math.min(i, 7) * 24}ms` }}
                >
                  <button
                    className="community-main"
                    onClick={() => openDetail(g.key)}
                    aria-label={`查看${g.name}的成交记录`}
                  >
                    <span className="index-number">{String(i + 1).padStart(2, '0')}</span>
                    <div className="community-info">
                      <h3>{g.name}</h3>
                      <p>
                        {g.layouts.length === 1 ? g.layouts[0] : '多种户型'} ·{' '}
                        {g.areaMin === g.areaMax ? g.areaMin : `${g.areaMin}至${g.areaMax}`}㎡
                      </p>
                      <time dateTime={g.latestMonth}>
                        {g.areas.join(' / ')} · {monthLabel(g.latestMonth)}
                      </time>
                    </div>
                    <IndexRent community={g} />
                  </button>
                  <Bookmark
                    active={saved.includes(g.key)}
                    name={g.name}
                    onClick={() => toggle(g.key, g.name)}
                  />
                </article>
              ))}
            </div>
            {!groups.length && (
              <div className="empty">
                <SlidersHorizontal size={32} weight="light" />
                <h2>{savedOnly && saved.length === 0 ? '留住你心仪的小区' : '换个条件，再找找'}</h2>
                <p>
                  {savedOnly && saved.length === 0
                    ? '在小区旁点击收藏，下次就能从这里找到它。'
                    : '暂时没有匹配记录，可以放宽户型、租金或街道条件。'}
                </p>
                <button className="primary" onClick={reset}>
                  {savedOnly ? '浏览小区' : '查看已收录小区'}
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
            {groups.length > 0 && (
              <div className="list-end">
                <span>已显示全部 {groups.length} 个小区</span>
                {(filters.query ||
                  filters.layout ||
                  regions.length > 0 ||
                  filters.min ||
                  filters.max ||
                  filters.month) && (
                  <button className="text-button" onClick={reset}>
                    清除筛选
                  </button>
                )}
              </div>
            )}
            <p className="data-caption">首页展示最近有记录的月份，点开小区可查看各月成交区间。</p>
          </section>
        </main>
      )}
      {selected && !detail && <p className="data-caption">未找到该小区，已显示小区索引。</p>}
      <footer className="site-footer">
        <span>
          来了就住深 <i> / </i> SHENZHEN
        </span>
        <span>
          {coverageMonths} · {areaCount} 个片区 · {money(totalMonthlyRecords)} 条月度记录
          <i> / </i>© {new Date().getFullYear()} Taikonaut
        </span>
        <button onClick={() => setSheet('about')}>
          关于这份索引
          <ArrowRight size={14} />
        </button>
      </footer>
      {sheet === 'region' && (
        <RegionSheet
          filters={{ ...filters, district: filters.district || INITIAL.district }}
          onApply={apply}
          onClose={closeSheet}
        />
      )}
      {sheet === 'budget' && <BudgetSheet filters={filters} onApply={apply} onClose={closeSheet} />}
      {sheet === 'layout' && (
        <ChoiceSheet
          title="选择户型"
          options={layouts.map((v) => [v, v || '全部户型'])}
          value={filters.layout}
          onSelect={(v) => apply({ layout: v })}
          onClose={closeSheet}
        />
      )}
      {sheet === 'month' && (
        <ChoiceSheet
          title="成交月份"
          options={[['', '全部月份'], ...months.map((v) => [v, monthLabel(v)])]}
          value={filters.month}
          onSelect={(v) => apply({ month: v })}
          onClose={closeSheet}
        />
      )}
      {sheet === 'sort' && (
        <ChoiceSheet
          title="排列方式"
          options={SORT_OPTIONS}
          value={filters.sort}
          onSelect={(v) => apply({ sort: v })}
          onClose={closeSheet}
        />
      )}
      {sheet === 'about' && (
        <Modal title="关于这份索引" onClose={closeSheet}>
          <div className="about-copy">
            <p>按小区、户型和月份查看深圳的成交租金区间和每一笔成交记录。</p>
            <p>
              当前收录 {coverageMonths} 的 {money(totalMonthlyRecords)} 条月度记录，覆盖{' '}
              {districtCount} 个行政区、{areaCount}{' '}
              个区内片区。行政区以核实的小区地址为准，片区名沿用原表。
            </p>
            <p>同一小区同一个月合为一条，按所选户型汇总，租金区间显示最低值至最高值。</p>
            <p>
              「高于同类 / 接近同类 /
              低于同类」是跨小区比较：只纳入同行政区、同片区、同月份、同户型，且面积与本小区相差不超过
              20%
              的其他小区。每个小区取其当月成交区间中点（最低与最高租金的平均值），这些中点的中位数即参考价；偏离参考价超过
              +10% 标红「高于同类」，低于 −10% 标绿「低于同类」，其余标橙「接近同类」。可比小区少于
              5 个时不显示标签。
            </p>
            <p>
              详情页的“最近地铁”取自高德地图，按小区坐标找到最近的地铁站，标注的是地图直线距离，不是步行里程。
            </p>
            <p>部分小区的街道归属仍在补充，选择“全区”或“片区”可以查看更完整的记录。</p>
            <p>收藏保存在当前浏览器，暂不跨设备同步。</p>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
