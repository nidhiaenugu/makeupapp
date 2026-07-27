import { routineOrderFor } from '@/lib/domain/taxonomy';
import type { Category, ProductType, RoutineTime } from '@/lib/domain/taxonomy';
import type { Product, Recommendation, Routine, RoutineStep, UserProfile } from '@/lib/domain/types';
import { recommend } from './recommend';

/**
 * Routine building.
 *
 * A ranked list of products is not a routine — a user needs to know what to
 * use, in what order, and how often. This turns the engine's output into an
 * ordered plan with one product per step.
 */

/** The steps a routine should try to fill, in the order they are applied. */
const TEMPLATES: Record<'am' | 'pm' | 'wash-day', ProductType[]> = {
  am: ['cleanser', 'toner', 'serum', 'eye-cream', 'moisturiser', 'sunscreen'],
  pm: ['cleanser', 'exfoliant', 'essence', 'serum', 'eye-cream', 'moisturiser', 'face-oil'],
  'wash-day': [
    'scalp-treatment',
    'shampoo',
    'conditioner',
    'hair-mask',
    'leave-in',
    'heat-protectant',
    'hair-oil',
  ],
};

const MAKEUP_TEMPLATE: ProductType[] = [
  'primer',
  'foundation',
  'concealer',
  'setting-powder',
  'blush',
  'bronzer',
  'mascara',
  'lipstick',
  'setting-spray',
];

/** Steps that are genuinely optional — skipped rather than filled with a poor match. */
const OPTIONAL_STEPS = new Set<ProductType>([
  'exfoliant',
  'essence',
  'eye-cream',
  'face-oil',
  'hair-mask',
  'scalp-treatment',
  'heat-protectant',
  'hair-oil',
  'setting-powder',
  'bronzer',
  'setting-spray',
]);

/** Below this score a product is not worth putting in someone's routine. */
const MIN_STEP_SCORE = 45;

function guidanceFor(product: Product, time: RoutineTime | 'wash-day'): string {
  if (product.type === 'exfoliant') {
    return product.potency >= 2
      ? 'Start twice a week at night and build up only if your skin stays comfortable.'
      : 'Two or three nights a week is plenty — more is not better.';
  }
  if (product.keyIngredients.some((i) => /retin(ol|al|oid)|adapalene/i.test(i))) {
    return 'Introduce slowly: two nights a week for a fortnight, then increase. Always pair with daily SPF.';
  }
  if (product.type === 'sunscreen') {
    return 'Two fingers’ length for the face and neck, every morning, reapplied if you are outdoors.';
  }
  if (product.type === 'hair-mask') {
    return 'Once a week on damp hair, concentrated from the mid-lengths down.';
  }
  if (product.type === 'scalp-treatment') {
    return 'Apply to the scalp before washing, or as directed — not to the lengths.';
  }
  if (product.type === 'heat-protectant') {
    return 'Only needed on days you use heat — but on those days, never skip it.';
  }
  if (product.type === 'shampoo' && product.potency >= 3) {
    return 'Use twice a week and alternate with a gentler shampoo to avoid drying the lengths.';
  }
  if (time === 'am' && product.type === 'serum') {
    return 'Apply to clean skin before moisturiser, while the skin is still slightly damp.';
  }
  return 'Apply as the packaging directs, in the order shown here.';
}

export interface BuildRoutineOptions {
  category: Category;
  /** Only used for skincare; makeup and hair have a single sequence. */
  time?: RoutineTime;
}

export function buildRoutine(
  products: Product[],
  profile: UserProfile,
  options: BuildRoutineOptions,
): Routine {
  const { category } = options;

  const slot: 'am' | 'pm' | 'wash-day' =
    category === 'hair' ? 'wash-day' : category === 'makeup' ? 'am' : (options.time ?? 'am');

  const template = category === 'makeup' ? MAKEUP_TEMPLATE : TEMPLATES[slot];

  // Score once against the whole catalog, then pick the best product per step.
  // Scoring per type would be wasteful and would not change the ranking.
  const profileForCategory: UserProfile = { ...profile, categories: [category] };
  const { recommendations, notes } = recommend(products, profileForCategory, {
    limit: Number.MAX_SAFE_INTEGER,
    maxPerType: 0,
  });

  const byType = new Map<string, Recommendation[]>();
  for (const rec of recommendations) {
    const list = byType.get(rec.product.type);
    if (list) list.push(rec);
    else byType.set(rec.product.type, [rec]);
  }

  const steps: RoutineStep[] = [];
  const missing: ProductType[] = [];

  for (const type of template) {
    // Skincare products declare which half of the day they belong to; makeup
    // and hair products do not, so the template alone decides.
    const candidates = (byType.get(type) ?? []).filter(
      (rec) =>
        category !== 'skincare' ||
        rec.product.routineTimes.length === 0 ||
        rec.product.routineTimes.includes(slot as RoutineTime),
    );

    const best = candidates[0];
    if (!best || best.score < MIN_STEP_SCORE) {
      if (!OPTIONAL_STEPS.has(type)) missing.push(type);
      continue;
    }

    steps.push({
      order: routineOrderFor(type),
      type,
      recommendation: best,
      guidance: guidanceFor(best.product, slot),
    });
  }

  steps.sort((a, b) => a.order - b.order);

  const routineNotes = [...notes];
  if (missing.length > 0) {
    routineNotes.push(
      `We could not fill ${missing.join(', ')} from the current catalog within your filters.`,
    );
  }
  if (slot === 'pm' && steps.some((s) => s.type === 'exfoliant')) {
    routineNotes.push(
      'Do not use your exfoliant and any retinoid on the same night until you know your skin tolerates both.',
    );
  }

  return { time: slot, category, steps, notes: routineNotes };
}
