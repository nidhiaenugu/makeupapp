/**
 * Server-side copies of the prompts and the intent schema.
 *
 * These mirror `src/core/ai/prompts.ts`. They are duplicated rather than
 * imported because the proxy deploys on its own — it has no build step and no
 * access to the app's TypeScript sources. If you change one, change both;
 * `docs/DEPLOYING_PROXY.md` says so too.
 */

const CATEGORIES = ['skincare', 'makeup', 'hair'];
const PRICE_TIERS = ['budget', 'mid', 'luxury'];
const EFFORT_LEVELS = ['low', 'medium', 'high'];
const ETHICS_FLAGS = ['crueltyFree', 'vegan', 'fragranceFree', 'reefSafe'];
const ALLERGENS = [
  'fragrance',
  'essential-oils',
  'alcohol-denat',
  'sulfates',
  'silicones',
  'parabens',
  'nuts',
  'gluten',
  'soy',
  'coconut',
  'lanolin',
  'shellfish',
  'salicylates',
];
const SKIN_TYPES = ['dry', 'oily', 'combination', 'normal', 'sensitive'];
const SKIN_CONCERNS = [
  'acne',
  'blackheads',
  'large-pores',
  'dark-spots',
  'dullness',
  'fine-lines',
  'redness',
  'dryness',
  'dehydration',
  'oiliness',
  'texture',
  'dark-circles',
  'puffiness',
  'sun-damage',
];
const FINISHES = ['matte', 'natural', 'satin', 'dewy', 'radiant'];
const COVERAGE_LEVELS = ['sheer', 'light', 'medium', 'full'];
const MAKEUP_STYLES = ['natural', 'polished', 'glam', 'bold', 'editorial'];
const UNDERTONES = ['cool', 'neutral', 'warm', 'olive'];
const HAIR_TYPES = ['straight', 'wavy', 'curly', 'coily'];
const POROSITY_LEVELS = ['low', 'medium', 'high'];
const SCALP_TYPES = ['dry', 'oily', 'balanced', 'flaky', 'sensitive'];
const HAIR_CONCERNS = [
  'frizz',
  'breakage',
  'dryness',
  'color-treated',
  'thinning',
  'dandruff',
  'heat-damage',
  'lack-of-volume',
  'oily-roots',
  'split-ends',
  'tangles',
  'curl-definition',
];

const nullable = (values) => ({ type: ['string', 'null'], enum: [...values, null] });
const list = (values) => ({ type: 'array', items: { type: 'string', enum: values } });

export const INTENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    interests: list(CATEGORIES),
    budget: nullable(PRICE_TIERS),
    effort: nullable(EFFORT_LEVELS),
    ethics: list(ETHICS_FLAGS),
    avoid: list(ALLERGENS),
    skinType: nullable(SKIN_TYPES),
    skinConcerns: list(SKIN_CONCERNS),
    makeupFinish: nullable(FINISHES),
    makeupCoverage: nullable(COVERAGE_LEVELS),
    makeupStyle: nullable(MAKEUP_STYLES),
    makeupUndertone: nullable(UNDERTONES),
    hairType: nullable(HAIR_TYPES),
    hairPorosity: nullable(POROSITY_LEVELS),
    hairScalp: nullable(SCALP_TYPES),
    hairConcerns: list(HAIR_CONCERNS),
  },
  required: [
    'interests',
    'budget',
    'effort',
    'ethics',
    'avoid',
    'skinType',
    'skinConcerns',
    'makeupFinish',
    'makeupCoverage',
    'makeupStyle',
    'makeupUndertone',
    'hairType',
    'hairPorosity',
    'hairScalp',
    'hairConcerns',
  ],
};

export const INTENT_SYSTEM_PROMPT = `You convert a person's description of their beauty needs into structured data.

Only fill a field when the text gives you clear evidence for it. Use null (or an empty array) for anything the person did not mention — guessing produces bad recommendations. Never infer skin tone, undertone or ethnicity from anything other than an explicit statement.

Map plain language onto the closest allowed value: "greasy by lunchtime" is oily skin, "nothing shiny" is a matte finish, "cheap" is the budget tier, "I break out from coconut oil" belongs in avoid, "no animal testing" is crueltyFree.`;

export const EXPLAIN_SYSTEM_PROMPT = `You write one short sentence explaining why a beauty product suits a specific person.

Rules:
- Use only the facts given. Never invent ingredients, claims, prices or results.
- Address the person directly ("your oily T-zone"), never in the third person.
- One sentence, under 25 words, no emoji, no marketing superlatives.
- Never promise a result. "Salicylic acid targets the congestion you mentioned" is fine; "this will clear your acne" is not.`;

export const ADVISOR_SYSTEM_PROMPT = `You are the beauty advisor inside the Glowmatch app. You are knowledgeable, warm and direct — like a good friend who happens to work behind a counter and has no sales target.

Hard rules:
- You may only recommend products from the catalog excerpt provided in the user message. If nothing there fits, say so plainly and explain what they should look for instead. Never invent a product, brand, price or ingredient.
- Refer to products as "Brand Name" exactly as written in the excerpt.
- This is cosmetic guidance, not medical advice. If someone describes painful, spreading, bleeding or rapidly worsening symptoms, or asks about a prescription, tell them to see a dermatologist or doctor and stop there.
- Keep answers short: two or three sentences unless they ask for detail. No bullet-point walls, no emoji.
- If a routine they describe has a real problem — layering two exfoliants, a retinoid with an acid on the same night, skipping SPF while using actives — say so.`;

export function advisorContextBlock(products = [], profile = {}) {
  const catalog = products
    .slice(0, 24)
    .map(
      (product) =>
        `- ${product.brand} ${product.name} | ${product.subcategory} | $${product.priceUsd} | ${(product.keyIngredients ?? []).join(', ')} | ${(product.benefits ?? []).join('; ')}`
    )
    .join('\n');

  const about = [
    profile.skin?.type ? `skin: ${profile.skin.type}` : '',
    profile.skin?.concerns?.length ? `skin concerns: ${profile.skin.concerns.join(', ')}` : '',
    profile.hair?.type ? `hair: ${profile.hair.type}` : '',
    profile.hair?.concerns?.length ? `hair concerns: ${profile.hair.concerns.join(', ')}` : '',
    profile.budget ? `budget: ${profile.budget}` : '',
    profile.avoid?.length ? `avoiding: ${profile.avoid.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  return [
    `<about_them>${about || 'They have not filled in a profile yet.'}</about_them>`,
    '<catalog_excerpt>',
    catalog || 'No products matched their filters.',
    '</catalog_excerpt>',
  ].join('\n');
}
