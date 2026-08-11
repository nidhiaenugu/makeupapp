# Adding and editing products

Products live in three JSON files:

```
src/lib/data/catalog/skincare.json
src/lib/data/catalog/makeup.json
src/lib/data/catalog/hair.json
```

Add an entry, then run:

```bash
npm run validate:catalog
```

That checks structure (via the zod schema) *and* semantics — a product can't claim to be pregnancy-safe while listing a retinoid, or target and aggravate the same concern.

## A minimal product

```json
{
  "id": "brand-product-name",
  "name": "Product Name",
  "brand": "Brand",
  "category": "skincare",
  "type": "serum",
  "description": "One or two sentences written for a shopper, not a chemist. Say what it does and who it suits.",
  "price": 24,
  "size": "30ml",
  "targets": ["dehydration"],
  "keyIngredients": ["hyaluronic acid", "glycerin"],
  "attributes": ["vegan", "cruelty-free", "fragrance-free"],
  "potency": 1,
  "routineTimes": ["am", "pm"],
  "curationScore": 80,
  "tags": ["hydration"]
}
```

Array fields not listed default to `[]`.

## Field reference

| Field | Required | Notes |
| --- | --- | --- |
| `id` | ✅ | kebab-case, unique. Convention: `brand-product` |
| `name` `brand` | ✅ | As printed on the packaging |
| `category` | ✅ | `skincare` \| `makeup` \| `hair` |
| `type` | ✅ | Must belong to the category — see `PRODUCT_TYPES` in `taxonomy.ts` |
| `description` | ✅ | Min 10 chars. Honest, including drawbacks |
| `price` | ✅ | Approximate full-size USD RRP |
| `size` | | Free text, e.g. `"30ml"`, `"12 x 1.1g"` |
| `audience` | | `["women"]` \| `["men"]` \| `["women","men"]`. **Defaults to both** — see below |
| `skinTypes` | | **Empty means "suits everyone"**, not "suits nobody" |
| `hairTypes` `hairTextures` `porosities` `scalpTypes` | | Same convention |
| `targets` | ✅ for skincare/hair | Concern ids this addresses |
| `aggravates` | | Concern ids it makes worse. **Please fill this in** |
| `keyIngredients` | | Lowercase. Powers ingredient exclusion and concern explanations |
| `attributes` | | Preference ids the product satisfies |
| `finish` `coverage` `weight` `spf` | | Mostly makeup and sunscreen |
| `potency` | ✅ | 1–3, see below |
| `shades` | | Complexion products — see below |
| `routineTimes` | | `["am"]`, `["pm"]`, both, or `[]` if not a routine step |
| `curationScore` | ✅ | 0–100 editorial weight, see below |
| `tags` | | Free-form, used by search |

## The fields people get wrong

### `aggravates`

The most valuable and most-skipped field. A salicylic acid exfoliant genuinely helps blackheads *and* genuinely dries out dry skin. Recording both is what lets the engine warn users instead of silently recommending something that will make one of their stated problems worse.

If a product has a real downside, say so.

### `potency`

Gates strong actives away from beginners, and the strongest away from sensitive skin entirely.

| Level | Meaning | Examples |
| --- | --- | --- |
| 1 | Gentle, anyone can start here | Hyaluronic acid, ceramides, most cleansers |
| 2 | Moderate; needs a little care | 2% BHA, low-dose retinol, 10% niacinamide |
| 3 | Strong; experienced users only | Adapalene, retinal, ketoconazole shampoo |

Level 3 is **never** shown to beginners, or to anyone who says their skin is reactive. Rate honestly — over-rating hides useful products, under-rating puts an irritant in a beginner's routine.

### `curationScore`

A hand-assigned 0–100 signal for how broadly recommendable a product is. It is **not** a review average and must not be presented as one.

Rough calibration: 90+ genuinely exceptional and widely suitable; 80–89 excellent; 70–79 good with caveats; below 70 niche or superseded.

Its weight in scoring is only 0.05 — enough to break ties between equally good matches, not enough to override a genuine fit.

### `skinTypes` and friends — empty means "all"

`"skinTypes": []` on a lipstick means it suits everyone. It does **not** mean it suits nobody. Only list types when the formula genuinely favours some over others.

### `audience` — default to both, narrow only when it's genuinely true

Almost nothing in skincare or haircare is inherently gendered — a cleanser or a shampoo works the same regardless of who's holding it — so `audience` defaults to `["women", "men"]` and most products should just omit the field entirely. Only set it to a single gender when a brand genuinely formulates and markets a line for one audience (a dedicated men's grooming range, for instance). When a user states their gender in the quiz, products whose `audience` doesn't include it are excluded outright; leaving `audience` at its default means the product is never gated out by this filter.

### `shades`

For foundation, concealer, tinted moisturiser and similar:

```json
"shades": [
  { "name": "1N0 Porcelain", "depth": 1, "undertone": "neutral", "hex": "#f6ded0" },
  { "name": "5W1 Bronze",    "depth": 7, "undertone": "warm",    "hex": "#a66b47" }
]
```

- `depth` is 1 (fairest) to 10 (deepest).
- `undertone` is `cool` \| `neutral` \| `warm` \| `olive`.
- `hex` is an approximate swatch, `#rrggbb`.

A representative sample across the full range beats an exhaustive list of one end. The validator warns if a range spans fewer than 4 depth steps, because a narrow range usually means the deep shades were forgotten — and the engine's honesty about coverage depends on the data being honest first.

## Data standards

This is a **curated sample dataset**, and it should stay defensible:

- **Prices are approximate.** Don't chase exact current retail; a representative RRP is fine.
- **Attributes should reflect publicly documented formulations.** If you can't verify a claim like "fragrance-free", leave it off rather than guessing.
- **Don't invent review scores.** `curationScore` is explicitly editorial. Never present it as aggregated customer ratings.
- **Descriptions should be honest.** "Effective, and drying enough that twice a week is the sensible ceiling" is more useful than marketing copy.

## Adding a new concern or preference

Edit `src/lib/domain/taxonomy.ts` — one entry in `CONCERNS` or `PREFERENCES`. It automatically becomes valid in the schema, appears in the quiz, is exposed at `/api/meta`, and gets checked by the validator.

The validator will then fail until at least one product targets your new concern, which is the intended nudge: a concern users can select but nothing can treat is worse than no concern at all.

For concerns, fill in `heroIngredients` — it documents *why* an ingredient helps and is used in explanations.
