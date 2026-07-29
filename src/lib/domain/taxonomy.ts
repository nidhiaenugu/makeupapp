/**
 * Controlled vocabularies for the whole app.
 *
 * Everything the engine reasons about — concerns, skin types, ingredients,
 * preferences — is declared here exactly once. Pages, API validation, the
 * catalog validator and the scoring engine all import from this file, so
 * adding a new concern or preference is a one-line change that propagates
 * everywhere instead of a find-and-replace across the codebase.
 */

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const CATEGORIES = ['skincare', 'makeup', 'hair'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  skincare: 'Skincare',
  makeup: 'Makeup',
  hair: 'Hair',
};

/** Product types, grouped by the category they belong to. */
export const PRODUCT_TYPES = {
  skincare: [
    'cleanser',
    'exfoliant',
    'toner',
    'essence',
    'serum',
    'moisturiser',
    'eye-cream',
    'face-oil',
    'mask',
    'spot-treatment',
    'sunscreen',
  ],
  makeup: [
    'primer',
    'foundation',
    'concealer',
    'tinted-moisturiser',
    'setting-powder',
    'blush',
    'bronzer',
    'highlighter',
    'eyeshadow',
    'eyeliner',
    'mascara',
    'brow',
    'lipstick',
    'lip-gloss',
    'lip-oil',
    'setting-spray',
  ],
  hair: [
    'shampoo',
    'conditioner',
    'co-wash',
    'hair-mask',
    'leave-in',
    'hair-oil',
    'styling-cream',
    'curl-gel',
    'mousse',
    'heat-protectant',
    'dry-shampoo',
    'scalp-treatment',
    'hair-serum',
  ],
} as const satisfies Record<Category, readonly string[]>;

export type ProductType = (typeof PRODUCT_TYPES)[Category][number];

export const ALL_PRODUCT_TYPES: ProductType[] = Object.values(PRODUCT_TYPES).flat() as ProductType[];

/** Reverse lookup used by validation and by the browse facets. */
export const PRODUCT_TYPE_CATEGORY: Record<string, Category> = Object.fromEntries(
  (Object.keys(PRODUCT_TYPES) as Category[]).flatMap((category) =>
    PRODUCT_TYPES[category].map((type) => [type, category]),
  ),
);

// ---------------------------------------------------------------------------
// Skin
// ---------------------------------------------------------------------------

export const SKIN_TYPES = ['dry', 'oily', 'combination', 'normal'] as const;
export type SkinType = (typeof SKIN_TYPES)[number];

export const UNDERTONES = ['cool', 'neutral', 'warm', 'olive'] as const;
export type Undertone = (typeof UNDERTONES)[number];

/**
 * Shade depth on a 1–10 scale (1 = fairest, 10 = deepest). A numeric scale
 * rather than named ranges so shade matching can measure distance.
 */
export const DEPTH_MIN = 1;
export const DEPTH_MAX = 10;

export const DEPTH_LABELS: Record<number, string> = {
  1: 'Fair (porcelain)',
  2: 'Fair',
  3: 'Light',
  4: 'Light-medium',
  5: 'Medium',
  6: 'Medium-tan',
  7: 'Tan',
  8: 'Deep-tan',
  9: 'Deep',
  10: 'Rich / deepest',
};

// ---------------------------------------------------------------------------
// Hair
// ---------------------------------------------------------------------------

export const HAIR_TYPES = ['straight', 'wavy', 'curly', 'coily'] as const;
export type HairType = (typeof HAIR_TYPES)[number];

export const HAIR_TEXTURES = ['fine', 'medium', 'coarse'] as const;
export type HairTexture = (typeof HAIR_TEXTURES)[number];

export const POROSITIES = ['low', 'medium', 'high'] as const;
export type Porosity = (typeof POROSITIES)[number];

export const SCALP_TYPES = ['dry', 'oily', 'balanced', 'flaky'] as const;
export type ScalpType = (typeof SCALP_TYPES)[number];

// ---------------------------------------------------------------------------
// Concerns
// ---------------------------------------------------------------------------

export interface ConcernDef {
  id: string;
  label: string;
  category: Category;
  /** Short explanation shown under the checkbox in the quiz. */
  hint: string;
  /**
   * Ingredients known to address this concern, best-supported first. Used
   * both for scoring and for the "why this matched" explanations.
   */
  heroIngredients: string[];
  /** Product types that typically carry the fix for this concern. */
  keyTypes: ProductType[];
}

