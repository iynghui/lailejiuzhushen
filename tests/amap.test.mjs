import assert from 'node:assert/strict';
import test from 'node:test';
import {
  amapMarkerUrl,
  amapSearchUrl,
  loadAMap,
  normalizeMapPlaces,
  searchCommunityPlaces,
} from '../src/amap.js';

const community = { district: '罗湖区', name: '华润银湖蓝山' };
const location = { lng: 114.08, lat: 22.57 };

test('map links encode the community and Shenzhen district', () => {
  const url = new URL(amapSearchUrl(community));
  assert.equal(url.origin, 'https://uri.amap.com');
  assert.equal(url.searchParams.get('keyword'), '深圳市罗湖区华润银湖蓝山');
  assert.equal(url.searchParams.get('city'), '深圳');
  const marker = new URL(amapMarkerUrl({ ...location, name: '公寓 & 花园' }));
  assert.equal(marker.searchParams.get('name'), '公寓 & 花园');
  assert.equal(marker.searchParams.get('position'), '114.08,22.57');
});

test('rejects missing or out-of-city coordinates and duplicate POIs', () => {
  const poi = { id: 'one', name: '公寓', location, adname: '罗湖区' };
  const results = normalizeMapPlaces([
    poi,
    poi,
    { ...poi, id: 'invalid', location: { lng: NaN, lat: 22.5 } },
    { ...poi, id: 'empty', location: null },
    { ...poi, id: 'Beijing', location: { lng: 116.4, lat: 39.9 } },
    { id: 'SDK', name: '花园', location: { getLng: () => 114.1, getLat: () => 22.6 } },
  ]);
  assert.deepEqual(
    results.map((result) => result.id),
    ['one', 'SDK'],
  );
});

test('the SDK loader retries after errors, shares loading and sets security before loading', async () => {
  const appended = [];
  globalThis.window = { setTimeout, clearTimeout };
  globalThis.document = {
    createElement: () => ({
      remove() {
        this.removed = true;
      },
    }),
    head: {
      append(script) {
        assert.equal(window._AMapSecurityConfig.securityJsCode, 'test-code');
        appended.push(script);
      },
    },
  };
  try {
    await assert.rejects(loadAMap({ key: '', securityJsCode: 'test-code' }), /配置/);
    const config = { key: 'test-key', securityJsCode: 'test-code' };
    const failure = loadAMap(config);
    appended[0].onerror();
    await assert.rejects(failure, /无法加载/);
    assert.equal(appended[0].removed, true);
    const retry = loadAMap(config);
    assert.equal(loadAMap(config), retry);
    const query = new URL(appended[1].src).searchParams;
    window.AMap = { Map() {}, PlaceSearch() {} };
    window[query.get('callback')]();
    assert.equal(await retry, window.AMap);
    assert.equal(appended.length, 2);
  } finally {
    delete globalThis.document;
    delete globalThis.window;
  }
});

test('PlaceSearch is Shenzhen-limited and reports API failures without coordinates', async () => {
  globalThis.window = { setTimeout, clearTimeout };
  const fake = (status, result) => ({
    PlaceSearch: class {
      constructor(options) {
        assert.equal(options.city, '深圳');
        assert.equal(options.citylimit, true);
      }
      search(query, callback) {
        assert.equal(query, '罗湖区华润银湖蓝山');
        callback(status, result);
      }
    },
  });
  try {
    assert.deepEqual(await searchCommunityPlaces(fake('no_data'), community), []);
    await assert.rejects(searchCommunityPlaces(fake('error', { info: 'INVALID_KEY' }), community));
    const results = await searchCommunityPlaces(
      fake('complete', {
        poiList: { pois: [{ id: 'matched', name: community.name, location, adname: '罗湖区' }] },
      }),
      community,
    );
    assert.equal(results[0].district, '罗湖区');
  } finally {
    delete globalThis.window;
  }
});
