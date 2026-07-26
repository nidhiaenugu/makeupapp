import { EFFORT_LEVELS } from '../types/enums';
import type { Category, EffortLevel } from '../types/enums';
import type { Product, Subcategory } from '../types/product';
import type { UserProfile } from '../types/profile';
import type { Recommendation, Routine, RoutineStep } from '../types/recommendation';
import { conflictNotesFor, findConflicts } from './conflicts';
import { recommend } from './recommend';

interface SlotSpec {
  key: string;
  label: string;
  /** Candidate subcategories, in priority order. */
  subcategories: Subcategory[];
  /** Included once the user's effort level reaches this. */
  minEffort: EffortLevel;
}

const AM_SKINCARE: SlotSpec[] = [
  { key: 'cleanse', label: 'Cleanse', subcategories: ['cleanser'], minEffort: 'low' },
  { key: 'tone', label: 'Tone', subcategories: ['toner', 'essence'], minEffort: 'high' },
  { key: 'treat', label: 'Treat', subcategories: ['serum'], minEffort: 'medium' },
  { key: 'eyes', label: 'Eyes', subcategories: ['eye-cream'], minEffort: 'high' },
  { key: 'moisturise', label: 'Moisturise', subcategories: ['moisturizer'], minEffort: 'low' },
  { key: 'protect', label: 'Protect', subcategories: ['sunscreen'], minEffort: 'low' },
];

const PM_SKINCARE: SlotSpec[] = [
  { key: 'cleanse', label: 'Cleanse', subcategories: ['cleanser'], minEffort: 'low' },
  { key: 'exfoliate', label: 'Exfoliate', subcategories: ['exfoliant'], minEffort: 'medium' },
  { key: 'treat', label: 'Treat', subcategories: ['treatment', 'serum'], minEffort: 'low' },
  { key: 'eyes', label: 'Eyes', subcategories: ['eye-cream'], minEffort: 'high' },
  { key: 'moisturise', label: 'Moisturise', subcategories: ['moisturizer'], minEffort: 'low' },
  { key: 'seal', label: 'Seal', subcategories: ['face-oil'], minEffort: 'high' },
];

const MAKEUP_KIT: SlotSpec[] = [
  { key: 'prime', label: 'Prime', subcategories: ['primer'], minEffort: 'medium' },
  { key: 'base', label: 'Base', subcategories: ['foundation'], minEffort: 'low' },
  { key: 'conceal', label: 'Conceal', subcategories: ['concealer'], minEffort: 'low' },
  { key: 'set', label: 'Set', subcategories: ['powder'], minEffort: 'medium' },
  { key: 'colour', label: 'Cheeks', subcategories: ['blush'], minEffort: 'low' },
  { key: 'sculpt', label: 'Sculpt', subcategories: ['bronzer'], minEffort: 'high' },
  { key: 'glow', label: 'Glow', subcategories: ['highlighter'], minEffort: 'high' },
  { key: 'brows', label: 'Brows', subcategories: ['brow'], minEffort: 'medium' },
  { key: 'eyes', label: 'Eyes', subcategories: ['eyeshadow'], minEffort: 'high' },
  { key: 'liner', label: 'Line', subcategories: ['eyeliner'], minEffort: 'high' },
  { key: 'lashes', label: 'Lashes', subcategories: ['mascara'], minEffort: 'low' },
  { key: 'lips', label: 'Lips', subcategories: ['lipstick', 'lip-gloss'], minEffort: 'low' },
  { key: 'lock', label: 'Lock in', subcategories: ['setting-spray'], minEffort: 'high' },
];

const HAIR_REGIMEN: SlotSpec[] = [
  { key: 'scalp', label: 'Scalp care', subcategories: ['scalp-treatment'], minEffort: 'high' },
  { key: 'wash', label: 'Wash', subcategories: ['shampoo'], minEffort: 'low' },
  { key: 'condition', label: 'Condition', subcategories: ['conditioner'], minEffort: 'low' },
  {
    key: 'treat',
    label: 'Weekly treatment',
    subcategories: ['hair-mask', 'deep-conditioner'],
    minEffort: 'medium',
  },
  { key: 'leave-in', label: 'Leave in', subcategories: ['leave-in'], minEffort: 'medium' },
  { key: 'protect', label: 'Heat protect', subcategories: ['heat-protectant'], minEffort: 'medium' },
  {
    key: 'style',
    label: 'Style',
    subcategories: ['styling-cream', 'gel', 'mousse'],
    minEffort: 'medium',
  },
  { key: 'finish', label: 'Finish', subcategories: ['hair-oil'], minEffort: 'high' },
];

export interface RoutineRequest {
  category: Category;
  /** Only meaningful for skincare. */
  timeOfDay?: 'am' | 'pm';
}

/**
 * Builds an ordered, usable routine rather than a flat list.
 *
 * Each slot is filled with the best-scoring product for that slot, then the
 * whole set is checked for conflicts: blocking conflicts cause a re-pick from
 * the runner-up, and soft conflicts become notes attached to the step.
 */