export const CONCERNS = [
  // --- skincare -----------------------------------------------------------
  {
    id: 'acne',
    label: 'Breakouts & acne',
    category: 'skincare',
    hint: 'Spots, congestion, inflamed blemishes',
    heroIngredients: ['salicylic acid', 'benzoyl peroxide', 'niacinamide', 'azelaic acid', 'zinc'],
    keyTypes: ['cleanser', 'exfoliant', 'serum', 'spot-treatment'],
  },
  {
    id: 'blackheads',
    label: 'Blackheads & congestion',
    category: 'skincare',
    hint: 'Clogged pores around the nose and chin',
    heroIngredients: ['salicylic acid', 'clay', 'retinol', 'niacinamide'],
    keyTypes: ['cleanser', 'exfoliant', 'mask'],
  },
  {
    id: 'large-pores',
    label: 'Enlarged pores',
    category: 'skincare',
    hint: 'Visible pore texture, especially on the T-zone',
    heroIngredients: ['niacinamide', 'salicylic acid', 'retinol'],
    keyTypes: ['serum', 'exfoliant', 'primer'],
  },
  {
    id: 'oiliness',
    label: 'Excess oil & shine',
    category: 'skincare',
    hint: 'Skin looks shiny a few hours after cleansing',
    heroIngredients: ['niacinamide', 'clay', 'zinc', 'salicylic acid'],
    keyTypes: ['cleanser', 'toner', 'moisturiser', 'setting-powder'],
  },
  {
    id: 'dryness',
    label: 'Dryness & flaking',
    category: 'skincare',
    hint: 'Tight, rough or flaky skin — a lack of oil',
    heroIngredients: ['ceramides', 'squalane', 'shea butter', 'cholesterol', 'fatty acids'],
    keyTypes: ['moisturiser', 'face-oil', 'cleanser', 'mask'],
  },
  {
    id: 'dehydration',
    label: 'Dehydration',
    category: 'skincare',
    hint: 'Skin feels tight but still gets oily — a lack of water',
    heroIngredients: ['hyaluronic acid', 'glycerin', 'panthenol', 'beta-glucan', 'polyglutamic acid'],
    keyTypes: ['serum', 'essence', 'toner', 'moisturiser'],
  },
  {
    id: 'dullness',
    label: 'Dullness',
    category: 'skincare',
    hint: 'Skin lacks glow or looks tired',
    heroIngredients: ['vitamin c', 'glycolic acid', 'lactic acid', 'niacinamide'],
    keyTypes: ['serum', 'exfoliant', 'mask'],
  },
  {
    id: 'hyperpigmentation',
    label: 'Dark spots & uneven tone',
    category: 'skincare',
    hint: 'Post-acne marks, melasma or sun spots',
    heroIngredients: ['vitamin c', 'tranexamic acid', 'alpha arbutin', 'azelaic acid', 'niacinamide', 'retinol'],
    keyTypes: ['serum', 'sunscreen', 'exfoliant'],
  },
  {
    id: 'fine-lines',
    label: 'Fine lines & wrinkles',
    category: 'skincare',
    hint: 'Early signs of ageing, loss of firmness',
    heroIngredients: ['retinol', 'retinal', 'peptides', 'vitamin c', 'bakuchiol'],
    keyTypes: ['serum', 'moisturiser', 'eye-cream'],
  },
  {
    id: 'uneven-texture',
    label: 'Rough or uneven texture',
    category: 'skincare',
    hint: 'Bumpy skin, milia, general unevenness',
    heroIngredients: ['glycolic acid', 'lactic acid', 'retinol', 'pha', 'urea'],
    keyTypes: ['exfoliant', 'serum'],
  },
  {
    id: 'redness',
    label: 'Redness & sensitivity',
    category: 'skincare',
    hint: 'Skin flushes, stings or reacts easily',
    heroIngredients: ['centella asiatica', 'azelaic acid', 'niacinamide', 'panthenol', 'oat', 'madecassoside'],
    keyTypes: ['moisturiser', 'serum', 'cleanser'],
  },
  {
    id: 'dark-circles',
    label: 'Dark circles & puffiness',
    category: 'skincare',
    hint: 'Shadows or morning puffiness under the eyes',
    heroIngredients: ['caffeine', 'vitamin c', 'peptides', 'retinol'],
    keyTypes: ['eye-cream', 'concealer'],
  },
  {
    id: 'sun-protection',
    label: 'Sun protection',
    category: 'skincare',
    hint: 'The single highest-impact step for tone and ageing',
    heroIngredients: ['zinc oxide', 'titanium dioxide', 'tinosorb', 'uvinul'],
    keyTypes: ['sunscreen'],
  },

  // --- makeup -------------------------------------------------------------
  {
    id: 'shade-match',
    label: 'Finding my shade',
    category: 'makeup',
    hint: 'Complexion products that actually disappear into your skin',
    heroIngredients: [],
    keyTypes: ['foundation', 'concealer', 'tinted-moisturiser'],
  },
  {
    id: 'coverage',
    label: 'Coverage',
    category: 'makeup',
    hint: 'Evening out tone, covering marks and redness',
    heroIngredients: [],
    keyTypes: ['foundation', 'concealer'],
  },
  {
    id: 'longwear',
    label: 'Longwear',
    category: 'makeup',
    hint: 'Makeup that survives a full day or a hot climate',
    heroIngredients: [],
    keyTypes: ['primer', 'foundation', 'setting-spray', 'setting-powder'],
  },
  {
    id: 'oil-control-makeup',
    label: 'Controlling shine',
    category: 'makeup',
    hint: 'Makeup that does not slide or go patchy on oily skin',
    heroIngredients: ['silica', 'clay'],
    keyTypes: ['primer', 'setting-powder', 'foundation'],
  },
  {
    id: 'creasing',
    label: 'Creasing & settling',
    category: 'makeup',
    hint: 'Product gathering in lines around the eyes and smile',
    heroIngredients: [],
    keyTypes: ['concealer', 'primer', 'setting-powder'],
  },
  {
    id: 'natural-finish',
    label: 'A natural, skin-like finish',
    category: 'makeup',
    hint: 'Looking like skin rather than like makeup',
    heroIngredients: [],
    keyTypes: ['tinted-moisturiser', 'foundation', 'blush', 'lip-oil'],
  },
  {
    id: 'sensitive-eyes',
    label: 'Sensitive eyes',
    category: 'makeup',
    hint: 'Contact lenses or eyes that water and sting easily',
    heroIngredients: [],
    keyTypes: ['mascara', 'eyeliner', 'eyeshadow'],
  },

  // --- hair ---------------------------------------------------------------
  {
    id: 'frizz',
    label: 'Frizz',
    category: 'hair',
    hint: 'Hair swells and loses shape in humidity',
    heroIngredients: ['argan oil', 'glycerin', 'silicones', 'shea butter', 'flaxseed'],
    keyTypes: ['conditioner', 'leave-in', 'hair-oil', 'hair-serum', 'styling-cream'],
  },
  {
    id: 'hair-dryness',
    label: 'Dry, thirsty hair',
    category: 'hair',
    hint: 'Straw-like feel, drinks up product',
    heroIngredients: ['shea butter', 'coconut oil', 'glycerin', 'panthenol', 'honey'],
    keyTypes: ['hair-mask', 'conditioner', 'leave-in', 'hair-oil'],
  },
  {
    id: 'damage',
    label: 'Damage & breakage',
    category: 'hair',
    hint: 'Bleach, heat or colour damage; hair snaps easily',
    heroIngredients: ['bond builder', 'keratin', 'amino acids', 'hydrolysed protein', 'ceramides'],
    keyTypes: ['hair-mask', 'conditioner', 'leave-in', 'hair-serum'],
  },
  {
    id: 'split-ends',
    label: 'Split ends',
    category: 'hair',
    hint: 'Frayed, wispy ends',
    heroIngredients: ['hydrolysed protein', 'argan oil', 'ceramides'],
    keyTypes: ['hair-serum', 'hair-oil', 'leave-in'],
  },
  {
    id: 'flat-hair',
    label: 'Flat, limp hair',
    category: 'hair',
    hint: 'Hair falls flat and loses body quickly',
    heroIngredients: ['rice protein', 'biotin', 'panthenol'],
    keyTypes: ['mousse', 'shampoo', 'dry-shampoo'],
  },
  {
    id: 'curl-definition',
    label: 'Curl definition',
    category: 'hair',
    hint: 'Getting clumped, defined curls instead of a halo',
    heroIngredients: ['flaxseed', 'glycerin', 'shea butter', 'polyquaternium'],
    keyTypes: ['curl-gel', 'leave-in', 'styling-cream', 'co-wash'],
  },
  {
    id: 'oily-scalp',
    label: 'Oily scalp',
    category: 'hair',
    hint: 'Roots get greasy within a day',
    heroIngredients: ['salicylic acid', 'charcoal', 'tea tree', 'zinc'],
    keyTypes: ['shampoo', 'scalp-treatment', 'dry-shampoo'],
  },
  {
    id: 'dandruff',
    label: 'Dandruff & flaky scalp',
    category: 'hair',
    hint: 'Visible flakes or an itchy scalp',
    heroIngredients: ['zinc pyrithione', 'ketoconazole', 'salicylic acid', 'tea tree', 'selenium sulfide'],
    keyTypes: ['shampoo', 'scalp-treatment'],
  },
  {
    id: 'hair-thinning',
    label: 'Thinning & shedding',
    category: 'hair',
    hint: 'More hair in the brush, wider parting',
    heroIngredients: ['rosemary oil', 'caffeine', 'peptides', 'biotin', 'redensyl'],
    keyTypes: ['scalp-treatment', 'shampoo', 'hair-serum'],
  },
  {
    id: 'colour-fade',
    label: 'Colour fading',
    category: 'hair',
    hint: 'Dyed hair losing tone or brassing',
    heroIngredients: ['uv filters', 'antioxidants', 'bond builder'],
    keyTypes: ['shampoo', 'conditioner', 'hair-mask'],
  },
  {
    id: 'heat-damage',
    label: 'Heat styling',
    category: 'hair',
    hint: 'Regular blow-drying, straightening or curling',
    heroIngredients: ['silicones', 'hydrolysed protein', 'panthenol'],
    keyTypes: ['heat-protectant', 'hair-serum', 'leave-in'],
  },
] as const satisfies readonly ConcernDef[];

