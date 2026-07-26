# Glowmatch

A beauty app that recommends makeup, skincare and hair products based on your skin, your hair, your budget and your values — and tells you exactly why each product made the list.

Built with Expo and React Native. Runs on iOS, Android and the web from one codebase.

---

## What it does

- **A short quiz** captures skin type and concerns, hair texture, porosity and scalp, tone depth and undertone, budget, how much time you want to spend, ethical must-haves and ingredients you need to avoid.
- **A transparent scoring engine** ranks 176 real products against that profile. Every recommendation shows the reasons behind its score — "Salicylic acid targets your clogged pores", "Fragrance-free, which matters for reactive skin" — plus honest warnings about what's in the bottle.
- **Hard filters are hard.** If you say no fragrance, a fragranced product never appears, no matter how well it matches otherwise. The app tells you how many products your filters hid.
- **A routine builder** turns your matches into an ordered routine — cleanse, treat, moisturise, protect — and refuses to put a retinoid and an acid exfoliant on the same night.
- **An optional AI advisor** (Claude) lets you describe what you want in your own words and answers questions about your routine. It can only recommend products that are actually in your matches. **The whole app works with this switched off**, which is the default.

Everything stays on your device. No account, no upload, no tracking.

---

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with [Expo Go](https://expo.dev/go) on your phone. Press `w` in the terminal to open it in a browser instead.

Requires Node 20+.

---

## How it's built to scale

Five interfaces, each with a swappable implementation. Every one of them exists so the obvious next version of this app doesn't require a rewrite:

| Seam | Today | Later |
|---|---|---|
| `CatalogProvider` (`src/core/catalog/provider.ts`) | Bundled JSON, 176 products | A REST API, Postgres, or a retailer feed — no screen changes |
| `ProfileRepository` / `FavoritesRepository` (`src/data/repository.ts`) | AsyncStorage on-device | Accounts and a server, by writing one more class |
| `AiProvider` (`src/core/ai/provider.ts`) | Off, or your own key | A hosted proxy so other people get AI without a key |
| Quiz questions (`src/core/quiz/questions.ts`) | Defined as data | Add a question by adding an object — no new screen |
| `src/core/**` | Zero React Native imports | Reusable by a web app, a server, or a CLI |

Tuning constants all live in one file (`src/core/engine/weights.ts`), so changing how recommendations behave is a single-file edit that the tests keep honest.

```
app/            expo-router screens — thin, no business logic
src/core/       pure TypeScript: types, catalog, quiz, engine, AI. Fully tested.
src/data/       persistence interfaces + AsyncStorage implementation
src/store/      zustand state
src/ui/         design system
server/         optional AI proxy (deployable to Vercel)
docs/           architecture, adding products, deploying the proxy
```

---

## The recommendation engine

`hard filters → weighted score → explain → diversify`

Anything containing an ingredient you avoid, failing an ethics filter, or over your budget is removed before scoring — with the rule that removed it recorded, so the app can tell you *why* something's missing.

What survives is scored on seven signals:

| Signal | Weight |
|---|---|
| Concern match | 0.30 |
| Skin / hair type match | 0.25 |
| Preference match (finish, coverage, porosity, scalp) | 0.15 |
| Shade availability | 0.10 |
| Budget fit | 0.10 |
| Effort fit | 0.05 |
| Rating and review volume | 0.05 |

Signals a product carries no data for are dropped and the remaining weights renormalised — a shampoo isn't penalised for having no shade range. Every signal keeps the reasons that produced it, which is what makes the result explainable rather than a number you have to trust.

Results are then diversified so one brand can't take every slot.

---

## The AI layer

Optional and additive. With it off, the app is fully functional and entirely local.

Three things it adds: parsing free text ("oily but dehydrated, hate anything sticky, under $30") into profile fields, rewriting match reasons into warmer copy, and a chat advisor. The advisor only ever sees products the engine already shortlisted for you, so it can't invent a product or recommend something your filters excluded.

Two ways to power it:

- **Your own key** — paste an [Anthropic API key](https://console.anthropic.com/) in the You tab. It's stored in your device keychain and sent only to Anthropic. Good for you; not something you can ship to other people.
- **A hosted proxy** — deploy `server/` and the key lives on the server instead. This is what you want if other people are going to use the app. See [docs/DEPLOYING_PROXY.md](docs/DEPLOYING_PROXY.md).

---

## Development

```bash
npm test           # engine + catalog tests
npm run typecheck
npm run lint
npm run export:web # production web build
```

Adding products: [docs/ADDING_PRODUCTS.md](docs/ADDING_PRODUCTS.md). Every entry is validated against a schema in CI, so a malformed contribution fails the build rather than breaking recommendations at runtime.

Architecture in more depth: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Shipping to the stores

`eas.json` is set up with development, preview and production profiles. You don't need it to use the app, but when you want to submit:

```bash
npm install -g eas-cli
eas login
eas build --platform ios      # or android
```

Requires an Apple Developer account ($99/yr) and/or a Google Play developer account ($25 one-off).

---

## A few honest caveats

- **This is cosmetic guidance, not medical advice.** For persistent acne, a painful or spreading rash, hair loss, or anything that's getting worse, see a dermatologist.
- **Product data is hand-curated from public knowledge.** Prices are approximate and drift; formulations change. Check the ingredient list on the packaging if you have allergies.
- **Glowmatch is not affiliated with, endorsed by, or sponsored by any brand listed.** There are no affiliate links and nothing is paid placement. Product tiles are generated from a brand colour rather than using brand imagery.

## Licence

MIT — see [LICENSE](LICENSE).
