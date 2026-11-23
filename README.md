# 来了就住深

来了就是深圳人，租房也得有点才。

移动优先的深圳住宅租金参考网站。按行政区、街道或片区寻找小区，查看不同户型的月度成交租金区间和每笔成交明细。

## 本地运行

需要 Node.js 22 或更高版本及 npm。

```sh
npm ci
cp .env.example .env.local
npm run dev
```

打开 http://127.0.0.1:4173/ 。地图配置可选，未配置时仍可浏览租金数据和使用高德搜索入口。收藏保存在当前浏览器的 localStorage。

## 高德地图

在[高德开放平台控制台](https://console.amap.com/dev/key/app)创建应用，添加服务平台为 **Web端（JS API）** 的 Key。在 `.env.local` 中填写：

```dotenv
VITE_AMAP_KEY=
VITE_AMAP_SECURITY_JS_CODE=
```

修改后重启开发服务。详情页默认只显示位置卡片，首次展开才加载地图，使用深圳行政区和小区名搜索并采用第一条有效结果。再次点击卡片收起地图；只有“去高德地图”按钮会打开高德。不请求用户定位，不展示距离。

生产环境使用 `VITE_AMAP_KEY` 和 `VITE_AMAP_SERVICE_HOST`。按照[高德安全密钥指南](https://lbs.amap.com/api/javascript-api-v2/guide/abc/jscode)配置 HTTPS 代理，地址以 `/_AMapService` 结尾，由代理注入安全密钥。仓库不包含已部署的代理。`VITE_` 变量在构建时写入浏览器代码，因此生产环境应将安全密钥保留在代理端，清空 `VITE_AMAP_SECURITY_JS_CODE`。`.env.example` 只包含空值；真实配置文件不提交到 Git。

## 功能与数据口径

默认展示南山区的一房，按小区名称的拼音排序。区域标签依次为南山、宝安、福田、罗湖和龙华。支持宝安、南山、福田、罗湖和龙华，进一步按行政街道、片区、户型、租金及月份筛选（街道和片区支持多选，符合任一已选范围即显示），并切换最新纪录或租金排序。

首页每个小区显示一行，价格取匹配记录中最新月份的租金区间。详情默认展示全部户型和月份，同一小区同一个月汇总为一条月度记录，附每笔原表成交明细。相似成交行保留，不按房源去重。原表“议价率”各列口径不一致，已不再展示。

价格颜色使用同一行政区、片区、月份和户型的其他小区作为比较样本，面积差不超过 20%，至少包含 5 个可比小区。先取各小区租金区间中点，再取其中位数作为参考价。目标小区月租区间中点高出参考价超过 10% 用红色，低于参考价超过 10% 用绿色，其余用橙色。样本不足或混合不同户型、片区时使用默认颜色。

`src/data/records.json` 包含 2026 年 9 月的 4,086 条和 10 月的 4,526 条原表行，共 8,612 条，汇总为 2,759 条小区月度记录，覆盖 5 个行政区的 62 个区内片区。行政区按已核实的小区地址归类，片区名沿用原表，部分行政街道为空。当前数据为图片 OCR 后整理的静态数据，未接入定时抓取、账号服务或数据库。

2026 年 11 月 23 日增量更新：从 6 篇新帖子、28 张表格图补入 939 条 10 月原表行，新增 198 个小区和 252 条小区月度记录。新增覆盖莲塘、地王、洪湖、百仕达、布心、东门和笋岗；翠竹、银湖、万象城及南山多个片区也有补充。原表中 2 行的户型因文字重叠保留为“待核”，不会计入一房筛选。原有 7,673 条记录未改动，新增帖子与已收录帖子按来源 ID 区分，保留不同原表中的相似成交行。

## 目录

```text
src/
  App.jsx              首页、筛选状态及导航
  catalog.js           数据索引与覆盖统计
  components/          筛选弹层、小区详情及复用组件
  CommunityMap.jsx     位置卡片与按需地图
  amap.js              高德加载、地点查询及链接
  model.js             筛选、排序和月度汇总
  rentComparison.js    同类租金比较
  data/records.json    运行所需的租金数据
public/fonts/          本地宋体子集及字体授权
scripts/               构建及字体维护脚本
tests/                 数据、地图及部署入口测试
worker/                Sites 静态资源入口
```

原始图片、历史 OCR 工具、设计参考、截图和代理说明保留在本地，通过 `.gitignore` 排除。它们不参与应用运行或构建。运行所需的数据、字体、依赖锁文件及测试均纳入版本管理。

## 检查与构建

```sh
npm run format        # 统一源码和文档格式
npm run format:check  # 检查格式
npm test              # 数据模型与地图逻辑测试
npm run build         # 构建静态页面及 Sites 入口
npm run test:sites    # 构建后验证资源入口和产物
npm run check         # 依次执行上述检查和构建
npm run preview       # 本地预览构建结果
```

静态页面产物位于 `dist/client`；`dist/server/index.js` 与 `dist/.openai/hosting.json` 是保留的 Sites 部署入口。`dist` 不提交到 Git。测试使用本地模拟，不会请求真实高德服务。

## 依赖审计

截至 2026 年 11 月 18 日，已更新 Vite 至 6.4.6 并修复兼容范围内的间接依赖。`npm audit` 仍报告 4 项高风险，均由开发依赖链中的同一个 [picomatch 上游公告](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) 引起，公告尚未提供修复版本。可运行 `npm audit` 跟踪后续更新。`npm audit --omit=dev` 对运行时依赖的审计结果为 0 项。开发服务默认仅监听本机地址。

## 字体维护

标题和小区名使用本地 Noto Serif SC 子集，授权见 [OFL.txt](public/fonts/OFL.txt)。正文使用系统字体，图标使用 Phosphor Icons。

新增小区名称或宋体文案后，可通过 [uv](https://docs.astral.sh/uv/) 运行：

```sh
uv run scripts/update-font.py
```

脚本下载并缓存源字体，重新生成 `public/fonts` 中的子集，验证全部小区名称用字。缓存位于 `.cache/fonts`，不提交到 Git。

## Vercel 部署

已提供 `vercel.json` 和按需地图代理 `api/amap.js`。在 Vercel 项目生产环境设置 `AMAP_KEY` 与 `AMAP_SECURITY_JS_CODE`，然后通过官方 CLI 执行 `vercel --prod`。构建脚本仅将公开 Key 和同源代理路径写入前端，安全密钥保留在服务端。若高德配置了域名白名单，需加入实际生产域名。`.vercelignore` 排除本地配置、代理说明、原图、OCR 工具和核对页面。
