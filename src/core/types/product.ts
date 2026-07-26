import type {
  Allergen,
  Category,
  Coverage,
  EffortLevel,
  Finish,
  HairConcern,
  HairType,
  Porosity,
  PriceTier,
  ScalpType,
  SkinConcern,
  SkinType,
  TimeOfDay,
  Undertone,
} from './enums';

/**
 * Subcategories double as routine slots: `routine.ts` uses them to order steps
 * and to guarantee a routine never contains two products from the same slot.
 */
export const SKINCARE_SUBCATEGORIES = [
  'cleanser',
  'toner',
  'essence',
  'exfoliant',
  'serum',
  'treatment',
  'eye-cream',
  'moisturizer',
  'face-oil',
  'sunscreen',
  'mask',
] as const;
export type SkincareSubcategory = (typeof SKINCARE_SUBCATEGORIES)[number];

export const MAKEUP_SUBCATEGORIES = [
  'primer',
  'foundation',
  'concealer',
  'powder',
  'blush',
  'bronzer',
  'highlighter',
  'eyeshadow',
  'eyeliner',
  'mascara',
  'brow',
  'lipstick',
  'lip-gloss',
  'lip-liner',
  'setting-spray',
] as const;
export type MakeupSubcategory = (typeof MAKEUP_SUBCATEGORIES)[number];

export const HAIR_SUBCATEGORIES = [
  'shampoo',
  'conditioner',
  'deep-conditioner',
  'scalp-treatment',
  'leave-in',
  'styling-cream',
  'gel',
  'mousse',
  'hair-oil',
  'heat-protectant',
  'dry-shampoo',
  'hair-mask',
] as const;
export type HairSubcategory = (typeof HAIR_SUBCATEGORIES)[number];

export type Subcategory = SkincareSubcategory | MakeupSubcategory | HairSubcategory;

export const ALL_SUBCATEGORIES = [
  ...SKINCARE_SUBCATEGORIES,
  ...MAKEUP_SUBCATEGORIES,
  ...HAIR_SUBCATEGORIES,
] as const;

/** Which subcategories belong to which category — used for validation and filtering. */
export const SUBCATEGORIES_BY_CATEGORY: Record<Category, readonly Subcategory[]> = {
  skincare: SKINCARE_SUBCATEGORIES,
  makeup: MAKEUP_SUBCATEGORIES,
  hair: HAIR_SUBCATEGORIES,
};

export interface ShadeRange {
  /** Number of shades the product is sold in. */
  count: number;
  /** Inclusive [lightest, deepest] on the 1-10 depth scale. */
  depthRange: [number, number];
  /** Undertone families the range actually covers. */
  undertones: Undertone[];
}

export interface ProductAttributes {
  crueltyFree: boolean;
  vegan: boolean;
  fragranceFree: boolean;
  reefSafe: boolean;
  nonComedogenic: boolean;
  sulfateFree: boolean;
  siliconeFree: boolean;
  /** Hair products only: contains hydrolysed proteins (relevant to protein overload). */
  proteinRich?: boolean;
}

/**
 * A single catalog entry.
 *
 * Targeting fields are optional because they are category-specific: a shampoo
 * has no `skinTypes`, a foundation has no `porosity`. The scoring engine simply
 * skips signals a product carries no data for, so partially-filled entries
 * degrade gracefully instead of scoring zero.
 */
export interface Product {
  id: string;
  brand: string;
  name: string;
  category: Category;
  subcategory: Subcategory;
  description: string;
  priceUsd: number;
  priceTier: PriceTier;
  size?: string;

  keyIngredients: string[];
  benefits: string[];

  /** Skincare / complexion-makeup targeting. */
  skinTypes?: SkinType[];
  skinConcerns?: SkinConcern[];

  /** Makeup targeting. */
  finish?: Finish;
  coverage?: Coverage;
  shadeRange?: ShadeRange;

  /** Hair targeting. */
  hairTypes?: HairType[];
  hairConcerns?: HairConcern[];
  porosity?: Porosity[];
  scalpTypes?: ScalpType[];

  attributes: ProductAttributes;
  /** Allergens present in the formula. Any overlap with the user's list excludes it. */
  allergens: Allergen[];

  effort: EffortLevel;
  /** Lower numbers go on first. Used to order routines. */
  routineStep: number;
  timeOfDay: TimeOfDay;

  rating: number;
  reviewCount: number;
  /** Brand-derived accent colour used for the product tile gradient. */
  accentColor: string;
}
