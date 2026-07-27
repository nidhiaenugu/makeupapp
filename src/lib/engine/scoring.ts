import { CONCERN_BY_ID, PREFERENCE_BY_ID, priceTierFor } from '@/lib/domain/taxonomy';
import type { MatchReason, Product, UserProfile } from '@/lib/domain/types';
import { bestShadeFor, rangeCoverage } from './shade';

/**
 * The scoring model.
 *
 * Every factor produces a 0–1 sub-score which is multiplied by its weight; the
 * weighted sum is scaled to 0–100. Weights are declared in one table so the
 * model's priorities are legible and tunable, and so tests can assert that
 * they always sum to 1.
 *
 * Design note: the engine is deliberately transparent rather than clever. Every
 * point a product earns is attributable to a named factor, which is what makes
 * the "why we picked this" explanations honest instead of decorative.
 */
export const WEIGHTS = {
  /** Does it treat what the user actually came here for? */
  concerns: 0.34,
  /** Is it formulated for their skin or hair type? */
  typeFit: 0.2,
  /** Vegan, fragrance-free, and the rest of the nice-to-haves. */
  preferences: 0.14,
  /** Is it in the price bracket they said they shop in? */
  budget: 0.1,
  /** Finish, coverage and texture preferences. */
  aesthetic: 0.09,
  /** Does the shade range serve them? */
  shade: 0.08,
  /** Editorial curation weight — a tiebreak, not a driver. */
  curation: 0.05,
} as const;

export type ScoreFactor = keyof typeof WEIGHTS;

/** Penalty applied per concern the product is known to make worse. */
const AGGRAVATION_PENALTY = 0.12;

/** Extra credit for a product that is safe for reactive skin. */
const SENSITIVE_SAFE_BONUS = 0.05;

interface FactorScore {
  score: number;
  reason?: MatchReason;
}

// ---------------------------------------------------------------------------
// Concern matching
// ---------------------------------------------------------------------------

/**
 * Concerns are ordered by importance in the quiz, so earlier entries get more
 * weight. The decay is gentle — a fourth concern still matters — but a product
 * that nails the user's top concern should beat one that nails their fifth.
 */
export function concernWeights(concerns: string[]): Map<string, number> {
  const weights = new Map<string, number>();
  concerns.forEach((concern, index) => {
    weights.set(concern, 1 / (1 + index * 0.35));
  });
  return weights;
}

export function scoreConcerns(product: Product, profile: UserProfile): FactorScore & {
  addressed: string[];
} {
  if (profile.concerns.length === 0) {
    // No stated concerns: fall back to neutral so other factors decide.
    return { score: 0.5, addressed: [] };
  }

  const weights = concernWeights(profile.concerns);
  const total = [...weights.values()].reduce((sum, w) => sum + w, 0);

  const addressed = profile.concerns.filter((c) => product.targets.includes(c));
  const matchedWeight = addressed.reduce((sum, c) => sum + (weights.get(c) ?? 0), 0);

  const aggravated = profile.concerns.filter((c) => product.aggravates.includes(c));
  const aggravatedWeight = aggravated.reduce((sum, c) => sum + (weights.get(c) ?? 0), 0);

  // Aggravation subtracts at half the rate a match adds: making one concern
  // worse should sting, but not cancel out treating two others well.
  const score = clamp(matchedWeight / total - (aggravatedWeight / total) * 0.5);

  let reason: MatchReason | undefined;
  if (addressed.length > 0) {
    const labels = addressed.map((c) => CONCERN_BY_ID[c]?.label ?? c);
    reason = {
      factor: 'concerns',
      message:
        labels.length === 1
          ? `Targets your ${labels[0]!.toLowerCase()} concern`
          : `Targets ${labels.length} of your concerns: ${labels.join(', ').toLowerCase()}`,
      impact: round(matchedWeight / total * WEIGHTS.concerns * 100),
      polarity: 'positive',
    };
  }

  return { score, reason, addressed };
}

/** Separate negative reason so trade-offs are shown, not hidden. */
export function aggravationReason(product: Product, profile: UserProfile): MatchReason | undefined {
  const aggravated = profile.concerns.filter((c) => product.aggravates.includes(c));
  if (aggravated.length === 0) return undefined;

  const labels = aggravated.map((c) => CONCERN_BY_ID[c]?.label?.toLowerCase() ?? c);
  return {
    factor: 'concerns',
    message: `Heads up: this can worsen ${labels.join(' and ')}`,
    impact: -round(aggravated.length * AGGRAVATION_PENALTY * 100),
    polarity: 'negative',
  };
}

// ---------------------------------------------------------------------------
// Skin / hair type fit
// ---------------------------------------------------------------------------

export function scoreTypeFit(product: Product, profile: UserProfile): FactorScore {
  if (product.category === 'hair') {
    return scoreHairFit(product, profile);
  }
  return scoreSkinFit(product, profile);
}

