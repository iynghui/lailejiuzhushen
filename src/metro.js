import metroData from './data/metro.json';

const formatMeters = (meters) => {
  const value = Number(meters) || 0;
  if (value >= 1000) return `${(value / 1000).toFixed(1)} km`;
  return `${Math.max(10, Math.round(value / 10) * 10)} m`;
};

export function metroFor(community) {
  const entry = metroData[`${community.district}|${community.name}`];
  if (!entry || !entry.s) return null;
  const name = entry.s.endsWith('站') ? entry.s : `${entry.s}站`;
  return {
    name,
    exit: entry.e || '',
    lines: (entry.l || []).join(' · '),
    distance: formatMeters(entry.m),
    meters: Number(entry.m) || 0,
    communityAt: entry.c || null,
    stationAt: entry.at || null,
    exitAt: entry.eat || null,
  };
}
