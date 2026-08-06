# Design QA

## Comparison target

- Source visual truth: `C:\Users\yuy04\.codex\visualizations\2026\07\18\019f72e5-071e-7bc1-a81d-83349a1c6a53\css-cargo-hover-reference.png` and `css-cargo-buttons-section.png`, captured from <https://css-cargo.vercel.app/> and its button inventory.
- Rendered implementation: `cargo-home-desktop.png`, `cargo-detail-top.png`, `cargo-detail-gallery.png`, and `cargo-home-mobile.png` in the same visualization directory.
- Full-view comparison input: `cargo-source-implementation-full.jpg`.
- Focused CTA comparison input: `cargo-source-implementation-focus.jpg`.
- Desktop viewport: 1536 × 1024 for the implementation; the source capture was 1440 × 1024 and normalized to the same 512 px comparison height.
- Mobile viewport: 390 × 844.
- States checked: default, hover, pointer-down/active, desktop home, enriched detail, scrolled photo gallery, and mobile home.

## Findings

- No actionable P0, P1, or P2 visual mismatch remains.
- The source is an interaction reference rather than a page-cloning target. The implementation intentionally retains the existing coral, mint, rounded family-oriented brand while transferring CSS Cargo's tactile signals: dark keyline, inset highlight, offset base shadow, hover lift, and pressed-down travel.
- Typography: the app keeps its readable Japanese product type rather than importing the source's pixel display font. Weight, hierarchy, line height, and wrapping remain clear at desktop and mobile sizes.
- Spacing and layout rhythm: the stronger controls do not change the established hero, condition strip, recommendation-card, or detail hierarchy. Desktop widths match the viewport and the 390 px mobile view has no horizontal overflow.
- Colors and tokens: coral remains the primary action color, mint remains the selection/success color, and the new dark outline/shadow token supplies the Cargo-like physical contrast without replacing the brand palette.
- Image quality and asset fidelity: the final home capture shows five real location images across the six above-the-fold feature tiles. The tested detail contains five sharp Wikimedia Commons photos with visible author/license credit and source links. No broken images were found.
- Copy and content: detail pages now expose four immediate decision facts, an information-completeness indicator, the existing curated description, a Wikipedia overview when a relevant article is found, and source/verification guidance.

## Comparison history

### Pass 1

- Finding [P1]: the first post-build home capture still showed repeated neutral fallback art in four of six feature tiles.
- Fix: split the lightweight Wikipedia representative-image lookup from the richer Commons gallery lookup, prioritized the former for cards, increased the public-API timeout, and retained the database image as first choice.
- Post-fix evidence: `cargo-home-final-preview.jpg` shows five real photos and one honest fallback above the fold. The final QA recorded 14 Wikimedia responses and 2 working database-image responses, with no failed browser requests.

### Pass 2

- Finding: no P0/P1/P2 issue.
- Evidence: the focused comparison input shows the source's offset, pressable CTA treatment translated into the app's coral rounded CTA. The detail capture shows four decision facts above the fold and the gallery capture shows five credited photos.

## Functional and accessibility checks

- Production build and TypeScript checks: passed with Next.js 16.2.4.
- Routes checked: home, detail, and mobile home returned HTTP 200.
- Primary CTA hover and active states: passed.
- Detail photo gallery: 5 images.
- Immediate decision facts: 4.
- Wikipedia note: visible.
- Broken images: 0.
- Console errors: 0.
- Failed browser requests: 0.
- Mobile horizontal overflow: false.
- `prefers-reduced-motion` continues to disable non-essential transition duration.

## Follow-up polish

- [P3] Obscure places without a relevant free-license public image still use the branded map fallback. Their coverage can improve later through admin-curated image URLs or licensed user submissions; the UI does not fabricate location photography.

final result: passed
---

# Design QA — 2026-08-06 Editorial Homepage

## Comparison target

- Source visual truth: `design/reference-homepage-long.png` (793 × 1983).
- Rendered implementation: `design/implementation-desktop.png` (1440 × 8945 before the density correction).
- Same-input comparisons: `design/qa-hero-comparison.jpg` and `design/qa-full-comparison.jpg`.
- Desktop viewport: 1440 × 1100, full-page capture.
- Responsive rules checked in code: 1080 px, 820 px, and 560 px breakpoints.

## Findings and fixes

### Pass 1

- [P2][Density/layout] The first implementation preserved all requested discovery sections but was substantially taller than the source visual rhythm. Evidence: the source normalized to a 1440 px width is approximately 3600 px tall, while the first full capture was 8945 px.
- Fix: added a desktop density pass in `EditorialHome.module.css`: hero 660 px, 72–76 px section padding, shorter section headings, 16:10 media, 420 px map, compact mood/event/rain rows, 470 px closing feature, and tighter final CTA.
- [P2][Surface treatment] The hero used a gradient shade not present in the selected flat editorial direction.
- Fix: replaced it with one uniform translucent image shade.
- Post-fix production build and TypeScript checks passed.

### Pass 2

- No actionable P0 or P1 issue remains.
- Typography: Dela Gothic One supplies the approved heavy Japanese Gothic display voice; Noto Sans JP remains the readable body face. The hero scale is smaller than the initial screenshot while keeping the deliberate editorial line breaks.
- Layout: diagonal hero image, folio index, paper-like dividers, three-column recommendations, pale-blue map field, mood matrix, dark rainy-day band, time columns, editorial feature, and final decision CTA preserve the reference hierarchy.
- Colors: off-white paper, black ink, Kansai blue, and a restrained red CTA match the source direction. Focus states keep a visible 3 px blue outline.
- Image quality: hero/cards/events/articles use current production content images; the map uses the generated 1200 × 620 editorial Kansai asset. No CSS or SVG substitute was used for visible imagery.
- Content: all public sections use existing spot, ranking, prefecture count, mood, weather, event, rainy-day, stay-time, or article data. No fabricated venue data was added.
- Intentional P3 difference: the source hero shows a waterfront rail scene, while the implementation shows the current Kobe hero spot. This is intentional because the approved handoff explicitly requested reuse of the live site's information and imagery.

## Functional and accessibility checks

- Production build and Next.js TypeScript validation: passed.
- Existing unit suite: 63 tests passed.
- Search form, primary recommendation CTA, geolocation CTA, area links, map link, mood tabs, event links, article links, and mobile navigation are wired to existing routes.
- Semantic buttons/tabs, input labels, alt text, keyboard focus, reduced-motion rules, and practical mobile tap sizes are present.
- The Browser plugin could not start because the local Windows sandbox returned a DPAPI error; the fallback desktop capture completed through the project's installed Playwright CLI.

final result: passed
