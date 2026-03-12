# How to DADU — Design Specification

**Version:** 1.0  
**Role:** Senior UX Designer, Product Designer, Architecture Industry Strategist  
**Objective:** Redesign and reposition as a practical guide, acquisition + design practice, and tool-driven development resource.

---

## 1. New Page Structure

### Single-page architecture

The website is a **single scrolling page** with clearly defined sections. The Feasibility Tool remains a dedicated page (`/feasibility`) but is surfaced as the primary interactive entry point from the homepage.

| Order | Section | Purpose |
|-------|---------|---------|
| 1 | Hero | Clear positioning + primary CTA to tool |
| 2 | Guide to Middle Housing | Educational foundation: what it is, why it matters |
| 3 | Housing Types (DADU, Duplex, Triplex, Fourplex) | Visual overview with simple diagrams/icons |
| 4 | Seattle Development Basics | Practical considerations (zoning, setbacks, etc.) |
| 5 | **Feasibility Tool** | Central interactive component — full-width CTA + link to `/feasibility` |
| 6 | Acquisition + Design | Services explained directly |
| 7 | Who This Is For | Audiences: homeowners, buyers, small developers |
| 8 | Process | Five-step sequence |
| 9 | Newsletter | Optional — zoning updates, policy, insights |
| 10 | Footer | Navigation, contact |

### Navigation model

- **Header:** Logo | Guide | Tool | Services | Contact
- Sticky header, minimal. “Tool” links to `/feasibility` or in-page anchor.
- Footer: Same links plus newsletter signup.

---

## 2. Content Hierarchy

### Information architecture

```
Level 1 — Section titles (H1/H2)
  "Guide to Middle Housing in Seattle"
  "Seattle Development Basics"
  "Feasibility Tool"

Level 2 — Subsection titles (H3)
  "What is middle housing?"
  "Housing types"
  "Zoning"
  "Setbacks"
  etc.

Level 3 — Card/block titles (H4)
  "DADU"
  "Duplex"
  "Parcel Snapshot"
  "Development Capacity"

Level 4 — Body copy, labels, captions
```

### Reading flow

1. **Scan:** Section titles and card headers
2. **Skim:** First sentence of each block
3. **Deep read:** Body copy where interested

Copy is short (2–4 sentences per block). No dense paragraphs.

---

## 3. UX Layout Recommendations

### Grid system

- **Base grid:** 8px
- **Container max-width:** 1120px (70rem)
- **Gutter:** 24px (3 × 8px)
- **Columns:** 12-column grid for flexibility

### Section spacing

| Element | Spacing |
|--------|---------|
| Section padding (top/bottom) | 64px (8 × 8px) |
| Section padding (mobile) | 40px |
| Between subsections | 40px |
| Between cards | 24px |

### Card design

- **Padding:** 20–24px (2.5–3 × 8px)
- **Border:** 1px solid `#e5e5e5` (soft gray)
- **Background:** White or `#fafafa`
- No heavy shadows; subtle borders only.

### Responsive breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| sm | 640px | Single column → two columns |
| md | 768px | Two-column layouts |
| lg | 1024px | Full multi-column layouts |
| xl | 1280px | Max container |

---

## 4. Updated Feasibility Tool UI Layout

### Overall structure

**Two-column interface:**

- **Left (60–65%):** Map — dominant, full height
- **Right (35–40%):** Information panel — scrollable

Map and legend remain unchanged. Only layout, typography, and panel structure are updated.

### Right panel sections (cards)

#### 1. Parcel Snapshot

- **Card title:** Parcel Snapshot
- **Content:** Address, lot size (sq ft), zoning designation
- **Layout:** 2–3 key stats in a simple grid
- **Style:** Clean labels, bold values

#### 2. Zoning Summary

- **Card title:** Zoning Summary
- **Content:** Zone code, zone name, description
- **Style:** Single card, minimal text

#### 3. Development Capacity

