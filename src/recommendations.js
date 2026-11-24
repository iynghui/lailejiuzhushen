const ratioGap = 0.3;

function midpoint(item) {
  return (item.min + item.max) / 2;
}

/**
 * 同一片区、租金接近的其他小区：优先同月，其次任意有记录月份；按租金接近程度排序。
 */
export function similarCommunities(all, group, limit = 4) {
  if (!group?.area) return [];
  const base = midpoint(group);
  if (!base) return [];

  const picks = all.filter((item) => {
    if (item.key === group.key) return false;
    if (item.district !== group.district) return false;
    if (!item.areas.includes(group.area)) return false;
    const mid = midpoint(item);
    return mid > 0 && Math.abs(mid / base - 1) <= ratioGap;
  });

  const sameMonth = picks.filter((item) => item.latestMonth === group.latestMonth);
  const pool = sameMonth.length >= 2 ? sameMonth : picks;

  return pool
    .map((item) => ({ ...item, closeness: Math.abs(midpoint(item) / base - 1) }))
    .sort((a, b) => a.closeness - b.closeness || b.latest.localeCompare(a.latest))
    .slice(0, limit);
}
