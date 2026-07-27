# Contributing

Thanks for wanting to help. This project is small and deliberately structured, so most changes are a one-file affair.

## Setup

```bash
npm install
npm run dev
```

Before opening a pull request:

```bash
npm run check     # typecheck + tests + catalog validation
npm run build
```

CI runs exactly these, plus lint.

## Where things go

| I want to… | Edit |
| --- | --- |
| Add or fix a product | `src/lib/data/catalog/*.json` — see [docs/CATALOG.md](docs/CATALOG.md) |
| Add a concern or preference | `src/lib/domain/taxonomy.ts` (one entry, propagates everywhere) |
| Change how matching works | `src/lib/engine/` |
| Change the UI | `src/app/`, `src/components/` |
| Point at a different data source | Implement `CatalogProvider`, wire it in `src/lib/data/index.ts` |

Architecture and the reasoning behind the design: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## House rules

**Keep the engine pure.** `src/lib/engine/` must not import React, Next.js, or anything that does I/O. If you need data, take it as a parameter. This is what makes the engine testable without mocks and reusable outside the web app.

**Scoring changes need tests.** If you adjust a weight or add a factor, add a test asserting the behaviour you intended. `WEIGHTS` must still sum to 1 — there's a test for that.

**Filter or score, not both.** New exclusion logic goes in `filters.ts` only if a user would be upset to see the product *at all* (allergen, over budget, unsafe for them). Everything else is a scoring preference.

**Every scoring factor produces its own explanation.** Return the `MatchReason` alongside the sub-score so the number the UI quotes can't drift from the number the engine used.

**Record downsides.** When adding products, fill in `aggravates`. A recommender that only tells users good news isn't one they can calibrate trust against.

## Product data

The catalog is a curated sample, not a shopping index. Contributions should:

- Reflect publicly documented formulations — if you can't verify a claim, leave it off.
- Use approximate prices; don't chase exact current retail.
- Never present `curationScore` as a customer review average. It's an editorial weight, and the docs say so.
- Write honest descriptions, including drawbacks.

## Accessibility

The UI is plain CSS with semantic HTML. Please keep:

- Real `<button>` elements with `aria-pressed` for toggles, not styled divs.
- Visible focus indicators (`:focus-visible` is styled globally).
- Both light and dark themes working — `data-theme` on `<html>` must win over the OS media query in both directions.
- Wide content scrolling inside its own container so the page body never scrolls sideways.

## Scope

GlowMatch gives cosmetic guidance, not medical advice. Please don't add features that diagnose conditions or recommend prescription treatments. Pointing users toward a dermatologist for persistent acne, rosacea, eczema or hair loss is the right behaviour, and the footer says so on every page.

## Licence

By contributing you agree your work is licensed under the MIT licence.
