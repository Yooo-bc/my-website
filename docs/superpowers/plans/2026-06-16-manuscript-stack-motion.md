# Manuscript Stack Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved A manuscript stack interaction: back稿件 slides out from the side, lifts, rotates toward straight, and settles into the front layer before it can be enlarged.

**Architecture:** Keep the current static single-file preview structure, but replace `nth-child` stack positioning with state-driven `data-stack-position` and `is-moving-forward` classes. JavaScript owns the front-card index and updates each card's position, z-index, aria label, and click behavior.

**Tech Stack:** Static HTML, CSS transforms/transitions/keyframes, vanilla JavaScript, Playwright/Edge for browser verification.

---

## File Structure

- Modify: `.superpowers/brainstorm/646-1781578391/content/stacked-artwork-preview-v1.html`
  - CSS: replace `nth-child` stack transforms with `[data-stack-position]` state styles and an `is-moving-forward` animation.
  - HTML: add stable `data-index` attributes and initial `data-stack-position` values to `.art-card` buttons.
  - JS: add `frontIndex`, `renderStack()`, `bringToFront(card)`, and guarded click handling.
- Verify-only: `site-preview.png`
  - Refresh screenshot after implementation if needed.

## Task 1: Add A Browser Regression Probe Before Editing

**Files:**
- Test command only; no production file changes.

- [ ] **Step 1: Write the failing browser probe**

Run this from the project root before editing. It asserts the desired behavior that currently does not exist: clicking a back card should reorder the stack and should not open the modal immediately.

```powershell
$script = @'
const { chromium } = await import("playwright");
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
await page.goto("http://127.0.0.1:50487/stacked-artwork-preview-v1.html", { waitUntil: "networkidle" });
await page.locator("#showcase").scrollIntoViewIfNeeded();
const cards = page.locator(".art-card");
const before = await cards.evaluateAll(items => items.map(card => ({
  index: card.dataset.index || "",
  position: card.dataset.stackPosition || "",
  moving: card.classList.contains("is-moving-forward"),
})));
await cards.nth(0).click();
await page.waitForTimeout(120);
const modalOpenEarly = await page.locator("#artModal").evaluate(el => el.classList.contains("is-open"));
const during = await cards.evaluateAll(items => items.map(card => ({
  index: card.dataset.index || "",
  position: card.dataset.stackPosition || "",
  moving: card.classList.contains("is-moving-forward"),
})));
await page.waitForTimeout(900);
const after = await cards.evaluateAll(items => items.map(card => ({
  index: card.dataset.index || "",
  position: card.dataset.stackPosition || "",
  moving: card.classList.contains("is-moving-forward"),
})));
await browser.close();
if (modalOpenEarly) throw new Error("Back card opened modal instead of reordering first");
if (before[0].position !== "back") throw new Error("Expected first card to start in back position");
if (during[0].position !== "front") throw new Error("Clicked back card did not move to front state");
if (!during[0].moving) throw new Error("Clicked back card did not get moving-forward animation class");
if (after[0].moving) throw new Error("moving-forward animation class was not cleaned up");
'@
$script | node --input-type=module
```

- [ ] **Step 2: Verify the probe fails for the expected reason**

Expected now: FAIL because cards do not have `data-index` / `data-stack-position`, or because the click opens the modal immediately. This proves the probe is testing the missing behavior.

## Task 2: Convert Stack Styling To State-Driven Positions

**Files:**
- Modify: `.superpowers/brainstorm/646-1781578391/content/stacked-artwork-preview-v1.html`

- [ ] **Step 1: Replace the `nth-child` position rules**

Replace the desktop and mobile `nth-child` stack transform rules with state selectors:

```css
.art-card {
  --stack-x: 0px;
  --stack-y: 0px;
  --stack-rotate: 0deg;
  --stack-scale: 1;
  --stack-shadow: 0 24px 58px rgba(74,83,96,.24), 0 0 30px rgba(55,109,255,.16), 0 0 34px rgba(220,32,49,.12), inset 0 1px 0 rgba(255,255,255,.72);
  transform: translate(var(--stack-x), var(--stack-y)) rotate(var(--stack-rotate)) scale(var(--stack-scale));
  box-shadow: var(--stack-shadow);
  z-index: var(--stack-z, 1);
}
.art-card[data-stack-position="back"] {
  --stack-x: -34px;
  --stack-y: 28px;
  --stack-rotate: -8deg;
  --stack-scale: .92;
  --stack-z: 1;
  cursor: pointer;
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
  --stack-x: -90px;
  --stack-y: 34px;
  --stack-rotate: -12deg;
  --stack-scale: .94;
}
.art-stack:hover .art-card[data-stack-position="front"] {
  --stack-x: 88px;
  --stack-y: -18px;
  --stack-rotate: 10deg;
  --stack-scale: 1;
}
.art-card.is-moving-forward {
  z-index: 5;
  animation: slideIntoFront .82s cubic-bezier(.16, 1, .3, 1);
}
@keyframes slideIntoFront {
  0% { transform: translate(-34px, 28px) rotate(-8deg) scale(.92); }
  42% { transform: translate(-112px, -6px) rotate(-13deg) scale(.98); }
  68% { transform: translate(16px, -24px) rotate(1deg) scale(1.05); }
  100% { transform: translate(38px, -10px) rotate(6deg) scale(.98); }
}
```

