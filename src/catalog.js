import records from './data/records.json';
import { DISTRICTS, communityKeyAliases, groupCommunities, monthLabel } from './model.js';
import { indexComparableRents } from './rentComparison.js';

export const comparableRents = indexComparableRents(records);
export const allCommunities = groupCommunities(records);
export const monthlyRecordCount = (communities) =>
  communities.reduce((total, community) => total + community.monthlyCount, 0);
export const totalMonthlyRecords = monthlyRecordCount(allCommunities);
const oldCommunityKeys = communityKeyAliases(records);
export const resolveCommunityKey = (key) => oldCommunityKeys.get(key) ?? key;
export const districtCount = new Set(records.map((record) => record.district)).size;
export const months = [...new Set(records.map((r) => r.month))].sort().reverse();
export const layouts = [
  '',
  ...[...new Set(records.map((r) => r.layout))].sort(
    (a, b) => (parseInt(a) || 99) - (parseInt(b) || 99),
  ),
];
export const coverageByDistrict = Object.fromEntries(
  Object.keys(DISTRICTS).map((d) => {
    const local = records.filter((r) => r.district === d);
    const areas = [...new Set(local.map((r) => r.area_label))].sort((a, b) =>
      a.localeCompare(b, 'zh-CN'),
    );
    return [d, { local, areas }];
  }),
);
export const areaCount = Object.values(coverageByDistrict).reduce((n, v) => n + v.areas.length, 0);
export const coverageMonths =
  months.length === 1
    ? monthLabel(months[0])
    : `${monthLabel(months.at(-1))}至${monthLabel(months[0])}`;
