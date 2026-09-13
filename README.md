# dao3 爬取数据仓库（地图 / 模型 / 评论）

本仓库保存从 **dao3.fun（神岛 / Box3）** 公开接口爬取的 UGC 内容，用于 [nexisle.space](https://nexisle.space) 多人实时游戏引擎的世界库扩容。

> ⚠️ **版权与合规说明**：仓库内的地图、模型、评论均为 dao3 平台第三方用户生成内容（UGC），著作权归原作者所有。本仓库默认**私有（private）**，仅供引擎内自用，请勿在未经授权的情况下公开再分发。

## 数据概览（2026-09-13 爬取）

| 类别 | 文件数 | 大小 | 说明 |
|------|--------|------|------|
| 地图 `maps/` | 7466 | ~30 MB | 全量地图元数据 + 详情 |
| 模型 `models_part_*.json` | 130528 条 / 14 片 | ~46.3 MB | 全量模型元数据（分片，每片 10000 条）|
| 评论 `comments/` | 7 | 进行中 | 采样/爬取中（全局上限 150 万条）|
| 索引 `map_index.json` | 1 | 74 KB | 全部地图 ID 数组 |
| 索引 `model_index.json` | 1 | - | 全部模型 ID 数组 |
| 清单 `models_manifest.json` | 1 | - | 模型分片清单 |

## 目录结构

```
dao3-github-repo/
├── maps/                 # 每个文件 <mapId>.json，地图详情
├── models_part_001.json  # 模型分片（每片 10000 条，拼接 = 全量）
├── ...
├── models_manifest.json  # 分片清单
├── comments/             # 每个文件 <type>_<id>.json，评论列表
├── map_index.json        # 全部地图 ID
├── model_index.json      # 全部模型 ID
├── manifest.json         # 爬取元信息 / 统计
├── crawl-dao3-v2.mjs     # 爬取脚本（可复现）
└── README.md
```

## 数据源（公开接口，无需登录）

| 用途 | 接口 |
|------|------|
| 地图列表 | `https://dao3.fun/api/list-maps?offset=&limit=32&tabKey1=<分类>&lang=zh` |
| 模型列表 | `https://dao3.fun/api/page-translated-newest-model?offset=&limit=50&lang=zh` |
| 地图详情 | `https://code-api-pc.dao3.fun/map/detail?mapId=<contentId>` |
| 模型详情 | `https://code-api-pc.dao3.fun/model/v2?modelId=<id>` |
| 模型资产 | `https://assets.box3.fun/engine/m/<modelFileHash>` |
| 评论列表 | `https://code-api-pc.dao3.fun/comment/list?type=map|model&id=<id>&offset=&limit=20` |

## 加载全量模型

```js
import manifest from './models_manifest.json';
let models = [];
for (const c of manifest.chunks) models = models.concat(await (await fetch(c)).json());
```

## 复现爬取

```bash
node crawl-dao3-v2.mjs --what map --out ./dao3-crawl --limit 0
node crawl-dao3-v2.mjs --what model --out ./dao3-crawl --list-only
node crawl-dao3-v2.mjs --what comment --out ./dao3-crawl --cmax 1500000
```
