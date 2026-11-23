const CALLBACK_NAME = '__laileAmapReady';
const MAP_TIMEOUT = 20000;
let sdkPromise;

export function amapSearchUrl(community) {
  const url = new URL('https://uri.amap.com/search');
  url.search = new URLSearchParams({
    keyword: `深圳市${community.district}${community.name}`,
    city: '深圳',
    view: 'map',
    src: 'lailejiuzhushen',
    callnative: '1',
  }).toString();
  return url.href;
}

export function amapMarkerUrl(place) {
  const url = new URL('https://uri.amap.com/marker');
  url.search = new URLSearchParams({
    position: `${place.lng},${place.lat}`,
    name: place.name,
    src: 'lailejiuzhushen',
    callnative: '1',
  }).toString();
  return url.href;
}

export function loadAMap({ key, securityJsCode, serviceHost }) {
  if (!key || (!securityJsCode && !serviceHost)) {
    return Promise.reject(new Error('地图配置尚未完成'));
  }
  if (sdkPromise) return sdkPromise;

  const pending = new Promise((resolve, reject) => {
    window._AMapSecurityConfig = serviceHost
      ? { serviceHost: new URL(serviceHost, window.location.origin).href }
      : { securityJsCode };
    const script = document.createElement('script');
    const timer = window.setTimeout(() => fail(), MAP_TIMEOUT);
    const finish = () => {
      window.clearTimeout(timer);
      delete window[CALLBACK_NAME];
      script.onerror = null;
    };
    function fail() {
      finish();
      script.remove();
      reject(new Error('高德地图暂时无法加载'));
    }
    window[CALLBACK_NAME] = () => {
      if (!window.AMap?.Map || !window.AMap?.PlaceSearch) return fail();
      finish();
      resolve(window.AMap);
    };
    script.onerror = fail;
    script.src =
      'https://webapi.amap.com/maps?' +
      new URLSearchParams({
        v: '2.0',
        key,
        plugin: 'AMap.PlaceSearch,AMap.ToolBar',
        callback: CALLBACK_NAME,
      });
    script.async = true;
    document.head.append(script);
  });
  sdkPromise = pending.catch((error) => {
    sdkPromise = undefined;
    throw error;
  });
  return sdkPromise;
}

export function normalizeMapPlaces(pois) {
  const unique = new Map();
  for (const poi of pois ?? []) {
    const location = poi.location;
    const lng = Number(location?.getLng?.() ?? location?.lng);
    const lat = Number(location?.getLat?.() ?? location?.lat);
    // PlaceSearch is city-limited. Reject invalid coordinates before drawing.
    if (
      !Number.isFinite(lng) ||
      !Number.isFinite(lat) ||
      lng < 113.6 ||
      lng > 114.7 ||
      lat < 22.35 ||
      lat > 22.95
    )
      continue;
    const name = typeof poi.name === 'string' ? poi.name : '';
    if (!name) continue;
    const id = poi.id || `${name}|${lng}|${lat}`;
    unique.set(id, {
      id,
      name,
      address: typeof poi.address === 'string' ? poi.address : '',
      district: typeof poi.adname === 'string' ? poi.adname : '',
      lng,
      lat,
    });
  }
  return [...unique.values()];
}

export function searchCommunityPlaces(AMap, community) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('小区位置查询超时')), MAP_TIMEOUT);
    try {
      const search = new AMap.PlaceSearch({
        city: '深圳',
        citylimit: true,
        pageSize: 10,
        pageIndex: 1,
        extensions: 'base',
      });
      search.search(`${community.district}${community.name}`, (status, result) => {
        window.clearTimeout(timer);
        if (status === 'no_data') return resolve([]);
        if (status !== 'complete') return reject(new Error('暂时无法查询小区位置'));
        resolve(normalizeMapPlaces(result?.poiList?.pois));
      });
    } catch (error) {
      window.clearTimeout(timer);
      reject(error);
    }
  });
}
