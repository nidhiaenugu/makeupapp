import { MAX_POTENCY_FOR_EXPERIENCE } from '@/lib/domain/taxonomy';
import type { Product, UserProfile } from '@/lib/domain/types';

/**
 * Hard filters: reasons a product is removed from consideration entirely
 * rather than merely scored down.
 *
 * The rule of thumb for putting something here instead of in scoring: would a
 * user be actively upset to see this product at all? An allergen, a blown
 * budget or a retinoid during pregnancy — yes. A slightly-wrong finish — no,
 * that belongs in scoring.
 */

export interface ExclusionResult {
  excluded: boolean;
  /** Machine-readable reason, aggregated into the "notes" on a result set. */
  reason?: string;
  /** Sentence shown to the user when we explain a thin result set. */
  detail?: string;
}

const NOT_EXCLUDED: ExclusionResult = { excluded: false };

/** Case-insensitive substring match across a product's ingredient list. */
export function containsIngredient(product: Product, needle: string): boolean {
  const term = needle.trim().toLowerCase();
  if (!term) return false;
  return (
    product.keyIngredients.some((ingredient) => ingredient.toLowerCase().includes(term)) ||
    product.name.toLowerCase().includes(term)
  );
}

export function checkExclusion(product: Product, profile: UserProfile): ExclusionResult {
  // 1. Category — the user only asked about some categories.
  if (!profile.categories.includes(product.category)) {
    return { excluded: true, reason: 'category', detail: 'Outside the categories you chose' };
  }

  // 2. Budget ceiling is a hard number, not a preference.
  if (product.price > profile.budget.max) {
    return {
      excluded: true,
      reason: 'budget',
      detail: `Over your $${profile.budget.max} per-product limit`,
    };
  }

  // 3. Non-negotiable preferences.
  const missing = profile.mustHave.filter((pref) => !product.attributes.includes(pref));
  if (missing.length > 0) {
    return {
      excluded: true,
      reason: 'must-have',
      detail: `Not ${missing.join(', ')}`,
    };
  }

  // 4. Ingredient exclusions — allergies and personal avoid-lists.
  const hit = profile.avoidIngredients.find((ingredient) => containsIngredient(product, ingredient));
  if (hit) {
    return {
      excluded: true,
      reason: 'ingredient',
      detail: `Contains ${hit}, which you asked to avoid`,
    };
  }

  // 5. Potency gate — do not hand a beginner a level-3 active.
  if (product.potency > MAX_POTENCY_FOR_EXPERIENCE[profile.experience]) {
    return {
      excluded: true,
      reason: 'potency',
      detail: 'Stronger than we recommend starting with',
    };
  }

  // 6. Sensitive skin: exclude the harshest actives outright. A level-3 active
  //    on reactive skin is how people end up with a damaged barrier.
  if (profile.sensitive && product.potency >= 3) {
    return {
      excluded: true,
      reason: 'sensitivity',
      detail: 'Too strong for skin you told us reacts easily',
    };
  }

  return NOT_EXCLUDED;
}

/** Human-readable summary of why a result set came back thin. */
export function summariseExclusions(reasons: string[]): string[] {
  const counts = new Map<string, number>();
  for (const reason of reasons) {
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }

  /** "1 product was" vs "3 products were" — plural agreement in one place. */
  const count = (n: number, singular: string, plural = `${singular}s`) =>
    `${n} ${n === 1 ? singular : plural} ${n === 1 ? 'was' : 'were'}`;

  const messages: Record<string, (n: number) => string> = {
    budget: (n) => `${count(n, 'product')} over your budget — raising it will widen your results.`,
    'must-have': (n) => `${count(n, 'product')} ruled out by your must-have filters.`,
    ingredient: (n) =>
      `${n === 1 ? '1 product contained' : `${n} products contained`} an ingredient on your avoid list.`,
    potency: (n) =>
      `${count(n, 'stronger active')} held back because you told us you are new to them.`,
    sensitivity: (n) =>
      `${count(n, 'high-strength active')} excluded to protect sensitive skin.`,
  };

  return [...counts.entries()]
    // "category" is an expected, uninteresting exclusion — never surface it.
    .filter(([reason]) => reason !== 'category' && reason in messages)
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => messages[reason]!(count));
}
