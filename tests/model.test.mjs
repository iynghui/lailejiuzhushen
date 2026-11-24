import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  DISTRICTS,
  INITIAL,
  filterRecords,
  groupCommunities,
  communityKey,
  communityKeyAliases,
  summarizeCommunityMonths,
} from '../src/model.js';
import { indexComparableRents, compareCommunityRent } from '../src/rentComparison.js';
const records = JSON.parse(readFileSync(new URL('../src/data/records.json', import.meta.url)));
test('Nanshan is first and default; Baoan filters preserve matching records', () => {
  assert.equal(INITIAL.district, '南山区');
  assert.deepEqual(Object.keys(DISTRICTS).slice(0, 2), ['南山区', '宝安区']);
  const initial = filterRecords(records, INITIAL);
  assert.ok(initial.length > 0);
  assert.ok(initial.every((record) => record.district === '南山区' && record.layout === '1房'));
  const shown = filterRecords(records, { ...INITIAL, district: '宝安区', month: '2026-10' });
  assert.equal(shown.length, 147);
  assert.equal(groupCommunities(shown).length, 58);
  assert.equal(new Set(shown.map((r) => r.area_label)).size, 10);
  const west = filterRecords(records, {
    ...INITIAL,
    district: '宝安区',
    region: 'area:西乡',
    month: '2026-10',
  });
  assert.equal(west.length, 25);
  assert.equal(groupCommunities(west).length, 11);
  assert.ok(shown.every((r) => r.layout === '1房'));
  assert.equal(
    groupCommunities(shown).reduce((n, g) => n + g.records.length, 0),
    shown.length,
  );
});
test('combined price, month, query and street filters match records rather than community-wide extrema', () => {
  const shown = filterRecords(records, {
    ...INITIAL,
    district: '宝安区',
    region: 'street:西乡街道',
    query: '财富港',
    min: '3500',
    max: '4100',
    month: '2026-10',
  });
  assert.ok(shown.length > 0);
  assert.ok(
    shown.every(
      (r) =>
        r.community === '财富港大厦' &&
        r.rent >= 3500 &&
        r.rent <= 4100 &&
        r.month === '2026-10' &&
        r.street === '西乡街道',
    ),
  );
  const group = groupCommunities(shown)[0];
  assert.equal(group.min, Math.min(...shown.map((r) => r.rent)));
});
test('new districts, area filters and saved-only results stay scoped', () => {
  for (const [district, region] of [
    ['南山区', 'area:前海'],
    ['福田区', 'area:莲花'],
  ]) {
    const result = filterRecords(records, { ...INITIAL, district, region });
    assert.ok(result.length > 0);
    assert.ok(
      result.every(
        (r) => r.district === district && r.area_label === region.slice(5) && r.layout === '1房',
      ),
    );
  }
  assert.equal(
    filterRecords(records, { ...INITIAL, district: '南山区', region: 'area:西乡' }).length,
    0,
  );
  const key = communityKey(records.find((r) => r.community === '财富港大厦'));
  const shown = filterRecords(records, { ...INITIAL, district: '宝安区' }, true, [key]);
  assert.ok(shown.length > 0);
  assert.ok(shown.every((r) => communityKey(r) === key));
});
test('duplicate-looking observations remain separate', () => {
  const r = records[0];
  const groups = groupCommunities([r, { ...r, id: 'duplicate-observation' }]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].records.length, 2);
});
test('source dataset has stable IDs and complete core fields', () => {
  assert.equal(new Set(records.map((r) => r.id)).size, records.length);
  assert.equal(records.filter((r) => r.id.startsWith('6af810260000000016030a29')).length, 206);
  const addedSources = {
    '6b02d1ca000000001601a3b6': 162,
    '6b015fd600000000220398a6': 175,
    '6b0108db000000001802dda1': 160,
    '6afe55d2000000002b01c5d9': 140,
    '6afd78ae000000002a01b20e': 140,
    '6afbfdba000000001802e918': 162,
  };
  for (const [note, count] of Object.entries(addedSources)) {
    assert.equal(records.filter((record) => record.id.startsWith(`${note}-p`)).length, count);
  }

  assert.deepEqual([...new Set(records.map((r) => r.month))].sort(), [
    '2026-04',
    '2026-05',
    '2026-06',
    '2026-07',
    '2026-09',
    '2026-10',
  ]);
  assert.ok(
    records.every(
      (r) =>
        DISTRICTS[r.district] &&
        r.rent > 0 &&
        r.area_sqm > 0 &&
        r.date.startsWith(r.month + '-') &&
        r.layout &&
        r.community,
    ),
  );
});
test('both price sort orders follow the starting price visible on each community row', () => {
  const shown = filterRecords(records, INITIAL);
  for (const direction of ['low', 'high']) {
    const values = groupCommunities(shown, direction).map((g) => g.min);
    assert.deepEqual(
      values,
      [...values].sort((a, b) => (direction === 'low' ? a - b : b - a)),
    );
  }
});
test('the index defaults to pinyin order and can switch to latest records', () => {
  const template = records[0];
  const examples = [
    { ...template, community: '中粮花园', date: '2026-10-29' },
    { ...template, community: '白金公寓', date: '2026-10-05' },
    { ...template, community: '金海大厦', date: '2026-10-23' },
  ];
  const names = (sort) => groupCommunities(examples, sort).map((group) => group.name);
  assert.deepEqual(names(INITIAL.sort), ['白金公寓', '金海大厦', '中粮花园']);
  assert.deepEqual(names('recent'), ['中粮花园', '金海大厦', '白金公寓']);
});
test('Yinhu spans two administrative districts and old detail links still resolve', () => {
  const base = { ...INITIAL, month: '2026-10', region: 'area:银湖', layout: '' };
  const luohu = filterRecords(records, { ...base, district: '罗湖区' });
  const futian = filterRecords(records, { ...base, district: '福田区' });
  assert.equal(luohu.length, 53);
  assert.equal(futian.length, 15);
  assert.ok(luohu.every((record) => record.street === '清水河街道'));
  assert.ok(futian.some((record) => record.community === '笔架山公馆'));
  assert.equal(communityKeyAliases(records).get('福田区|华润银湖蓝山'), '罗湖区|华润银湖蓝山');
});