export type ConcernId = (typeof CONCERNS)[number]['id'];

export const CONCERN_IDS = CONCERNS.map((c) => c.id) as ConcernId[];

export const CONCERN_BY_ID: Record<string, ConcernDef> = Object.fromEntries(
  CONCERNS.map((c) => [c.id, c]),
);

export function concernsForCategory(category: Category): ConcernDef[] {
  return CONCERNS.filter((c) => c.category === category);
}

// ---------------------------------------------------------------------------
// Preferences (ethics, formulation and lifestyle filters)
// ---------------------------------------------------------------------------

export interface PreferenceDef {
  id: string;
  label: string;
  hint: string;
  /** Grouping used to lay the quiz step out. */
  group: 'ethics' | 'formulation' | 'sensitivity';
}

export const PREFERENCES = [
  { id: 'vegan', label: 'Vegan', hint: 'No animal-derived ingredients', group: 'ethics' },
  { id: 'cruelty-free', label: 'Cruelty-free', hint: 'Not tested on animals', group: 'ethics' },
  { id: 'refillable', label: 'Refillable packaging', hint: 'Lower-waste refill system', group: 'ethics' },
  { id: 'reef-safe', label: 'Reef-safer filters', hint: 'No oxybenzone or octinoxate', group: 'ethics' },
  { id: 'fragrance-free', label: 'Fragrance-free', hint: 'No added or essential-oil fragrance', group: 'sensitivity' },
  { id: 'essential-oil-free', label: 'Essential-oil free', hint: 'A common trigger for reactive skin', group: 'sensitivity' },
  { id: 'alcohol-free', label: 'No drying alcohol', hint: 'No SD/denatured alcohol high in the list', group: 'sensitivity' },
  { id: 'non-comedogenic', label: 'Non-comedogenic', hint: 'Formulated not to clog pores', group: 'sensitivity' },
  { id: 'pregnancy-safe', label: 'Pregnancy & nursing safe', hint: 'Excludes retinoids and high-dose salicylic acid', group: 'sensitivity' },
  { id: 'sulfate-free', label: 'Sulfate-free', hint: 'Gentler cleansing, kinder to colour', group: 'formulation' },
  { id: 'silicone-free', label: 'Silicone-free', hint: 'Often preferred for curly-girl routines', group: 'formulation' },
  { id: 'paraben-free', label: 'Paraben-free', hint: 'A common personal preference', group: 'formulation' },
  { id: 'oil-free', label: 'Oil-free', hint: 'Preferred by some acne-prone users', group: 'formulation' },
] as const satisfies readonly PreferenceDef[];

