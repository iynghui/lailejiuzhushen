# 来了就住深

深圳住宅租金成交参考站。按行政区、片区、户型、月份查找小区，查看月度成交租金区间和每笔成交明细。

线上地址：https://lailejiuzhushen.vercel.app

国内备用地址（GitHub Pages 镜像，推送 main 自动部署）：https://iynghui.github.io/lailejiuzhushen/

## 技术栈

Vite + React 的纯静态站点，部署在 Vercel；地图使用高德 JS API，服务端代理注入安全密钥。

## 本地运行

需要 Node.js 22 或更高版本。

```sh
npm ci
cp .env.example .env.local
npm run dev
```

打开 http://127.0.0.1:4173/ 。不配置地图 Key 也能浏览全部租金数据；收藏保存在浏览器 localStorage。

## 环境变量

```dotenv
VITE_AMAP_KEY=              # 高德 Web 端（JS API）Key
VITE_AMAP_SECURITY_JS_CODE= # 本地开发用安全密钥
VITE_AMAP_SERVICE_HOST=     # 可选，HTTPS 服务代理地址
```

真实 Key 与安全密钥只写在本机 `.env.local`，不提交到仓库。仓库里只有空值的 `.env.example`。

## 常用脚本

```sh
npm run dev      # 开发服务
npm test         # 数据模型与地图逻辑测试
npm run build    # 构建静态页面
npm run check    # 格式检查 + 测试 + 构建
```

## 目录

```text
src/
  App.jsx            首页、筛选状态及导航
  catalog.js         数据索引与覆盖统计
  components/        筛选弹层、小区详情、分享等组件
  CommunityMap.jsx   位置卡片与按需地图
  model.js           筛选、排序和月度汇总
  rentComparison.js  同类租金比较
  data/records.json  租金数据
api/amap.js          高德请求代理
scripts/             构建与字体维护脚本
tests/               数据、地图、部署入口测试
```

## 数据与口径

`src/data/records.json` 是整理后的静态成交记录，覆盖深圳 5 个行政区、62 个片区。同一小区同月按区间汇总为一条月度记录，明细保留原表每一笔成交，不按房源去重。

价格标签为本站自算：以同行政区、同片区、同月、同户型且面积差不超过 20% 的其他小区为样本，各取区间中点后求中位数作参考价；偏离超过 ±10% 才标红（高于同类）或标绿（低于同类），可比小区不足 5 个时不标注。

数据来自公开渠道整理，仅供参考，不作为成交依据。

## 部署

Vercel 项目需配置环境变量 `AMAP_KEY` 与 `AMAP_SECURITY_JS_CODE`，随后正常构建部署即可。前端只包含公开 Key 与同源代理路径 `/_AMapService`，安全密钥始终留在服务端。

## 字体

标题使用本地 Noto Serif SC 子集，授权见 [OFL.txt](public/fonts/OFL.txt)；正文使用系统字体，图标来自 Phosphor Icons。
