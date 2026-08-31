#!/usr/bin/env node
/* 마드모아젤 공식 — 카드뉴스 생성기 v2 (에디토리얼) — post.json → 1080×1350 PNG 캐러셀
 * 사용법: node make_cards.js post.json 출력폴더
 * 렌더: 시스템 chromium headless (Playwright 번들: /opt/pw-browsers/chromium)
 * 디자인: 아이보리 지면 + 헤어라인 프레임 + 세리프 타이포 (살롱 매거진 톤)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SERIES = {
  'STORY':     { color: '#A85D72', label: 'DESIGNER STORY' },
  'CARE NOTE': { color: '#6E8B74', label: 'CARE NOTE' },
};

const post = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const outDir = process.argv[3] || 'out';
fs.mkdirSync(outDir, { recursive: true });
const S = SERIES[post.series] || SERIES['CARE NOTE'];

/* hl() : **텍스트** → 로즈 세리프 이탤릭 + 밑줄 강조 */
const hl = t => t
  .replace(/\*\*(.+?)\*\*/g, `<em class="hl">$1</em>`)
  .replace(/\n/g, '<br>');

const dots = (idx, total) => Array.from({ length: total }, (_, i) =>
  `<span class="dot${i === idx ? ' on' : ''}"></span>`).join('');

