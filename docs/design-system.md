# Design & UX System — Extracted from razorpay.com

> Extracted directly from the live site's computed styles, DOM structure, and interaction behavior (colors, type, spacing, radii, shadows, card anatomy, hover/click states, information architecture). Logo and brand assets intentionally excluded, and no page copy/content is reproduced — only the **structural pattern**: how sections are ordered, how components are built, and how features/data are presented. This is meant to be reused as a system to generate new pages (home, product/feature pages, etc.) in the same visual and structural language.

---

## PART A — VISUAL DESIGN LANGUAGE

### 1. Color Palette

**Primary**
| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#305EFF` | Primary CTA fills, links, headline accent words/phrases, active icons |
| `--color-primary-hover` | `#4D7FFF` | Hover/lighter state of primary blue |
| `--color-primary-tint` | `rgba(48,94,255,0.09)` | Pill/chip backgrounds, subtle highlighted nav items |
| `--color-primary-tint-2` | `#D0E0FF` | Soft badge backgrounds |
| `--color-primary-pale` | `#BBDDFF` / `#CCEEFF` | Decorative background tints, illustration accents |

**Neutrals**
| Token | Value | Usage |
|---|---|---|
| `--color-ink` | `#000000` | Primary body text |
| `--color-heading-dark` | `#192839` | Card titles, sub-headings |
| `--color-navy-deep` | `#0D1A48` | Dark high-contrast section backgrounds |
| `--color-teal-deep` | `#1F3D3A`-ish deep teal-green | Alternate dark section background (no-code product trio, some feature blocks) |
| `--color-surface` | `#FFFFFF` | Default page/card background |
| `--color-surface-muted` | `#F0F4F6` | Alternating section backgrounds |
| `--color-surface-faint` | `#F8FAFC` | Card interiors, subtle panel fill |
| `--color-surface-faint-2` | `#F1F5FA` | Secondary panel fill |
| `--color-overlay-dark` | `rgba(11,10,13,0.2)` | Image overlays / scrim on photography |

**Semantic**
| Token | Value | Usage |
|---|---|---|
| `--color-success` | `#009E5C` | Success states, "completed" badges, teal-green accent cards |
| `--color-error` | `#ED2939` / `#D52B1E` | Error/destructive states, alert chips |
| `--color-error-tint` | `#FFBFBF` | Error background tint |

**Philosophy:** ~90% white/near-white surfaces, one confident primary blue for everything actionable, occasional deep-navy or deep-teal full-bleed blocks used deliberately as **rhythm breaks** roughly every 3–5 sections to reset visual pace, and green/red reserved strictly for semantic meaning.

---

### 2. Typography

| Role | Font Family | Notes |
|---|---|---|
| Display / H1–H2 | `"TASA Orbiter Display", sans-serif` | Weight 500, large hero/section headlines only |
| Body / lead paragraph | `"Inter Tight", sans-serif` | Weight 500 for intro/subhead copy |
| UI / card text | `"Inter", sans-serif` | Card titles, labels, buttons, nav — weight 400–600 |

**Type scale**
| Element | Size | Weight | Color |
|---|---|---|---|
| H1 (hero) | 48px | 500 | Primary blue and/or ink (two-tone) |
| H2 (section) | 42px | 500 | White (on dark) or ink |
| H3 (card/subsection title) | 16–24px | 600 | `#192839` |
| Lead paragraph | 20px | 500 | Ink / dark gray |
| Body / labels | 12–14px | 400 | Ink or muted gray |

**Two-tone headline pattern (used constantly, on nearly every section):** one clause/keyword rendered in primary blue, the rest in black — e.g. *"Your entire payment universe, **in one dashboard**"* or *"**Payments** that just work!"*. This is the site's primary emphasis technique instead of italics, underlines, or all-caps. Apply this pattern to every major section headline generated from this system.

---

### 3. Layout & Spacing

