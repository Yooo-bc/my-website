const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3456;
const PASSWORD = 'wolf123';
const ROOT = __dirname;

const tokens = new Set();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function serveFile(res, filePath) {
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}

function parseCookies(req) {
  const cookie = req.headers.cookie || '';
  const result = {};
  cookie.split(';').forEach(pair => {
    const [k, v] = pair.trim().split('=');
    if (k) result[k] = decodeURIComponent(v || '');
  });
  return result;
}

function checkAuth(req) {
  const cookies = parseCookies(req);
  return tokens.has(cookies.admin_token);
}

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf-8'));
  } catch {
    return {
      avatar: {
        image: 'files/avatar-preview.jpg',
        kicker: 'Wolf / High School Student',
        title: '汪先生是个大废人',
        quote: '别靠太近……算了，朋友的话可以。',
        frontHint: '点击卡片查看简介',
        backTitle: '关于我',
        backDescription: '我是一只狼，也是一个学习不太好的高中生。平时看起来有点冷，不太好接近，还喜欢打架，上课也经常困到睡着；不过熟了之后我其实很热情，对朋友会很认真。虽然我有时候很呆，但看到可爱的东西会忍不住多看几眼。',
        backHint: '再点一次翻回头像',
        tags: [
          { label: '外冷内热', style: '' },
          { label: '喜欢打架', style: 'red' },
          { label: '高中生', style: 'blue' },
          { label: '喜欢可爱东西', style: '' }
        ]
      },
      artworks: [
        { id: 1, title: '稿件 01', image: 'files/artwork-01.png' },
        { id: 2, title: '稿件 02', image: 'files/artwork-02.png' }
      ],
      contact: {
        qq: { url: 'https://qm.qq.com/q/gTjB0YQ9TG', label: 'QQ 好友入口', desc: '点击链接加我为 QQ 好友' },
        bilibili: { url: 'https://b23.tv/XBYwzty', label: 'Bilibili 空间', desc: '去看看我的个人空间' }
      },
      texts: {
        topNote: '稿件区已装入两张图片：默认堆叠展示，点击可自然放大。右键/拖拽会被拦截。',
        spacer1: '往下滑，中间是堆叠稿件展示区',
        spacer2: '继续往下是联系方式',
        showcaseTitle: '稿件展示',
        showcaseDesc: '这里放着我的两张稿件。点击任意一张可以放大查看。',
        protectedNote: '普通右键保存和拖拽会被拦住；截图和开发者工具无法完全阻止。',
        closeHint: '点击空白处关闭',
        modalWatermark: 'Preview Only'
      }
    };
  }
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateIndexHtml(data) {
  const a = data.avatar;
  const arts = data.artworks || [];
  const c = data.contact;
  const t = data.texts;

  const tagsHtml = (a.tags || []).map(tag =>
    `                <span class="tag${tag.style ? ' ' + tag.style : ''}">${escapeHtml(tag.label)}</span>`
  ).join('\n');

  const artworkCardsHtml = arts.map((art, i) => {
    const pos = i === arts.length - 1 ? 'front' : 'back';
    const isFront = pos === 'front';
    return `            <button class="art-card" type="button" data-index="${i}" data-stack-position="${pos}" data-art="${escapeHtml(art.image)}" aria-label="${isFront ? '放大查看' : '将稿件 ' + String(i+1).padStart(2,'0') + ' 移到最前'}">
              <img src="${escapeHtml(art.image)}" alt="${escapeHtml(art.title)}" draggable="false">
              <span class="art-overlay"></span>
              <span class="watermark">Preview Only</span>
            </button>`;
  }).join('\n');

  const manuscriptLabel = (i) => String(i + 1).padStart(2, '0');
  const initArtworkJs = arts.map((art, i) => {
    const pos = i === arts.length - 1 ? 'front' : 'back';
    return `            <button class="art-card" type="button" data-index="${i}" data-stack-position="${pos}" data-art="${escapeHtml(art.image)}" aria-label="${pos === 'front' ? `放大查看稿件 ${manuscriptLabel(i)}` : `将稿件 ${manuscriptLabel(i)} 移到最前`}">`;
  });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>驳川小站</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 230vh;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #27303b;
      background: #c7cbd1;
      overflow-x: hidden;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background: rgba(255,255,255,.22);
      pointer-events: none;
    }
    body.modal-open { overflow: hidden; }
    .wrap {
      position: relative;
      width: min(980px, calc(100% - 32px));
      margin: 0 auto;
      padding: 44px 0 120px;
    }
    .note {
      margin: 0 0 22px;
      color: #3d4654;
      text-align: center;
      line-height: 1.7;
    }
    .stage { min-height: 84vh; display: grid; place-items: center; }
    .flip-card {
      width: min(620px, 100%);
      min-height: 620px;
      perspective: 1400px;
      cursor: pointer;
      border-radius: 36px;
      filter: drop-shadow(0 0 28px rgba(55,109,255,.24)) drop-shadow(0 0 34px rgba(220,32,49,.18));
    }
    .flip-inner {
      position: relative;
      display: block;
      width: 100%;
      min-height: 620px;
      transform-style: preserve-3d;
      transition: transform .9s cubic-bezier(.16, 1, .3, 1);
    }
    .flip-card.is-flipped .flip-inner { transform: rotateY(180deg); }
    .face, .glass-section, .link-card {
      border: 1px solid rgba(255,255,255,.62);
      background: rgba(230,233,238,.5);
      backdrop-filter: blur(24px) saturate(120%);
      -webkit-backdrop-filter: blur(24px) saturate(120%);
      box-shadow: 0 30px 90px rgba(74,83,96,.24), 0 0 26px rgba(55,109,255,.13), 0 0 34px rgba(220,32,49,.1), inset 0 1px 0 rgba(255,255,255,.8), inset 0 -1px 0 rgba(255,255,255,.22);
    }
    .face {
      position: absolute;
      inset: 0;
      min-height: 620px;
      overflow: hidden;
      display: grid;
      place-items: center;
      padding: 44px;
      border-radius: 36px;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    .face.back { transform: rotateY(180deg); }
    .sweep {
      position: absolute;
      inset: -40% -75%;
      transform: translateX(-62%) rotate(18deg);
      background: linear-gradient(90deg, transparent 43%, rgba(255,255,255,.72), rgba(255,255,255,.2), transparent 58%);
      opacity: 0;
      pointer-events: none;
      z-index: 2;
    }
    .flip-card.sweep-on .sweep { animation: sweepOnce .82s cubic-bezier(.16, 1, .3, 1); }
    @keyframes sweepOnce {
      0% { transform: translateX(-62%) rotate(18deg); opacity: 0; }
      20% { opacity: .9; }
      100% { transform: translateX(62%) rotate(18deg); opacity: 0; }
    }
    .content { position: relative; z-index: 3; width: 100%; text-align: center; }
    .avatar {
      display: block;
      width: 220px;
      height: 220px;
      margin: 0 auto 22px;
      padding: 6px;
      border-radius: 50%;
      background: #3b72ff;
      box-shadow: 0 0 0 4px #dc2031, 0 0 0 12px rgba(255,255,255,.42), 0 20px 58px rgba(68,77,91,.28);
    }
    .avatar img { width: 100%; height: 100%; display: block; object-fit: cover; border-radius: 50%; }
    .kicker { color: #355da8; font-size: 12px; letter-spacing: .2em; text-transform: uppercase; }
    h1 { margin: 12px 0; font-size: clamp(40px, 6vw, 64px); line-height: 1.04; letter-spacing: 0; color: #202833; }
    .quote, .hint { margin: 0; color: #384454; font-size: 17px; line-height: 1.7; }
    .hint { margin-top: 22px; color: #536072; font-size: 14px; }
    .back .content { max-width: 500px; margin: 0 auto; text-align: left; }
    .back h2, .glass-section h2 { margin: 0 0 18px; font-size: clamp(30px, 5vw, 46px); letter-spacing: 0; color: #202833; }
    .back p, .glass-section p { margin: 0; color: #344051; font-size: clamp(16px, 2vw, 20px); line-height: 1.95; }
    .tags { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 26px; }
    .tag { border-radius: 999px; padding: 8px 12px; border: 1px solid rgba(71,82,99,.18); background: rgba(255,255,255,.38); color: #344051; font-size: 13px; }
    .tag.red { border-color: rgba(220,32,49,.48); background: rgba(220,32,49,.14); }
    .tag.blue { border-color: rgba(55,109,255,.5); background: rgba(55,109,255,.15); }
    .spacer { min-height: 18vh; display: grid; place-items: center; color: #3d4654; text-align: center; }
    .glass-section {
      position: relative;
      overflow: hidden;
      border-radius: 34px;
      padding: clamp(28px, 5vw, 48px);
      transform: translateY(130px) scale(.95);
      opacity: 0;
      transition: transform 1s cubic-bezier(.16,1,.3,1), opacity 1s cubic-bezier(.16,1,.3,1);
    }
    .glass-section.is-visible, .contact.is-visible { transform: translateY(0) scale(1); opacity: 1; }
    .stack-area {
      position: relative;
      z-index: 2;
      min-height: 500px;
      margin-top: 28px;
      padding-bottom: clamp(72px, 8vw, 112px);
      user-select: none;
      -webkit-user-select: none;
    }
    .art-stack {
      position: relative;
      width: min(420px, 78vw);
      height: 390px;
      margin: 0 auto;
    }
    .art-card {
      --stack-x: 0px;
      --stack-y: 0px;
      --stack-rotate: 0deg;
      --stack-scale: 1;
      --stack-z: 1;
      --stack-shadow:
        0 24px 58px rgba(74,83,96,.24),
        0 0 30px rgba(55,109,255,.16),
        0 0 34px rgba(220,32,49,.12),
        inset 0 1px 0 rgba(255,255,255,.72);
      position: absolute;
      inset: 0;
      overflow: hidden;
      border: 1px solid rgba(255,255,255,.6);
      border-radius: 28px;
      background: rgba(255,255,255,.42);
      box-shadow: var(--stack-shadow);
      cursor: pointer;
      transform: translate(var(--stack-x), var(--stack-y)) rotate(var(--stack-rotate)) scale(var(--stack-scale));
      z-index: var(--stack-z);
      transition:
        transform .92s cubic-bezier(.16, 1, .3, 1),
        box-shadow .45s ease,
        filter .45s ease;
    }
    .art-card[data-stack-position="back"] {
      --stack-x: -34px;
      --stack-y: 28px;
      --stack-rotate: -8deg;
      --stack-scale: .92;
      --stack-z: 1;
    }
    .art-card[data-stack-position="front"] {
      --stack-x: 38px;
      --stack-y: -10px;
      --stack-rotate: 6deg;
      --stack-scale: .98;
      --stack-z: 2;
      cursor: zoom-in;
    }
    .art-stack:hover .art-card[data-stack-position="back"] {
      --stack-x: -68px;
      --stack-y: 24px;
      --stack-rotate: -12deg;
      --stack-scale: .95;
    }
    .art-stack:hover .art-card[data-stack-position="front"] {
      --stack-x: 72px;
      --stack-y: -22px;
      --stack-rotate: 10deg;
      --stack-scale: 1;
    }
    .art-card:hover {
      box-shadow:
        0 30px 70px rgba(74,83,96,.28),
        0 0 44px rgba(55,109,255,.28),
        0 0 48px rgba(220,32,49,.2),
        inset 0 1px 0 rgba(255,255,255,.8);
    }
    .art-card[data-stack-position="front"]:hover { z-index: 4; }
    .art-card img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      pointer-events: none;
      -webkit-user-drag: none;
      user-select: none;
    }
    .art-overlay {
      position: absolute;
      inset: 0;
      z-index: 3;
      background: linear-gradient(180deg, transparent 70%, rgba(32,40,51,.18));
    }
    .watermark {
      position: absolute;
      right: 14px;
      bottom: 12px;
      z-index: 4;
      color: rgba(255,255,255,.86);
      text-shadow: 0 1px 8px rgba(32,40,51,.45);
      font-size: 12px;
      letter-spacing: .08em;
      text-transform: uppercase;
      pointer-events: none;
    }
    .glass-section .protected-note {
      position: relative;
      z-index: 2;
      margin: clamp(68px, 8vw, 96px) auto 0;
      max-width: 620px;
      font-size: 14px;
      color: #536072;
      text-align: center;
    }
    .modal {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: grid;
      place-items: center;
      padding: 24px;
      background: rgba(46, 52, 62, 0);
      backdrop-filter: blur(0);
      -webkit-backdrop-filter: blur(0);
      opacity: 0;
      pointer-events: none;
      transition:
        opacity .42s cubic-bezier(.16, 1, .3, 1),
        background .42s cubic-bezier(.16, 1, .3, 1),
        backdrop-filter .42s cubic-bezier(.16, 1, .3, 1);
    }
    .modal.is-open {
      background: rgba(46, 52, 62, .42);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      opacity: 1;
      pointer-events: auto;
    }
    .modal-card {
      position: relative;
      width: min(760px, 92vw);
      max-height: 86vh;
      transform: translateY(46px) scale(.86);
      opacity: 0;
      transition:
        transform .62s cubic-bezier(.16, 1, .3, 1),
        opacity .42s cubic-bezier(.16, 1, .3, 1);
    }
    .modal.is-open .modal-card {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    .modal-card img {
      width: 100%;
      max-height: 86vh;
      display: block;
      object-fit: contain;
      border-radius: 28px;
      box-shadow: 0 30px 90px rgba(38,46,58,.45), 0 0 42px rgba(55,109,255,.24), 0 0 52px rgba(220,32,49,.18);
      pointer-events: none;
      -webkit-user-drag: none;
      user-select: none;
    }
    .modal-card::after {
      content: "Preview Only";
      position: absolute;
      right: 18px;
      bottom: 16px;
      color: rgba(255,255,255,.82);
      text-shadow: 0 1px 10px rgba(20,24,30,.6);
      font-size: 12px;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .close-hint {
      position: fixed;
      top: 20px;
      right: 24px;
      z-index: 101;
      color: #f7f8fb;
      font-size: 14px;
      opacity: 0;
      transition: opacity .25s ease;
      pointer-events: none;
    }
    .modal.is-open + .close-hint { opacity: .9; }
    .contact { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; transform: translateY(130px) scale(.95); opacity: 0; transition: transform 1s cubic-bezier(.16,1,.3,1), opacity 1s cubic-bezier(.16,1,.3,1); }
    .link-card { color: #27303b; text-decoration: none; padding: 24px; border-radius: 22px; transition: transform .35s cubic-bezier(.16,1,.3,1), background .22s ease; }
    .link-card:hover { transform: translateY(-6px); background: rgba(240,242,246,.66); }
    .link-card strong { display: block; margin-bottom: 8px; }
    .link-card span { color: #536072; }
    @media (max-width: 700px) {
      .contact { grid-template-columns: 1fr; }
      .stack-area { min-height: 470px; }
      .art-stack { height: 340px; }
      .art-card[data-stack-position="back"] {
        --stack-x: -18px;
        --stack-y: 28px;
        --stack-rotate: -7deg;
        --stack-scale: .9;
      }
      .art-card[data-stack-position="front"] {
        --stack-x: 24px;
        --stack-y: -8px;
        --stack-rotate: 6deg;
        --stack-scale: .96;
      }
      .art-stack:hover .art-card[data-stack-position="back"] {
        --stack-x: -44px;
        --stack-y: 24px;
        --stack-rotate: -10deg;
        --stack-scale: .93;
      }
      .art-stack:hover .art-card[data-stack-position="front"] {
        --stack-x: 52px;
        --stack-y: -16px;
        --stack-rotate: 9deg;
        --stack-scale: .98;
      }
    }
    @media (max-width: 640px) {
      .wrap { width: min(100% - 24px, 980px); padding-top: 28px; }
      .flip-card, .flip-inner, .face { min-height: 600px; }
      .face { padding: 30px 22px; }
      .avatar { width: 170px; height: 170px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .flip-inner, .glass-section, .contact, .link-card, .art-card, .modal, .modal-card { transition: none; }
      .glass-section, .contact { transform: none; opacity: 1; }
      .flip-card.sweep-on .sweep { animation: none; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <p class="note">${escapeHtml(t.topNote)}</p>
    <section class="stage">
      <div class="flip-card" role="button" tabindex="0" aria-pressed="false" aria-label="翻转头像卡片查看简介">
        <div class="flip-inner">
          <div class="face front">
            <div class="sweep"></div>
            <div class="content">
              <div class="avatar"><img src="${escapeHtml(a.image)}" alt="灰狼头像" draggable="false"></div>
              <div class="kicker">${escapeHtml(a.kicker)}</div>
              <h1>${escapeHtml(a.title)}</h1>
              <p class="quote">"${escapeHtml(a.quote)}"</p>
              <p class="hint">${escapeHtml(a.frontHint)}</p>
            </div>
          </div>
          <div class="face back">
            <div class="sweep"></div>
            <div class="content">
              <h2>${escapeHtml(a.backTitle)}</h2>
              <p>${escapeHtml(a.backDescription)}</p>
              <div class="tags">
${tagsHtml}
              </div>
              <p class="hint">${escapeHtml(a.backHint)}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
    <div class="spacer">${escapeHtml(t.spacer1)}</div>
    <section class="glass-section reveal" id="showcase">
      <div class="content" style="text-align:left">
        <h2>${escapeHtml(t.showcaseTitle)}</h2>
        <p>${escapeHtml(t.showcaseDesc)}</p>
        <div class="stack-area" oncontextmenu="return false">
          <div class="art-stack">
${artworkCardsHtml}
          </div>
          <p class="protected-note">${escapeHtml(t.protectedNote)}</p>
        </div>
      </div>
    </section>
    <div class="spacer">${escapeHtml(t.spacer2)}</div>
    <section class="contact reveal">
      <a class="link-card" href="${escapeHtml(c.qq.url)}" target="_blank" rel="noreferrer">
        <strong>${escapeHtml(c.qq.label)}</strong>
        <span>${escapeHtml(c.qq.desc)}</span>
      </a>
      <a class="link-card" href="${escapeHtml(c.bilibili.url)}" target="_blank" rel="noreferrer">
        <strong>${escapeHtml(c.bilibili.label)}</strong>
        <span>${escapeHtml(c.bilibili.desc)}</span>
      </a>
    </section>
  </main>
  <div class="modal" id="artModal" aria-hidden="true" oncontextmenu="return false">
    <div class="modal-card">
      <img id="modalImage" alt="放大的稿件预览" draggable="false">
    </div>
  </div>
  <div class="close-hint">${escapeHtml(t.closeHint)}</div>
  <script>
    const flipCard = document.querySelector('.flip-card');
    const toggleFlip = () => {
      const flipped = flipCard.classList.toggle('is-flipped');
      flipCard.setAttribute('aria-pressed', String(flipped));
      window.setTimeout(() => {
        flipCard.classList.remove('sweep-on');
        void flipCard.offsetWidth;
        flipCard.classList.add('sweep-on');
        window.setTimeout(() => flipCard.classList.remove('sweep-on'), 900);
      }, 520);
    };
    flipCard.addEventListener('click', toggleFlip);
    flipCard.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleFlip();
      }
    });

    const modal = document.getElementById('artModal');
    const modalImage = document.getElementById('modalImage');
    const openModal = (src) => {
      modalImage.src = src;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => modal.classList.add('is-open'));
    };
    const closeModal = () => {
      modal.classList.remove('is-open');
      window.setTimeout(() => {
        modal.setAttribute('aria-hidden', 'true');
        modalImage.removeAttribute('src');
        document.body.classList.remove('modal-open');
      }, 420);
    };

    const artworkCards = Array.from(document.querySelectorAll('.art-card'));
    let frontIndex = artworkCards.findIndex((card) => card.dataset.stackPosition === 'front');
    if (frontIndex < 0) frontIndex = artworkCards.length - 1;

    const manuscriptLabel = (index) => String(index + 1).padStart(2, '0');
    const renderStack = () => {
      artworkCards.forEach((card, index) => {
        const isFront = index === frontIndex;
        card.dataset.stackPosition = isFront ? 'front' : 'back';
        card.setAttribute(
          'aria-label',
          isFront ? \`放大查看稿件 \${manuscriptLabel(index)}\` : \`将稿件 \${manuscriptLabel(index)} 移到最前\`
        );
      });
    };

    const bringToFront = (card) => {
      const nextIndex = artworkCards.indexOf(card);
      if (nextIndex === -1 || nextIndex === frontIndex) return;
      frontIndex = nextIndex;
      renderStack();
    };

    renderStack();

    artworkCards.forEach((card) => {
      card.addEventListener('click', () => {
        if (artworkCards.indexOf(card) === frontIndex) {
          openModal(card.dataset.art);
          return;
        }
        bringToFront(card);
      });
      card.addEventListener('contextmenu', (event) => event.preventDefault());
      card.addEventListener('dragstart', (event) => event.preventDefault());
    });
    document.querySelectorAll('#showcase, #showcase *, #artModal, #artModal *').forEach((el) => {
      el.addEventListener('contextmenu', (event) => event.preventDefault());
      el.addEventListener('dragstart', (event) => event.preventDefault());
    });
    modal.addEventListener('click', closeModal);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
        else entry.target.classList.remove('is-visible');
      });
    }, { threshold: 0.25 });
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
  <\/script>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // --- API ---
  if (pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { password } = JSON.parse(body);
        if (password === PASSWORD) {
          const token = crypto.randomBytes(32).toString('hex');
          tokens.add(token);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, token }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: '密码错误' }));
        }
      } catch {
        res.writeHead(400);
        res.end('Bad Request');
      }
    });
    return;
  }

  if (pathname === '/api/check-auth' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ authenticated: checkAuth(req) }));
    return;
  }

  if (pathname === '/api/site' && req.method === 'GET') {
    if (!checkAuth(req)) { res.writeHead(401); res.end('Unauthorized'); return; }
    const data = loadData();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  if (pathname === '/api/site' && req.method === 'PUT') {
    if (!checkAuth(req)) { res.writeHead(401); res.end('Unauthorized'); return; }
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        fs.writeFileSync(path.join(ROOT, 'data.json'), JSON.stringify(data, null, 2), 'utf-8');
        const html = generateIndexHtml(data);
        fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  if (pathname === '/api/upload' && req.method === 'POST') {
    if (!checkAuth(req)) { res.writeHead(401); res.end('Unauthorized'); return; }
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { filename, data: base64 } = JSON.parse(body);
        const ext = path.extname(filename) || '.png';
        const safeName = Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext;
        const filePath = path.join(ROOT, 'files', safeName);
        const buffer = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        if (!fs.existsSync(path.join(ROOT, 'files'))) fs.mkdirSync(path.join(ROOT, 'files'));
        fs.writeFileSync(filePath, buffer);
        const urlPath = 'files/' + safeName;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, path: urlPath }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // --- Static files ---
  let filePath;
  if (pathname === '/' || pathname === '') {
    filePath = path.join(ROOT, 'admin.html');
  } else {
    filePath = path.join(ROOT, pathname.replace(/^\//, ''));
    // Security: prevent directory traversal
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
  }
  serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`\n  🐺 驳川小站管理后台已启动\n`);
  console.log(`  地址: http://localhost:${PORT}`);
  console.log(`  密码: ${PASSWORD}\n`);
  console.log(`  编辑后点击「保存全部」，index.html 会自动更新`);
  console.log(`  然后 git push 即可部署到 GitHub Pages\n`);
});
