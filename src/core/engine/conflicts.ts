import type { Product } from '../types/product';

export type ConflictSeverity = 'block' | 'note';

export interface Conflict {
  severity: ConflictSeverity;
  /** The two products involved, by id. */
  between: [string, string];
  message: string;
}

interface IngredientRule {
  id: string;
  severity: ConflictSeverity;
  /** Both groups must be present (one in each product) for the rule to fire. */
  groupA: string[];
  groupB: string[];
  message: string;
  /** Rule only applies when both products are used at the same time of day. */
  sameTimeOnly: boolean;
}

/**
 * Ingredient pairings worth intervening on.
 *
 * `block` means the routine builder will swap one product out. `note` means
 * both stay but the user is told how to space them. These are the widely-agreed
 * cases only — this is guidance, not dermatology.
 */
const INGREDIENT_RULES: IngredientRule[] = [
  {
    id: 'retinoid-aha-bha',
    severity: 'block',
    groupA: ['retinol', 'retinal', 'retinaldehyde', 'tretinoin', 'adapalene', 'retinyl'],
    groupB: ['glycolic acid', 'lactic acid', 'salicylic acid', 'mandelic acid'],
    message: 'Using a retinoid and an acid exfoliant on the same night is a fast track to irritation — alternate them instead.',
    sameTimeOnly: true,
  },
  {
    id: 'retinoid-benzoyl',
    severity: 'block',
    groupA: ['retinol', 'retinal', 'tretinoin', 'adapalene'],
    groupB: ['benzoyl peroxide'],
    message: 'Benzoyl peroxide can deactivate a retinoid applied at the same time — use them at different times of day.',
    sameTimeOnly: true,
  },
  {
    id: 'double-vitamin-c',
    severity: 'note',
    groupA: ['l-ascorbic acid'],
    groupB: ['l-ascorbic acid'],
    message: 'Two vitamin C products is more than your skin can use — one is plenty.',
    sameTimeOnly: true,
  },
  {
    id: 'acid-plus-acid',
    severity: 'note',
    groupA: ['glycolic acid', 'lactic acid'],
    groupB: ['salicylic acid'],
    message: 'Two exfoliating acids at once can over-strip. Start by using them on different days.',
    sameTimeOnly: true,
  },
  {
    id: 'protein-overload',
    severity: 'note',
    groupA: ['hydrolyzed protein', 'keratin', 'hydrolyzed keratin', 'wheat protein', 'silk protein'],
    groupB: ['hydrolyzed protein', 'keratin', 'hydrolyzed keratin', 'wheat protein', 'silk protein'],
    message: 'Stacking protein treatments can leave hair stiff and brittle — alternate with a purely moisturising wash.',
    sameTimeOnly: false,
  },
];

/** Subcategories where having two in one routine is always redundant. */
const SINGLETON_SUBCATEGORIES = new Set(['sunscreen', 'foundation', 'shampoo', 'conditioner']);

/**
 * Finds every conflict within a set of products intended to be used together.
 */
export function findConflicts(products: Product[]): Conflict[] {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < products.length; i += 1) {
    for (let j = i + 1; j < products.length; j += 1) {
      const a = products[i]!;
      const b = products[j]!;

      if (a.subcategory === b.subcategory && SINGLETON_SUBCATEGORIES.has(a.subcategory)) {
        conflicts.push({
          severity: 'block',
          between: [a.id, b.id],
          message: `You only need one ${a.subcategory.replace('-', ' ')} in a routine.`,
        });
        continue;
      }

      for (const rule of INGREDIENT_RULES) {
        if (rule.sameTimeOnly && !overlapsInTime(a, b)) continue;

        const forward = hasAny(a, rule.groupA) && hasAny(b, rule.groupB);
        const backward = hasAny(a, rule.groupB) && hasAny(b, rule.groupA);
        if (!forward && !backward) continue;

        // Self-referential rules (two vitamin Cs) need genuinely two products.
        if (rule.groupA === rule.groupB && a.id === b.id) continue;

        conflicts.push({ severity: rule.severity, between: [a.id, b.id], message: rule.message });
        break;
      }
    }
  }

  return conflicts;
}

/** Conflicts that mention a specific product, as plain messages. */
export function conflictNotesFor(productId: string, conflicts: Conflict[]): string[] {
  return conflicts
    .filter((conflict) => conflict.between.includes(productId))
    .map((conflict) => conflict.message);
}

function hasAny(product: Product, needles: string[]): boolean {
  const haystack = product.keyIngredients.join(' ').toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}

function overlapsInTime(a: Product, b: Product): boolean {
  if (a.timeOfDay === 'both' || b.timeOfDay === 'both') return true;
  return a.timeOfDay === b.timeOfDay;
}
