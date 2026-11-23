import { useEffect, useId, useRef, useState } from 'react';
import { ArrowUpRight, CaretDown, MapPin } from '@phosphor-icons/react';
import { amapMarkerUrl, amapSearchUrl, loadAMap, searchCommunityPlaces } from './amap.js';

const config = {
  key: import.meta.env.VITE_AMAP_KEY?.trim(),
  securityJsCode: import.meta.env.VITE_AMAP_SECURITY_JS_CODE?.trim(),
  serviceHost: import.meta.env.VITE_AMAP_SERVICE_HOST?.trim(),
};
const configured = Boolean(config.key && (config.securityJsCode || config.serviceHost));

export default function CommunityMap({ community }) {
  const panelId = useId();
  const container = useRef();
  const [expanded, setExpanded] = useState(false);
  const [requested, setRequested] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: configured ? 'loading' : 'unconfigured' });
  const [selected, setSelected] = useState(null);
  const isReady = state.status === 'ready' && selected;
  const externalUrl = isReady ? amapMarkerUrl(selected) : amapSearchUrl(community);

  useEffect(() => {
    if (!configured || !requested) return;
    let disposed = false;
    setState({ status: 'loading' });
    setSelected(null);

    async function locate() {
      try {
        const AMap = await loadAMap(config);
        const places = await searchCommunityPlaces(AMap, community);
        if (disposed) return;
        if (!places.length) return setState({ status: 'empty' });
        setSelected(places[0]);
        setState({ status: 'ready', AMap });
      } catch {
        if (!disposed) setState({ status: 'error' });
      }
    }
    locate();
    return () => {
      disposed = true;
    };
  }, [community.key, community.district, community.name, attempt, requested]);

  useEffect(() => {
    if (!expanded || !isReady || !container.current) return;
    let map;
    let timer;
    let failed = false;
    const fail = () => {
      if (failed) return;
      failed = true;
      window.clearTimeout(timer);
      map?.destroy();
      map = null;
      setState({ status: 'error' });
    };
    try {
      map = new state.AMap.Map(container.current, {
        center: [selected.lng, selected.lat],
        zoom: 16,
        viewMode: '2D',
        scrollWheel: false,
      });
      new state.AMap.Marker({
        map,
        position: [selected.lng, selected.lat],
        title: selected.name,
      });
      map.addControl(new state.AMap.ToolBar());
      timer = window.setTimeout(fail, 20000);
      map.on('complete', () => window.clearTimeout(timer));
    } catch {
      fail();
    }
    return () => {
      window.clearTimeout(timer);
      map?.destroy();
    };
  }, [expanded, isReady, selected, state.AMap]);

  return (
    <section className="community-map" aria-label="小区位置">
      <button
        type="button"
        className="location-card"
        aria-label={`${expanded ? '收起' : '展开'}${community.name}的位置地图`}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => {
          setExpanded((value) => !value);
          setRequested(true);
        }}
      >
        <MapPin size={19} />
        <span className="location-card-label">地点</span>
        <span className="location-card-name">{community.name}</span>
        <CaretDown className="location-card-chevron" size={14} />
      </button>
      <div id={panelId} className="community-map-panel" hidden={!expanded}>
        <div className="community-map-content" aria-busy={state.status === 'loading'}>
          {isReady ? (
            <>
              <div
                ref={container}
                className="amap-canvas"
                role="region"
                aria-label={`${community.name}的高德地图`}
              />
              <div className="community-map-address">
                <MapPin size={16} />
                <p>
                  {selected.name}
                  <span>
                    {selected.district} {selected.address}
                  </span>
                </p>
              </div>
            </>
          ) : (
            <div className="community-map-message" role="status">
              <MapPin size={24} weight="light" />
              <p>
                {state.status === 'loading'
                  ? '正在查找小区位置…'
                  : state.status === 'unconfigured'
                    ? '内嵌地图待接通，可先在高德查看位置'
                    : state.status === 'empty'
                      ? '暂未找到对应位置，请在高德搜索确认'
                      : '地图暂时无法加载，请稍后重试'}
                <span>
                  深圳市 · {community.district} · {community.name}
                </span>
              </p>
              {state.status === 'error' && (
                <button className="text-button" onClick={() => setAttempt((value) => value + 1)}>
                  重试
                </button>
              )}
            </div>
          )}
        </div>
        <div className="community-map-actions">
          <a href={externalUrl} target="_blank" rel="noopener noreferrer">
            去高德地图
            <ArrowUpRight size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}
