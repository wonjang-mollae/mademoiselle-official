#!/usr/bin/env node
/* 마드모아젤 공식 — 주제 큐 자동 보충 (Claude API 웹서치)
 * topics.json의 '대기' 주제가 MIN_QUEUE개 미만이면 웹서치 리서치로 ADD_COUNT개를 생성해 추가한다.
 * 실행: collect_topics.yml (매주 일요일 21:17 KST) 또는 수동 실행. 필요 env: ANTHROPIC_API_KEY
 */
const fs = require('fs');
const path = require('path');

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error('ANTHROPIC_API_KEY 필요'); process.exit(1); }
const MODEL = process.env.MODEL || 'claude-sonnet-4-5';
const MIN_QUEUE = parseInt(process.env.MIN_QUEUE || '6', 10);
const ADD_COUNT = parseInt(process.env.ADD_COUNT || '6', 10);
const root = __dirname;

const topicsPath = path.join(root, 'topics.json');
const topics = JSON.parse(fs.readFileSync(topicsPath, 'utf8'));
const waiting = topics.filter(t => t.status === '대기').length;
console.log(`대기 주제 ${waiting}개 (보충 기준: ${MIN_QUEUE}개 미만)`);
if (waiting >= MIN_QUEUE) { console.log('충분 — 보충 불필요'); process.exit(0); }

const guide = fs.readFileSync(path.join(root, 'guide.md'), 'utf8');
const existingList = topics.map(t => `- [${t.series}] ${t.topic}`).join('\n');

function nextIssueNo(series) {
  const nums = topics.filter(t => t.series === series)
    .map(t => parseInt(String(t.issueNo).replace(/[^0-9]/g, ''), 10) || 0);
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return '#' + String(n).padStart(3, '0');
}

async function main() {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8 }],
      messages: [{
        role: 'user',
        content: `너는 세종시 미용실 브랜드 '마드모아젤헤어' 공식 인스타그램의 편집장이다. 시리즈는 STORY(디자이너·브랜드 철학)와 CARE NOTE(고객용 헤어 케어·스타일 팁) 두 가지다.

## 운영 가이드 (가드레일 반드시 준수)
${guide}

## 기존 주제 (중복 금지)
${existingList}

## 작업
웹서치로 지금 한국 미용업계(헤어 중심)의 화제·통계·논쟁·제도 변화를 리서치해서, 새 주제 ${ADD_COUNT}개를 제안하라.
- 시리즈 배분: MONEY CUT(돈·정산·세금·계약), DATA CUT(통계·데이터), COUNTER CUT(관행·구조 비판)를 고르게 섞어라.
- 관점은 세종시 고객의 실익(케어 팁)과 브랜드 철학(디자이너의 성장). 어그로·공포 프레임 금지, 실명·타 업체 언급 금지, 가격·이벤트 주제 금지(본사만 결정).
- note에는 핵심 메시지와 근거(출처 매체명 포함)를 적어라. 웹서치로 확인 안 되는 수치는 쓰지 마라.

응답은 JSON 배열만 출력하라. 코드블록 없이:
[{"series":"MONEY CUT","topic":"주제","note":"핵심 메시지 / 근거·출처"}]`,
      }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const jsonStr = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);
  const newTopics = JSON.parse(jsonStr);
  let added = 0;
  for (const t of newTopics) {
    if (!t.series || !t.topic) continue;
    if (topics.some(x => x.topic === t.topic)) continue;
    topics.push({ series: t.series, issueNo: nextIssueNo(t.series), topic: t.topic, note: t.note || '', status: '대기' });
    added++;
  }
  fs.writeFileSync(topicsPath, JSON.stringify(topics, null, 2));
  console.log(`${added}개 주제 추가 — 총 대기 ${waiting + added}개`);
}
main().catch(e => { console.error('주제 수집 실패:', e.message); process.exit(1); });
