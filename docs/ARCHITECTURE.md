# Architecture

## The one rule

`src/core/` contains no React Native imports. Nothing in it knows a UI exists.

That's what makes the recommendation engine testable in plain Jest, reusable by a future web app or server, and safe to reason about — the interesting logic has no framework entangled in it. If you find yourself wanting to `import { View } from 'react-native'` inside `src/core/`, the logic belongs in `src/ui/` or a screen instead.

Everything else follows from that split:

```
app/        screens. Read from stores, call the engine, render. No business logic.
src/core/   pure TypeScript. Types, catalog, quiz, engine, AI prompts.
src/data/   persistence interfaces + their AsyncStorage implementations.
src/store/  zustand. Glue between core and screens.
src/ui/     design system. Theme tokens and components.
server/     optional AI proxy. Deploys separately, no shared build.
```

## Data flow

```
                 ┌──────────────┐
   quiz answers  │ UserProfile  │  ← ProfileRepository (AsyncStorage)
                 └──────┬───────┘
                        │
     ┌──────────────────▼───────────────────┐
     │  recommend(products, profile, opts)  │  ← CatalogProvider
     │  filter → score → explain → diversify│
     └──────────────────┬───────────────────┘
                        │  Recommendation[]
          ┌─────────────┴─────────────┐
          ▼                           ▼
    For You / Discover          buildRoutine()
                                      │
                                findConflicts()
```

Derived data is computed on read, not stored. `recommend()` is pure and fast enough to run on every render, so there is no cache to invalidate and no way for the list and the detail page to disagree — the product screen scores that one product through the same function the list uses.

## The five seams

Each is an interface plus at least one implementation. This is where the app grows.

### 1. `CatalogProvider` — `src/core/catalog/provider.ts`

Where products come from. Every method is async specifically so a remote implementation is a drop-in.

```ts
class ApiCatalogProvider implements CatalogProvider { /* fetch from your API */ }
setCatalogProvider(new ApiCatalogProvider(url));   // in app/_layout.tsx
```

Nothing else changes. The engine takes `Product[]`; it doesn't care where they came from.

### 2. Repositories — `src/data/repository.ts`

`ProfileRepository`, `FavoritesRepository`, `SettingsRepository`, `SecretRepository`. The app never touches AsyncStorage directly. Adding accounts means writing a `RemoteProfileRepository` that calls your API and swapping it in `src/data/asyncStorage.ts`'s exported singletons.

`SecretRepository` is separate from the rest because secrets go in the device keychain (`expo-secure-store`), not in AsyncStorage.

### 3. `AiProvider` — `src/core/ai/provider.ts`

Three implementations: `NullAiProvider` (default — every method a no-op), `ClaudeAiProvider` (the user's own key, on-device), `ProxyAiProvider` (a server holds the key).

Every AI call site treats failure as normal and falls back to the deterministic engine. That is why the app is honest about AI being optional rather than degrading into an error state.

### 4. Quiz as data — `src/core/quiz/questions.ts`

A question is an object with `read` and `write` functions that are the only place it knows the shape of `UserProfile`. `app/onboarding/quiz.tsx` renders whatever the array contains, so adding a question is a data edit.

`requiresCategory` makes a question conditional — hair questions only appear for people shopping for hair.

### 5. Weights — `src/core/engine/weights.ts`

Every tunable number in the engine. Nothing else in `engine/` hard-codes a constant, so retuning behaviour is a one-file change, and `__tests__/engine.test.ts` catches it if a change breaks an invariant (weights summing to 1, scores staying in range, filters still filtering).

## Why the engine works the way it does

**Hard filters are separate from scoring.** If someone says they can't have fragrance, no score is high enough to override that. Filters run first and record the rule that fired, so the UI can say "51 products hidden by your values filters and your budget" rather than silently showing a short list.

**Signals renormalise.** A shampoo has no shade range; a foundation has no porosity. Rather than scoring those signals as zero, the engine drops inapplicable signals and renormalises the remaining weights. A partially-filled catalog entry degrades gracefully instead of ranking last.

**Scores carry their reasons.** `SignalScore` holds `reasons: string[]` alongside the number. `explain.ts` orders them by how much each moved the score, so the first line the user reads is the strongest argument. This is the whole reason the app can justify itself.

**Conflicts block, then note.** `conflicts.ts` distinguishes `block` (the routine builder swaps the product out) from `note` (both stay, the user is told how to space them). Two sunscreens is a block; two protein treatments is a note.

## Testing

`__tests__/engine.test.ts` and `__tests__/catalog.test.ts` cover the parts where a bug is invisible: that hard filters actually exclude, that scores stay in range for every product against every persona, that a low-effort user gets fewer routine steps than a high-effort one, that no PM-only product lands in a morning routine, and that all 176 catalog entries satisfy the schema.

The catalog tests exist so a contributor adding a product gets a CI failure naming their product rather than a subtly wrong recommendation in production.