test('September results can be selected without pulling in October records', () => {
  const results = filterRecords(records, {
    ...INITIAL,
    district: '罗湖区',
    region: 'area:黄贝岭',
    month: '2026-09',
  });
  assert.ok(results.length > 0);
  assert.ok(results.every((record) => record.month === '2026-09' && record.district === '罗湖区'));
});

test('monthly rows combine rents for the same community month', () => {
  const examples = [
    { month: '2026-10', rent: 4200 },
    { month: '2026-10', rent: 4000 },
    { month: '2026-10', rent: 4500 },
    { month: '2026-09', rent: 3500 },
    { month: '2026-08', rent: 3200 },
  ];
  assert.deepEqual(summarizeCommunityMonths(examples), [
    { month: '2026-10', min: 4000, max: 4500 },
    { month: '2026-09', min: 3500, max: 3500 },
    { month: '2026-08', min: 3200, max: 3200 },
  ]);
});

test('index counts the matching months and quotes one month instead of blending prices', () => {
  const filters = { ...INITIAL, district: '福田区', query: '莲花一村' };
  const [all] = groupCommunities(filterRecords(records, filters));
  assert.equal(all.monthlyCount, 5);
  assert.deepEqual([all.latestMonth, all.min, all.max], ['2026-10', 2800, 4500]);
  const [september] = groupCommunities(filterRecords(records, { ...filters, month: '2026-09' }));
  assert.equal(september.monthlyCount, 1);
  assert.deepEqual([september.latestMonth, september.min, september.max], ['2026-09', 3700, 4300]);
});

test('rent colors use the ten-percent thresholds and comparable communities only', () => {
  const sample = {
    ...records[0],
    district: '宝安区',
    area_label: '西乡',
    month: '2026-10',
    date: '2026-10-01',
    layout: '1房',
    area_sqm: 40,
    rent: 4000,
  };
  const peers = Array.from({ length: 5 }, (_, index) => ({ ...sample, community: `同类${index}` }));
  const outliers = [
    { ...sample, community: '面积不同', area_sqm: 62, rent: 7000 },
    { ...sample, community: '其他月份', month: '2026-09', rent: 7000 },
    { ...sample, community: '其他户型', layout: '2房', rent: 7000 },
    { ...sample, community: '其他片区', area_label: '新安', rent: 7000 },
    { ...sample, community: '其他行政区', district: '南山区', rent: 7000 },
    { ...sample, community: '目标小区', rent: 7000 },
  ];
  const compare = (rent, source) => {
    const [community] = groupCommunities([{ ...sample, community: '目标小区', rent }]);
    return compareCommunityRent(community, indexComparableRents(source));
  };
  const references = peers.concat(outliers);
  assert.equal(compare(4401, references).tone, 'high');
  assert.equal(compare(4400, references).tone, 'near');
  assert.equal(compare(3600, references).tone, 'near');
  assert.equal(compare(3599, references).tone, 'low');
  assert.equal(compare(4000, references).reference, 4000);
  assert.equal(compare(4000, peers.slice(0, 4).concat(outliers, peers[0])), null);
});

test('multiple streets and areas form a union without duplicates and stay district-scoped', () => {
  const base = { ...INITIAL, district: '南山区', month: '2026-10' };
  const selections = ['area:前海', 'area:后海', 'street:粤海街道'];
  const expected = new Set(
    selections.flatMap((region) =>
      filterRecords(records, { ...base, region }).map((row) => row.id),
    ),
  );
  const actual = filterRecords(records, { ...base, region: selections });
  assert.ok(actual.length > 0);
  assert.deepEqual(new Set(actual.map((row) => row.id)), expected);
  assert.equal(actual.length, expected.size);
  assert.ok(
    actual.every(
      (row) => row.district === '南山区' && row.layout === '1房' && row.month === '2026-10',
    ),
  );
  assert.deepEqual(
    filterRecords(records, { ...base, region: [] }),
    filterRecords(records, { ...base, region: '' }),
  );
  assert.equal(filterRecords(records, { ...base, region: ['area:西乡'] }).length, 0);
});
