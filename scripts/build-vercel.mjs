import { spawnSync } from 'node:child_process';

if (!process.env.AMAP_KEY || !process.env.AMAP_SECURITY_JS_CODE) {
  throw new Error('Configure AMAP_KEY and AMAP_SECURITY_JS_CODE in Vercel before deploying.');
}
const result = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_AMAP_KEY: process.env.AMAP_KEY,
    VITE_AMAP_SECURITY_JS_CODE: '',
    VITE_AMAP_SERVICE_HOST: '/_AMapService',
  },
});
process.exit(result.status ?? 1);
