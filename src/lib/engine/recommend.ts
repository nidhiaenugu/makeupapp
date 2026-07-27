import { priceTierFor } from '@/lib/domain/taxonomy';
import type { ProductType } from '@/lib/domain/taxonomy';
import type {
  Product,
  ProductWithTier,
  Recommendation,
  RecommendationSet,
  UserProfile,
} from '@/lib/domain/types';
import { checkExclusion, summariseExclusions } from './filters';
import { scoreProduct } from './scoring';
import { bestShadeFor } from './shade';

export interface RecommendOptions {
  limit?: number;
  /** Restrict to a single product type. */
  type?: ProductType;
  /**
   * Cap on how many products of the same type may appear. Without this a user
   * whose top concern is acne gets six cleansers and no moisturiser. 0 disables.
   */
  maxPerType?: number;
}

const DEFAULTS = { limit: 24, maxPerType: 2 } as const;

export function withTier(product: Product): ProductWithTier {
  return { ...product, priceTier: priceTierFor(product.price) };
}

/**
 * Score the catalog against a profile and return the best matches.
 *
 * Deliberately a pure function of (products, profile, options): no I/O, no
 * framework types, no globals. That is what lets the same engine back the web
 * UI, the REST API and the test suite without adaptation.
 */
export function recommend(
  products: Product[],
  profile: UserProfile,
  options: RecommendOptions = {},
): RecommendationSet {
  const limit = options.limit ?? DEFAULTS.limit;
  const maxPerType = options.maxPerType ?? DEFAULTS.maxPerType;

  const pool = options.type ? products.filter((p) => p.type === options.type) : products;

  const exclusionReasons: string[] = [];
  const eligible: Product[] = [];

  for (const product of pool) {
    const exclusion = checkExclusion(product, profile);
    if (exclusion.excluded) {
      if (exclusion.reason) exclusionReasons.push(exclusion.reason);
      continue;
    }
    eligible.push(product);
  }

  const scored: Recommendation[] = eligible
    .map((product) => {
      const breakdown = scoreProduct(product, profile);
      return {
        product: withTier(product),
        score: breakdown.score,
        reasons: breakdown.reasons,
        addressesConcerns: breakdown.addressedConcerns,
        shadeMatch: bestShadeFor(product, profile),
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Stable, meaningful tiebreaks: curation, then cheaper, then by id so
      // results never reshuffle between identical requests.
      if (b.product.curationScore !== a.product.curationScore) {
        return b.product.curationScore - a.product.curationScore;
      }
      if (a.product.price !== b.product.price) return a.product.price - b.product.price;
      return a.product.id.localeCompare(b.product.id);
    });

  const diversified = maxPerType > 0 ? capPerType(scored, maxPerType) : scored;

  const unmatchedConcerns = profile.concerns.filter(
    (concern) => !diversified.some((rec) => rec.addressesConcerns.includes(concern)),
  );

  const notes = summariseExclusions(exclusionReasons);
  if (diversified.length === 0) {
    notes.unshift(
      'Nothing in the catalog cleared your filters. Try raising your budget or relaxing a must-have.',
    );
  }

  return {
    recommendations: diversified.slice(0, limit),
    considered: pool.length,
    eligible: eligible.length,
    unmatchedConcerns,
    notes,
  };
}

/**
 * Keep at most `max` products per type while preserving score order.
 *
 * Overflow is appended after the diversified head rather than discarded, so a
 * user who explicitly wants "more foundations" still sees them further down
 * instead of hitting a wall.
 */
function capPerType(recommendations: Recommendation[], max: number): Recommendation[] {
  const counts = new Map<string, number>();
  const head: Recommendation[] = [];
  const overflow: Recommendation[] = [];

  for (const rec of recommendations) {
    const type = rec.product.type;
    const seen = counts.get(type) ?? 0;
    if (seen < max) {
      counts.set(type, seen + 1);
      head.push(rec);
    } else {
      overflow.push(rec);
    }
  }

  return [...head, ...overflow];
}

/** Group recommendations by product type, for the sectioned results view. */
export function groupByType(recommendations: Recommendation[]): Map<string, Recommendation[]> {
  const groups = new Map<string, Recommendation[]>();
  for (const rec of recommendations) {
    const existing = groups.get(rec.product.type);
    if (existing) {
      existing.push(rec);
    } else {
      groups.set(rec.product.type, [rec]);
    }
  }
  return groups;
}
