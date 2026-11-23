const allowedPaths = new Set([
  'v3/place/text',
  'v3/place/detail',
  'v3/place/around',
  'v3/assistant/inputtips',
  'v3/log/init',
  'v4/map/styles',
  'v4/map/styles/info',
]);

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return response.status(405).json({ error: 'Method not allowed' });
  }
  const incoming = new URL(request.url, 'https://local.invalid');
  const path = incoming.searchParams.get('path');
  if (!allowedPaths.has(path)) return response.status(404).json({ error: 'Not found' });
  const key = process.env.AMAP_KEY;
  const secret = process.env.AMAP_SECURITY_JS_CODE;
  if (!key || !secret) return response.status(503).json({ error: 'Map is not configured' });
  if (incoming.searchParams.get('key') !== key)
    return response.status(403).json({ error: 'Invalid map key' });
  const host = path.startsWith('v4/map/styles') ? 'webapi.amap.com' : 'restapi.amap.com';
  const upstream = new URL(`https://${host}/${path}`);
  for (const [name, value] of incoming.searchParams) {
    if (!['path', 'key', 'jscode', 's'].includes(name)) upstream.searchParams.append(name, value);
  }
  upstream.searchParams.set('key', key);
  upstream.searchParams.set('jscode', secret);
  // JS API service proxy requests are only accepted by restapi.amap.com with s=rsv3.
  if (host === 'restapi.amap.com') upstream.searchParams.set('s', 'rsv3');
  try {
    const result = await fetch(upstream, { redirect: 'error', signal: AbortSignal.timeout(10000) });
    const body = Buffer.from(await result.arrayBuffer());
    response.setHeader(
      'Content-Type',
      result.headers.get('content-type') || 'application/octet-stream',
    );
    return response.status(result.status).send(body);
  } catch {
    return response.status(502).json({ error: 'Map service is temporarily unavailable' });
  }
}
