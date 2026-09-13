#!/usr/bin/env node
// crawl-dao3-v2.mjs —— 从神岛(dao3.fun) 爬取 地图 / 模型 / 评论区 到本地归档
//
// 真实 API（均已验证为公开 200，无需登录即可爬）：
//   地图列表 : https://dao3.fun/api/list-maps?offset=&limit=32&tabKey1=<分类>&lang=zh
//   地图详情 : https://code-api-pc.dao3.fun/map/detail?mapId=<contentId>
//   模型列表 : https://dao3.fun/api/page-translated-newest-model?offset=&limit=50&lang=zh
//   模型详情 : https://code-api-pc.dao3.fun/model/v2?modelId=<id>
//   模型资产 : https://assets.box3.fun/engine/m/<modelFileHash>  (previewUrl 即此)
//   评论列表 : https://code-api-pc.dao3.fun/comment/list?type=map|model&id=<id>&offset=&limit=20
//
// 登录态(可选，用于需鉴权的端点)：从 /tmp/dao3_session.json 读取（--login）
// 用法：
//   node scripts/crawl-dao3-v2.mjs --what map     --out /workspace/dao3-crawl [--limit 0]
//   node scripts/crawl-dao3-v2.mjs --what model   --out /workspace/dao3-crawl [--limit 200] [--assets]
//   node scripts/crawl-dao3-v2.mjs --what comment --out /workspace/dao3-crawl
//   node scripts/crawl-dao3-v2.mjs --what all     --out /workspace/dao3-crawl --limit 100
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const arg = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const WHAT = arg('--what', 'all');
const LIMIT = parseInt(arg('--limit', '0')) || 0;
const OUT = arg('--out', '/workspace/dao3-crawl');
const WITH_ASSETS = process.argv.includes('--assets');
const WITH_LOGIN = process.argv.includes('--login');
const LIST_ONLY = process.argv.includes('--list-only');
const CMAX = parseInt(arg('--cmax', '0')) || 0; // 评论全局上限（0=不限制，单作品仍受 5000 保护）

const H = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };
if (WITH_LOGIN) {
  try {
    const s = JSON.parse(readFileSync('/tmp/dao3_session.json', 'utf8'));
    const auth = s.localStorage?.AUTHORIZATION || (s.cookies?.find((c) => c.name === 'authorization') || {}).value;
    if (auth) { H.authorization = auth; H.Cookie = 'authorization=' + auth; console.log('[crawl] 已加载登录态'); }
  } catch { /* 无登录态则用匿名公开 API */ }
}

const MAP_TABS = ['mapPopular', 'mapCasual', 'mapParkour', 'mapRacing', 'mapSports', 'mapSimulator', 'mapTycoon', 'mapRolePlaying', 'mapSurvival', 'mapPuzzle', 'mapOther', 'mapPotential'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: H });
      if (r.status === 429) { await sleep(1500); continue; }
      if (!r.ok) return null;
      return await r.json();
    } catch { await sleep(800); }
  }
  return null;
}

async function crawlMaps() {
  mkdirSync(OUT + '/maps', { recursive: true });
  const seen = new Set(); const metas = [];
  for (const tab of MAP_TABS) {
    let off = 0;
    while (true) {
      const j = await getJSON(`https://dao3.fun/api/list-maps?offset=${off}&limit=32&tabKey1=${tab}&lang=zh`);
      if (!j || !j.rows || !j.rows.length) break;
      for (const m of j.rows) {
        if (seen.has(m.contentId)) continue; seen.add(m.contentId);
        const d = await getJSON(`https://code-api-pc.dao3.fun/map/detail?mapId=${m.contentId}`);
        const full = (d && d.data) ? d.data : m;
        full._tab = tab;
        writeFileSync(`${OUT}/maps/${m.contentId}.json`, JSON.stringify(full));
        metas.push(m.contentId);
        console.log(`[map] ${m.contentId} «${full.title}» tab=${tab}`);
        if (LIMIT && metas.length >= LIMIT) return metas;
      }
      off += 32; await sleep(180);
    }
  }
  return metas;
}