function scoreSkinFit(product: Product, profile: UserProfile): FactorScore {
  // An empty list means "suits everyone" (lipstick, mascara, eyeshadow).
  if (product.skinTypes.length === 0 || !profile.skinType) {
    return { score: 0.6 };
  }

  const fits = product.skinTypes.includes(profile.skinType);
  let score = fits ? 1 : 0.15;

  if (profile.sensitive) {
    const gentle =
      product.attributes.includes('fragrance-free') ||
      product.attributes.includes('essential-oil-free');
    score = clamp(score + (gentle ? SENSITIVE_SAFE_BONUS : -0.15));
  }

  return {
    score,
    reason: fits
      ? {
          factor: 'typeFit',
          message: `Formulated for ${profile.skinType} skin`,
          impact: round(score * WEIGHTS.typeFit * 100),
          polarity: 'positive',
        }
      : {
          factor: 'typeFit',
          message: `Aimed at ${product.skinTypes.join('/')} skin rather than ${profile.skinType}`,
          impact: -round(WEIGHTS.typeFit * 40),
          polarity: 'negative',
        },
  };
}

function scoreHairFit(product: Product, profile: UserProfile): FactorScore {
  const checks: Array<{ matched: boolean; label: string }> = [];

  if (profile.hairType && product.hairTypes.length > 0) {
    checks.push({
      matched: product.hairTypes.includes(profile.hairType),
      label: `${profile.hairType} hair`,
    });
  }
  if (profile.hairTexture && product.hairTextures.length > 0) {
    checks.push({
      matched: product.hairTextures.includes(profile.hairTexture),
      label: `${profile.hairTexture} texture`,
    });
  }
  if (profile.porosity && product.porosities.length > 0) {
    checks.push({
      matched: product.porosities.includes(profile.porosity),
      label: `${profile.porosity} porosity`,
    });
  }
  if (profile.scalpType && product.scalpTypes.length > 0) {
    checks.push({
      matched: product.scalpTypes.includes(profile.scalpType),
      label: `${profile.scalpType} scalp`,
    });
  }

  if (checks.length === 0) return { score: 0.6 };

  const matched = checks.filter((c) => c.matched);
  const score = matched.length / checks.length;

  if (matched.length === 0) {
    return {
      score: 0.1,
      reason: {
        factor: 'typeFit',
        message: 'Not specifically formulated for your hair profile',
        impact: -round(WEIGHTS.typeFit * 40),
        polarity: 'negative',
      },
    };
  }

  return {
    score,
    reason: {
      factor: 'typeFit',
      message: `Suits your ${matched.map((c) => c.label).join(', ')}`,
      impact: round(score * WEIGHTS.typeFit * 100),
      polarity: 'positive',
    },
  };
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export function scorePreferences(product: Product, profile: UserProfile): FactorScore {
  // Must-haves are already enforced as hard filters; only score the soft ones.
  const soft = profile.preferences.filter((p) => !profile.mustHave.includes(p));
  if (soft.length === 0) return { score: 0.6 };

  const met = soft.filter((p) => product.attributes.includes(p));
  const score = met.length / soft.length;

  if (met.length === 0) return { score: 0 };

  const labels = met.map((p) => PREFERENCE_BY_ID[p]?.label ?? p);
  return {
    score,
    reason: {
      factor: 'preferences',
      message: `Matches your preferences: ${labels.join(', ').toLowerCase()}`,
      impact: round(score * WEIGHTS.preferences * 100),
      polarity: 'positive',
    },
  };
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

export function scoreBudget(product: Product, profile: UserProfile): FactorScore {
  const tier = priceTierFor(product.price);

  if (!profile.budget.preferredTier) {
    // No stated preference: reward staying comfortably inside the ceiling.
    const headroom = 1 - product.price / profile.budget.max;
    return { score: clamp(0.4 + headroom * 0.6) };
  }

  const order = ['budget', 'mid', 'premium', 'luxury'];
  const distance = Math.abs(order.indexOf(tier) - order.indexOf(profile.budget.preferredTier));
  const score = clamp(1 - distance * 0.35);

  if (distance === 0) {
    return {
      score,
      reason: {
        factor: 'budget',
        message: `In your usual price bracket at $${product.price}`,
        impact: round(score * WEIGHTS.budget * 100),
        polarity: 'positive',
      },
    };
  }

  if (distance >= 2) {
    return {
      score,
      reason: {
        factor: 'budget',
        message: `Pricier than you usually shop, at $${product.price}`,
        impact: -round(WEIGHTS.budget * 30),
        polarity: 'negative',
      },
    };
  }

  return { score };
}

// ---------------------------------------------------------------------------
// Aesthetic: finish, coverage, texture
// ---------------------------------------------------------------------------

/** Finishes arranged matte → glowy, so "near misses" score better than opposites. */
const FINISH_SCALE = ['matte', 'natural', 'satin', 'sheer', 'dewy', 'radiant'];
const COVERAGE_SCALE = ['sheer', 'light', 'medium', 'full'];
const WEIGHT_SCALE = ['light', 'medium', 'rich'];

function scaleProximity(scale: string[], a?: string, b?: string): number | undefined {
  if (!a || !b) return undefined;
  const ia = scale.indexOf(a);
  const ib = scale.indexOf(b);
  if (ia === -1 || ib === -1) return undefined;
  return clamp(1 - Math.abs(ia - ib) / (scale.length - 1));
}

export function scoreAesthetic(product: Product, profile: UserProfile): FactorScore {
  const parts: number[] = [];
  const matches: string[] = [];

  const finish = scaleProximity(FINISH_SCALE, product.finish, profile.finishPreference);
  if (finish !== undefined) {
    parts.push(finish);
    if (finish === 1) matches.push(`${product.finish} finish`);
  }

  const coverage = scaleProximity(COVERAGE_SCALE, product.coverage, profile.coveragePreference);
  if (coverage !== undefined) {
    parts.push(coverage);
    if (coverage === 1) matches.push(`${product.coverage} coverage`);
  }

  const weight = scaleProximity(WEIGHT_SCALE, product.weight, profile.texturePreference);
  if (weight !== undefined) {
    parts.push(weight);
    if (weight === 1) matches.push(`${product.weight} texture`);
  }

  if (parts.length === 0) return { score: 0.6 };

  const score = parts.reduce((sum, p) => sum + p, 0) / parts.length;

  return {
    score,
    reason:
      matches.length > 0
        ? {
            factor: 'aesthetic',
            message: `Exactly the ${matches.join(' and ')} you asked for`,
            impact: round(score * WEIGHTS.aesthetic * 100),
            polarity: 'positive',
          }
        : undefined,
  };
}

// ---------------------------------------------------------------------------
// Shade
// ---------------------------------------------------------------------------

export function scoreShade(product: Product, profile: UserProfile): FactorScore {
  const match = bestShadeFor(product, profile);
  // Products without a shade range are neither rewarded nor punished.
  if (!match) return { score: 0.6 };

  const coverage = rangeCoverage(product, profile) ?? 1;
  const score = clamp(match.confidence * 0.7 + coverage * 0.3);

  if (score >= 0.85) {
    return {
      score,
      reason: {
        factor: 'shade',
        message: `${match.shade.name} looks like your shade`,
        impact: round(score * WEIGHTS.shade * 100),
        polarity: 'positive',
      },
    };
  }

  if (score < 0.45) {
    return {
      score,
      reason: {
        factor: 'shade',
        message: 'The shade range does not extend far enough for your skin',
        impact: -round(WEIGHTS.shade * 60),
        polarity: 'negative',
      },
    };
  }

  return { score };
}

// ---------------------------------------------------------------------------
// Composite
// ---------------------------------------------------------------------------

export interface ScoreBreakdown {
  score: number;
  reasons: MatchReason[];
  addressedConcerns: string[];
  /** Per-factor sub-scores, exposed for debugging and the API's verbose mode. */
  factors: Record<ScoreFactor, number>;
}

export function scoreProduct(product: Product, profile: UserProfile): ScoreBreakdown {
  const concerns = scoreConcerns(product, profile);
  const typeFit = scoreTypeFit(product, profile);
  const preferences = scorePreferences(product, profile);
  const budget = scoreBudget(product, profile);
  const aesthetic = scoreAesthetic(product, profile);
  const shade = scoreShade(product, profile);
  const curation = { score: product.curationScore / 100 } satisfies FactorScore;

  const factors: Record<ScoreFactor, number> = {
    concerns: concerns.score,
    typeFit: typeFit.score,
    preferences: preferences.score,
    budget: budget.score,
    aesthetic: aesthetic.score,
    shade: shade.score,
    curation: curation.score,
  };

  const weighted = (Object.keys(WEIGHTS) as ScoreFactor[]).reduce(
    (sum, factor) => sum + factors[factor] * WEIGHTS[factor],
    0,
  );

  const reasons = [
    concerns.reason,
    typeFit.reason,
    preferences.reason,
    budget.reason,
    aesthetic.reason,
    shade.reason,
    aggravationReason(product, profile),
  ].filter((r): r is MatchReason => r !== undefined);

  // Strongest reasons first, but always keep trade-offs visible at the end.
  reasons.sort((a, b) => {
    if (a.polarity !== b.polarity) return a.polarity === 'positive' ? -1 : 1;
    return Math.abs(b.impact) - Math.abs(a.impact);
  });

  return {
    score: Math.round(clamp(weighted) * 100),
    reasons,
    addressedConcerns: concerns.addressed,
    factors,
  };
}

// ---------------------------------------------------------------------------

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
