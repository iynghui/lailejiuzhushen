export const DISTRICTS = {
  南山区: ['南头', '南山', '西丽', '沙河', '蛇口', '招商', '粤海', '桃源'],
  宝安区: ['新安', '西乡', '航城', '福永', '福海', '沙井', '新桥', '松岗', '燕罗', '石岩'],
  福田区: ['园岭', '南园', '福田', '沙头', '香蜜湖', '梅林', '莲花', '华富', '福保', '华强北'],
  罗湖区: ['桂园', '黄贝', '东门', '南湖', '笋岗', '翠竹', '东湖', '东晓', '莲塘', '清水河'],
  龙华区: ['民治', '龙华', '观湖', '大浪', '福城', '观澜'],
};
export const SORT_OPTIONS = [
  ['alphabetical', '字母排序'],
  ['recent', '最新纪录'],
  ['low', '租金从低到高'],
  ['high', '租金从高到低'],
];
export const INITIAL = {
  district: '南山区',
  region: [],
  layout: '1房',
  min: '',
  max: '',
  month: '',
  query: '',
  sort: 'alphabetical',
};
const pinyinCollator = new Intl.Collator('zh-Hans-u-co-pinyin', { numeric: true });
const compareNames = (a, b) =>
  pinyinCollator.compare(a.name, b.name) || pinyinCollator.compare(a.district, b.district);
const compareLatest = (a, b) => b.latest.localeCompare(a.latest) || compareNames(a, b);
const communitySort = {
  alphabetical: compareNames,
  recent: compareLatest,
  low: (a, b) => a.min - b.min || compareLatest(a, b),
  high: (a, b) => b.min - a.min || compareLatest(a, b),
};
export const communityKey = (r) => `${r.district}|${r.community}`;

export function communityKeyAliases(records) {
  const current = new Set(records.map(communityKey));
  const aliases = new Map();
  for (const record of records) {
    if (!record.source_district) continue;
    const previous = `${record.source_district}|${record.community}`;
    if (!current.has(previous)) aliases.set(previous, communityKey(record));
  }
  return aliases;
}
const moneyFormatter = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 });
export const money = (n) => moneyFormatter.format(n);
export const monthLabel = (m) => `${Number(m.slice(0, 4))}年${Number(m.slice(5))}月`;
export function selectedRegions(region) {
  return Array.isArray(region)
    ? region.filter((value) => typeof value === 'string' && value)
    : region
      ? [region]
      : [];
}

export function filterRecords(records, f, savedOnly = false, saved = []) {
  const query = f.query.trim().toLowerCase();
  const regions = selectedRegions(f.region);
  return records.filter(
    (r) =>
      (!f.district || r.district === f.district) &&
      (!regions.length ||
        regions.some((region) =>
          region.startsWith('street:')
            ? r.street === region.slice(7)
            : r.area_label === region.slice(5),
        )) &&
      (!f.layout || r.layout === f.layout) &&
      (f.min === '' || r.rent >= Number(f.min)) &&
      (f.max === '' || r.rent <= Number(f.max)) &&
      (!f.month || r.month === f.month) &&
      (!query || r.community.toLowerCase().includes(query)) &&
      (!savedOnly || saved.includes(communityKey(r))),
  );
}

export function summarizeCommunityMonths(records) {
  const months = new Map();
  for (const record of records) {
    const month = record.month;
    if (!months.has(month)) {
      months.set(month, {
        month,
        min: record.rent,
        max: record.rent,
      });
    }
    const summary = months.get(month);
    summary.min = Math.min(summary.min, record.rent);
    summary.max = Math.max(summary.max, record.rent);
  }
  return [...months.values()].sort((a, b) => b.month.localeCompare(a.month));
}

export function groupCommunities(records, sort = INITIAL.sort) {
  const groups = new Map();
  for (const r of records) {
    const key = communityKey(r);
    if (!groups.has(key))
      groups.set(key, {
        key,
        name: r.community,
        district: r.district,
        area: r.area_label,
        street: r.street,
        records: [],
      });
    groups.get(key).records.push(r);
  }
  return [...groups.values()]
    .map((group) => {
      const monthly = summarizeCommunityMonths(group.records);
      const { month: latestMonth, min, max } = monthly[0];
      const recent = group.records.filter((record) => record.month === latestMonth);
      return {
        ...group,
        latestMonth,
        monthlyCount: monthly.length,
        min,
        max,
        areaMin: Math.min(...recent.map((record) => record.area_sqm)),
        areaMax: Math.max(...recent.map((record) => record.area_sqm)),
        latest: recent
          .map((record) => record.date)
          .sort()
          .at(-1),
        areas: [...new Set(group.records.map((record) => record.area_label))],
        layouts: [...new Set(recent.map((record) => record.layout))],
      };
    })
    .sort(communitySort[sort] ?? compareNames);
}
