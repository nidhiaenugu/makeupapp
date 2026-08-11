import type { Product, UserProfile } from '@/lib/domain/types';
import { EMPTY_PROFILE } from '@/lib/profile/defaults';

/** Build a profile from a partial, so tests only state what they care about. */
export function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return { ...EMPTY_PROFILE, ...overrides };
}

/**
 * A minimal valid product. Tests override just the fields under examination,
 * which keeps each assertion about one thing.
 */
export function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'test-product',
    name: 'Test Product',
    brand: 'Test Brand',
    category: 'skincare',
    type: 'serum',
    description: 'A product that exists only inside the test suite.',
    price: 20,
    audience: ['women', 'men'],
    skinTypes: [],
    hairTypes: [],
    hairTextures: [],
    porosities: [],
    scalpTypes: [],
    targets: [],
    aggravates: [],
    keyIngredients: [],
    attributes: [],
    potency: 1,
    routineTimes: [],
    curationScore: 50,
    tags: [],
    ...overrides,
  };
}
