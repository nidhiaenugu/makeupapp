import {
  COVERAGE_LEVELS,
  EFFORT_LEVELS,
  FINISHES,
  PRICE_TIER_CEILING,
  SKIN_CONCERN_LABELS,
  HAIR_CONCERN_LABELS,
} from '../types/enums';
import type { Category } from '../types/enums';
import type { Product } from '../types/product';
import type { UserProfile } from '../types/profile';
import type { SignalKey, SignalScore } from '../types/recommendation';
import {
  BUDGET_SWEET_SPOT,
  CONCERN_MATCH_BONUS,
  EFFORT_DISTANCE_SCORES,
  NEUTRAL_SIGNAL_VALUE,
  SENSITIVE_ACTIVE_PENALTY,
  SENSITIVE_FRAGRANCE_PENALTY,
  SENSITIVITY_FRAGRANCE_THRESHOLD,
  SHADE_EDGE,
  SHADE_FULL_COVER,
  SHADE_INCLUSIVE_COUNT,
  SHADE_MISS,
  SHADE_UNDERTONE_BONUS,
  SIGNAL_WEIGHTS,
  SOCIAL_RATING_FLOOR,
  SOCIAL_REVIEW_SATURATION,
  SPF_PRIORITY_BOOST,
  TYPE_EXACT_MATCH,
  TYPE_MISMATCH,
  TYPE_UNIVERSAL,
} from './weights';

/** Actives strong enough that very reactive skin should approach them slowly. */
const STRONG_ACTIVES = [
  'retinol',
  'retinal',
  'retinaldehyde',
  'tretinoin',
  'adapalene',
  'glycolic acid',
  'benzoyl peroxide',
  'l-ascorbic acid',
  'lactic acid',
];

export interface ScoreBreakdown {
  /** 0-100. */
  total: number;
  signals: SignalScore[];
  /** Multipliers applied after the weighted sum, with an explanation each. */
  modifiers: { label: string; factor: number }[];
}

/**
 * Scores one product against one profile.
 *
 * Signals the product carries no data for are dropped and the remaining weights
 * renormalised, so a shampoo isn't punished for having no shade range. Every
 * signal keeps the human-readable reasons that produced its value — that's what
 * makes the result explainable instead of an opaque number.
 */
