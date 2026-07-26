/**
 * Closed vocabularies shared by the catalog, the quiz and the scoring engine.
 *
 * Everything here is a plain `as const` array plus a derived union type. Keeping
 * the runtime array around means the same source of truth can drive zod schemas,
 * quiz option lists and exhaustiveness checks without duplication.
 */

export const CATEGORIES = ['skincare', 'makeup', 'hair'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  skincare: 'Skincare',
  makeup: 'Makeup',
  hair: 'Hair',
};

/* -------------------------------------------------------------------------- */
/*                                  Skincare                                  */
/* -------------------------------------------------------------------------- */

export const SKIN_TYPES = ['dry', 'oily', 'combination', 'normal', 'sensitive'] as const;
export type SkinType = (typeof SKIN_TYPES)[number];

export const SKIN_CONCERNS = [
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
] as const;
export type SkinConcern = (typeof SKIN_CONCERNS)[number];

export const SKIN_CONCERN_LABELS: Record<SkinConcern, string> = {
  acne: 'Acne & breakouts',
  blackheads: 'Blackheads',
  'large-pores': 'Large pores',
  'dark-spots': 'Dark spots & hyperpigmentation',
  dullness: 'Dullness',
  'fine-lines': 'Fine lines & wrinkles',
  redness: 'Redness & irritation',
  dryness: 'Dryness',
  dehydration: 'Dehydration',
  oiliness: 'Excess oil & shine',
  texture: 'Uneven texture',
  'dark-circles': 'Dark circles',
  puffiness: 'Puffiness',
  'sun-damage': 'Sun damage',
};

/* -------------------------------------------------------------------------- */
/*                                   Makeup                                   */
/* -------------------------------------------------------------------------- */

export const UNDERTONES = ['cool', 'neutral', 'warm', 'olive'] as const;
export type Undertone = (typeof UNDERTONES)[number];

export const COVERAGE_LEVELS = ['sheer', 'light', 'medium', 'full'] as const;
export type Coverage = (typeof COVERAGE_LEVELS)[number];

export const FINISHES = ['matte', 'natural', 'satin', 'dewy', 'radiant'] as const;
export type Finish = (typeof FINISHES)[number];

export const MAKEUP_STYLES = ['natural', 'polished', 'glam', 'bold', 'editorial'] as const;
export type MakeupStyle = (typeof MAKEUP_STYLES)[number];

/** Depth of complexion on a 1 (fairest) to 10 (deepest) scale. */
export const DEPTH_MIN = 1;
export const DEPTH_MAX = 10;

/* -------------------------------------------------------------------------- */
/*                                    Hair                                    */
/* -------------------------------------------------------------------------- */

export const HAIR_TYPES = ['straight', 'wavy', 'curly', 'coily'] as const;
export type HairType = (typeof HAIR_TYPES)[number];

export const POROSITY_LEVELS = ['low', 'medium', 'high'] as const;
export type Porosity = (typeof POROSITY_LEVELS)[number];

export const HAIR_DENSITIES = ['fine', 'medium', 'thick'] as const;
export type HairDensity = (typeof HAIR_DENSITIES)[number];

export const SCALP_TYPES = ['dry', 'oily', 'balanced', 'flaky', 'sensitive'] as const;
export type ScalpType = (typeof SCALP_TYPES)[number];

export const HAIR_CONCERNS = [
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
] as const;
export type HairConcern = (typeof HAIR_CONCERNS)[number];

export const HAIR_CONCERN_LABELS: Record<HairConcern, string> = {
  frizz: 'Frizz',
  breakage: 'Breakage',
  dryness: 'Dryness',
  'color-treated': 'Colour-treated care',
  thinning: 'Thinning & shedding',
  dandruff: 'Dandruff & flakes',
  'heat-damage': 'Heat damage',
  'lack-of-volume': 'Lack of volume',
  'oily-roots': 'Oily roots',
  'split-ends': 'Split ends',
  tangles: 'Tangles',
  'curl-definition': 'Curl definition',
};

/* -------------------------------------------------------------------------- */
/*                                   Shared                                   */
/* -------------------------------------------------------------------------- */

export const PRICE_TIERS = ['budget', 'mid', 'luxury'] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];

export const PRICE_TIER_LABELS: Record<PriceTier, string> = {
  budget: 'Drugstore',
  mid: 'Mid-range',
  luxury: 'Luxury',
};

/** Upper price bound (USD) that defines each tier. */
export const PRICE_TIER_CEILING: Record<PriceTier, number> = {
  budget: 20,
  mid: 45,
  luxury: Number.POSITIVE_INFINITY,
};

export const EFFORT_LEVELS = ['low', 'medium', 'high'] as const;
export type EffortLevel = (typeof EFFORT_LEVELS)[number];

export const EFFORT_LABELS: Record<EffortLevel, string> = {
  low: 'Keep it minimal',
  medium: 'A few steps',
  high: 'The full ritual',
};

/**
 * Ingredients people most often need to avoid. Anything listed on a product is
 * a hard exclusion when the user has flagged it — never a soft score penalty.
 */
export const ALLERGENS = [
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
] as const;
export type Allergen = (typeof ALLERGENS)[number];

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  fragrance: 'Added fragrance',
  'essential-oils': 'Essential oils',
  'alcohol-denat': 'Drying alcohols',
  sulfates: 'Sulfates',
  silicones: 'Silicones',
  parabens: 'Parabens',
  nuts: 'Nut derivatives',
  gluten: 'Gluten',
  soy: 'Soy',
  coconut: 'Coconut',
  lanolin: 'Lanolin',
  shellfish: 'Shellfish-derived',
  salicylates: 'Salicylates',
};

/** Values-based filters. Each maps to a boolean flag on the product. */
export const ETHICS_FLAGS = ['crueltyFree', 'vegan', 'fragranceFree', 'reefSafe'] as const;
export type EthicsFlag = (typeof ETHICS_FLAGS)[number];

export const ETHICS_LABELS: Record<EthicsFlag, string> = {
  crueltyFree: 'Cruelty-free',
  vegan: 'Vegan',
  fragranceFree: 'Fragrance-free',
  reefSafe: 'Reef-safe',
};

export const TIME_OF_DAY = ['am', 'pm', 'both'] as const;
export type TimeOfDay = (typeof TIME_OF_DAY)[number];