- **Card title:** Development Capacity
- **Content:** Visual badges for each housing type:
  - `DADU` — Possible / Not possible / Conditional
  - `Duplex` — Possible / Not possible / Conditional
  - `Triplex` — Possible / Not possible / Conditional
  - `Fourplex` — Possible / Not possible / Conditional
- **Style:** Badges with clear status (e.g. green border = possible, gray = not possible)
- **Layout:** Horizontal wrap or 2×2 grid

#### 4. Lot Constraints

- **Card title:** Lot Constraints
- **Content:** Setbacks, coverage max, height limit, access
- **Style:** Label + value pairs in a card

#### 5. Legend

- **Card title:** Map Legend
- **Content:** Existing legend items (property boundary, setback zone, etc.)
- **Style:** Unchanged visually; improved spacing

### Panel layout specs

| Element | Spec |
|---------|------|
| Panel padding | 24px |
| Card padding | 20px |
| Card gap | 16px |
| Section heading | 12px uppercase, 0.2em tracking |
| Card title | 14px semibold |
| Value text | 16–18px, medium weight |
| Label text | 12px, muted |

### Proptech feel

- Cards instead of dense tables
- Clear hierarchy: Snapshot → Zoning → Capacity → Constraints
- Badge-based capacity (not long text)
- Plenty of whitespace between cards

---

## 5. Section Wireframe Descriptions

### Hero

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  [Small label: Seattle · Middle Housing]                 │
│                                                         │
│  Understanding Seattle lots and                         │
│  designing housing on them.                             │
│                                                         │
│  A guide to middle housing in Seattle and a practice    │
│  that helps clients acquire and design small housing   │
│  projects.                                              │
│                                                         │
│  [ Check a property ]  [ Book a consultation ]          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- One clear headline
- 2–3 sentence subhead
- Two buttons: primary = Tool, secondary = Consult
- No decorative imagery; typography only

---

### Guide to Middle Housing

```
┌─────────────────────────────────────────────────────────┐
│  Guide to Middle Housing                                │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ What it is   │  │ Why it       │  │ Housing      │   │
│  │              │  │ matters      │  │ types       │   │
│  │ [2-3 sent]   │  │ [2-3 sent]   │  │ [brief]     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────┘
```

- Three cards: what it is, why it matters, housing types
- Short, informational copy

---

### Housing Types (Visual Section)

```
┌─────────────────────────────────────────────────────────┐
│  Housing Types                                           │
│                                                         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│  │ [icon] │ │ [icon] │ │ [icon] │ │ [icon] │          │
│  │ DADU   │ │Duplex  │ │Triplex │ │Fourplex│          │
│  │ [1-2   │ │ [1-2   │ │ [1-2   │ │ [1-2   │          │
│  │  sent] │ │  sent] │ │  sent] │ │  sent] │          │
│  └────────┘ └────────┘ └────────┘ └────────┘          │
└─────────────────────────────────────────────────────────┘
```

- Four cards in a row (2×2 on mobile)
- Simple icon or diagram per type
- One sentence description each
- Line-based or icon illustrations, not photos

---

### Seattle Development Basics

```
┌─────────────────────────────────────────────────────────┐
│  Seattle Development Basics                              │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │ Zoning          │  │ Setbacks        │               │
│  │ [brief para]    │  │ [brief para]    │               │
│  └─────────────────┘  └─────────────────┘               │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │ Lot coverage    │  │ Height limits   │               │
│  └─────────────────┘  └─────────────────┘               │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │ Access          │  │ Permitting      │               │
│  └─────────────────┘  └─────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

- 2×3 or 3×2 grid of cards
- Each card: term + short explanation
- Professional, planner-style tone

---

### Feasibility Tool CTA

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  Feasibility Tool                                       │
│                                                         │
│  Enter a Seattle address to see zoning, lot capacity,   │
│  and development options.                               │
│                                                         │
│  ┌──────────────────────────────────┐  [ Check ]       │
│  │ Enter address…                   │                   │
│  └──────────────────────────────────┘                   │
│                                                         │
│  [ Link: Open full tool → ]                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

- Optional: embed minimal lookup on homepage or link through to full tool
- Full tool lives at `/feasibility` with updated panel layout

---

### Acquisition + Design

```
┌─────────────────────────────────────────────────────────┐
│  Acquisition + Design                                    │
│                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │ 1           │ │ 2           │ │ 3           │      │
│  │ Site eval   │ │ Acquisition │ │ Design      │      │
│  │ [1-2 sent]  │ │ [1-2 sent]  │ │ [1-2 sent]  │      │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
│                                                         │
│  ┌─────────────┐                                        │
│  │ 4           │                                        │
│  │ Permitting  │                                        │
│  │ [1-2 sent]  │                                        │
│  └─────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

