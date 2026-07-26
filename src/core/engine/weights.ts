import type { SignalKey } from '../types/recommendation';

/**
 * Every tunable number in the recommendation engine lives here.
 *
 * Nothing else in `engine/` hard-codes a magic constant, so retuning how
 * recommendations behave is a single-file change that the unit tests keep
 * honest.
 */

/** Relative importance of each scoring signal. Must sum to 1. */
export const SIGNAL_WEIGHTS: Record<SignalKey, number> = {
  concern: 0.3,
  type: 0.25,
  preference: 0.15,
  shade: 0.1,
  budget: 0.1,
  effort: 0.05,
  social: 0.05,
};

/**
 * When a product carries no data for a signal (a shampoo has no shade range),
 * that signal is dropped and the remaining weights are renormalised. This is
 * the neutral value used for signals that apply but are simply unremarkable.
 */
export const NEUTRAL_SIGNAL_VALUE = 0.5;

/** Bonus applied per matched concern, capped at 1.0 overall. */
export const CONCERN_MATCH_BONUS = 0.34;

/** Score for a product explicitly formulated for the user's skin/hair type. */
export const TYPE_EXACT_MATCH = 1;
/** Score when a product targets "all types" (empty or full type list). */
export const TYPE_UNIVERSAL = 0.65;
/** Score when a product targets types the user isn't. */
export const TYPE_MISMATCH = 0.15;

/** Sensitivity level (0-4) at or above which fragrance becomes a real penalty. */
export const SENSITIVITY_FRAGRANCE_THRESHOLD = 2;
/** Multiplier applied to a fragranced product's score for sensitive users. */
export const SENSITIVE_FRAGRANCE_PENALTY = 0.55;
/** Multiplier applied to a high-strength active for very sensitive users. */
export const SENSITIVE_ACTIVE_PENALTY = 0.75;

/** Score for a shade range that comfortably covers the user's depth. */
export const SHADE_FULL_COVER = 1;
/** Score when the user sits within one step of the range's edge. */
export const SHADE_EDGE = 0.55;
/** Score when the range doesn't reach the user at all. */
export const SHADE_MISS = 0.05;
/** Extra credit for ranges that include the user's undertone family. */
export const SHADE_UNDERTONE_BONUS = 0.2;
/** A range this large is treated as genuinely inclusive. */
export const SHADE_INCLUSIVE_COUNT = 30;

/** Fraction of the budget ceiling considered the sweet spot. */
export const BUDGET_SWEET_SPOT = 0.7;

/** Effort distance -> score. Index is |userEffort - productEffort|. */
export const EFFORT_DISTANCE_SCORES = [1, 0.6, 0.25] as const;

/** Reviews needed before a rating is trusted at full weight. */
export const SOCIAL_REVIEW_SATURATION = 5000;
/** Ratings below this contribute nothing. */
export const SOCIAL_RATING_FLOOR = 3.2;

/** Sun exposure levels that push sunscreen up the list. */
export const SPF_PRIORITY_BOOST: Record<'minimal' | 'moderate' | 'high', number> = {
  minimal: 1,
  moderate: 1.08,
  high: 1.18,
};

/** No more than this many products from one brand in a result set. */
export const MAX_PER_BRAND = 2;
/** No more than this many products from one subcategory in a result set. */
export const MAX_PER_SUBCATEGORY = 3;

/** Recommendations scoring below this are not worth showing. */
export const MIN_SCORE_THRESHOLD = 25;
