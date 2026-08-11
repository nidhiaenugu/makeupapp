import { z } from 'zod';
import {
  ALL_PRODUCT_TYPES,
  CATEGORIES,
  CONCERN_IDS,
  COVERAGE_LEVELS,
  DEFAULT_AUDIENCE,
  DEPTH_MAX,
  DEPTH_MIN,
  EXPERIENCE_LEVELS,
  FINISHES,
  GENDERS,
  HAIR_TEXTURES,
  HAIR_TYPES,
  POROSITIES,
  PREFERENCE_IDS,
  PRICE_TIERS,
  PRODUCT_TYPE_CATEGORY,
  ROUTINE_TIMES,
  SCALP_TYPES,
  SKIN_TYPES,
  UNDERTONES,
  WEIGHTS,
} from './taxonomy';

/** zod's enum() needs a non-empty tuple; these helpers keep the casts local. */
const enumOf = <T extends string>(values: readonly T[]) =>
  z.enum(values as unknown as [T, ...T[]]);

export const categorySchema = enumOf(CATEGORIES);
export const genderSchema = enumOf(GENDERS);
export const productTypeSchema = enumOf(ALL_PRODUCT_TYPES);
export const skinTypeSchema = enumOf(SKIN_TYPES);
export const undertoneSchema = enumOf(UNDERTONES);
export const hairTypeSchema = enumOf(HAIR_TYPES);
export const hairTextureSchema = enumOf(HAIR_TEXTURES);
export const porositySchema = enumOf(POROSITIES);
export const scalpTypeSchema = enumOf(SCALP_TYPES);
export const finishSchema = enumOf(FINISHES);
export const coverageSchema = enumOf(COVERAGE_LEVELS);
export const weightSchema = enumOf(WEIGHTS);
export const priceTierSchema = enumOf(PRICE_TIERS);
export const experienceSchema = enumOf(EXPERIENCE_LEVELS);
export const preferenceSchema = enumOf(PREFERENCE_IDS);
export const concernSchema = enumOf(CONCERN_IDS);
export const routineTimeSchema = enumOf(ROUTINE_TIMES);
export const potencySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const depthSchema = z.number().int().min(DEPTH_MIN).max(DEPTH_MAX);

// ---------------------------------------------------------------------------
// Product
// ---------------------------------------------------------------------------

export const shadeSchema = z.object({
  name: z.string().min(1),
  depth: depthSchema,
  undertone: undertoneSchema,
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'hex must look like #rrggbb'),
});

export const productSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'id must be kebab-case'),
    name: z.string().min(1),
    brand: z.string().min(1),
    category: categorySchema,
    type: productTypeSchema,
    description: z.string().min(10),
    price: z.number().positive(),
    size: z.string().optional(),
    audience: z.array(genderSchema).min(1).default(() => [...DEFAULT_AUDIENCE]),
    skinTypes: z.array(skinTypeSchema).default([]),
    hairTypes: z.array(hairTypeSchema).default([]),
    hairTextures: z.array(hairTextureSchema).default([]),
    porosities: z.array(porositySchema).default([]),
    scalpTypes: z.array(scalpTypeSchema).default([]),
    targets: z.array(concernSchema).default([]),
    aggravates: z.array(concernSchema).default([]),
    keyIngredients: z.array(z.string()).default([]),
    attributes: z.array(preferenceSchema).default([]),
    finish: finishSchema.optional(),
    coverage: coverageSchema.optional(),
    weight: weightSchema.optional(),
    spf: z.number().int().min(0).max(110).optional(),
    potency: potencySchema.default(1),
    shades: z.array(shadeSchema).optional(),
    routineTimes: z.array(routineTimeSchema).default([]),
    curationScore: z.number().min(0).max(100),
    tags: z.array(z.string()).default([]),
  })
  // A product's declared type has to belong to its declared category,
  // otherwise category filtering silently drops it.
  .refine((p) => PRODUCT_TYPE_CATEGORY[p.type] === p.category, {
    message: 'product type does not belong to the declared category',
    path: ['type'],
  })
  // A concern the product both targets and aggravates is a data-entry bug.
  .refine((p) => !p.targets.some((t) => p.aggravates.includes(t)), {
    message: 'a product cannot both target and aggravate the same concern',
    path: ['aggravates'],
  });

export const catalogSchema = z.array(productSchema);

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

export const userProfileSchema = z.object({
  categories: z.array(categorySchema).min(1, 'pick at least one category'),
  gender: genderSchema.optional(),
  skinType: skinTypeSchema.optional(),
  undertone: undertoneSchema.optional(),
  depth: depthSchema.optional(),
  sensitive: z.boolean().default(false),
  hairType: hairTypeSchema.optional(),
  hairTexture: hairTextureSchema.optional(),
  porosity: porositySchema.optional(),
  scalpType: scalpTypeSchema.optional(),
  colourTreated: z.boolean().default(false),
  concerns: z.array(concernSchema).default([]),
  preferences: z.array(preferenceSchema).default([]),
  mustHave: z.array(preferenceSchema).default([]),
  avoidIngredients: z.array(z.string()).default([]),
  budget: z
    .object({
      max: z.number().positive().default(1000),
      preferredTier: priceTierSchema.optional(),
    })
    .default({ max: 1000 }),
  finishPreference: finishSchema.optional(),
  coveragePreference: coverageSchema.optional(),
  texturePreference: weightSchema.optional(),
  experience: experienceSchema.default('beginner'),
});

// ---------------------------------------------------------------------------
// API request shapes
// ---------------------------------------------------------------------------

export const recommendationRequestSchema = z.object({
  profile: userProfileSchema,
  /** Cap on how many recommendations to return. */
  limit: z.number().int().min(1).max(100).default(24),
  /** Restrict to a single product type, e.g. only foundations. */
  type: productTypeSchema.optional(),
  /**
   * Return at most this many products of the same type, so a result set is
   * not eight cleansers. Set to 0 to disable.
   */
  maxPerType: z.number().int().min(0).max(20).default(2),
});

export const routineRequestSchema = z.object({
  profile: userProfileSchema,
  category: categorySchema.default('skincare'),
});

export const productQuerySchema = z.object({
  category: categorySchema.optional(),
  type: productTypeSchema.optional(),
  brand: z.string().optional(),
  concern: concernSchema.optional(),
  attribute: preferenceSchema.optional(),
  maxPrice: z.coerce.number().positive().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  search: z.string().optional(),
  sort: z.enum(['curation', 'price-asc', 'price-desc', 'name']).default('curation'),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(24),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;
export type RoutineRequest = z.infer<typeof routineRequestSchema>;
