import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/amap.js';

function response() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(value) {
      this.code = value;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    send(value) {
      this.body = value;
      return this;
    },
  };
}

test('map proxy restricts methods and paths, injects the server secret and hides errors', async () => {
  const previousKey = process.env.AMAP_KEY;
  const previousSecret = process.env.AMAP_SECURITY_JS_CODE;
  const originalFetch = globalThis.fetch;
  process.env.AMAP_KEY = 'test-public-key';
  process.env.AMAP_SECURITY_JS_CODE = 'test-server-secret';
  try {
    let res = response();
    await handler({ method: 'POST', url: '/api/amap?path=v3/place/text' }, res);
    assert.equal(res.code, 405);
    res = response();
    await handler({ method: 'GET', url: '/api/amap?path=https://example.com' }, res);
    assert.equal(res.code, 404);
    res = response();
    await handler({ method: 'GET', url: '/api/amap?path=v3/place/text&key=other' }, res);
    assert.equal(res.code, 403);
    globalThis.fetch = async (url, options) => {
      assert.equal(url.origin, 'https://restapi.amap.com');
      assert.equal(url.pathname, '/v3/place/text');
      assert.equal(url.searchParams.get('jscode'), 'test-server-secret');
      assert.equal(url.searchParams.getAll('jscode').length, 1);
      assert.equal(url.searchParams.get('s'), 'rsv3');
      assert.equal(url.searchParams.has('path'), false);
      assert.equal(options.redirect, 'error');
      return new Response('{"status":"1"}', { headers: { 'content-type': 'application/json' } });
    };
    const request = {
      method: 'GET',
      url: '/api/amap?path=v3/place/text&key=test-public-key&jscode=untrusted',
    };
    res = response();
    await handler(request, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.toString(), '{"status":"1"}');
    globalThis.fetch = async () => {
      throw new Error('sensitive upstream URL');
    };
    res = response();
    await handler(request, res);
    assert.equal(res.code, 502);
    assert.equal(JSON.stringify(res.body).includes('sensitive'), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousKey === undefined) delete process.env.AMAP_KEY;
    else process.env.AMAP_KEY = previousKey;
    if (previousSecret === undefined) delete process.env.AMAP_SECURITY_JS_CODE;
    else process.env.AMAP_SECURITY_JS_CODE = previousSecret;
  }
});
