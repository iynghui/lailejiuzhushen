import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CaretDown, ShareNetwork, Train } from '@phosphor-icons/react';
import { money, monthLabel, summarizeCommunityMonths } from '../model.js';
import { allCommunities } from '../catalog.js';
import { similarCommunities } from '../recommendations.js';
import CommunityMap from '../CommunityMap.jsx';
import Bookmark from './Bookmark.jsx';
import RentRange from './RentRange.jsx';
import ShareSheet from './ShareSheet.jsx';
import { metroFor } from '../metro.js';

function TransactionDetails({ month, transactions }) {
  return (
    <details className="transaction-details" open>
      <summary>
        成交明细
        <CaretDown size={14} />
      </summary>
      <table aria-label={`${monthLabel(month)}成交明细`}>
        <thead>
          <tr>
            <th scope="col">成交日</th>
            <th scope="col">户型</th>
            <th scope="col">面积</th>
            <th scope="col">月租</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((record) => (
            <tr key={record.id}>
              <td>
                <time dateTime={record.date}>{record.date.slice(5).replace('-', '.')}</time>
              </td>
              <td>{record.layout}</td>
              <td>{record.area_sqm ? `${record.area_sqm}㎡` : '—'}</td>
              <td>¥{money(record.rent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

export default function CommunityDetail({ group, onBack, onOpen, saved, toggle, onToast }) {
  const [layout, setLayout] = useState('');
  const [month, setMonth] = useState('');
  const [sort, setSort] = useState('recent');
  const [sharing, setSharing] = useState(false);
  const metro = metroFor(group);

  const detailLayouts = [...new Set(group.records.map((record) => record.layout))].sort();
  const detailMonths = [...new Set(group.records.map((record) => record.month))].sort().reverse();
  const observations = group.records.filter(
    (record) => (!layout || record.layout === layout) && (!month || record.month === month),
  );
  const monthly = summarizeCommunityMonths(observations);
  const transactionsByMonth = new Map();
  for (const record of observations) {
    if (!transactionsByMonth.has(record.month)) transactionsByMonth.set(record.month, []);
    transactionsByMonth.get(record.month).push(record);
  }
  for (const transactions of transactionsByMonth.values()) {
    transactions.sort((a, b) => b.date.localeCompare(a.date));
  }
  if (sort === 'low') monthly.sort((a, b) => a.min - b.min || b.month.localeCompare(a.month));
  const related = similarCommunities(allCommunities, group, 4);

  return (
    <main className="detail-page">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={20} />
        返回小区索引
      </button>
      <div className="detail-title">
        <div>
          <p className="eyebrow">RESIDENTIAL ARCHIVE</p>
          <h1>{group.name}</h1>
          <p className="subtle">
            {group.district} · {group.street || group.areas.join(' / ')}
          </p>
          {metro && (
            <p className="metro-line">
              <Train size={14} weight="light" />
              <span>
                最近地铁 {metro.name}
                {metro.exit ? ` ${metro.exit}` : ''}
              </span>
              {metro.lines && <span className="metro-lines">{metro.lines}</span>}
              <span className="metro-distance">约 {metro.distance}</span>
            </p>
          )}
        </div>
        <div className="detail-actions">
          <button
            className="icon-button"
            aria-label={`分享${group.name}`}
            onClick={() => setSharing(true)}
          >
            <ShareNetwork size={22} weight="light" />
          </button>
          <Bookmark name={group.name} active={saved} onClick={toggle} />
        </div>
      </div>

      <CommunityMap key={group.key} community={group} />

      <div className="detail-filters">
        <label>
          户型
          <select aria-label="详情户型" value={layout} onChange={(e) => setLayout(e.target.value)}>
            <option value="">全部户型</option>
            {detailLayouts.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          月份
          <select aria-label="详情月份" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">全部月份</option>
            {detailMonths.map((value) => (
              <option key={value} value={value}>
                {value.replace('-', '.')}
              </option>
            ))}
          </select>
        </label>
        {monthly.length > 1 && (
          <label>
            排序
            <select aria-label="记录排序" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recent">按月份从新到旧</option>
              <option value="low">租金从低到高</option>
            </select>
          </label>
        )}
      </div>

      {monthly.length === 0 ? (
        <div className="empty">
          <h2>这个条件下还没有记录</h2>
          <p>换一个户型，看看这个小区的其他成交价格。</p>
          <button
            className="primary"
            onClick={() => {
              setLayout('');
              setMonth('');
            }}
          >
            查看全部记录
            <ArrowRight size={18} />
          </button>
        </div>
      ) : (
        <>
          <div className="monthly-heading">
            <h2>月度成交</h2>
            <span className="result-count">{monthly.length} 条月度记录</span>
          </div>
          <ul className="monthly-records" aria-label="月度成交记录">
            {monthly.map((record) => (
              <li className="monthly-record" key={record.month}>
                <h3>{monthLabel(record.month)}</h3>
                <dl className="monthly-values">
                  <div>
                    <dt>成交月租</dt>
                    <dd>
                      <RentRange min={record.min} max={record.max} className="month-rent" />
                    </dd>
                  </div>
                </dl>
                <TransactionDetails
                  month={record.month}
                  transactions={transactionsByMonth.get(record.month)}
                />
              </li>
            ))}
          </ul>
          <p className="data-caption">租金属原表成交记录，未做调整；同一小区同月按成交区间汇总。</p>
          {related.length > 0 && (
            <section className="related" aria-label="您可能还想看">
              <div className="monthly-heading">
                <h2>您可能还想看</h2>
                <span className="result-count">{group.area}</span>
              </div>
              <ul className="related-list">
                {related.map((item) => (
                  <li key={item.key}>
                    <button type="button" onClick={() => onOpen(item.key)}>
                      <span className="related-main">
                        <span className="related-name">{item.name}</span>
                        <span className="related-meta">
                          {item.layouts.slice(0, 2).join(' / ')} · {item.areaMin === item.areaMax ? `${item.areaMin}㎡` : `${item.areaMin}至${item.areaMax}㎡`}
                          {' · '}
                          {monthLabel(item.latestMonth)}
                        </span>
                      </span>
                      <span className="related-rent">
                        <RentRange min={item.min} max={item.max} className="month-rent" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      {sharing && <ShareSheet group={group} onClose={() => setSharing(false)} onToast={onToast} />}
    </main>
  );
}
