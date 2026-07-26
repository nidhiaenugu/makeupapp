# Contributing

## Setup

```bash
npm install
npx expo start
```

## Before you push

```bash
npm run typecheck
npm run lint
npm test
```

CI runs all three plus a web build.

## The two things worth knowing

**`src/core/` has no React Native imports.** That's what keeps the engine testable and reusable. If your change wants to import from `react-native` inside `src/core/`, it belongs in `src/ui/` or a screen.

**Engine changes need tests.** `src/core/engine/` is where a bug is invisible — a slightly wrong score looks like a plausible recommendation. If you change scoring, filtering, conflicts or routines, add a test that would have failed before your change.

## Common contributions

**Adding products** — see [docs/ADDING_PRODUCTS.md](docs/ADDING_PRODUCTS.md). This is the most useful thing you can do and needs no TypeScript.

**Adding a quiz question** — add an object to `QUESTIONS` in `src/core/quiz/questions.ts`. Its `read`/`write` functions are the only place it touches the profile shape; the quiz screen renders it automatically.

**Retuning recommendations** — every constant is in `src/core/engine/weights.ts`. Change it, run the tests, and check the result against a few personas in the app.

**A new catalog source** — implement `CatalogProvider` (`src/core/catalog/provider.ts`) and call `setCatalogProvider()` at startup. Nothing else changes.

## Product data standards

Be accurate rather than flattering. `allergens` in particular drives hard exclusions — an omission there means someone is shown a product they told us they can't use. If you're unsure whether a formula contains something, list it.

No affiliate links, no paid placement, no brand imagery.

## Scope

Glowmatch gives cosmetic guidance. It does not diagnose, and it shouldn't start. Copy that edges toward medical claims ("clears acne", "treats rosacea") won't be merged — "targets", "helps with", and naming the actual ingredient are the register to aim for.
