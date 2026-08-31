#!/usr/bin/env node
/* 마드모아젤 공식 — Instagram Graph API 릴스 자동 게시
 * 사용법: node publish_reel.js <포스트폴더>   (폴더에 reel.mp4 + caption.txt)
 * 필요 env: IG_USER_ID / IG_ACCESS_TOKEN / IMG_BASE_URL (publish_carousel.js와 동일)
 * reel.mp4는 실행 전에 IMG_BASE_URL 아래에 공개 업로드되어 있어야 한다.
 */
const fs = require('fs');
const path = require('path');

// .env 로드 (의존성 없이)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const { IG_USER_ID, IG_ACCESS_TOKEN, IMG_BASE_URL } = process.env;
if (!IG_USER_ID || !IG_ACCESS_TOKEN || !IMG_BASE_URL) {
  console.error('IG_USER_ID / IG_ACCESS_TOKEN / IMG_BASE_URL 이 필요합니다 (.env)');
  process.exit(1);
}
const API = 'https://graph.instagram.com/v21.0';
const postDir = process.argv[2];
if (!postDir || !fs.existsSync(path.join(postDir, 'reel.mp4'))) {
  console.error('포스트 폴더에 reel.mp4가 없습니다'); process.exit(1);
}
const caption = fs.readFileSync(path.join(postDir, 'caption.txt'), 'utf8');

async function api(endpoint, params) {
  const body = new URLSearchParams({ ...params, access_token: IG_ACCESS_TOKEN });
  const res = await fetch(`${API}/${endpoint}`, { method: 'POST', body });
  const json = await res.json();
  if (json.error) throw new Error(`${endpoint}: ${JSON.stringify(json.error)}`);
  return json;
}
/* 릴스는 영상 처리라 카드보다 오래 걸림 — 최대 5분 대기 */
async function waitReady(containerId, tries = 60) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`${API}/${containerId}?fields=status_code&access_token=${IG_ACCESS_TOKEN}`);
    const json = await res.json();
    if (json.status_code === 'FINISHED') return;
    if (json.status_code === 'ERROR') throw new Error(`컨테이너 ${containerId} 처리 실패`);
    await new Promise(r => setTimeout(r, 5000));
  }
  throw new Error('컨테이너 처리 시간 초과');
}

(async () => {
  console.log('릴스 컨테이너 생성 중...');
  const { id } = await api(`${IG_USER_ID}/media`, {
    media_type: 'REELS',
    video_url: `${IMG_BASE_URL}/reel.mp4`,
    caption,
    share_to_feed: 'true',
  });
  console.log(`  컨테이너 → ${id} (영상 처리 대기...)`);
  await waitReady(id);

  console.log('게시 실행...');
  const { id: mediaId } = await api(`${IG_USER_ID}/media_publish`, { creation_id: id });
  console.log(`✅ 릴스 게시 완료: media_id=${mediaId}`);
  // 게시 검증 신호: permalink 기록 → published.json (알림 세션이 읽음)
  try {
    const info = await (await fetch(`${API}/${mediaId}?fields=permalink&access_token=${IG_ACCESS_TOKEN}`)).json();
    const pubFile = path.join(postDir, 'published.json');
    const cur = fs.existsSync(pubFile) ? JSON.parse(fs.readFileSync(pubFile, 'utf8')) : {};
    cur.reel = { media_id: mediaId, permalink: info.permalink || null, at: new Date().toISOString() };
    fs.writeFileSync(pubFile, JSON.stringify(cur, null, 2));
    console.log(`🔗 릴스 permalink: ${info.permalink || '(조회 실패)'}`);
  } catch (pe) { console.warn('permalink 기록 실패:', pe.message); }
})().catch(e => { console.error('❌ 릴스 실패:', e.message); process.exit(1); });
