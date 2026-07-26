import type { Category } from '../types/enums';
import type { Product, Subcategory } from '../types/product';
import type { UserProfile } from '../types/profile';
import type { Recommendation, RecommendationResult } from '../types/recommendation';
import { buildReasons, buildWarnings, fallbackReason } from './explain';
import { applyHardFilters } from './filters';
import { scoreProduct } from './score';
import { MAX_PER_BRAND, MAX_PER_SUBCATEGORY, MIN_SCORE_THRESHOLD } from './weights';

export interface RecommendOptions {
  /** Restrict to one category (the For You screen scores each tab separately). */
  category?: Category;
  /** Restrict to one slot, used by the routine builder. */
  subcategories?: Subcategory[];
  limit?: number;
  /** Skip brand/subcategory spreading — the routine builder wants raw ranking. */
  diversify?: boolean;
  /** Products to leave out (already used elsewhere in a routine). */
  excludeIds?: string[];
  /** Drop results below the quality threshold. Off when we must return something. */
  applyThreshold?: boolean;
}

/**
 * The single entry point everything else calls: filter, score, explain, rank.
 *
 * Deliberately synchronous and pure — given the same products and profile it
 * always produces the same result, which is what makes it testable and what
 * lets the UI re-run it on every keystroke without a loading state.
 */
export function recommend(
  products: Product[],
  profile: UserProfile,
  options: RecommendOptions = {}
): RecommendationResult {
  const {
    category,
    subcategories,
    limit = 20,
    diversify = true,
    excludeIds = [],
    applyThreshold = true,
  } = options;

  const excluded = new Set(excludeIds);
  const pool = products.filter((product) => {
    if (excluded.has(product.id)) return false;
    if (category && product.category !== category) return false;
    if (subcategories && !subcategories.includes(product.subcategory)) return false;
    return true;
  });

  const filtered = applyHardFilters(pool, profile);

  const scored: Recommendation[] = filtered.kept.map((product) => {
    const breakdown = scoreProduct(product, profile);
    const reasons = buildReasons(breakdown.signals);
    return {
      product,
      score: breakdown.total,
      signals: breakdown.signals,
      reasons: reasons.length > 0 ? reasons : [fallbackReason(product)],
      warnings: buildWarnings(product, profile, breakdown.modifiers),
    };
  });

  scored.sort(compareRecommendations);

  const qualified = applyThreshold
    ? scored.filter((recommendation) => recommendation.score >= MIN_SCORE_THRESHOLD)
    : scored;

  // If the threshold left us with nothing useful, show the best of a bad lot
  // rather than an empty screen.
  const ranked = qualified.length >= 3 ? qualified : scored;

  return {
    recommendations: (diversify ? diversifyResults(ranked) : ranked).slice(0, limit),
    excluded: filtered.excluded,
    consideredCount: pool.length,
  };
}

/**
 * Stops one brand or one product type from taking every slot.
 *
 * Over-quota items aren't discarded — they're pushed to the end, so a short
 * catalog still fills the page.
 */
export function diversifyResults(recommendations: Recommendation[]): Recommendation[] {
  const brandCounts = new Map<string, number>();
  const subcategoryCounts = new Map<string, number>();
  const primary: Recommendation[] = [];
  const overflow: Recommendation[] = [];

  for (const recommendation of recommendations) {
    const { brand, subcategory } = recommendation.product;
    const brandCount = brandCounts.get(brand) ?? 0;
    const subcategoryCount = subcategoryCounts.get(subcategory) ?? 0;

    if (brandCount >= MAX_PER_BRAND || subcategoryCount >= MAX_PER_SUBCATEGORY) {
      overflow.push(recommendation);
      continue;
    }

    brandCounts.set(brand, brandCount + 1);
    subcategoryCounts.set(subcategory, subcategoryCount + 1);
    primary.push(recommendation);
  }

  return [...primary, ...overflow];
}

/** Highest score first; ties broken by rating, then review volume, then id. */
function compareRecommendations(a: Recommendation, b: Recommendation): number {
  if (b.score !== a.score) return b.score - a.score;
  if (b.product.rating !== a.product.rating) return b.product.rating - a.product.rating;
  if (b.product.reviewCount !== a.product.reviewCount) {
    return b.product.reviewCount - a.product.reviewCount;
  }
  return a.product.id.localeCompare(b.product.id);
}
