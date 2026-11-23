import { communityKey } from './model.js';

const MIN_PEER_COMMUNITIES = 5;
const MAX_AREA_DIFFERENCE = 0.2;
const cohortKey = (record) =>
  JSON.stringify([record.district, record.area_label, record.month, record.layout]);

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function indexComparableRents(records) {
  const cohorts = new Map();
  for (const record of records) {
    const key = cohortKey(record);
    if (!cohorts.has(key)) cohorts.set(key, []);
    cohorts.get(key).push(record);
  }
  return cohorts;
}

export function compareCommunityRent(community, cohorts) {
  const latest = community.records.filter((record) => record.month === community.latestMonth);
  const sample = latest[0];
  if (!sample || !sample.area_label || !/^\d+房$/.test(sample.layout)) return null;
  const key = cohortKey(sample);
  if (latest.some((record) => cohortKey(record) !== key)) return null;

  const typicalArea = median(latest.map((record) => record.area_sqm));
  const peers = new Map();
  for (const record of cohorts.get(key) ?? []) {
    const peerKey = communityKey(record);
    if (peerKey === community.key) continue;
    if (Math.abs(record.area_sqm - typicalArea) > typicalArea * MAX_AREA_DIFFERENCE) continue;
    const range = peers.get(peerKey) ?? { min: record.rent, max: record.rent };
    range.min = Math.min(range.min, record.rent);
    range.max = Math.max(range.max, record.rent);
    peers.set(peerKey, range);
  }
  if (peers.size < MIN_PEER_COMMUNITIES) return null;

  const reference = median([...peers.values()].map(({ min, max }) => (min + max) / 2));
  const midpoint = (community.min + community.max) / 2;
  let tone = 'near';
  if (midpoint * 10 > reference * 11) tone = 'high';
  if (midpoint * 10 < reference * 9) tone = 'low';
  return { tone, reference, variation: (midpoint / reference - 1) * 100, peerCount: peers.size };
}