- Four service cards
- Numbered for sequence
- Direct, practical copy

---

### Who This Is For

```
┌─────────────────────────────────────────────────────────┐
│  Who This Is For                                        │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Homeowners adding a second unit                  │   │
│  │ [1-2 sentences]                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Buyers looking for development sites            │   │
│  │ [1-2 sentences]                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Small developers building duplexes or fourplexes │   │
│  │ [1-2 sentences]                                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

- Three audience cards, stacked
- One short paragraph each

---

### Process

```
┌─────────────────────────────────────────────────────────┐
│  Process                                                 │
│                                                         │
│  1 ──► 2 ──► 3 ──► 4 ──► 5                              │
│                                                         │
│  Review    Evaluate   Acquire   Design   Permitting &    │
│  site      zoning     property  housing  construction   │
│  [short]   [short]    [short]   [short] [short]         │
└─────────────────────────────────────────────────────────┘
```

- Horizontal step sequence
- Number + label + one-line description per step
- Arrow or line connecting steps

---

## 6. Typography System

### Font stack

**Primary:** Inter (or Graphik, Helvetica)

- Headings and body: single sans-serif family
- No serif fonts

### Type scale (8px base)

| Use | Size | Weight | Line height | Letter spacing |
|-----|------|--------|-------------|-----------------|
| H1 (Hero) | 48px | 500 | 1.1 | -0.02em |
| H2 (Section) | 32px | 500 | 1.2 | -0.01em |
| H3 (Subsection) | 24px | 500 | 1.3 | 0 |
| H4 (Card title) | 16px | 600 | 1.4 | 0 |
| Body | 16px | 400 | 1.6 | 0 |
| Body small | 14px | 400 | 1.5 | 0 |
| Label | 12px | 500 | 1.4 | 0.08em (uppercase) |
| Caption | 12px | 400 | 1.4 | 0 |

### Font weights

- 400 — Body
- 500 — Headings, emphasized body
- 600 — Card titles, buttons

---

## 7. Spacing System

### Base grid: 8px

All spacing is a multiple of 8.

| Token | Value | Use |
|-------|-------|-----|
| space-1 | 4px | Tight inline (icons, badges) |
| space-2 | 8px | Inline gaps |
| space-3 | 12px | Small component gaps |
| space-4 | 16px | Between related elements |
| space-5 | 20px | Card internal padding |
| space-6 | 24px | Card padding, section gaps |
| space-8 | 32px | Between subsections |
| space-10 | 40px | Section internal spacing |
| space-12 | 48px | — |
| space-16 | 64px | Section padding (vertical) |

### Section rhythm

```
[64px top padding]
  [Section content]
  [40px between subsections]
  [Section content]
[64px bottom padding]
```

### Card internal spacing

```
[24px padding]
  [Label: 8px margin-bottom]
  [Title: 8px margin-bottom]
  [Body: 12px margin-bottom if more content]
[24px padding]
```

---

## Implementation Notes

1. **Feasibility logic:** Do not change. Map, API, analysis, and legend stay as-is.
2. **Feasibility UI:** Restructure panel only (layout, cards, typography, badges).
3. **Homepage:** Reorder and rewrite sections per this spec.
4. **Tone:** Professional, calm, architectural, clear. No marketing or startup language.
5. **Visual restraint:** White, black, soft gray. No gradients or heavy shadows.