function cardHTML(card, idx, total) {
  const isCover = card.type === 'cover';
  const isCta = card.type === 'cta';
  const num = String(idx).padStart(2, '0'); // 본문 카드 번호 (01부터)
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1080px; height:1350px; }
  body {
    font-family: "Noto Serif CJK KR", serif;
    background:#F6F1EA; color:#33291F;
    position:relative; overflow:hidden;
  }
  .frame { position:absolute; inset:44px; border:1.5px solid #C9BBAA; }
  .inner {
    position:absolute; inset:44px; padding:64px 84px 56px;
    display:flex; flex-direction:column; min-height:0;
  }
  .masthead { text-align:center; }
  .wordmark {
    font-family:"Noto Serif CJK KR", serif; font-weight:600;
    font-size:44px; letter-spacing:.04em;
  }
  .wordmark i { font-style:normal; color:${S.color}; }
  .series {
    margin-top:18px; font-family:"Noto Sans CJK KR", sans-serif;
    font-size:22px; font-weight:700; letter-spacing:.42em; text-indent:.42em;
    color:${S.color};
  }
  .rule { width:56px; height:1.5px; background:#C9BBAA; margin:34px auto 0; }
  .body { flex:1; min-height:0; display:flex; flex-direction:column; justify-content:center; }
  /* 표지 */
  h1 {
    font-weight:600; font-size:${card.headlineSize || 76}px; line-height:1.44;
    letter-spacing:-0.01em; word-break:keep-all; text-align:center;
  }
  .hl { font-style:normal; color:${S.color};
    border-bottom:3px solid ${S.color}55; padding-bottom:2px; }
  /* 본문 */
  .idx {
    font-family:"Noto Serif CJK KR", serif; text-align:center;
    font-size:30px; color:${S.color}; letter-spacing:.18em; text-indent:.18em;
    margin-bottom:26px;
  }
  h2 { font-weight:600; font-size:54px; line-height:1.4; text-align:center;
    word-break:keep-all; margin-bottom:48px; }
  .col { width:800px; margin:0 auto; }
  .txt {
    font-family:"Noto Sans CJK KR", sans-serif; font-weight:400;
    font-size:36px; line-height:1.85; color:#57493B; word-break:keep-all;
    text-align:center;
  }
  .txt b { color:#33291F; font-weight:700; }
  ol.pts { list-style:none; counter-reset:p; }
  ol.pts li {
    counter-increment:p;
    font-family:"Noto Sans CJK KR", sans-serif; font-size:35px; line-height:1.6;
    color:#57493B; word-break:keep-all; text-align:left;
    padding:30px 0 30px 88px; position:relative;
    border-top:1px solid #DDD2C4;
  }
  ol.pts li:last-child { border-bottom:1px solid #DDD2C4; }
  ol.pts li::before {
    content:counter(p, decimal-leading-zero);
    position:absolute; left:8px; top:32px;
    font-family:"Noto Serif CJK KR", serif; font-size:34px; color:${S.color};
  }
  /* CTA */
  .cta { text-align:center; }
  .cta h2 { margin-bottom:40px; }
  .ctabox {
    width:800px; margin:0 auto; padding:56px 52px;
    border:1.5px solid ${S.color}; outline:1.5px solid ${S.color}; outline-offset:6px;
  }
  .ctabox .big { font-size:44px; font-weight:600; line-height:1.6; word-break:keep-all; }
  .ctabox .small { font-family:"Noto Sans CJK KR", sans-serif;
    font-size:27px; color:#57493B; margin-top:26px; line-height:1.7; }
  /* 푸터 */
  .foot { text-align:center; }
  .dots { display:flex; gap:14px; justify-content:center; margin-bottom:22px; }
  .dot { width:9px; height:9px; border-radius:50%; background:#D8CCBD; }
  .dot.on { background:${S.color}; }
  .brandfoot { font-family:"Noto Sans CJK KR", sans-serif; font-size:22px;
    letter-spacing:.3em; text-indent:.3em; color:#9C8D7B; }
  .disc { position:absolute; bottom:14px; left:84px; right:84px;
    font-family:"Noto Sans CJK KR", sans-serif;
    font-size:18px; color:#AC9F8E; text-align:center; }
  </style></head><body>
  <div class="frame"></div>
  <div class="inner">
    <div class="masthead">
      <div class="wordmark">${post.brand.replace(/\{c\}(.+?)\{\/c\}/g,'<i>$1</i>')}</div>
      <div class="series">${S.label}${isCover ? ` · ${post.issueNo.replace('#','NO.')}` : ''}</div>
      <div class="rule"></div>
    </div>
    <div class="body">
      ${isCover ? `<h1>${hl(card.headline)}</h1>` : ''}
      ${!isCover && !isCta ? `<div class="idx">${num}</div>
        ${card.title ? `<h2>${hl(card.title)}</h2>` : ''}
        <div class="col">
        ${card.text ? `<p class="txt">${hl(card.text)}</p>` : ''}
        ${card.points ? `<ol class="pts">${card.points.map(p=>`<li>${hl(p)}</li>`).join('')}</ol>` : ''}
        </div>` : ''}
      ${isCta ? `<div class="cta"><h2>${hl(card.title)}</h2>
        <div class="ctabox"><div class="big">${hl(card.text)}</div>
        ${card.sub ? `<div class="small">${hl(card.sub)}</div>` : ''}</div></div>` : ''}
    </div>
    <div class="foot">
      <div class="dots">${dots(idx, total)}</div>
      <div class="brandfoot">MADEMOISELLE HAIR · SEJONG</div>
    </div>
    ${card.disclaimer ? `<div class="disc">${card.disclaimer}</div>` : ''}
  </div>
  </body></html>`;
}

const total = post.cards.length;
post.cards.forEach((card, i) => {
  const htmlPath = path.join(outDir, `card${i+1}.html`);
  const pngPath = path.join(outDir, `card${i+1}.png`);
  fs.writeFileSync(htmlPath, cardHTML(card, i, total));
  const chrome = process.env.CHROME_BIN || '/usr/bin/google-chrome';
  execSync(`${chrome} --headless --no-sandbox --disable-gpu --hide-scrollbars ` +
    `--force-device-scale-factor=1 --window-size=1080,1350 ` +
    `--screenshot=${pngPath} file://${path.resolve(htmlPath)} 2>/dev/null`);
  console.log('rendered', pngPath);
});
fs.writeFileSync(path.join(outDir, 'caption.txt'), post.caption);
console.log('caption saved');
