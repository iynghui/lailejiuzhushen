import metroData from './data/metro.json';

const formatMeters = (meters) => {
  const value = Number(meters) || 0;
  if (value >= 1000) return `${(value / 1000).toFixed(1)} km`;
  return `${Math.max(10, Math.round(value / 10) * 10)} m`;
};

export function metroCoordsFor(community) {
  const entry = metroData[`${community.district}|${community.name}`];
  if (!entry || !Array.isArray(entry.c) || entry.c.length !== 2) return null;
  return { lng: entry.c[0], lat: entry.c[1] };
}

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

const point = (at, name) => `${at[0]},${at[1]},${encodeURIComponent(name)}`;

export function metroWalkUrl(metro, communityName) {
  if (!metro || !metro.communityAt || !metro.stationAt) return null;
  const from = point(metro.communityAt, communityName);
  const destination = metro.exitAt || metro.stationAt;
  const name = metro.exit ? `${metro.name}${metro.exit}` : metro.name;
  const to = point(destination, name);
  return `https://uri.amap.com/navigation?from=${from}&to=${to}&mode=walk&policy=1&coordinate=gaode&callnative=1&src=lailejiuzhushen`;
}
