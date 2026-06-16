# Personal Wolf Site Design

## Goal

Build a static one-page personal website for a wolf character persona. The page should feel like a warm character profile: cold on the surface, friendly once someone looks closer.

## Selected Direction

Use the single-page scrolling character-card approach. The homepage opens with the avatar and a short line, then scrolls through profile sections.

## Visual Style

- Background: mostly solid light wolf-gray, slightly white/bright, with near-black used only for text depth and shadow. Avoid large decorative gradient backgrounds.
- Main colors: wolf gray and soft charcoal as the stable surfaces. Blue and red should be the main glow/highlight colors rather than large background colors.
- Red should echo the avatar's eyes and the fighting/battle side of the character.
- Blue should echo the shirt/school-life side of the character.
- The visual system should feel mostly solid-color and clean, with red/blue glow appearing through card glow, hover, and reflective edge details.
- Use frosted-glass panels with translucent backgrounds, blur, subtle borders, and soft highlights.
- Mood: quiet, slightly tough, sleepy, and secretly cute.
- Typography: readable sans-serif with strong section headings.
- The avatar should be circular and centered in the hero section.
- The avatar should sit on the front side of a clickable flip card. Clicking or pressing Enter/Space flips the card to reveal the first-person introduction on the back side.
- Glass card edges should have a visible reflective rim/highlight. After the avatar card flips, a reflective sweep should run once across the card.
- Motion: stronger scroll-triggered reveal animations for sections and glass cards, larger slide distance, visible opacity changes, bright hover glow near the cursor, subtle red/blue light movement, with reduced-motion support.

## Content

The page must include:

- Avatar image from `b_d746aae242a5d100067b4666c2c09533.jpg`.
- Personality: cold outside, warm inside, likes fighting, a bit dense, very warm to friends, interested in cute things.
- Species: wolf.
- Role: high school student.
- School-life notes: not very good at studying, sleeps in class.
- Contact links:
  - QQ friend link: `https://qm.qq.com/q/gTjB0YQ9TG`
  - Bilibili profile link: `https://b23.tv/XBYwzty`

## Page Structure

1. Hero section with a centered flip card: front side shows the circular avatar and short character quote; back side shows the first-person introduction.
2. Manuscript/artwork showcase section in the middle of the page. It should use the two actual artwork images, display them as a stacked pile, and protect images from casual saving.
3. Contact section with QQ and Bilibili links.

The profile/introduction content should be written as one first-person paragraph on the back side of the avatar flip card. It should combine species, role, school-life notes, personality, fighting tendency, warmth toward friends, and interest in cute things.

## Implementation

- Static files only: `index.html`, `css/styles.css`, `js/main.js`, and `assets/images/`.
- Copy the avatar into `assets/images/avatar.jpg` for stable references.
- No external image URLs or placeholder assets.
- The site should work by opening `index.html` directly and through a local dev server.
- Use semantic HTML, keyboard-focus styles, responsive CSS, and accessible alt text.
- Use CSS `backdrop-filter` / `-webkit-backdrop-filter` for frosted-glass effects with readable fallback colors.
- Use lightweight JavaScript with `IntersectionObserver` for scroll reveal animations.
- Use one large boxed glass card for the main first-person introduction text rather than multiple separate intro cards.
- Add bright glow effects on interactive glass cards, with blue/red as the main halo colors. Cards should have a soft persistent glow even before hover.
- Add reflective card-edge highlights using pseudo-elements or layered gradients.
- Add a one-shot reflective sweep animation after each flip completes.
- Make the flip card accessible with button semantics, keyboard support, and `aria-pressed`.

## Showcase Artwork Protection

The middle showcase section should be a glass card or grid area titled `稿件展示`.

There should be two artwork cards for the user's manuscripts/artworks:

Encoding note: the final visible section title must be `稿件展示`, and the source artwork files are `微信图片_20260616123113_134_4.png` and `微信图片_20260616123114_135_4.png`.

- `微信图片_20260616123113_134_4.png`
- `微信图片_20260616123114_135_4.png`

The artwork cards should appear stacked by default. Clicking a card should enlarge it into a focused preview while keeping the protective overlay.

Stack interaction:

- The front artwork can be clicked to enlarge.
- On pointer devices, hovering a back artwork should bring it to the front automatically.
- When a back artwork moves forward, it should animate from the side, as if it slides out from the pile and inserts itself into the front layer.
- The side-insertion animation should include horizontal movement, slight rotation, and depth/scale changes.
- Approved direction A, revised: the hovered back artwork slides out from the side, lifts above the stack, rotates closer to straight, scales up slightly, and settles into the front layer through smooth transform transitions rather than a stiff keyframe jump.
- The previous front artwork should drift backward at the same time, with a smaller scale, lower shadow, and slight counter-rotation so the whole stack feels like a real pile being reordered.
- Clicking the current front artwork opens the focused preview.
- On touch devices without hover, tapping a back artwork should still bring it to the front first, and tapping the current front artwork should open the focused preview.
- The stack interaction should be state-driven instead of relying on `nth-child`, so future manuscript cards can join the same behavior.

Motion requirements:

- Use natural easing for stack movement and enlargement, such as `cubic-bezier(0.16, 1, 0.3, 1)` or a spring-like transition.
- Avoid stiff linear movement.
- Animate transform, opacity, and shadow/filter-like effects rather than layout dimensions.
- Respect `prefers-reduced-motion`: reorder instantly or with a minimal opacity change when reduced motion is enabled.
- The enlarged preview should feel like it lifts out of the stack.

Protection requirements:

- Disable right-click context menu on the artwork area.
- Disable image dragging.
- Do not wrap artwork images in direct links to the source file.
- Place a transparent overlay above each image to block simple right-click/save interactions.
- Add subtle ownership/watermark text on the artwork cards.
- Do not claim perfect protection because screenshots, browser cache, and developer tools can still copy visible web images.

## Verification

- Check desktop and mobile layout.
- Confirm avatar loads from the local assets folder.
- Confirm QQ and Bilibili links open correctly.
- Confirm there are no placeholder URLs.
- Confirm reduced-motion users do not get unnecessary animation.
