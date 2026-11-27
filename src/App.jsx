import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  MagnifyingGlass,
  BookmarkSimple,
  CaretDown,
  ArrowRight,
  X,
  Check,
  SlidersHorizontal,
  ArrowLeft,
  ArrowUp,
  Info,
} from '@phosphor-icons/react';
import records from './data/records.json';
import useInteractionMode from './useInteractionMode.js';
import {
  DISTRICTS,
  INITIAL,
  SORT_OPTIONS,
  money,
  monthLabel,
  filterRecords,
  selectedRegions,
  parseRegionSelection,
  groupCommunities,
} from './model.js';
import { compareCommunityRent } from './rentComparison.js';
import {
  comparableRents,
  allCommunities,
  monthlyRecordCount,
  totalMonthlyRecords,
  resolveCommunityKey,
  months,
  layouts,
  areaCount,
  coverageMonths,
} from './catalog.js';
import Modal from './components/Modal.jsx';
import Bookmark from './components/Bookmark.jsx';
import RegionSelections from './components/RegionSelections.jsx';
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
const SAVED_FILTERS = {
  query: '',
  district: '',
  region: [],
  layout: '',
  min: '',
  max: '',
  month: '',
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

function IndexRent({ community, comparison }) {
  return (
    <div className="row-quote" data-tone={comparison?.tone}>
      <RentRange min={community.min} max={community.max} className="row-price" label="月租" />
    </div>
  );
}

function ComparisonRules({ explanation }) {
  return (
    <div className="about-copy">
      {explanation && (
        <>
          <p className="comparison-community">{explanation.community.name}</p>
          <dl className="comparison-facts">
            <div>
              <dt>同类参考月租</dt>
              <dd>¥{money(explanation.comparison.reference)}</dd>
            </div>
            <div>
              <dt>比较样本</dt>
              <dd>{explanation.comparison.peerCount} 个其他小区</dd>
            </div>
            <div>
              <dt>成交月份</dt>
              <dd>{monthLabel(explanation.community.latestMonth)}</dd>
            </div>
          </dl>
        </>
      )}
      <p>比较同片区、同月份、同户型，且面积相差不超过 20% 的其他小区。</p>
      <p>以本小区租金区间的中点，与其他小区区间中点的中位数比较。参考价和百分比用于辅助判断。</p>
      <p>
        高出 10% 以上为红色，低于参考价 10% 以上为绿色，其余为橙色。可比较的其他小区少于 5
        个时，不显示比较标签。
      </p>
    </div>
  );
}

export function App() {
  useInteractionMode();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [filters, setFilters] = useState(INITIAL);
  const [saved, setSaved] = useState(readSaved);
  const [savedOnly, setSavedOnly] = useState(false);
  const [sheet, setSheet] = useState('');
  const [selected, setSelected] = useState(getHash);
  const [toast, setToast] = useState('');
  const [queryFocused, setQueryFocused] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [rentExplanation, setRentExplanation] = useState(null);
  const suggestionId = useId();
  const indexPosition = useRef({ top: 0, key: null });
  const previousSelection = useRef(selected);
  const searchRef = useRef();
  const listRef = useRef();
  const regions = selectedRegions(filters.region);
  const chosenRegions = regions
    .map((value) => parseRegionSelection(value, filters.district))
    .filter(Boolean);
  const chosenDistricts = new Set(chosenRegions.map((value) => value.district));
  const regionLabel = chosenRegions
    .map((value) => (value.type === 'all' ? `${value.district}全区` : value.name))
    .join('、');
  const closeSheet = useCallback(() => setSheet(''), []);
  const update = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const apply = (patch) => {
    update(patch);
    setSheet('');
  };
  useEffect(() => {
    const change = () => {
      setSelected(getHash());
    };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useLayoutEffect(() => {
    const wasDetail = Boolean(previousSelection.current);
    previousSelection.current = selected;
    if (selected) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    } else if (wasDetail) {
      const { top, key } = indexPosition.current;
      const trigger = [...document.querySelectorAll('[data-community-key]')].find(
        (node) => node.dataset.communityKey === key,
      );
      trigger?.focus({ preventScroll: true });
      window.scrollTo({ top, behavior: 'instant' });
    }
  }, [selected]);
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
    () => filterRecords(records, savedOnly ? SAVED_FILTERS : filters, savedOnly, saved),
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
    if (!selected) indexPosition.current = { top: window.scrollY, key };
    setQueryFocused(false);
    setActiveSuggestion(-1);
    location.hash = encodeURIComponent(key);
  };
  const back = ({ restore = true } = {}) => {
    if (!restore) indexPosition.current = { top: 0, key: null };
    history.replaceState(null, '', location.pathname + location.search);
    setSelected('');
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
  const openSaved = () => {
    back({ restore: false });
    setQueryFocused(false);
    setSavedOnly(true);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const closeSaved = () => {
    setSavedOnly(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  return (
    <div className="app-shell">
      <header className="masthead">
        <button
          className="brand"
          onClick={() => {
            back({ restore: false });
            window.scrollTo({ top: 0, behavior: 'instant' });
            setSavedOnly(false);
            setFilters(INITIAL);
          }}
          aria-label="来了就住深首页"
        >
          <span className="brand-mark" aria-hidden="true">
            <img
              className="brand-logo"
              src={`${import.meta.env.BASE_URL}brand/logo.png`}
              alt=""
              width="64"
              height="64"
              fetchPriority="high"
            />
          </span>
          来了就住深
        </button>
        <span className="brand-en">
          SHENZHEN /<br />
          RENTAL INDEX
        </span>
        <span className="header-caption">一份关于深圳居住的价格档案</span>
        <button
          className={`icon-button collection-button ${savedOnly ? 'is-saved' : ''}`}
          onClick={() => (savedOnly ? closeSaved() : openSaved())}
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
          onOpen={openDetail}
          saved={saved.includes(detail.key)}
          toggle={() => toggle(detail.key, detail.name)}
          onToast={setToast}
        />
      ) : (
        <main className="index-layout">
          <aside className="intro">
            <p className="eyebrow desktop-only">AN INDEX OF PLACES TO LIVE</p>
            <div className="intro-headline">
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
              {!savedOnly && (
                <div className="intro-seal" aria-hidden="true">
                  <span className="intro-seal-stamp">深</span>
                  <span className="intro-seal-note">成交实录</span>
                </div>
              )}
            </div>
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
            {!savedOnly && (
              <div className="intro-facts">
                <div>
                  <strong>{money(allCommunities.length)}</strong>
                  <span>个小区</span>
                </div>
                <div>
                  <strong>{areaCount}</strong>
                  <span>个片区</span>
                </div>
                <div>
                  <strong>{months[0].replace('-', '.')}</strong>
                  <span>最新成交月</span>
                </div>
              </div>
            )}
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
            {!savedOnly && (
              <div className="filter-sticky">
                <div
                  className="search-wrapper"
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setQueryFocused(false);
                      setActiveSuggestion(-1);
                    }
                  }}
                >
                  <form
                    className="search-field"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const exactMatches = suggestions.filter(
                        (g) => g.name.toLowerCase() === filters.query.trim().toLowerCase(),
                      );
                      const match =
                        queryFocused && activeSuggestion >= 0
                          ? suggestions[activeSuggestion]
                          : exactMatches.length === 1
                            ? exactMatches[0]
                            : null;
                      if (match) {
                        openDetail(match.key);
                        return;
                      }
                      setQueryFocused(false);
                      searchRef.current.blur();
                      listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                  >
                    <MagnifyingGlass size={24} weight="light" />
                    <input
                      ref={searchRef}
                      type="search"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={queryFocused && suggestions.length > 0}
                      aria-controls={
                        queryFocused && suggestions.length > 0 ? suggestionId : undefined
                      }
                      aria-activedescendant={
                        queryFocused && activeSuggestion >= 0
                          ? `${suggestionId}-${activeSuggestion}`
                          : undefined
                      }
                      aria-label="搜索小区或公寓"
                      placeholder="搜索小区或公寓"
                      value={filters.query}
                      autoComplete="off"
                      onChange={(e) => {
                        update({ query: e.target.value });
                        setActiveSuggestion(-1);
                        setQueryFocused(true);
                      }}
                      onFocus={() => setQueryFocused(true)}
                      onKeyDown={(event) => {
                        if (
                          (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
                          suggestions.length
                        ) {
                          event.preventDefault();
                          setQueryFocused(true);
                          setActiveSuggestion((current) =>
                            event.key === 'ArrowDown'
                              ? (current + 1) % suggestions.length
                              : current <= 0
                                ? suggestions.length - 1
                                : current - 1,
                          );
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          setQueryFocused(false);
                          setActiveSuggestion(-1);
                        }
                      }}
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
                    <div className="suggestions">
                      <p className="suggestions-label">全市小区 · 可直接打开档案</p>
                      <div id={suggestionId} role="listbox" aria-label="全市匹配的小区">
                        {suggestions.map((g, index) => (
                          <button
                            type="button"
                            role="option"
                            aria-selected={activeSuggestion === index}
                            id={`${suggestionId}-${index}`}
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
                    </div>
                  )}
                </div>
                <div className="district-tabs" role="group" aria-label="选择行政区">
                  {Object.keys(DISTRICTS).map((d) => (
                    <button
                      className={
                        (regions.length ? chosenDistricts.has(d) : filters.district === d)
                          ? 'active'
                          : ''
                      }
                      aria-pressed={
                        regions.length ? chosenDistricts.has(d) : filters.district === d
                      }
                      onClick={() => {
                        update({ district: d });
                        if (regions.length) setSheet('region');
                      }}
                      key={d}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div className="filter-bar">
                  <button
                    className={regions.length ? 'has-value' : ''}
                    title={chosenRegions.map((value) => value.label).join('、')}
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
            )}
            {!savedOnly && (
              <RegionSelections
                regions={regions}
                district={filters.district}
                onRemove={(id) => update({ region: regions.filter((value) => value !== id) })}
                onClear={() => update({ region: [] })}
              />
            )}
            {savedOnly && (
              <button className="back-button saved-back" onClick={closeSaved}>
                <ArrowLeft size={20} />
                返回小区列表
              </button>
            )}
            <div className="results-heading" ref={listRef}>
              <div>
                <h2>{savedOnly ? '我的收藏' : '小区租金档案'}</h2>
                <span className="result-count">
                  {groups.length} 个小区 · {monthlyRecordCount(groups)} 条月度记录
                </span>
              </div>
              <button className="sort-button" onClick={() => setSheet('sort')}>
                {SORT_OPTIONS.find(([value]) => value === filters.sort)[1]}
                <CaretDown size={15} />
              </button>
            </div>
            <div className="comparison-intro">
              <span>颜色比较同片区、同月份的相近房源</span>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setRentExplanation(null);
                  setSheet('comparison');
                }}
              >
                比较规则
                <Info size={14} />
              </button>
            </div>
            <div
              className="community-list"
              key={JSON.stringify([
                regions.length ? '' : filters.district,
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
              {groups.map((g, i) => {
                const comparison = compareCommunityRent(g, comparableRents);
                return (
                  <article
                    className="community-row"
                    key={g.key}
                    style={{ '--entry-delay': `${Math.min(i, 7) * 24}ms` }}
                  >
                    <button
                      className="community-main"
                      data-community-key={g.key}
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
                      <IndexRent community={g} comparison={comparison} />
                    </button>
                    {comparison && (
                      <button
                        type="button"
                        className="comparison-trigger"
                        data-tone={comparison.tone}
                        aria-label={`${g.name}的租金比较依据`}
                        onClick={() => {
                          setRentExplanation({ community: g, comparison });
                          setSheet('comparison');
                        }}
                      >
                        {comparisonLabels[comparison.tone]}{' '}
                        {comparisonPercent.format(comparison.variation)}%<Info size={14} />
                      </button>
                    )}
                    <Bookmark
                      active={saved.includes(g.key)}
                      name={g.name}
                      onClick={() => toggle(g.key, g.name)}
                    />
                  </article>
                );
              })}
            </div>
            {!groups.length && (
              <div className="empty">
                <SlidersHorizontal size={32} weight="light" />
                <h2>{savedOnly && saved.length === 0 ? '留住你心仪的小区' : '换个条件，再找找'}</h2>
                {!savedOnly && suggestions.length > 0 && (
                  <div className="search-recovery">
                    <p>当前筛选下没有匹配记录，全市有以下小区：</p>
                    {suggestions.map((g) => (
                      <button key={g.key} type="button" onClick={() => openDetail(g.key)}>
                        <span>
                          {g.name}
                          <small>
                            {g.district} · {g.areas.join(' / ')}
                          </small>
                        </span>
                        <ArrowRight size={18} />
                      </button>
                    ))}
                  </div>
                )}
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
      {selected && !detail && <p className="data-caption">未找到该小区，已显示全部小区。</p>}
      {!detail && showTop && (
        <button className="to-top" onClick={scrollToTop} aria-label="回到顶部" title="回到顶部">
          <ArrowUp size={18} weight="light" />
        </button>
      )}
      <footer className="site-footer">
        <span>
          来了就住深 <i> / </i> SHENZHEN
        </span>
        <span>
          {coverageMonths} · {areaCount} 个片区 · {money(totalMonthlyRecords)} 条月度记录
          <i> / </i>© {new Date().getFullYear()} Taikonaut
        </span>
        <button onClick={() => setSheet('about')}>
          数据说明
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
      {sheet === 'comparison' && (
        <Modal title="租金比较依据" onClose={closeSheet}>
          <ComparisonRules explanation={rentExplanation} />
        </Modal>
      )}
      {sheet === 'about' && (
        <Modal title="数据说明" onClose={closeSheet}>
          <div className="about-copy">
            <p>
              这里记录深圳住宅的实际成交租金，按小区、户型和月份汇总，也可查看每一笔成交明细，给找房一个参照。
            </p>
            <p>
              当前收录 {coverageMonths} 的 {money(totalMonthlyRecords)} 条月度记录。
            </p>
            <p>
              数据来源：小红书博主「江江租房丨温居客」（小红书号
              49321262206）公开发布的深圳成交租金笔记，按其笔记内成交表逐条整理。
            </p>
            <p>同一小区同一个月合为一条，按所选户型汇总，租金区间显示最低值至最高值。</p>
            <p>
              「高于同类 / 接近同类 / 低于同类」是同类比较：与附近面积相近（相差不超过
              20%）、同片区、同月份、同户型的小区成交价中位数相比，高出 10% 以上标红「高于同类」，低
              10% 以上标绿「低于同类」，其余标橙「接近同类」。可比较的小区少于 5 个时不显示标签。
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