async function crawlModels(limit) {
  mkdirSync(OUT + '/models', { recursive: true });
  const ids = []; let off = 0;
  while (true) {
    const j = await getJSON(`https://dao3.fun/api/page-translated-newest-model?offset=${off}&limit=50&lang=zh`);
    if (!j || !j.rows || !j.rows.length) break;
    for (const m of j.rows) {
      if (ids.includes(m.id)) continue; ids.push(m.id);
      let full = m;
      if (!LIST_ONLY) {
        const d = await getJSON(`https://code-api-pc.dao3.fun/model/v2?modelId=${m.id}`);
        if (d && d.data) full = d.data;
      }
      writeFileSync(`${OUT}/models/${m.id}.json`, JSON.stringify(full));
      // 可选下载 3D 资产
      if (WITH_ASSETS && full.modelFileHash) {
        try {
          const r = await fetch(`https://assets.box3.fun/engine/m/${full.modelFileHash}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          if (r.ok) { const buf = Buffer.from(await r.arrayBuffer()); writeFileSync(`${OUT}/models/${m.id}.bin`, buf); }
        } catch { /* 资产下载失败忽略 */ }
      }
      console.log(`[model] ${m.id} «${full.title}» assets=${!!full.modelFileHash}`);
      if (limit && ids.length >= limit) return ids;
    }
    off += 50; await sleep(180);
  }
  return ids;
}

async function crawlComments(ids, type) {
  mkdirSync(OUT + '/comments', { recursive: true });
  let total = 0;
  for (const id of ids) {
    if (CMAX && total >= CMAX) { console.log(`[comment] 已达全局上限 ${CMAX}，停止`); break; }
    let off = 0; const rows = [];
    while (true) {
      const j = await getJSON(`https://code-api-pc.dao3.fun/comment/list?type=${type}&id=${id}&offset=${off}&limit=20`);
      if (!j || !j.data || !j.data.rows || !j.data.rows.length) break;
      rows.push(...j.data.rows); off += 20; await sleep(120);
      if (rows.length > 5000) break; // 单作品评论上限保护
      if (CMAX && total + rows.length >= CMAX) break;
    }
    writeFileSync(`${OUT}/comments/${type}_${id}.json`, JSON.stringify(rows));
    total += rows.length;
    console.log(`[comment ${type}] ${id} -> ${rows.length} 条 (累计 ${total})`);
  }
  return total;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  let mapIds = [], modelIds = [];
  if (WHAT === 'map' || WHAT === 'all') { console.log('=== 爬地图 ==='); mapIds = await crawlMaps(); writeFileSync(OUT + '/map_index.json', JSON.stringify(mapIds)); }
  if (WHAT === 'model' || WHAT === 'all') { console.log('=== 爬模型 ==='); modelIds = await crawlModels(LIMIT || (WHAT === 'all' ? 200 : 0)); writeFileSync(OUT + '/model_index.json', JSON.stringify(modelIds)); }
  if (WHAT === 'comment' || WHAT === 'all') {
    console.log('=== 爬评论 ===');
    if (!mapIds.length && existsSync(OUT + '/map_index.json')) mapIds = JSON.parse(readFileSync(OUT + '/map_index.json'));
    if (!modelIds.length && existsSync(OUT + '/model_index.json')) modelIds = JSON.parse(readFileSync(OUT + '/model_index.json'));
    const tc = await crawlComments(mapIds, 'map');
    const mc = await crawlComments(modelIds, 'model');
    console.log(`评论总计: 地图 ${tc} + 模型 ${mc}`);
  }
  console.log('[crawl] 完成 ->', OUT);
}
main().catch((e) => { console.error(e); process.exit(1); });
