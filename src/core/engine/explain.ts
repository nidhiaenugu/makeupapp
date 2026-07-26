import { ALLERGEN_LABELS } from '../types/enums';
import type { Product } from '../types/product';
import type { UserProfile } from '../types/profile';
import type { SignalScore } from '../types/recommendation';
import { SENSITIVITY_FRAGRANCE_THRESHOLD } from './weights';
import { containsStrongActive } from './score';

/**
 * Turns a score breakdown into the two lists the UI shows: why this product was
 * picked, and what to know before buying.
 *
 * Reasons are ordered by how much each signal actually moved the score, so the
 * first line is always the strongest argument for the product rather than
 * whichever signal happens to be first in the array.
 */
export function buildReasons(signals: SignalScore[], limit = 4): string[] {
  return [...signals]
    .filter((signal) => signal.reasons.length > 0)
    .sort((a, b) => b.value * b.weight - a.value * a.weight)
    .flatMap((signal) => signal.reasons)
    .slice(0, limit);
}

/**
 * Advisories. These never block a recommendation — they're the things a good
 * salesperson would mention while handing you the bottle.
 */
export function buildWarnings(
  product: Product,
  profile: UserProfile,
  modifiers: { label: string; factor: number }[]
): string[] {
  const warnings: string[] = [];
  const sensitivity = profile.skin.sensitivity ?? 0;

  if (!product.attributes.fragranceFree && sensitivity >= SENSITIVITY_FRAGRANCE_THRESHOLD) {
    warnings.push('Contains fragrance — patch test first if your skin is reactive.');
  }

  if (product.allergens.includes('alcohol-denat')) {
    warnings.push('Contains denatured alcohol, which can feel drying on dry skin.');
  }

  if (containsStrongActive(product)) {
    warnings.push('Contains a strong active — start two or three nights a week and build up.');
  }

  if (product.category === 'skincare' && product.subcategory === 'exfoliant') {
    warnings.push("Don't layer this with another exfoliant on the same night.");
  }

  if (
    product.attributes.proteinRich &&
    profile.hair.porosity === 'low'
  ) {
    warnings.push('Protein-rich — low-porosity hair can stiffen if you use it too often.');
  }

  if (product.shadeRange && profile.makeup.depth !== undefined) {
    const [lightest, deepest] = product.shadeRange.depthRange;
    if (profile.makeup.depth < lightest || profile.makeup.depth > deepest) {
      warnings.push("This shade range may not reach your depth — check before you buy.");
    }
  }

  // Surface any residual allergens the user didn't explicitly exclude but that
  // are worth knowing about.
  const notable = product.allergens.filter(
    (allergen) => allergen !== 'alcohol-denat' && !profile.avoid.includes(allergen)
  );
  if (notable.length > 0 && sensitivity >= 3) {
    warnings.push(
      `Contains ${notable.map((a) => ALLERGEN_LABELS[a].toLowerCase()).join(', ')}.`
    );
  }

  // Any score penalty the user hasn't already been told about becomes a note,
  // so a product never loses points for a reason we keep to ourselves.
  for (const modifier of modifiers) {
    if (modifier.factor >= 1) continue;
    const alreadyCovered = warnings.some((warning) =>
      warning.toLowerCase().includes(modifier.label.split(',')[0]!.toLowerCase())
    );
    if (!alreadyCovered) warnings.push(`${modifier.label}.`);
  }

  return [...new Set(warnings)];
}

/**
 * A single-sentence fallback used when a product matched on nothing specific —
 * better than showing an empty "why this" section.
 */
export function fallbackReason(product: Product): string {
  const benefit = product.benefits[0];
  return benefit
    ? `A well-reviewed ${product.subcategory.replace('-', ' ')} that ${benefit.toLowerCase()}`
    : `A well-reviewed ${product.subcategory.replace('-', ' ')}`;
}