export type PreferenceId = (typeof PREFERENCES)[number]['id'];

export const PREFERENCE_IDS = PREFERENCES.map((p) => p.id) as PreferenceId[];

export const PREFERENCE_BY_ID: Record<string, PreferenceDef> = Object.fromEntries(
  PREFERENCES.map((p) => [p.id, p]),
);

// ---------------------------------------------------------------------------
// Finish / texture / budget
// ---------------------------------------------------------------------------

export const FINISHES = ['matte', 'natural', 'satin', 'dewy', 'radiant', 'sheer'] as const;
export type Finish = (typeof FINISHES)[number];

export const COVERAGE_LEVELS = ['sheer', 'light', 'medium', 'full'] as const;
export type Coverage = (typeof COVERAGE_LEVELS)[number];

/** How heavy a formula feels — used to match texture preference. */
export const WEIGHTS = ['light', 'medium', 'rich'] as const;
export type Weight = (typeof WEIGHTS)[number];

export const PRICE_TIERS = ['budget', 'mid', 'premium', 'luxury'] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];

export const PRICE_TIER_RANGES: Record<PriceTier, { min: number; max: number; label: string }> = {
  budget: { min: 0, max: 15, label: 'Under $15' },
  mid: { min: 15, max: 40, label: '$15 – $40' },
  premium: { min: 40, max: 80, label: '$40 – $80' },
  luxury: { min: 80, max: Number.POSITIVE_INFINITY, label: '$80+' },
};

