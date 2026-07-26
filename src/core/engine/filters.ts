import { ALLERGEN_LABELS, ETHICS_LABELS, PRICE_TIER_CEILING } from '../types/enums';
import type { Product } from '../types/product';
import type { UserProfile } from '../types/profile';
import type { ExclusionReason } from '../types/recommendation';

export interface FilterOutcome {
  kept: Product[];
  excluded: ExclusionReason[];
}

/**
 * Hard exclusions, applied before anything is scored.
 *
 * These are deliberately not score penalties: if someone says they can't have
 * fragrance, a fragranced product must never surface no matter how well it
 * matches otherwise. Each exclusion records the rule that fired so the UI can
 * offer to loosen a specific filter instead of silently showing nothing.
 */
export function applyHardFilters(products: Product[], profile: UserProfile): FilterOutcome {
  const kept: Product[] = [];
  const excluded: ExclusionReason[] = [];

  for (const product of products) {
    const exclusion = excludeProduct(product, profile);
    if (exclusion) {
      excluded.push(exclusion);
    } else {
      kept.push(product);
    }
  }

  return { kept, excluded };
}

function excludeProduct(product: Product, profile: UserProfile): ExclusionReason | undefined {
  if (profile.interests.length > 0 && !profile.interests.includes(product.category)) {
    return {
      productId: product.id,
      rule: 'category',
      detail: `You're not shopping for ${product.category} right now`,
    };
  }

  const matchedAllergen = profile.avoid.find((allergen) => product.allergens.includes(allergen));
  if (matchedAllergen) {
    return {
      productId: product.id,
      rule: 'allergen',
      detail: `Contains ${ALLERGEN_LABELS[matchedAllergen].toLowerCase()}`,
    };
  }

  const failedEthic = profile.ethics.find((flag) => !product.attributes[flag]);
  if (failedEthic) {
    return {
      productId: product.id,
      rule: 'ethics',
      detail: `Not ${ETHICS_LABELS[failedEthic].toLowerCase()}`,
    };
  }

  if (profile.budget) {
    const ceiling = PRICE_TIER_CEILING[profile.budget];
    if (product.priceUsd > ceiling) {
      return {
        productId: product.id,
        rule: 'budget',
        detail: `$${product.priceUsd.toFixed(2)} is above your $${ceiling} limit`,
      };
    }
  }

  return undefined;
}

/**
 * Summarises exclusions so the UI can say "12 hidden by your fragrance filter"
 * rather than listing every product that was removed.
 */
export function summariseExclusions(excluded: ExclusionReason[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const exclusion of excluded) {
    if (exclusion.rule === 'category') continue;
    counts[exclusion.rule] = (counts[exclusion.rule] ?? 0) + 1;
  }
  return counts;
}
