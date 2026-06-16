import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'index.html should include the homepage script');

const cardWatermarkCount = (html.match(/class="scroll-watermark art-watermark"/g) || []).length;
assert.equal(cardWatermarkCount, 3, 'each artwork card should include a scrolling Bochuan watermark');
assert.ok(/id="lightboxCanvas"/.test(html), 'the lightbox should use a canvas for single-layer watermark compositing');
const watermarkRowCount = (html.match(/class="scroll-watermark-row/g) || []).length;
assert.ok(watermarkRowCount >= 12, 'artwork and lightbox watermarks should use multiple visible rows');
assert.match(html, /<div class="lightbox-frame"[\s\S]*id="lightboxCanvas"[\s\S]*<img id="lightboxImg"/, 'lightbox canvas should be inside the image frame alongside the hidden img loader');
assert.match(html, /requestAnimationFrame\(draw\)/, 'expanded lightbox watermark should keep scrolling via canvas rAF loop');
assert.match(html, /@media \(hover: none\), \(pointer: coarse\)[\s\S]*\.img-lightbox\s*\{[^}]*backdrop-filter:\s*none/, 'mobile should keep backdrop-filter disabled for performance');
assert.match(html, /@media \(hover: none\), \(pointer: coarse\)[\s\S]*animation:\s*none/, 'mobile should suppress glowPulse animation on the lightbox frame');

class StubClassList {
  constructor() {
    this.values = new Set();
  }

  add(...names) {
    for (const name of names) this.values.add(name);
  }

  remove(...names) {
    for (const name of names) this.values.delete(name);
  }

  replace(oldName, newName) {
    if (!this.values.has(oldName)) return false;
    this.values.delete(oldName);
    this.values.add(newName);
    return true;
  }

  toggle(name) {
    if (this.values.has(name)) {
      this.values.delete(name);
      return false;
    }
    this.values.add(name);
    return true;
  }

  contains(name) {
    return this.values.has(name);
  }
}

class StubElement {
  constructor(selector = '') {
    this.selector = selector;
    this.listeners = new Map();
    this.classList = new StubClassList();
    this.style = {
      values: new Map(),
      setProperty(name, value) {
        this.values.set(name, value);
        this[name] = value;
      },
      getPropertyValue(name) {
        return this.values.get(name) || this[name] || '0px';
      },
      removeProperty(name) {
        this.values.delete(name);
        delete this[name];
      },
    };
    this.dataset = {};
    this.children = [];
    this.attributes = new Map();
    this.src = '';
    this.rect = { left: 0, top: 0, width: 260, height: 360 };
    this.parentElement = null;
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  dispatch(type, event = {}) {
    const eventObject = {
      target: this,
      preventDefault() {},
      ...event,
    };
    let node = this;
    while (node) {
      node.emit(type, eventObject);
      if (eventObject.bubbles === false) break;
      node = node.parentElement;
    }
  }

  emit(type, eventObject) {
    for (const handler of this.listeners.get(type) || []) {
      handler(eventObject);
    }
  }

  querySelectorAll(selector) {
    if (selector === '.art-card') return this.children;
    return [];
  }

  closest(selector) {
    if (selector === '.art-card' && this.classList.contains('art-card')) return this;
    return null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getBoundingClientRect() {
    return this.rect;
  }
}

const flipCard = new StubElement('.flip-card');
const artStack = new StubElement('.art-stack');
artStack.rect = { left: 0, top: 0, width: 300, height: 420 };
const sectionHint = new StubElement('.section-hint');
const touchHint = new StubElement('.touch-hint');
const lightbox = new StubElement('#imgLightbox');
const lightboxFrame = new StubElement('.lightbox-frame');
const lightboxImg = new StubElement('#lightboxImg');
const showcase = new StubElement('#showcase');
const showcaseContent = new StubElement('#showcase .content');
showcaseContent.parentElement = showcase;
const card1 = new StubElement('.art-card');
card1.classList.add('art-card');
card1.dataset.art = 'files/artwork-01.png';
card1.dataset.artWidth = '1791';
card1.dataset.artHeight = '2133';
const card2 = new StubElement('.art-card');
card2.classList.add('art-card');
card2.dataset.art = 'files/artwork-02.png';
card2.dataset.artWidth = '1791';
card2.dataset.artHeight = '2133';
card2.rect = { left: 70, top: 110, width: 260, height: 360 };
const card3 = new StubElement('.art-card');
card3.classList.add('art-card');
card3.dataset.art = 'files/artwork-03.png';
card3.dataset.artWidth = '640';
card3.dataset.artHeight = '640';
artStack.children = [card1, card2, card3];
artStack.parentElement = showcaseContent;
sectionHint.parentElement = showcaseContent;
touchHint.parentElement = showcaseContent;
card1.parentElement = artStack;
card2.parentElement = artStack;
card3.parentElement = artStack;

let elementPoint = card1;
const documentElement = new StubElement('html');
documentElement.clientWidth = 980;

const documentStub = {
  body: { style: {} },
  documentElement,
  querySelector(selector) {
    if (selector === '.flip-card') return flipCard;
    if (selector === '.art-stack') return artStack;
    if (selector === '#showcase > .content') return showcaseContent;
    if (selector === '.section-hint') return sectionHint;
    if (selector === '.touch-hint') return touchHint;
    if (selector === '.lightbox-frame') return lightboxFrame;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === '#showcase, #showcase *') return [showcase, showcaseContent, artStack, sectionHint, touchHint, card1, card2, card3];
    if (selector === '.reveal') return [showcase];
    return [];
  },
  getElementById(id) {
    if (id === 'imgLightbox') return lightbox;
    if (id === 'lightboxImg') return lightboxImg;
    return null;
  },
  elementFromPoint() {
    return elementPoint;
  },
  addEventListener() {},
};

const timers = [];
const animationFrames = [];
const context = vm.createContext({
  document: documentStub,
  window: {
    innerWidth: 1000,
    innerHeight: 800,
    matchMedia: (query) => ({ matches: query.includes('hover: none') || query.includes('pointer: coarse') }),
    setTimeout: (fn, ms) => { timers.push(fn); return timers.length; },
  },
  setTimeout: (fn, ms) => { timers.push(fn); return timers.length; },
  clearTimeout() {},
  requestAnimationFrame: (fn) => {
    animationFrames.push(fn);
    return animationFrames.length;
  },
  IntersectionObserver: class {
    observe() {}
  },
});

vm.runInContext(script, context, { filename: 'index.html' });

const flushAnimationFrames = () => {
  for (const frame of animationFrames.splice(0)) frame();
};

assert.equal(sectionHint.classList.contains('touch-hint'), false, 'desktop hint should remain separate from the mobile hint');

artStack.dispatch('mousemove', { clientX: 130, clientY: 180 });
flushAnimationFrames();
assert.equal(card1.classList.contains('is-pulled'), true, 'mouse hover should still pull a card');

artStack.dispatch('mouseleave', {});
for (const timer of timers.splice(0)) timer();
assert.equal(card1.classList.contains('is-pulled'), false, 'mouse leave should release the hovered card');

lightbox.classList.remove('is-open');
lightboxImg.src = '';
elementPoint = card1;

assert.doesNotThrow(() => {
  artStack.dispatch('touchstart', {
    touches: [{ clientX: 130, clientY: 180 }],
  });
}, 'touchstart should not throw');

assert.equal(card1.classList.contains('is-pulled'), false, 'short touch should not immediately pull the card');

artStack.dispatch('touchend', {});
for (const timer of timers.splice(0)) timer();
assert.equal(lightbox.classList.contains('is-open'), false, 'short tap should not open the lightbox on mobile');

artStack.dispatch('click', { target: card1 });
for (const timer of timers.splice(0)) timer();
assert.equal(lightbox.classList.contains('is-open'), false, 'synthetic click after a touch should not open the lightbox on mobile');

elementPoint = null;
showcaseContent.dispatch('touchstart', {
  touches: [{ clientX: 150, clientY: 120 }],
});
for (const timer of timers.splice(0)) timer();
assert.equal(card2.classList.contains('is-pulled'), true, 'long-press on the showcase title area should activate the artwork preview');
showcaseContent.dispatch('touchcancel', {});
assert.equal(card2.classList.contains('is-pulled'), false, 'canceling the title-area touch should release the preview');

elementPoint = null;
artStack.dispatch('touchstart', {
  touches: [{ clientX: 150, clientY: 180 }],
});

elementPoint = card2;
artStack.dispatch('touchmove', {
  touches: [{ clientX: 148, clientY: 192 }],
});
assert.equal(card2.classList.contains('is-pulled'), false, 'dragging before long-press should not activate preview');

for (const timer of timers.splice(0)) timer();
assert.equal(card1.classList.contains('is-pulled'), false, 'touch preview should not depend on the element under the finger');
assert.equal(card2.classList.contains('is-pulled'), true, 'long-press in the middle of the stage should pull the middle card');

artStack.dispatch('touchmove', {
  touches: [{ clientX: 150, clientY: 220 }],
});
const shortMoveRotateX = Number(card2.style.transform.match(/rotateX\((-?\d+(?:\.\d+)?)deg\)/)?.[1]);
assert.ok(Number.isFinite(shortMoveRotateX) && Math.abs(shortMoveRotateX) >= 8, 'a small vertical move after long-press should tilt from the press point, not from the full card height');

elementPoint = card3;
artStack.dispatch('touchmove', {
  touches: [{ clientX: 206, clientY: 252 }],
});
assert.equal(card2.classList.contains('is-pulled'), true, 'small movement near a stage boundary should not flicker to the next card');
assert.equal(card3.classList.contains('is-pulled'), false, 'boundary hysteresis should keep the neighboring card down');

elementPoint = card1;
artStack.dispatch('touchmove', {
  touches: [{ clientX: 254, clientY: 254 }],
});
assert.equal(card3.classList.contains('is-pulled'), true, 'dragging deep into the right stage zone should select the right card');

artStack.dispatch('touchend', {});
flushAnimationFrames();
for (const timer of timers.splice(0)) timer();
assert.equal(lightbox.classList.contains('is-open'), true, 'lifting after the preview should open the lightbox');
assert.equal(lightboxImg.src, card3.dataset.art, 'the current stage-zone card at release should be opened');
assert.equal(card3.classList.contains('is-pulled'), false, 'opening the lightbox should release the previewed card behind it');
assert.equal(lightboxFrame.style.width, '640px', 'mobile lightbox should display the square image at its native width');
assert.equal(lightboxFrame.style.height, '640px', 'mobile lightbox should display the square image at its native height');
assert.equal(lightboxFrame.style.getPropertyValue('--origin-x'), '0px', 'mobile opening should not keep a card-origin x offset');
assert.equal(lightboxFrame.style.getPropertyValue('--origin-y'), '0px', 'mobile opening should not keep a card-origin y offset');
assert.equal(lightboxFrame.style.getPropertyValue('--origin-scale'), '0px', 'mobile opening should not keep a card-origin scale');

lightbox.dispatch('click', { bubbles: false });
for (const timer of timers.splice(0)) timer();
assert.equal(lightbox.classList.contains('is-open'), true, 'touch-generated click should not immediately close the freshly opened lightbox');

lightbox.dispatch('touchend', {});
for (const timer of timers.splice(0)) timer();
assert.equal(lightbox.classList.contains('is-open'), false, 'touching the lightbox again should still close it on mobile');

card2.dispatch('click', { target: card2 });
for (const timer of timers.splice(0)) timer();
assert.equal(lightbox.classList.contains('is-opening'), false, 'touch devices should never open artwork from a click event');

context.window.matchMedia = () => ({ matches: false });
card2.dispatch('click', { target: card2 });
for (const timer of timers.splice(0)) timer();
assert.equal(lightbox.classList.contains('is-opening'), true, 'desktop click should start with an opening state before settling');
assert.notEqual(lightboxFrame.style.getPropertyValue('--origin-x'), '0px', 'lightbox image frame should start from the source card horizontal position');
assert.notEqual(lightboxFrame.style.getPropertyValue('--origin-y'), '0px', 'lightbox image frame should start from the source card vertical position');
assert.notEqual(lightboxFrame.style.getPropertyValue('--origin-scale'), '.9', 'lightbox image frame should start from the source card scale');
assert.equal(documentStub.body.style.paddingRight, '20px', 'locking scroll should compensate for scrollbar width to avoid page jump');
flushAnimationFrames();
assert.equal(lightbox.classList.contains('is-open'), true, 'the next frame should settle the lightbox into the open state');
