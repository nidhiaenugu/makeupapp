# API reference

All endpoints return JSON and send permissive CORS headers, so browser clients on any origin can call them.

**Success:**

```json
{ "data": <payload>, "meta": { ... } }
```

**Error:**

```json
{ "error": { "code": "invalid_request", "message": "…", "details": [ … ] } }
```

| Code | Status | Meaning |
| --- | --- | --- |
| `invalid_request` | 400 | Body or query failed schema validation; `details` lists each field |
| `invalid_json` | 400 | Body was not valid JSON |
| `not_found` | 404 | No such product |

---

## `GET /api/meta`

Everything needed to build your own quiz UI: the full vocabulary of concerns, preferences, product types, genders and scales, plus the engine's scoring weights and catalog statistics.

```bash
curl http://localhost:3000/api/meta
```

Use this rather than hard-coding vocabularies — it stays in sync with the server automatically.

---

## `GET /api/products`

Filter, search, sort and paginate the catalog.

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `category` | `skincare` \| `makeup` \| `hair` | — | |
| `type` | product type | — | e.g. `serum`, `foundation`, `shampoo` |
| `brand` | string | — | Exact match, case-insensitive |
| `concern` | concern id | — | Products targeting this concern |
| `attribute` | preference id | — | e.g. `vegan`, `fragrance-free` |
| `minPrice` / `maxPrice` | number | — | USD |
| `search` | string | — | Matches name, brand, type, description, ingredients, tags |
| `sort` | `curation` \| `price-asc` \| `price-desc` \| `name` | `curation` | |
| `page` | integer ≥ 1 | `1` | |
| `perPage` | integer 1–100 | `24` | |

```bash
curl 'http://localhost:3000/api/products?category=skincare&concern=acne&maxPrice=30&sort=price-asc'
```

`meta` contains `total`, `page`, `perPage` and `totalPages`.

---

## `GET /api/products/:id`

A single product, with `priceTier` resolved. Returns `404` with `not_found` if the id is unknown.

```bash
curl http://localhost:3000/api/products/paulas-choice-bha
```

---

## `POST /api/recommendations`

Score the catalog against a profile. `POST` rather than `GET` because a profile is a nested object with a dozen fields.

**Body**

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `profile` | Profile | *required* | See below |
| `limit` | 1–100 | `24` | Maximum recommendations returned |
| `type` | product type | — | Restrict to one type, e.g. only foundations |
| `maxPerType` | 0–20 | `2` | Cap per product type so results stay varied; `0` disables |

**Profile**

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `categories` | array of category | *required, min 1* | |
| `gender` | `women` \| `men` | — | Excludes products marketed only to the other audience; unisex products (the default for most of the catalog) always pass |
| `skinType` | `dry` \| `oily` \| `combination` \| `normal` | — | |
| `undertone` | `cool` \| `neutral` \| `warm` \| `olive` | — | Shade matching |
| `depth` | integer 1–10 | — | 1 = fairest, 10 = deepest |
| `sensitive` | boolean | `false` | Excludes the strongest actives outright |
| `hairType` | `straight` \| `wavy` \| `curly` \| `coily` | — | |
| `hairTexture` | `fine` \| `medium` \| `coarse` | — | |
| `porosity` | `low` \| `medium` \| `high` | — | |
| `scalpType` | `dry` \| `oily` \| `balanced` \| `flaky` | — | |
| `colourTreated` | boolean | `false` | |
| `concerns` | array of concern id | `[]` | **Order matters** — earlier entries weigh more |
| `preferences` | array of preference id | `[]` | Soft: adds score |
| `mustHave` | array of preference id | `[]` | Hard: failing products are removed |
| `avoidIngredients` | array of string | `[]` | Case-insensitive substring match |
| `budget.max` | number | `1000` | Hard ceiling per product |
| `budget.preferredTier` | `budget` \| `mid` \| `premium` \| `luxury` | — | Scored, not enforced |
| `finishPreference` | finish | — | |
| `coveragePreference` | coverage | — | |
| `texturePreference` | `light` \| `medium` \| `rich` | — | |
| `experience` | `beginner` \| `intermediate` \| `advanced` | `beginner` | Gates strong actives |

Every optional field genuinely means "unknown" and is scored neutrally — a partial profile still returns sensible results.

**Response**

`data` is an array of recommendations:

```json
{
  "product": { "id": "…", "priceTier": "mid", … },
  "score": 87,
  "reasons": [
    {
      "factor": "concerns",
      "message": "Targets 2 of your concerns: breakouts & acne, enlarged pores",
      "impact": 28.4,
      "polarity": "positive"
    }
  ],
  "addressesConcerns": ["acne", "large-pores"],
  "shadeMatch": { "shade": { … }, "confidence": 0.93 }
}
```

`meta` contains:

| Field | Meaning |
| --- | --- |
| `considered` | Products examined before filtering |
| `eligible` | Products that passed the hard filters |
| `returned` | Products in `data` |
| `unmatchedConcerns` | Concerns nothing in the results addresses |
| `notes` | Human-readable explanations of what filters removed |

`reasons` with `polarity: "negative"` are trade-offs — a product that helps one concern but aggravates another, or sits outside your usual price bracket.

---

## `POST /api/routine`

Build an ordered routine.

**Body:** `{ "profile": Profile, "category": "skincare" | "makeup" | "hair" }`

Skincare returns two routines (`am` and `pm`); makeup and hair return one. Each routine has ordered `steps`, each with a `type`, its winning `recommendation`, and `guidance` on how to use it.

```bash
curl -X POST http://localhost:3000/api/routine \
  -H 'Content-Type: application/json' \
  -d '{"profile":{"categories":["hair"],"hairType":"curly","concerns":["frizz"]},"category":"hair"}'
```

---

## Using the engine directly

If you're working in TypeScript, skip HTTP entirely — the engine is a pure module:

```ts
import { recommend, buildRoutine } from '@/lib/engine';
import { getCatalogProvider } from '@/lib/data';

const products = await getCatalogProvider().all();
const { recommendations } = recommend(products, profile, { limit: 10 });
```

`recommend(products, profile, options)` has no I/O and no framework dependency — pass any `Product[]`, including your own.
