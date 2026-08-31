#!/usr/bin/env node
/* 마드모아젤 공식 — 계정·게시물 지표 수집 → stats.json 누적
 * 매일 metrics.yml이 실행. 필요 env: IG_USER_ID, IG_ACCESS_TOKEN
 */
const fs = require('fs');
const path = require('path');

const { IG_ACCESS_TOKEN } = process.env;
if (!IG_ACCESS_TOKEN) { console.error('IG_ACCESS_TOKEN 필요'); process.exit(1); }
const API = 'https://graph.instagram.com/v21.0';

(async () => {
  const acct = await (await fetch(`${API}/me?fields=followers_count,media_count&access_token=${IG_ACCESS_TOKEN}`)).json();
  if (acct.error) throw new Error(JSON.stringify(acct.error));
  const media = await (await fetch(`${API}/me/media?fields=id,media_type,permalink,timestamp,like_count,comments_count&limit=12&access_token=${IG_ACCESS_TOKEN}`)).json();

  const statsPath = path.join(__dirname, 'stats.json');
  const stats = fs.existsSync(statsPath) ? JSON.parse(fs.readFileSync(statsPath, 'utf8')) : { snapshots: [] };
  stats.snapshots.push({
    at: new Date().toISOString(),
    followers: acct.followers_count,
    media_count: acct.media_count,
    media: (media.data || []).map(m => ({
      id: m.id, type: m.media_type, permalink: m.permalink,
      likes: m.like_count ?? null, comments: m.comments_count ?? null, ts: m.timestamp,
    })),
  });
  if (stats.snapshots.length > 120) stats.snapshots = stats.snapshots.slice(-120);
  fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  console.log(`📊 팔로워 ${acct.followers_count} · 게시물 ${acct.media_count}`);
})().catch(e => { console.error('지표 수집 실패:', e.message); process.exit(1); });