- Outer page container: `1440px` max
- Core content container: `1184px` max
- Wide grid container: `1280px`
- Horizontal page padding: `128px` desktop, scales down responsively
- Primary nav height: `74px`, white, no visible border (shadow appears only on scroll)
- Section vertical rhythm: ~80–160px between sections; alternates background (`white` ↔ `#F0F4F6` ↔ occasional full-bleed dark navy/teal) instead of hard dividers/borders

### 4. Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `4px` | Buttons, small controls, chips |
| `--radius-md` | `8px` | Cards, panels (most common) |
| `--radius-lg` | `12–16px` | Large feature/image cards |
| `--radius-pill` | `40px` / `100%` | Nav pill buttons, tags, circular badges |

### 5. Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-card` | `0 2px 16px 0 rgba(25,40,57,0.09)` | Standard resting card |
| `--shadow-card-alt` | `0 2px 16px 0 rgba(49,49,51,0.1)` | Alternate card elevation |
| `--shadow-panel` | `0 2px 4px -2px rgba(19,38,68,0.06), 0 4px 8px -2px rgba(19,38,68,0.1)` | Dropdowns, mega-menus, popovers |
| `--shadow-sticky-bar` | `0 -2px 4px 0 rgba(0,0,0,0.04)` | Bottom sticky bar, nav-on-scroll |
| `--shadow-drawer` | `0 -4px 16px -4px rgba(8,13,41,0.08)` | Bottom sheets/drawers |

All shadows are soft, low-contrast, and cool/navy-tinted rather than pure black — elevation stays subtle.

---

## PART B — COMPONENT ANATOMY

### 6. Buttons
- **Primary CTA:** solid `#305EFF`, white text, `4px` radius, ~36–44px height, trailing arrow icon common, no border/shadow.
- **Secondary/text CTA:** transparent, primary-blue text, no border (e.g. "Know More").
- **Outline button:** transparent fill, thin border, `4px` radius (e.g. "Login").
- **Inverted (on dark backgrounds):** white pill, dark text — used inside navy/teal blocks for contrast.

### 7. Card Taxonomy
This site uses **five distinct card types**, each with a specific job:

1. **Icon-benefit card** — white bg, centered content, blue rounded-square icon (~40px) on top, bold title, centered muted 2–3 line description. Used for "why choose us" style benefit grids (typically 6 cards, 2×3 grid). *Static, no hover reveal.*
2. **Product-tile card** — image/illustration/mockup fills the top ~60% of the card, bold left-aligned title + 1-line description below. **On hover:** card lifts slightly and reveals a primary "Sign Up →" button + "Know More" text link that are hidden at rest — keeps the default grid visually calm and reserves CTAs for intent-driven hover.
3. **Dark text-only CTA card** — no image, deep teal/navy background, white bold multi-line headline + "Know More →" link. Used to showcase 3 lightweight/no-code products side by side where imagery isn't needed.
4. **Testimonial card** — resting state: full-bleed black-and-white portrait photo with name + role overlaid at the bottom on a dark gradient scrim. **On click/hover:** card expands and flips to a white surface, revealing the full quote text above the name/role, with a small thumbnail avatar retained.
5. **Code-snippet card** (developer sections only) — dark navy card, tab pill for the language (e.g. "Curl") with a "change language" control, copy + expand icons top-right, monospace syntax-highlighted code with line numbers.

### 8. Chips / Tags / Pills
- Background `rgba(48,94,255,0.09)`, `40px` radius, 12px regular text — used for quick-nav links, currency badges.
- Solid dark pill (`#000`/near-black) — used specifically for a "NEW" label to flag recently added features, always top-right of a section/card title.

