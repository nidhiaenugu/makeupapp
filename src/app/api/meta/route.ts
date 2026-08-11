import { getCatalogProvider } from '@/lib/data';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CONCERNS,
  COVERAGE_LEVELS,
  EXPERIENCE_LEVELS,
  FINISHES,
  GENDERS,
  GENDER_LABELS,
  HAIR_TEXTURES,
  HAIR_TYPES,
  POROSITIES,
  PREFERENCES,
  PRICE_TIERS,
  PRICE_TIER_RANGES,
  PRODUCT_TYPES,
  SCALP_TYPES,
  SKIN_TYPES,
  UNDERTONES,
  WEIGHTS,
} from '@/lib/domain/taxonomy';
import { WEIGHTS as SCORING_WEIGHTS } from '@/lib/engine';
import { ok, preflight } from '@/lib/api/respond';

/**
 * GET /api/meta
 *
 * Everything a client needs to build its own quiz UI: the full vocabulary of
 * concerns, preferences and product types, plus the engine's scoring weights
 * so third parties can see exactly how matches are ranked.
 */
export async function GET() {
  const provider = getCatalogProvider();
  const [products, brands] = await Promise.all([provider.all(), provider.brands()]);

  return ok({
    categories: CATEGORIES.map((id) => ({ id, label: CATEGORY_LABELS[id] })),
    genders: GENDERS.map((id) => ({ id, label: GENDER_LABELS[id] })),
    productTypes: PRODUCT_TYPES,
    concerns: CONCERNS,
    preferences: PREFERENCES,
    skinTypes: SKIN_TYPES,
    undertones: UNDERTONES,
    hairTypes: HAIR_TYPES,
    hairTextures: HAIR_TEXTURES,
    porosities: POROSITIES,
    scalpTypes: SCALP_TYPES,
    finishes: FINISHES,
    coverageLevels: COVERAGE_LEVELS,
    weights: WEIGHTS,
    experienceLevels: EXPERIENCE_LEVELS,
    priceTiers: PRICE_TIERS.map((id) => ({ id, ...PRICE_TIER_RANGES[id] })),
    scoringWeights: SCORING_WEIGHTS,
    catalog: {
      totalProducts: products.length,
      brands,
      byCategory: CATEGORIES.map((category) => ({
        category,
        count: products.filter((p) => p.category === category).length,
      })),
    },
  });
}

export function OPTIONS() {
  return preflight();
}
