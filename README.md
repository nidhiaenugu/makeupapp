# GlowMatch

A personalised makeup, skincare and haircare recommender with an **explainable** matching engine and a public REST API.

Answer a short quiz about your skin, hair, concerns and preferences; GlowMatch scores every product in the catalog against your profile and shows you *why* each one matched — including the trade-offs it thinks you should know about.

```
┌─────────────┐   profile   ┌──────────────────┐   scores   ┌──────────────┐
│  Quiz / API │ ──────────► │ Matching engine  │ ─────────► │ Ranked list  │
└─────────────┘             │  (pure TS)       │            │ + reasons    │
                            └────────┬─────────┘            └──────────────┘
                                     │ reads
                            ┌────────▼─────────┐
                            │ CatalogProvider  │  swap for Postgres,
                            │ (JSON by default)│  a CMS, a retailer feed…
                            └──────────────────┘
```

## What it does

- **A quiz that adapts.** Only asks about your undertone if you selected makeup or skincare; only asks about porosity if you selected hair.
- **Men's and women's products.** Skincare and haircare are treated as gender-neutral by default — a cleanser works the same regardless — and only products a brand genuinely markets to one audience (a dedicated men's grooming line, say) are filtered by the gender you select.
- **Explainable matches.** Every score decomposes into named factors, and each product card states the reasons it ranked where it did.
- **Honest trade-offs.** If a product treats your acne but will worsen the dryness you also mentioned, it says so on the card rather than burying it.
- **Dealbreakers are absolute.** Mark *fragrance-free* as a dealbreaker and failing products are removed from consideration, not quietly ranked lower.
- **Ingredient exclusions.** Free-text allergy list; anything containing a listed ingredient is filtered out entirely.
- **Safety gating.** Strong actives are held back from users who say they're beginners, and the strongest are withheld from sensitive skin regardless of experience.
- **Shade matching that admits defeat.** Foundation matching weighs depth and undertone separately, and tells you plainly when a range simply doesn't extend to your skin.
- **Routine building.** Turns matches into an ordered AM / PM / wash-day routine with usage guidance per step.
- **A public REST API.** Everything the UI does is available over HTTP with CORS enabled.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Production build |
| `npm test` | Run the engine test suite (97 tests) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run validate:catalog` | Semantic checks on the product data |
| `npm run check` | Typecheck + tests + catalog validation |
| `npm run build:standalone` | Bundle the whole app into one offline HTML file |
| `npm run smoke:standalone` | Drive that file in a headless browser |

No database, no API keys, no environment variables. The catalog ships with the repo.

## The single-file build

`npm run build:standalone` produces `dist/glowmatch.html` — the entire app, engine and catalog in one ~185 KB file that runs from `file://` with **no network requests at all**. Useful for phones, offline use, or emailing someone the whole app.

It is not a reimplementation: `src/standalone/app.ts` is a vanilla-DOM front end that imports the *real* engine and catalog, and esbuild bundles them together. The hosted version therefore cannot drift from the source. `npm run smoke:standalone` drives the built file in headless Chromium — full quiz, results, routine, saving, theme persistence — and fails on any console error or network request.

The same command also writes `manifest.json`, `sw.js` and four icon sizes into `dist/`, so **when the whole folder is hosted** (as it is on GitHub Pages — see below), the site is a proper installable PWA: "Add to Home Screen" gets a real icon and launches full-screen with no browser chrome, and a tiny service worker caches the app shell so it keeps opening offline after the first visit. Icons live as static PNGs in `assets/icons/`, rendered once via `node scripts/generate-icons.mjs` (headless Chromium) rather than regenerated on every build. Opening the lone `.html` file directly still works exactly as before — the manifest and icon links just resolve to nothing, harmlessly, since a file with no origin can't be "installed" in any meaningful sense anyway.

## Using the API

```bash
curl -X POST http://localhost:3000/api/recommendations \
  -H 'Content-Type: application/json' \
  -d '{
    "profile": {
      "categories": ["skincare"],
      "skinType": "oily",
      "sensitive": false,
      "concerns": ["acne", "large-pores"],
      "mustHave": ["fragrance-free"],
      "budget": { "max": 40 },
      "experience": "intermediate"
    },
    "limit": 5
  }'
```

Full reference: **[docs/API.md](docs/API.md)**.

## How matching works

Products are first run through **hard filters** — category, budget ceiling, dealbreaker preferences, ingredient exclusions and potency gating. Anything that fails is removed entirely.

Survivors are scored on seven weighted factors:

| Factor | Weight | What it measures |
| --- | --- | --- |
| Concerns | 0.34 | Does it treat what you came here for? |
| Type fit | 0.20 | Is it formulated for your skin or hair type? |
| Preferences | 0.14 | Vegan, fragrance-free and other nice-to-haves |
| Budget | 0.10 | Is it in the bracket you shop in? |
| Aesthetic | 0.09 | Finish, coverage and texture |
| Shade | 0.08 | Does the range serve your depth and undertone? |
| Curation | 0.05 | Editorial weight — a tiebreak, not a driver |

Concerns are weighted by the order you selected them, so your first priority counts for more than your fifth. A product that *aggravates* a stated concern loses points at half the rate a match gains them — bad enough to matter, not enough to cancel out genuine benefits.

Details and rationale: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Making it yours

The engine is a pure TypeScript module with no dependency on Next.js, React or any storage layer, and all data access goes through one interface. To point GlowMatch at your own inventory:

1. Implement `CatalogProvider` (four methods) against your store.
2. Return it from `getCatalogProvider()` in `src/lib/data/index.ts`.

Nothing in the engine, the API routes or the UI imports a concrete provider. Adding a new concern or preference is a one-line change in `src/lib/domain/taxonomy.ts` that propagates to the quiz, the API, the validator and the scoring model.

See **[docs/CATALOG.md](docs/CATALOG.md)** to add products, and **[CONTRIBUTING.md](CONTRIBUTING.md)** to contribute.

## Deploying

Any Node host works. The app is a standard Next.js 15 project with no runtime services:

```bash
npm run build && npm start
```

For Vercel, import the repo and accept the defaults — there is nothing to configure.

## Project layout

```
src/
  app/              Next.js App Router — pages and API routes
  components/       React components (UI only, no matching logic)
  lib/
    domain/         Types, taxonomy and zod schemas — the shared vocabulary
    data/           CatalogProvider interface + bundled JSON catalog
    engine/         The matching engine (pure, framework-free)
    profile/        Client-side profile persistence
tests/              Vitest suite for the engine and catalog
scripts/            Catalog validator
docs/               Architecture, API and catalog documentation
```

## About the product data

The bundled catalog is a **curated sample dataset** of 104 real products, hand-assembled to exercise the engine across every concern and category. Most skincare and haircare is unisex, as it is in real life; a subset of 18 products across all three categories is marketed specifically to men (Every Man Jack, Baxter of California, American Crew and similar grooming brands), surfaced when you select "Men" in the quiz. Attributes reflect publicly documented formulations, but:

- **Prices are approximate** and change constantly.
- **Formulations change.** Always read the current ingredient list, especially if you have allergies.
- **`curationScore` is an editorial weight**, hand-assigned to reflect how broadly recommendable a product is. It is *not* a scraped review average and does not represent aggregated customer ratings.

GlowMatch is not affiliated with, endorsed by, or sponsored by any brand listed. Product names and brands are trademarks of their respective owners, used here for identification only.

## A note on scope

GlowMatch offers **cosmetic guidance, not medical advice**. Persistent acne, rosacea, eczema, seborrhoeic dermatitis and hair loss are medical conditions — see a dermatologist or GP. Always patch-test new actives, and introduce retinoids and acids one at a time.

## Licence

MIT — see [LICENSE](LICENSE).