- [ ] **Step 2: Update mobile state selectors**

Replace the mobile `nth-child` rules with mobile variants:

```css
@media (max-width: 700px) {
  .contact { grid-template-columns: 1fr; }
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
    --stack-x: -34px;
    --stack-y: 32px;
    --stack-rotate: -10deg;
    --stack-scale: .92;
  }
  .art-stack:hover .art-card[data-stack-position="front"] {
    --stack-x: 42px;
    --stack-y: -12px;
    --stack-rotate: 8deg;
    --stack-scale: .98;
  }
  @keyframes slideIntoFront {
    0% { transform: translate(-18px, 28px) rotate(-7deg) scale(.9); }
    42% { transform: translate(-56px, 4px) rotate(-12deg) scale(.96); }
    68% { transform: translate(8px, -20px) rotate(1deg) scale(1.02); }
    100% { transform: translate(24px, -8px) rotate(6deg) scale(.96); }
  }
}
```

- [ ] **Step 3: Preserve reduced motion**

Extend the reduced-motion block so `slideIntoFront` does not animate:

```css
@media (prefers-reduced-motion: reduce) {
  .art-card.is-moving-forward { animation: none; }
}
```

## Task 3: Add Stack State To Markup And JavaScript

**Files:**
- Modify: `.superpowers/brainstorm/646-1781578391/content/stacked-artwork-preview-v1.html`

- [ ] **Step 1: Add initial state attributes to artwork cards**

Set the first card as back and the second as front, matching the current visual order:

```html
<button class="art-card" type="button" data-index="0" data-stack-position="back" data-art="/files/artwork-01.png" aria-label="将稿件 01 移到最前">
```

```html
<button class="art-card" type="button" data-index="1" data-stack-position="front" data-art="/files/artwork-02.png" aria-label="放大查看稿件 02">
```

- [ ] **Step 2: Replace the direct open click handler**

Replace the current `.art-card` click listener with this state-driven version:

```js
const artworkCards = Array.from(document.querySelectorAll('.art-card'));
let frontIndex = artworkCards.findIndex((card) => card.dataset.stackPosition === 'front');
if (frontIndex < 0) frontIndex = artworkCards.length - 1;
let stackAnimating = false;

const renderStack = () => {
  artworkCards.forEach((card, index) => {
    const isFront = index === frontIndex;
    card.dataset.stackPosition = isFront ? 'front' : 'back';
    card.style.setProperty('--stack-z', isFront ? '2' : '1');
    card.setAttribute('aria-label', isFront ? `放大查看稿件 ${String(index + 1).padStart(2, '0')}` : `将稿件 ${String(index + 1).padStart(2, '0')} 移到最前`);
  });
};

const bringToFront = (card) => {
  const nextIndex = artworkCards.indexOf(card);
  if (nextIndex === -1 || nextIndex === frontIndex || stackAnimating) return;
  stackAnimating = true;
  frontIndex = nextIndex;
  renderStack();
  card.classList.remove('is-moving-forward');
  void card.offsetWidth;
  card.classList.add('is-moving-forward');
  window.setTimeout(() => {
    card.classList.remove('is-moving-forward');
    stackAnimating = false;
  }, 860);
};

renderStack();
artworkCards.forEach((card) => {
  card.addEventListener('click', () => {
    if (artworkCards.indexOf(card) === frontIndex && !stackAnimating) {
      openModal(card.dataset.art);
      return;
    }
    bringToFront(card);
  });
  card.addEventListener('contextmenu', (event) => event.preventDefault());
  card.addEventListener('dragstart', (event) => event.preventDefault());
});
```

- [ ] **Step 3: Run the browser probe again**

Run the exact probe from Task 1.

Expected: PASS with no thrown error.

## Task 4: Manual And Visual Verification

**Files:**
- Verify-only: `.superpowers/brainstorm/646-1781578391/content/stacked-artwork-preview-v1.html`

- [ ] **Step 1: Check browser resources**

Run:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:50487/stacked-artwork-preview-v1.html' -TimeoutSec 5
Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:50487/files/artwork-01.png' -TimeoutSec 5
Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:50487/files/artwork-02.png' -TimeoutSec 5
```

Expected: each request returns HTTP 200.

- [ ] **Step 2: Capture desktop screenshot**

Use Playwright with Edge at 1366x900. Scroll to the showcase and save `site-preview.png`.

Expected: the stack is visible, not blank, and the front/back cards are offset naturally.

- [ ] **Step 3: Capture mobile screenshot**

Use Playwright with Edge at 390x844. Scroll to the showcase and save `site-preview-mobile.png`.

Expected: the stack fits the viewport, the cards do not overflow awkwardly, and text does not overlap.

- [ ] **Step 4: Verify click behavior manually or through Playwright**

Run a script that clicks the back card once, checks the modal remains closed and the clicked card becomes front, then clicks the same card again and checks the modal opens.

Expected: first click reorders only; second click opens the focused preview.
