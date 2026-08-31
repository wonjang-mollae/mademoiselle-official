#!/usr/bin/env node
/* 마드모아젤 공식 — 릴스 생성기 v2 (에디토리얼) — post.json → 1080×1920 프레임 → reel.mp4 (무음 슬라이드)
 * 사용법: node make_reel.js post.json 출력폴더
 * 렌더: CHROME_BIN 크로미움 headless + ffmpeg (xfade 크로스페이드)
 * 디자인: 아이보리 지면 + 헤어라인 프레임 + 세리프 타이포 (make_cards.js v2와 동일 톤)
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

const hl = t => t
  .replace(/\*\*(.+?)\*\*/g, `<em class="hl">$1</em>`)
  .replace(/\n/g, '<br>');

/* 프레임별 노출 시간(초) */
const DUR = { cover: 3, content: 5, cta: 3.5 };
const FADE = 0.4; // 크로스페이드 길이

function frameHTML(card, idx, total) {
  const isCover = card.type === 'cover';
  const isCta = card.type === 'cta';
  const num = String(idx).padStart(2, '0');
  const segs = Array.from({ length: total }, (_, i) =>
    `<span class="seg${i <= idx ? ' on' : ''}"></span>`).join('');
  return `<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1080px; height:1920px; }
  body {
    font-family: "Noto Serif CJK KR", serif;
    background:#F6F1EA; color:#33291F;
    position:relative; overflow:hidden;
  }
  .frame { position:absolute; inset:52px; border:1.5px solid #C9BBAA; }
  .prog { position:absolute; top:76px; left:104px; right:104px; display:flex; gap:10px; }
  .prog .seg { flex:1; height:4px; background:#DDD2C4; }
  .prog .seg.on { background:${S.color}; }
  .inner {
    position:absolute; inset:52px; padding:120px 96px 72px;
    display:flex; flex-direction:column; min-height:0;
  }
  .masthead { text-align:center; }
  .wordmark { font-weight:600; font-size:52px; letter-spacing:.04em; }
  .wordmark i { font-style:normal; color:${S.color}; }
  .series {
    margin-top:20px; font-family:"Noto Sans CJK KR", sans-serif;
    font-size:25px; font-weight:700; letter-spacing:.42em; text-indent:.42em;
    color:${S.color};
  }
  .rule { width:56px; height:1.5px; background:#C9BBAA; margin:38px auto 0; }
  .body { flex:1; min-height:0; display:flex; flex-direction:column; justify-content:center; }
  h1 {
    font-weight:600; font-size:${Math.round((card.headlineSize || 76) * 1.12)}px; line-height:1.46;
    letter-spacing:-0.01em; word-break:keep-all; text-align:center;
  }
  .hl { font-style:normal; color:${S.color};
    border-bottom:3px solid ${S.color}55; padding-bottom:2px; }
  .idx {
    text-align:center; font-size:34px; color:${S.color};
    letter-spacing:.18em; text-indent:.18em; margin-bottom:30px;
  }
  h2 { font-weight:600; font-size:62px; line-height:1.4; text-align:center;
    word-break:keep-all; margin-bottom:56px; }
  .col { width:840px; margin:0 auto; }
  .txt {
    font-family:"Noto Sans CJK KR", sans-serif; font-weight:400;
    font-size:42px; line-height:1.85; color:#57493B; word-break:keep-all;
    text-align:center;
  }
  .txt b { color:#33291F; font-weight:700; }
  ol.pts { list-style:none; counter-reset:p; }
  ol.pts li {
    counter-increment:p;
    font-family:"Noto Sans CJK KR", sans-serif; font-size:40px; line-height:1.6;
    color:#57493B; word-break:keep-all; text-align:left;
    padding:36px 0 36px 100px; position:relative;
    border-top:1px solid #DDD2C4;
  }
  ol.pts li:last-child { border-bottom:1px solid #DDD2C4; }
  ol.pts li::before {
    content:counter(p, decimal-leading-zero);
    position:absolute; left:10px; top:38px;
    font-family:"Noto Serif CJK KR", serif; font-size:38px; color:${S.color};
  }
  .cta { text-align:center; }
  .cta h2 { margin-bottom:48px; }
  .ctabox {
    width:840px; margin:0 auto; padding:64px 56px;
    border:1.5px solid ${S.color}; outline:1.5px solid ${S.color}; outline-offset:6px;
  }
  .ctabox .big { font-size:50px; font-weight:600; line-height:1.6; word-break:keep-all; }
  .ctabox .small { font-family:"Noto Sans CJK KR", sans-serif;
    font-size:30px; color:#57493B; margin-top:30px; line-height:1.7; }
  .foot { text-align:center; }
  .brandfoot { font-family:"Noto Sans CJK KR", sans-serif; font-size:24px;
    letter-spacing:.3em; text-indent:.3em; color:#9C8D7B; }
  .disc { position:absolute; bottom:18px; left:104px; right:104px;
    font-family:"Noto Sans CJK KR", sans-serif;
    font-size:20px; color:#AC9F8E; text-align:center; }
  </style></head><body>
  <div class="frame"></div>
  <div class="prog">${segs}</div>
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
      <div class="brandfoot">MADEMOISELLE HAIR · SEJONG · ${idx+1}/${total}</div>
    </div>
    ${card.disclaimer ? `<div class="disc">${card.disclaimer}</div>` : ''}
  </div>
  </body></html>`;
}

/* 1) 프레임 렌더 */
const total = post.cards.length;
const frames = [];
post.cards.forEach((card, i) => {
  const htmlPath = path.join(outDir, `frame${i+1}.html`);
  const pngPath = path.join(outDir, `frame${i+1}.png`);
  fs.writeFileSync(htmlPath, frameHTML(card, i, total));
  const chrome = process.env.CHROME_BIN || '/usr/bin/google-chrome';
  execSync(`${chrome} --headless --no-sandbox --disable-gpu --hide-scrollbars ` +
    `--force-device-scale-factor=1 --window-size=1080,1920 ` +
    `--screenshot=${pngPath} file://${path.resolve(htmlPath)} 2>/dev/null`);
  frames.push({ png: pngPath, dur: DUR[card.type] ?? DUR.content });
  console.log('rendered', pngPath);
});

/* 2) ffmpeg 조립 — xfade 크로스페이드 체인 */
const inputs = frames.map(f => `-loop 1 -t ${f.dur + FADE} -i ${f.png}`).join(' ');
let filter = '', prev = '[0:v]';
let offset = 0;
for (let i = 1; i < frames.length; i++) {
  offset += frames[i-1].dur;
  const out = i === frames.length - 1 ? '[v]' : `[x${i}]`;
  filter += `${prev}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${offset}${out};`;
  prev = `[x${i}]`;
}
filter = filter.replace(/;$/, '');
const reelPath = path.join(outDir, 'reel.mp4');
const cmd = frames.length > 1
  ? `ffmpeg -y ${inputs} -filter_complex "${filter}" -map "[v]" ` +
    `-r 30 -c:v libx264 -pix_fmt yuv420p -crf 23 -movflags +faststart ${reelPath}`
  : `ffmpeg -y ${inputs} -r 30 -c:v libx264 -pix_fmt yuv420p -crf 23 -movflags +faststart ${reelPath}`;
execSync(cmd, { stdio: 'pipe' });
frames.forEach((f, i) => fs.unlinkSync(path.join(outDir, `frame${i+1}.html`)));
console.log('reel saved:', reelPath);
