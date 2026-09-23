#!/usr/bin/env node
/* 마드모아젤 공식 — Instagram Graph API 캐러셀 자동 게시
 * 사용법: node publish_carousel.js <포스트폴더>   (폴더에 card1..N.png + caption.txt)
 * 필요 env (.env 파일 또는 환경변수):
 *   IG_USER_ID      - Instagram 비즈니스 계정 ID
 *   IG_ACCESS_TOKEN - 장기 액세스 토큰 (60일, 갱신 필요)
 *   IMG_BASE_URL    - 카드 이미지가 공개로 서빙되는 베이스 URL (예: https://raw.githubusercontent.com/<user>/<repo>/main/<postdir>)
 * 이미지는 이 스크립트 실행 전에 IMG_BASE_URL 아래에 업로드되어 있어야 한다.
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
if (!postDir || !fs.existsSync(postDir)) { console.error('포스트 폴더를 지정하세요'); process.exit(1); }

const cards = fs.readdirSync(postDir).filter(f => /^card\d+\.png$/.test(f))
  .sort((a,b) => parseInt(a.match(/\d+/)[0]) - parseInt(b.match(/\d+/)[0]));
const caption = fs.readFileSync(path.join(postDir, 'caption.txt'), 'utf8');
if (cards.length < 2) { console.error('캐러셀에는 카드 2장 이상 필요'); process.exit(1); }

async function api(endpoint, params) {
  const body = new URLSearchParams({ ...params, access_token: IG_ACCESS_TOKEN });
  const res = await fetch(`${API}/${endpoint}`, { method: 'POST', body });
  const json = await res.json();
  if (json.error) throw new Error(`${endpoint}: ${JSON.stringify(json.error)}`);
  return json;
}
async function waitReady(containerId, tries = 20) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`${API}/${containerId}?fields=status_code&access_token=${IG_ACCESS_TOKEN}`);
    const json = await res.json();
    if (json.status_code === 'FINISHED') return;
    if (json.status_code === 'ERROR') throw new Error(`컨테이너 ${containerId} 처리 실패`);
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error('컨테이너 처리 시간 초과');
}

(async () => {
  // 사전 확인: 카드 URL이 실제로 서빙되는지 (푸시 직후 CDN 미전파 대비)
  for (const card of cards) {
    const url = `${IMG_BASE_URL}/${card}`;
    let ok = false;
    for (let i = 0; i < 6 && !ok; i++) {
      try { ok = (await fetch(url, { method: 'HEAD' })).ok; } catch (e) {}
      if (!ok) { console.log(`  ${card} 아직 서빙 안 됨 — 10초 후 재확인 (${i + 1}/6)`); await new Promise(r => setTimeout(r, 10000)); }
    }
    if (!ok) throw new Error(`${card} URL 접근 불가: ${url}`);
  }

  console.log(`카드 ${cards.length}장 컨테이너 생성 중...`);
  const children = [];
  // 2026-09-22 STORY #008: 푸시 2분 뒤 card5 fetch 실패(9004/2207052, CDN 전파 지연) → 재시도 도입
  const isFetchErr = (e) => /"code":9004|"error_subcode":2207052|fetch failed|ECONNRESET|ETIMEDOUT/.test(e.message);
  for (const card of cards) {
    let id;
    for (let attempt = 1; ; attempt++) {
      try {
        ({ id } = await api(`${IG_USER_ID}/media`, {
          image_url: `${IMG_BASE_URL}/${card}`, is_carousel_item: 'true',
        }));
        break;
      } catch (e) {
        if (attempt >= 4 || !isFetchErr(e)) throw e;
        const wait = 20000 * attempt;
        console.warn(`  ${card} 이미지 가져오기 실패(시도 ${attempt}/4) — ${wait / 1000}초 후 재시도: ${e.message.slice(0, 120)}`);
        await new Promise(r => setTimeout(r, wait));
      }
    }
    children.push(id);
    console.log(`  ${card} → ${id}`);
  }
  for (const id of children) await waitReady(id);

  console.log('캐러셀 컨테이너 생성...');
  const { id: carouselId } = await api(`${IG_USER_ID}/media`, {
    media_type: 'CAROUSEL', children: children.join(','), caption,
  });
  await waitReady(carouselId);

  console.log('게시 실행...');
  const { id: mediaId } = await api(`${IG_USER_ID}/media_publish`, { creation_id: carouselId });
  console.log(`✅ 게시 완료: media_id=${mediaId}`);
  // 게시 검증 신호: permalink 기록 → published.json (알림 세션이 읽음)
  try {
    const info = await (await fetch(`${API}/${mediaId}?fields=permalink&access_token=${IG_ACCESS_TOKEN}`)).json();
    const pubFile = path.join(postDir, 'published.json');
    const cur = fs.existsSync(pubFile) ? JSON.parse(fs.readFileSync(pubFile, 'utf8')) : {};
    cur.carousel = { media_id: mediaId, permalink: info.permalink || null, at: new Date().toISOString() };
    fs.writeFileSync(pubFile, JSON.stringify(cur, null, 2));
    console.log(`🔗 permalink: ${info.permalink || '(조회 실패)'}`);
  } catch (pe) { console.warn('permalink 기록 실패:', pe.message); }
})().catch(e => { console.error('❌ 실패:', e.message); process.exit(1); });