export function scoreProduct(product: Product, profile: UserProfile): ScoreBreakdown {
  const signals: SignalScore[] = [];

  const push = (key: SignalKey, value: number | undefined, reasons: string[]) => {
    if (value === undefined) return;
    signals.push({ key, value: clamp01(value), weight: SIGNAL_WEIGHTS[key], reasons });
  };

  const concern = scoreConcerns(product, profile);
  push('concern', concern?.value, concern?.reasons ?? []);

  const type = scoreType(product, profile);
  push('type', type?.value, type?.reasons ?? []);

  const preference = scorePreference(product, profile);
  push('preference', preference?.value, preference?.reasons ?? []);

  const shade = scoreShade(product, profile);
  push('shade', shade?.value, shade?.reasons ?? []);

  const budget = scoreBudget(product, profile);
  push('budget', budget?.value, budget?.reasons ?? []);

  const effort = scoreEffort(product, profile);
  push('effort', effort?.value, effort?.reasons ?? []);

  const social = scoreSocial(product);
  push('social', social.value, social.reasons);

  // Renormalise so dropped signals don't drag the total down.
  const totalWeight = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const weighted =
    totalWeight > 0
      ? signals.reduce((sum, signal) => sum + signal.value * signal.weight, 0) / totalWeight
      : NEUTRAL_SIGNAL_VALUE;

  const modifiers = collectModifiers(product, profile);
  const factor = modifiers.reduce((product_, modifier) => product_ * modifier.factor, 1);

  return {
    total: Math.round(clamp01(weighted * factor) * 100),
    signals,
    modifiers,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  Signals                                   */
/* -------------------------------------------------------------------------- */

type SignalResult = { value: number; reasons: string[] } | undefined;

function scoreConcerns(product: Product, profile: UserProfile): SignalResult {
  const { userConcerns, productConcerns, labels } = concernsFor(product.category, product, profile);
  if (userConcerns.length === 0 || productConcerns.length === 0) return undefined;

  const matched = userConcerns.filter((concern) => productConcerns.includes(concern));
  const value = Math.min(1, matched.length * CONCERN_MATCH_BONUS);
  const reasons = matched.map(
    (concern) => `Targets ${(labels[concern] ?? concern).toLowerCase()}`
  );

  if (matched.length === 0) {
    return { value: 0, reasons: [] };
  }
  return { value, reasons };
}

function concernsFor(
  category: Category,
  product: Product,
  profile: UserProfile
): { userConcerns: string[]; productConcerns: string[]; labels: Record<string, string> } {
  if (category === 'hair') {
    return {
      userConcerns: profile.hair.concerns,
      productConcerns: product.hairConcerns ?? [],
      labels: HAIR_CONCERN_LABELS,
    };
  }
  return {
    userConcerns: profile.skin.concerns,
    productConcerns: product.skinConcerns ?? [],
    labels: SKIN_CONCERN_LABELS,
  };
}

function scoreType(product: Product, profile: UserProfile): SignalResult {
  if (product.category === 'hair') {
    const userType = profile.hair.type;
    if (!userType || !product.hairTypes) return undefined;
    return matchTypeList(product.hairTypes, userType, `${userType} hair`);
  }

  const userType = profile.skin.type;
  if (!userType || !product.skinTypes) return undefined;
  return matchTypeList(product.skinTypes, userType, `${userType} skin`);
}

function matchTypeList(
  productTypes: string[],
  userType: string,
  label: string
): { value: number; reasons: string[] } {
  if (productTypes.length === 0) {
    return { value: TYPE_UNIVERSAL, reasons: ['Suits every type'] };
  }
  if (productTypes.includes(userType)) {
    return { value: TYPE_EXACT_MATCH, reasons: [`Formulated for ${label}`] };
  }
  return { value: TYPE_MISMATCH, reasons: [] };
}

function scorePreference(product: Product, profile: UserProfile): SignalResult {
  switch (product.category) {
    case 'makeup':
      return scoreMakeupPreference(product, profile);
    case 'hair':
      return scoreHairPreference(product, profile);
    case 'skincare':
      return scoreSkincarePreference(product, profile);
  }
}

function scoreMakeupPreference(product: Product, profile: UserProfile): SignalResult {
  const parts: number[] = [];
  const reasons: string[] = [];

  if (product.finish && profile.makeup.finish) {
    const distance = Math.abs(
      FINISHES.indexOf(product.finish) - FINISHES.indexOf(profile.makeup.finish)
    );
    const value = Math.max(0, 1 - distance * 0.28);
    parts.push(value);
    if (distance === 0) reasons.push(`${titleCase(product.finish)} finish, exactly what you wanted`);
    else if (distance === 1) reasons.push(`Close to the ${profile.makeup.finish} finish you like`);
  }

  if (product.coverage && profile.makeup.coverage) {
    const distance = Math.abs(
      COVERAGE_LEVELS.indexOf(product.coverage) - COVERAGE_LEVELS.indexOf(profile.makeup.coverage)
    );
    const value = Math.max(0, 1 - distance * 0.3);
    parts.push(value);
    if (distance === 0) reasons.push(`${titleCase(product.coverage)} coverage, as requested`);
  }

  if (parts.length === 0) return undefined;
  return { value: average(parts), reasons };
}

function scoreHairPreference(product: Product, profile: UserProfile): SignalResult {
  const parts: number[] = [];
  const reasons: string[] = [];

  if (product.porosity && profile.hair.porosity) {
    const match = product.porosity.includes(profile.hair.porosity);
    parts.push(match ? 1 : 0.25);
    if (match) reasons.push(`Weighted right for ${profile.hair.porosity}-porosity hair`);
  }

  if (product.scalpTypes && profile.hair.scalp) {
    const match = product.scalpTypes.includes(profile.hair.scalp);
    parts.push(match ? 1 : 0.3);
    if (match) reasons.push(`Suits a ${profile.hair.scalp} scalp`);
  }

  // Fine hair and heavy products don't mix.
  if (profile.hair.density === 'fine' && product.attributes.siliconeFree) {
    parts.push(0.9);
    reasons.push("Won't weigh down fine hair");
  }

  if (parts.length === 0) return undefined;
  return { value: average(parts), reasons };
}

function scoreSkincarePreference(product: Product, profile: UserProfile): SignalResult {
  const parts: number[] = [];
  const reasons: string[] = [];
  const sensitivity = profile.skin.sensitivity ?? 0;

  if (sensitivity >= SENSITIVITY_FRAGRANCE_THRESHOLD) {
    parts.push(product.attributes.fragranceFree ? 1 : 0.2);
    if (product.attributes.fragranceFree) {
      reasons.push('Fragrance-free, which matters for reactive skin');
    }
  }

  const acneProne =
    profile.skin.concerns.includes('acne') ||
    profile.skin.concerns.includes('blackheads') ||
    profile.skin.type === 'oily';
  if (acneProne) {
    parts.push(product.attributes.nonComedogenic ? 1 : 0.35);
    if (product.attributes.nonComedogenic) reasons.push("Non-comedogenic, so it won't clog pores");
  }

  if (parts.length === 0) return undefined;
  return { value: average(parts), reasons };
}

function scoreShade(product: Product, profile: UserProfile): SignalResult {
  const range = product.shadeRange;
  const depth = profile.makeup.depth;
  if (!range || depth === undefined) return undefined;

  const [lightest, deepest] = range.depthRange;
  const reasons: string[] = [];
  let value: number;

  if (depth >= lightest && depth <= deepest) {
    const edgeDistance = Math.min(depth - lightest, deepest - depth);
    value = edgeDistance >= 1 ? SHADE_FULL_COVER : SHADE_EDGE;
    if (edgeDistance >= 1) {
      reasons.push(`Your depth sits comfortably inside its ${range.count}-shade range`);
    } else {
      reasons.push(`You're near the edge of its shade range — worth swatching`);
    }
  } else {
    value = SHADE_MISS;
  }

  if (profile.makeup.undertone && range.undertones.includes(profile.makeup.undertone)) {
    value = Math.min(1, value + SHADE_UNDERTONE_BONUS);
    reasons.push(`Includes ${profile.makeup.undertone} undertones`);
  }

  if (range.count >= SHADE_INCLUSIVE_COUNT) {
    reasons.push(`${range.count} shades to choose from`);
  }

  return { value, reasons };
}

function scoreBudget(product: Product, profile: UserProfile): SignalResult {
  if (!profile.budget) return undefined;
  const ceiling = PRICE_TIER_CEILING[profile.budget];

  // "No limit" — reward value rather than cheapness, so nothing is penalised
  // for being expensive when the user said price doesn't matter.
  if (!Number.isFinite(ceiling)) {
    return { value: NEUTRAL_SIGNAL_VALUE + 0.3, reasons: [] };
  }

  const ratio = product.priceUsd / ceiling;
  if (ratio > 1) return { value: 0, reasons: [] };

  // Peak score at the sweet spot, tapering either side: dirt-cheap isn't
  // automatically better, and neither is scraping the ceiling.
  const distance = Math.abs(ratio - BUDGET_SWEET_SPOT);
  const value = clamp01(1 - distance * 0.8);
  const reasons =
    ratio <= 0.5 ? [`Well under budget at $${product.priceUsd.toFixed(2)}`] : [];
  return { value, reasons };
}

function scoreEffort(product: Product, profile: UserProfile): SignalResult {
  if (!profile.effort) return undefined;
  const distance = Math.abs(
    EFFORT_LEVELS.indexOf(product.effort) - EFFORT_LEVELS.indexOf(profile.effort)
  );
  const value = EFFORT_DISTANCE_SCORES[Math.min(distance, EFFORT_DISTANCE_SCORES.length - 1)] ?? 0;
  const reasons =
    distance === 0 && profile.effort === 'low' ? ['Fits a low-effort routine'] : [];
  return { value, reasons };
}

function scoreSocial(product: Product): { value: number; reasons: string[] } {
  const ratingComponent = clamp01(
    (product.rating - SOCIAL_RATING_FLOOR) / (5 - SOCIAL_RATING_FLOOR)
  );
  const confidence = clamp01(product.reviewCount / SOCIAL_REVIEW_SATURATION);
  const value = ratingComponent * (0.55 + 0.45 * confidence);
  const reasons =
    product.rating >= 4.5 && product.reviewCount >= 1000
      ? [`Rated ${product.rating.toFixed(1)} across ${formatCount(product.reviewCount)} reviews`]
      : [];
  return { value, reasons };
}

/* -------------------------------------------------------------------------- */
/*                                 Modifiers                                  */
/* -------------------------------------------------------------------------- */

function collectModifiers(
  product: Product,
  profile: UserProfile
): { label: string; factor: number }[] {
  const modifiers: { label: string; factor: number }[] = [];
  const sensitivity = profile.skin.sensitivity ?? 0;

  if (
    sensitivity >= SENSITIVITY_FRAGRANCE_THRESHOLD &&
    !product.attributes.fragranceFree &&
    product.category !== 'makeup'
  ) {
    modifiers.push({ label: 'Fragranced, and your skin reacts easily', factor: SENSITIVE_FRAGRANCE_PENALTY });
  }

  if (sensitivity >= 3 && containsStrongActive(product)) {
    modifiers.push({ label: 'Contains a strong active', factor: SENSITIVE_ACTIVE_PENALTY });
  }

  if (product.subcategory === 'sunscreen' && profile.skin.sunExposure) {
    const factor = SPF_PRIORITY_BOOST[profile.skin.sunExposure];
    if (factor !== 1) {
      modifiers.push({ label: 'You spend real time in the sun', factor });
    }
  }

  return modifiers;
}

export function containsStrongActive(product: Product): boolean {
  const ingredients = product.keyIngredients.join(' ').toLowerCase();
  return STRONG_ACTIVES.some((active) => ingredients.includes(active));
}

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function average(values: number[]): number {
  if (values.length === 0) return NEUTRAL_SIGNAL_VALUE;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatCount(count: number): string {
  if (count >= 1000) return `${Math.round(count / 100) / 10}k`;
  return String(count);
}
