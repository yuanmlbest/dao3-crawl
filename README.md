# dao3 爬取数据仓库（地图 / 模型 / 评论）

本仓库保存从 **dao3.fun（神岛 / Box3）** 公开接口爬取的 UGC 内容，用于 [nexisle.space](https://nexisle.space) 多人实时游戏引擎的世界库扩容。

> ⚠️ **版权与合规说明**：仓库内的地图、模型、评论均为 dao3 平台第三方用户生成内容（UGC），著作权归原作者所有。本仓库仅作**备份与引擎内自用**用途，**默认私有（private）**，请勿在未经授权的情况下公开再分发。如需公开分享，请先获得原作者许可。

## 数据概览

| 类别 | 文件数 | 大小 | 说明 |
|------|--------|------|------|
| 地图 `maps/` | 7466 | ~30 MB | 全量地图元数据 + 详情 |
| 模型 `models/` | 40 | ~160 KB | 采样（最新模型） |
| 评论 `comments/` | 3 | ~13 MB | 采样（单作品最多 5000 条） |
| 索引 `map_index.json` | 1 | 74 KB | 全部地图 ID 数组 |
| 索引 `model_index.json` | 1 | 571 B | 采样模型 ID 数组 |

爬取时间：**2026-09-13**。

## 目录结构

```
dao3-github-repo/
├── maps/                 # 每个文件 <mapId>.json，地图详情
├── models/               # 每个文件 <modelId>.json，模型元数据
├── comments/             # 每个文件 <type>_<id>.json，评论列表
├── map_index.json        # 全部地图 ID（快速检索）
├── model_index.json      # 模型 ID（采样）
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

## 数据字段示例

**地图 `maps/<mapId>.json`**
```json
{ "mapId": 100000041, "appId": "1", "authorId": 3913,
  "title": "异界之岛", "cover": "https://assets.box3.fun/...", "description": "..." }
```

**模型 `models/<modelId>.json`**
```json
{ "id": 270973, "title": "鱿鱼游戏·床铺", "modelType": 0,
  "previewUrl": "https://assets.box3.fun/engine/m/...", "modelFileHash": "..." }
```

**评论 `comments/<type>_<id>.json`**
```json
[ { "id": 609614, "comment": "...", "createdAt": "2026-09-12T17:09:25.066",
    "userInfo": { "userId": 13025070, "nickname": "..." }, "likeCount": 0 } ]
```

## 复现爬取

```bash
# 需要 Node.js + 可访问 dao3.fun 的网络
node crawl-dao3-v2.mjs --what map --out ./dao3-crawl --limit 0   # 全量地图
node crawl-dao3-v2.mjs --what model --out ./dao3-crawl --limit 200
node crawl-dao3-v2.mjs --what comment --out ./dao3-crawl --ids map_index.json
```

## 引擎使用

引擎世界库可直接从该仓库加载 `maps/<mapId>.json`；公开仓库可经
`https://raw.githubusercontent.com/<owner>/dao3-crawl/main/maps/<mapId>.json` 按需拉取。