export function buildRoutine(
  products: Product[],
  profile: UserProfile,
  request: RoutineRequest
): Routine {
  const slots = slotsFor(request);
  const effort = profile.effort ?? 'medium';
  const applicable = slots.filter((slot) => meetsEffort(slot.minEffort, effort));

  const chosen: { slot: SlotSpec; recommendation: Recommendation }[] = [];
  const usedIds: string[] = [];

  for (const slot of applicable) {
    const result = recommend(products, profile, {
      category: request.category,
      subcategories: slot.subcategories,
      excludeIds: usedIds,
      diversify: false,
      applyThreshold: false,
      limit: 6,
    });

    const pick = pickWithoutBlockingConflict(
      result.recommendations,
      chosen.map((entry) => entry.recommendation.product),
      request
    );
    if (!pick) continue;

    chosen.push({ slot, recommendation: pick });
    usedIds.push(pick.product.id);
  }

  const conflicts = findConflicts(chosen.map((entry) => entry.recommendation.product));

  const steps: RoutineStep[] = chosen.map((entry, index) => ({
    order: index + 1,
    label: entry.slot.label,
    recommendation: entry.recommendation,
    notes: conflictNotesFor(entry.recommendation.product.id, conflicts),
  }));

  const totalPriceUsd = Math.round(
    chosen.reduce((sum, entry) => sum + entry.recommendation.product.priceUsd, 0) * 100
  ) / 100;

  return {
    id: routineId(request),
    title: routineTitle(request),
    subtitle: routineSubtitle(request, steps.length),
    steps,
    totalPriceUsd,
    warnings: [
      ...new Set(
        conflicts.filter((conflict) => conflict.severity === 'block').map((c) => c.message)
      ),
    ],
  };
}

/** Every routine that makes sense for this profile. */
export function buildAllRoutines(products: Product[], profile: UserProfile): Routine[] {
  const routines: Routine[] = [];
  if (profile.interests.includes('skincare')) {
    routines.push(buildRoutine(products, profile, { category: 'skincare', timeOfDay: 'am' }));
    routines.push(buildRoutine(products, profile, { category: 'skincare', timeOfDay: 'pm' }));
  }
  if (profile.interests.includes('makeup')) {
    routines.push(buildRoutine(products, profile, { category: 'makeup' }));
  }
  if (profile.interests.includes('hair')) {
    routines.push(buildRoutine(products, profile, { category: 'hair' }));
  }
  return routines.filter((routine) => routine.steps.length > 0);
}

/* -------------------------------------------------------------------------- */

function pickWithoutBlockingConflict(
  candidates: Recommendation[],
  alreadyChosen: Product[],
  request: RoutineRequest
): Recommendation | undefined {
  for (const candidate of candidates) {
    if (request.timeOfDay && !suitsTimeOfDay(candidate.product, request.timeOfDay)) continue;

    const conflicts = findConflicts([...alreadyChosen, candidate.product]);
    const blocks = conflicts.some(
      (conflict) =>
        conflict.severity === 'block' && conflict.between.includes(candidate.product.id)
    );
    if (!blocks) return candidate;
  }

  // Every candidate conflicts — fall back to the first that at least fits the
  // time of day, and let the conflict surface as a note.
  return candidates.find(
    (candidate) => !request.timeOfDay || suitsTimeOfDay(candidate.product, request.timeOfDay)
  );
}

function suitsTimeOfDay(product: Product, timeOfDay: 'am' | 'pm'): boolean {
  return product.timeOfDay === 'both' || product.timeOfDay === timeOfDay;
}

function slotsFor(request: RoutineRequest): SlotSpec[] {
  switch (request.category) {
    case 'skincare':
      return request.timeOfDay === 'pm' ? PM_SKINCARE : AM_SKINCARE;
    case 'makeup':
      return MAKEUP_KIT;
    case 'hair':
      return HAIR_REGIMEN;
  }
}

function meetsEffort(slotMinimum: EffortLevel, userEffort: EffortLevel): boolean {
  return EFFORT_LEVELS.indexOf(userEffort) >= EFFORT_LEVELS.indexOf(slotMinimum);
}

function routineId(request: RoutineRequest): string {
  return request.timeOfDay ? `${request.category}-${request.timeOfDay}` : request.category;
}

function routineTitle(request: RoutineRequest): string {
  switch (request.category) {
    case 'skincare':
      return request.timeOfDay === 'pm' ? 'Evening skincare' : 'Morning skincare';
    case 'makeup':
      return 'Your makeup kit';
    case 'hair':
      return 'Wash day regimen';
  }
}

function routineSubtitle(request: RoutineRequest, stepCount: number): string {
  const steps = `${stepCount} step${stepCount === 1 ? '' : 's'}`;
  switch (request.category) {
    case 'skincare':
      return request.timeOfDay === 'pm' ? `${steps}, in order, before bed` : `${steps}, in order`;
    case 'makeup':
      return `${steps}, in application order`;
    case 'hair':
      return `${steps} from wash to style`;
  }
}
