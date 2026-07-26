import { z } from 'zod';

import {
  ALLERGENS,
  CATEGORIES,
  COVERAGE_LEVELS,
  DEPTH_MAX,
  DEPTH_MIN,
  EFFORT_LEVELS,
  FINISHES,
  HAIR_CONCERNS,
  HAIR_TYPES,
  POROSITY_LEVELS,
  PRICE_TIERS,
  PRICE_TIER_CEILING,
  SCALP_TYPES,
  SKIN_CONCERNS,
  SKIN_TYPES,
  TIME_OF_DAY,
  UNDERTONES,
} from '../types/enums';
import { ALL_SUBCATEGORIES, SUBCATEGORIES_BY_CATEGORY } from '../types/product';
import type { Product } from '../types/product';

const shadeRangeSchema = z.object({
  count: z.number().int().positive(),
  depthRange: z.tuple([
    z.number().min(DEPTH_MIN).max(DEPTH_MAX),
    z.number().min(DEPTH_MIN).max(DEPTH_MAX),
  ]),
  undertones: z.array(z.enum(UNDERTONES)).min(1),
});

const attributesSchema = z.object({
  crueltyFree: z.boolean(),
  vegan: z.boolean(),
  fragranceFree: z.boolean(),
  reefSafe: z.boolean(),
  nonComedogenic: z.boolean(),
  sulfateFree: z.boolean(),
  siliconeFree: z.boolean(),
  proteinRich: z.boolean().optional(),
});

/**
 * The single source of truth for what a valid catalog entry looks like.
 * `catalog.test.ts` runs every bundled product through this, so a malformed
 * contribution fails CI rather than silently breaking recommendations.
 */
export const productSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, 'ids must be lowercase kebab-case'),
    brand: z.string().min(1),
    name: z.string().min(1),
    category: z.enum(CATEGORIES),
    subcategory: z.enum(ALL_SUBCATEGORIES),
    description: z.string().min(10),
    priceUsd: z.number().positive(),
    priceTier: z.enum(PRICE_TIERS),
    size: z.string().optional(),

    keyIngredients: z.array(z.string().min(1)).min(1),
    benefits: z.array(z.string().min(1)).min(1),

    skinTypes: z.array(z.enum(SKIN_TYPES)).optional(),
    skinConcerns: z.array(z.enum(SKIN_CONCERNS)).optional(),

    finish: z.enum(FINISHES).optional(),
    coverage: z.enum(COVERAGE_LEVELS).optional(),
    shadeRange: shadeRangeSchema.optional(),

    hairTypes: z.array(z.enum(HAIR_TYPES)).optional(),
    hairConcerns: z.array(z.enum(HAIR_CONCERNS)).optional(),
    porosity: z.array(z.enum(POROSITY_LEVELS)).optional(),
    scalpTypes: z.array(z.enum(SCALP_TYPES)).optional(),

    attributes: attributesSchema,
    allergens: z.array(z.enum(ALLERGENS)),

    effort: z.enum(EFFORT_LEVELS),
    routineStep: z.number().int().min(0).max(100),
    timeOfDay: z.enum(TIME_OF_DAY),

    rating: z.number().min(0).max(5),
    reviewCount: z.number().int().min(0),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'accentColor must be a #rrggbb hex string'),
  })
  .superRefine((product, ctx) => {
    const allowed = SUBCATEGORIES_BY_CATEGORY[product.category];
    if (!allowed.includes(product.subcategory)) {
      ctx.addIssue({
        code: 'custom',
        path: ['subcategory'],
        message: `"${product.subcategory}" is not a valid subcategory for ${product.category}`,
      });
    }

    if (product.shadeRange) {
      const [light, deep] = product.shadeRange.depthRange;
      if (light > deep) {
        ctx.addIssue({
          code: 'custom',
          path: ['shadeRange', 'depthRange'],
          message: 'depthRange must be ordered [lightest, deepest]',
        });
      }
    }

    // A product tagged fragrance-free must not also declare fragrance as an
    // allergen — that contradiction would let a filtered product slip through.
    if (product.attributes.fragranceFree && product.allergens.includes('fragrance')) {
      ctx.addIssue({
        code: 'custom',
        path: ['attributes', 'fragranceFree'],
        message: 'a fragrance-free product cannot list "fragrance" as an allergen',
      });
    }

    if (product.attributes.sulfateFree && product.allergens.includes('sulfates')) {
      ctx.addIssue({
        code: 'custom',
        path: ['attributes', 'sulfateFree'],
        message: 'a sulfate-free product cannot list "sulfates" as an allergen',
      });
    }

    if (product.priceUsd > PRICE_TIER_CEILING[product.priceTier]) {
      ctx.addIssue({
        code: 'custom',
        path: ['priceTier'],
        message: `$${product.priceUsd} exceeds the ceiling for the "${product.priceTier}" tier`,
      });
    }
  });

export const catalogSchema = z.array(productSchema);

/**
 * Validates raw JSON into typed products, throwing with a readable message that
 * names the offending product rather than an anonymous array index.
 */
export function parseCatalog(raw: unknown, source: string): Product[] {
  const result = catalogSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 5)
      .map((issue) => {
        const index = issue.path[0];
        const entry =
          typeof index === 'number' && Array.isArray(raw)
            ? ((raw[index] as { id?: string } | undefined)?.id ?? `index ${index}`)
            : 'unknown';
        return `  • [${entry}] ${issue.path.slice(1).join('.')}: ${issue.message}`;
      })
      .join('\n');
    throw new Error(
      `Invalid catalog data in ${source} (${result.error.issues.length} issue(s)):\n${details}`
    );
  }
  return result.data as Product[];
}
