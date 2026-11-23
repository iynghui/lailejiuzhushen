const AMAP_KEY = import.meta.env.VITE_AMAP_KEY?.trim();
const SERVICE = '/_AMapService';
const CACHE_KEY = 'residential-index:metro:v1';
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
const TIMEOUT = 8000;

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function writeCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Cache is best-effort; ignore quota or private-mode failures.
  }
}

function inShenzhen(poi) {
  const [lng, lat] = String(poi?.location || '')
    .split(',')
    .map(Number);
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng > 113.6 &&
    lng < 114.7 &&
    lat > 22.35 &&
    lat < 22.95
  );
}

function cleanStationName(name) {
  const raw = String(name || '')
    .replace(/\(地铁站\)/g, '')
    .replace(/（地铁站）/g, '')
    .replace(/地铁站|站点$/g, '')
    .replace(/\s+/g, '')
    .trim();
  if (!raw) return '';
  return /站$/.test(raw) ? raw : `${raw}站`;
}

function cleanLines(type) {
  const parts = String(type || '')
    .split(';')
    .map((item) => item.split('/')[0].trim())
    .filter((item) => /^\d+号线$|^[^\d]{2,6}线$/.test(item));
  return [...new Set(parts)].slice(0, 3).join(' · ');
}

function formatKm(meters) {
  const value = Math.max(0.1, Math.round(meters / 100) / 10);
  return `${value.toFixed(1)} km`;
}

async function query(path, params, signal) {
  const url = new URL(`${SERVICE}/${path}`, window.location.origin);
  url.searchParams.set('key', AMAP_KEY);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`AMap ${response.status}`);
    const data = await response.json();
    if (data?.status !== '1') throw new Error(data?.info || 'AMap query failed');
    return data;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function nearestMetro(community, signal) {
  if (!AMAP_KEY || !community?.name) return null;
  const cacheKey = `${community.district || ''}|${community.name}`;
  const cache = readCache();
  const cached = cache[cacheKey];
  if (cached?.at && Date.now() - cached.at < CACHE_TTL) return cached.value;

  const keyword = `${community.district || '深圳'}${community.name}`;
  const text = await query(
    'v3/place/text',
    {
      keywords: keyword,
      city: '深圳',
      citylimit: 'true',
      offset: '5',
      page: '1',
    },
    signal,
  );
  const poi = (text.pois || []).find(inShenzhen);
  if (!poi) return null;

  const around = await query(
    'v3/place/around',
    {
      location: poi.location,
      types: '150500',
      radius: '1500',
      sortrule: 'distance',
      offset: '5',
      page: '1',
    },
    signal,
  );
  const station = (around.pois || []).find((item) => !/出入口|口$|口\d|站厅/.test(item.name || ''));
  if (!station) return null;

  const value = {
    name: cleanStationName(station.name),
    lines: cleanLines(station.address || station.type),
    distance: formatKm(Number(station.distance) || 0),
  };
  if (!value.name) return null;

  cache[cacheKey] = { at: Date.now(), value };
  writeCache(cache);
  return value;
}