export function priceTierFor(price: number): PriceTier {
  if (price < PRICE_TIER_RANGES.budget.max) return 'budget';
  if (price < PRICE_TIER_RANGES.mid.max) return 'mid';
  if (price < PRICE_TIER_RANGES.premium.max) return 'premium';
  return 'luxury';
}

// ---------------------------------------------------------------------------
// Experience level — drives how aggressive an actives recommendation may be
// ---------------------------------------------------------------------------

export const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

/**
 * Formula strength on a 1–3 scale. A beginner should not be handed a 0.1%
 * tretinoin-adjacent retinal as their first active, and an advanced user is
 * bored by another hyaluronic acid serum.
 */
export const POTENCY_LEVELS = [1, 2, 3] as const;
export type Potency = (typeof POTENCY_LEVELS)[number];

export const MAX_POTENCY_FOR_EXPERIENCE: Record<ExperienceLevel, Potency> = {
  beginner: 2,
  intermediate: 3,
  advanced: 3,
};

// ---------------------------------------------------------------------------
// Routine slots — used to order a generated routine
// ---------------------------------------------------------------------------

export const ROUTINE_TIMES = ['am', 'pm'] as const;
export type RoutineTime = (typeof ROUTINE_TIMES)[number];

/**
 * Canonical order products should be applied in, thinnest to thickest.
 * Lower number = applied earlier. Types not listed are appended at the end.
 */
export const ROUTINE_ORDER: Partial<Record<ProductType, number>> = {
  cleanser: 10,
  exfoliant: 20,
  toner: 30,
  essence: 40,
  serum: 50,
  'spot-treatment': 55,
  'eye-cream': 60,
  moisturiser: 70,
  'face-oil': 80,
  sunscreen: 90,
  mask: 95,
  // makeup follows skincare
  primer: 100,
  'tinted-moisturiser': 110,
  foundation: 115,
  concealer: 120,
  'setting-powder': 130,
  bronzer: 140,
  blush: 150,
  highlighter: 160,
  brow: 170,
  eyeshadow: 175,
  eyeliner: 180,
  mascara: 185,
  lipstick: 190,
  'lip-gloss': 192,
  'lip-oil': 194,
  'setting-spray': 200,
  // hair wash-day order
  'scalp-treatment': 300,
  shampoo: 310,
  'co-wash': 315,
  conditioner: 320,
  'hair-mask': 325,
  'leave-in': 330,
  'heat-protectant': 340,
  'curl-gel': 350,
  mousse: 355,
  'styling-cream': 360,
  'hair-serum': 370,
  'hair-oil': 380,
  'dry-shampoo': 390,
};

export function routineOrderFor(type: ProductType): number {
  return ROUTINE_ORDER[type] ?? 500;
}
