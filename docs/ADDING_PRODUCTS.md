# Adding products

The catalog lives in three JSON files:

```
src/core/catalog/data/skincare.json
src/core/catalog/data/makeup.json
src/core/catalog/data/hair.json
```

Add an object to the right file, run `npm test`, and you're done. The schema in `src/core/catalog/schema.ts` validates every entry and the tests fail with your product's id if something's off — so a mistake shows up as a clear CI failure, not a bad recommendation.

## A minimal entry

```json
{
  "id": "brand-product-name",
  "brand": "CeraVe",
  "name": "Foaming Facial Cleanser",
  "category": "skincare",
  "subcategory": "cleanser",
  "description": "A gel-to-foam wash that clears oil and sunscreen without leaving skin squeaky.",
  "priceUsd": 16.99,
  "priceTier": "budget",
  "size": "16 oz",
  "keyIngredients": ["ceramides", "niacinamide", "hyaluronic acid"],
  "benefits": ["Removes oil and sunscreen thoroughly", "Leaves the barrier intact"],
  "skinTypes": ["oily", "combination", "normal"],
  "skinConcerns": ["oiliness", "blackheads", "large-pores"],
  "attributes": {
    "crueltyFree": false,
    "vegan": false,
    "fragranceFree": true,
    "reefSafe": true,
    "nonComedogenic": true,
    "sulfateFree": false,
    "siliconeFree": true
  },
  "allergens": ["sulfates"],
  "effort": "low",
  "routineStep": 10,
  "timeOfDay": "both",
  "rating": 4.6,
  "reviewCount": 24800,
  "accentColor": "#0B5FA5"
}
```

## Fields that need care

**`id`** — lowercase kebab-case, unique across all three files. Convention is `brand-product`.

**`priceTier`** must match `priceUsd`: `budget` ≤ $20, `mid` ≤ $45, `luxury` above that. The schema rejects a $60 product tagged `mid`.

**`allergens`** is what's *in* the formula. This drives hard exclusions — if someone says no fragrance and you've left `fragrance` off a fragranced product, they'll be shown something they can't use. Err toward listing it.

The schema also rejects contradictions: a product can't be `fragranceFree: true` and list `fragrance` as an allergen.

**`routineStep`** orders the routine builder. Lower goes on first.

| Skincare | | Makeup | | Hair | |
|---|---|---|---|---|---|
| cleanser | 10 | primer | 10 | scalp-treatment | 5 |
| mask | 15 | foundation | 20 | shampoo | 10 |
| toner | 20 | concealer | 30 | conditioner | 20 |
| essence | 25 | powder | 40 | deep-conditioner / mask | 25 |
| exfoliant | 30 | blush | 50 | leave-in | 30 |
| serum | 40 | bronzer | 55 | heat-protectant | 40 |
| treatment | 45 | highlighter | 60 | styling-cream / mousse | 50 |
| eye-cream | 50 | eyeshadow | 65 | gel | 55 |
| moisturizer | 60 | eyeliner | 70 | hair-oil | 60 |
| face-oil | 70 | mascara | 75 | dry-shampoo | 70 |
| sunscreen | 80 | brow | 78 | | |
| | | lipstick | 90 | | |

**`timeOfDay`** — `am`, `pm` or `both`. A `pm` product is never placed in a morning routine. Retinoids and acid exfoliants should be `pm`.

**`accentColor`** — a `#rrggbb` hex used for the product tile. Pick something recognisably the brand's. We deliberately don't use brand imagery, so this is what makes a product visually identifiable.

**Category-specific targeting.** Fill in what applies; the engine skips signals a product has no data for:

- *Skincare and complexion makeup*: `skinTypes`, `skinConcerns`
- *Makeup*: `finish`, `coverage`, `shadeRange`
- *Hair*: `hairTypes`, `hairConcerns`, `porosity`, `scalpTypes`, and `attributes.proteinRich` for anything with hydrolysed proteins

**`shadeRange`** — `depthRange` is `[lightest, deepest]` on a 1–10 scale where 1 is the fairest and 10 the deepest. Be accurate: this is what tells someone whether a foundation will actually reach them.

## Valid values

The allowed values for every enum field are in `src/core/types/enums.ts` and `src/core/types/product.ts`. TypeScript won't help you inside a JSON file, so check there — or just run the tests, which name the offending field.

## Before you open a PR

```bash
npm test
```

The catalog tests check the schema, unique ids, that subcategories belong to their category, that hair products carry the targeting the engine needs, and that no entry contradicts itself.

## A note on the data

Everything here is curated from public knowledge. Prices are approximate and go stale; formulations change. This project isn't affiliated with any brand, takes no affiliate revenue, and has no paid placement — if you're adding a product, add it because it's genuinely good for the people it targets, and be honest in the `warnings`-worthy fields (`allergens`, `attributes`) rather than flattering it.