### 9. Navigation Structure
- **Top utility bar** (optional, contextual/geo-based): colored strip above the main nav for a timely offer, includes a small flag/region icon, one-line offer text, and a dark pill "Know More" CTA.
- **Primary nav (74px, white, sticky):** logo-left placeholder, center text links, right-aligned `Login` (outline) + `Sign Up` (solid primary) buttons.
- **Mega-menu (on hover/click of a primary nav item):** full-width dropdown panel below the nav, multiple columns, each column headed by a small-caps gray label (e.g. "ACCEPT PAYMENTS ONLINE"), each row = icon + bold title (+ optional "NEW" pill) + one-line gray description. A fine-print compliance/legal line is pinned along the bottom edge of the panel.
- **In-page sticky sub-nav:** appears when scrolling into a multi-part feature section; horizontal list of plain-text tabs, active tab gets a colored (green) underline + darker text, inactive tabs stay muted gray. A solid primary CTA button stays pinned to the right of this bar for the duration of the section.
- **Bottom sticky helper bar:** thin white bar fixed to the viewport bottom, "Need help choosing?" prompt + row of icon-pill quick-routing links (task-based, not page-based).
- **Footer:** white, multi-column link groups under small-caps gray section labels, blue link text, compliance/security badges, social icons, legal entity address block, and a final fine-print effective-date/legal line at the very bottom.

### 10. Section Header Pattern
Nearly every content section follows one of two header layouts:
- **Centered:** two-tone headline centered, one-line muted subhead centered directly below, content grid begins after generous spacing. (Used for benefit grids, FAQ intros.)
- **Left-aligned split:** two-tone headline + supporting paragraph on the left (~55–60% width), a primary CTA button aligned to the right on the same baseline as the headline. (Used before major feature/dashboard showcases.)

### 11. Section Transitions / Dividers
Instead of hard rule lines, the page uses **full-bleed colored bands as transitions**:
- A dark navy/teal infinite horizontal **marquee ticker** (e.g. tech-stack labels separated by bullet dots) is used as a lightweight visual divider between a benefit grid and a deeper technical section.
- Alternating section background colors (white ↔ light gray ↔ dark navy/teal) create rhythm without needing borders.

---

## PART C — INTERACTION PATTERNS

| Pattern | Trigger | Behavior |
|---|---|---|
| Product-tile CTA reveal | Hover | Card lifts (slight scale/shadow increase); hidden "Sign Up" + "Know More" fade/slide into view under the description |
| Testimonial expand | Hover / click | B&W photo card grows, flips to white surface, reveals full quote text above name |
| FAQ accordion | Click on question row | Chevron rotates 180°, answer text expands below in muted gray within the same row, only one or several can be open at once |
| Sticky sub-nav tabs | Scroll into a tabbed section | Sub-nav pins to just below the main nav; switching tabs swaps the card grid below with a simple cross-fade, active tab underlines in green |
| Mega-menu | Hover/click on a top nav item | Full-width panel drops down beneath the nav with a soft panel shadow; closes on mouse-leave or outside click |
| Infinite marquee | Passive (auto) | Logos/labels scroll continuously left, looping seamlessly, used as a section-break element |
| Button micro-interaction | Hover | Background shifts to the lighter primary shade; no scale/transform — kept subtle |

Overall motion language: gentle, low-amplitude (fade/slide/scale-lift only), no bounce/elastic easing, nothing that competes with content for attention.

---

## PART D — HOW FEATURES & DATA ARE PRESENTED

Across the homepage and product pages, the same handful of **content-presentation patterns** recur. Use these as building blocks rather than inventing new ones per page:

1. **Tabbed capability showcase** — a top-level claim ("The all-in-one finance platform…") backed by a sticky tab bar of 5–6 top-level capabilities; each tab reveals a 4-card grid of sub-features (product-tile cards). Good for summarizing a broad product suite on a homepage.
2. **Benefit grid** — 6 icon-benefit cards in a 2×3 grid answering "why this product." Good for a single product's differentiators on a feature page.
3. **Developer/technical proof block** — full-bleed dark section: left/top area lists 3 technical entry points (title + description + "View Docs →"), right/bottom area shows a live-looking code-snippet card. Good for establishing technical credibility without a wall of docs.
4. **No-code sub-products row** — 3 dark text-only CTA cards side by side, used when showcasing lightweight tools that don't need screenshots (each just needs a promise + a link).
5. **Big dashboard/product reveal** — left-aligned section header (two-tone headline + paragraph + CTA) followed by one large, wide product screenshot in a frameless rounded card. Used once per page, as the single "hero proof" of the product actually working.
6. **Industry/vertical grid** — a row of cards (photo or icon top, bold vertical name, 1-line value prop) used to show breadth of applicability (e-commerce, education, SaaS, etc.) without deep detail on any one.
7. **Social proof band** — grayscale logo strip (trust marker, near the top) plus a testimonial card row further down the page (deeper proof, requires more attention/interaction to unlock via the click-to-expand quote).
8. **FAQ close** — two-column (headline left, accordion right) placed near the end of the page, right before the footer, to catch remaining objections.

---

## PART E — REUSABLE PAGE TEMPLATES (structure only, not content)

### Template 1 — Homepage
1. Optional top utility/offer bar
2. Primary nav (with mega-menus)
3. Hero: two-tone headline + subhead + primary/secondary CTA pair + supporting photo/illustration with a floating "toast" overlay
4. Logo/trust strip (grayscale partner logos)
5. Full-bleed dark spotlight card (one flagship feature, screenshot + white CTA)
6. Tabbed capability showcase (sticky tabs + 4-card grids) — the broad product-suite summary
7. Industry/vertical card row
8. Bento-style mixed highlight grid (varied card sizes for 3–5 standout stats/features)
9. Secondary feature grid (smaller, icon-led product list)
10. Testimonial card row (click-to-expand quotes)
11. FAQ accordion (two-column)
12. Footer (multi-column mega nav + legal)
13. Persistent bottom sticky helper bar throughout

### Template 2 — Product / Feature Page
1. Primary nav
2. Hero: H1 + one-line value prop + primary CTA + limited-time offer/badge if applicable
3. Benefit grid (6 icon-benefit cards, 2×3) — centered section header
4. Full-bleed marquee divider (tech stack / integrations / supported methods)
5. Developer/technical proof block (dark, 3-point list + code-snippet card) — *skip this section for non-technical products*
6. Platform/integration logos grid (plugins, partners)
7. No-code/lightweight sub-products row (dark text-only CTA cards) — *only if the product has companion lightweight tools*
8. Big dashboard/product screenshot reveal — left-aligned header + CTA, large visual below
9. Industry/vertical card row (reused component from homepage)
10. Testimonial card row
11. Resources/further-reading teaser (simple card row linking to guides/blog)
12. FAQ accordion
13. Footer

**How to reuse this for a new page:** pick Template 1 for a top-level marketing/home page, Template 2 for any single-product or single-feature page, then populate each numbered slot with real content while keeping the component types (card taxonomy, section header pattern, interaction behavior) and color/type system from Parts A–C unchanged. Sections marked optional can be dropped if not relevant, but the ordering and card types should stay consistent so new pages feel native to the same system.

---

## PART F — Do / Don't

**Do**
- Keep ~90% of the page on white/near-white surfaces; use color with intent
- Use exactly one primary blue for all interactive/actionable elements
- Apply the two-tone headline treatment to every major section title
- Reserve full-bleed dark (navy/teal) sections for high-impact breaks, not more than once every few sections
- Hide secondary CTAs on product-tile cards until hover, to keep grids visually calm
- Keep motion subtle: fade/slide/lift only

**Don't**
- Don't introduce multiple saturated accent colors — green/red stay reserved for success/error semantics
- Don't use heavy, high-contrast, or dark drop shadows
- Don't mix more than two type families (display + UI/body) on one page
- Don't show every card's CTA at rest — use the hover-reveal pattern to add visual quiet
- Don't add hard border-line dividers between sections — use background-color changes or marquee bands instead
