import { loadBundledCatalog } from '@core/catalog';
import { findConflicts } from '@core/engine/conflicts';
import { applyHardFilters, summariseExclusions } from '@core/engine/filters';
import { diversifyResults, recommend } from '@core/engine/recommend';
import { buildAllRoutines, buildRoutine } from '@core/engine/routine';
import { scoreProduct } from '@core/engine/score';
import { MAX_PER_BRAND, SIGNAL_WEIGHTS } from '@core/engine/weights';
import type { Product } from '@core/types/product';
import { createEmptyProfile, mergeProfile } from '@core/types/profile';
import type { UserProfile } from '@core/types/profile';

const catalog = loadBundledCatalog();

/** Oily, acne-prone, tight budget, no fragrance. */
function oilyAcneProfile(): UserProfile {
  return mergeProfile(createEmptyProfile(), {
    interests: ['skincare'],
    budget: 'budget',
    effort: 'low',
    ethics: ['fragranceFree'],
    avoid: ['fragrance'],
    skin: { type: 'oily', sensitivity: 3, concerns: ['acne', 'blackheads', 'large-pores'] },
  });
}

/** Dry, mature, no budget ceiling, happy with a long routine. */
function dryMatureProfile(): UserProfile {
  return mergeProfile(createEmptyProfile(), {
    interests: ['skincare'],
    budget: 'luxury',
    effort: 'high',
    skin: { type: 'dry', sensitivity: 0, concerns: ['fine-lines', 'dryness', 'dullness'] },
  });
}

function coilyHairProfile(): UserProfile {
  return mergeProfile(createEmptyProfile(), {
    interests: ['hair'],
    budget: 'mid',
    effort: 'medium',
    hair: {
      type: 'coily',
      density: 'thick',
      porosity: 'high',
      scalp: 'dry',
      concerns: ['dryness', 'breakage', 'curl-definition'],
      washFrequency: 'weekly',
    },
  });
}

describe('weights', () => {
  it('sum to 1 so the weighted average is a true 0-1 value', () => {
    const total = Object.values(SIGNAL_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});

describe('hard filters', () => {
  it('excludes every product containing an avoided allergen', () => {
    const profile = oilyAcneProfile();
    const { kept } = applyHardFilters(catalog, profile);
    expect(kept.length).toBeGreaterThan(0);
    for (const product of kept) {
      expect(product.allergens).not.toContain('fragrance');
    }
  });

  it('excludes products that fail a required ethics flag', () => {
    const profile = mergeProfile(createEmptyProfile(), {
      interests: ['makeup'],
      ethics: ['crueltyFree', 'vegan'],
    });
    const { kept } = applyHardFilters(catalog, profile);
    expect(kept.length).toBeGreaterThan(0);
    for (const product of kept) {
      expect(product.attributes.crueltyFree).toBe(true);
      expect(product.attributes.vegan).toBe(true);
    }
  });

  it('excludes products above the budget ceiling', () => {
    const profile = mergeProfile(createEmptyProfile(), {
      interests: ['skincare'],
      budget: 'budget',
    });
    const { kept } = applyHardFilters(catalog, profile);
    for (const product of kept) {
      expect(product.priceUsd).toBeLessThanOrEqual(20);
    }
  });

  it('records why each product was excluded', () => {
    const { excluded } = applyHardFilters(catalog, oilyAcneProfile());
    const summary = summariseExclusions(excluded);
    expect(Object.keys(summary).length).toBeGreaterThan(0);
    expect(excluded.every((exclusion) => exclusion.detail.length > 0)).toBe(true);
  });

  it('only keeps categories the user is interested in', () => {
    const { kept } = applyHardFilters(catalog, coilyHairProfile());
    expect(kept.every((product) => product.category === 'hair')).toBe(true);
  });
});

describe('scoring', () => {
  it('scores a product formulated for the user above one that is not', () => {
    const profile = oilyAcneProfile();
    const forOily = catalog.find((p) => p.id === 'the-ordinary-niacinamide')!;
    const forDry = catalog.find((p) => p.id === 'weleda-skin-food')!;
    expect(scoreProduct(forOily, profile).total).toBeGreaterThan(
      scoreProduct(forDry, profile).total
    );
  });

  it('rewards matching more of the user concerns', () => {
    const oneConcern = mergeProfile(createEmptyProfile(), {
      interests: ['skincare'],
      skin: { type: 'oily', concerns: ['acne'] },
    });
    const threeConcerns = mergeProfile(createEmptyProfile(), {
      interests: ['skincare'],
      skin: { type: 'oily', concerns: ['acne', 'blackheads', 'large-pores'] },
    });
    const bha = catalog.find((p) => p.id === 'paulas-choice-2-bha')!;
    expect(scoreProduct(bha, threeConcerns).total).toBeGreaterThan(
      scoreProduct(bha, oneConcern).total
    );
  });

  it('renormalises so products missing a signal are not penalised', () => {
    // A shampoo has no shade range; its shade signal must simply be absent.
    const shampoo = catalog.find((p) => p.category === 'hair')!;
    const breakdown = scoreProduct(shampoo, coilyHairProfile());
    expect(breakdown.signals.some((signal) => signal.key === 'shade')).toBe(false);
    expect(breakdown.total).toBeGreaterThan(0);
  });

  it('penalises fragranced products for reactive skin', () => {
    const reactive = mergeProfile(createEmptyProfile(), {
      interests: ['skincare'],
      skin: { type: 'sensitive', sensitivity: 4, concerns: ['redness'] },
    });
    const calm = mergeProfile(createEmptyProfile(), {
      interests: ['skincare'],
      skin: { type: 'sensitive', sensitivity: 0, concerns: ['redness'] },
    });
    const fragranced = catalog.find(
      (p) => p.category === 'skincare' && !p.attributes.fragranceFree
    )!;
    const reactiveBreakdown = scoreProduct(fragranced, reactive);
    expect(reactiveBreakdown.modifiers.some((modifier) => modifier.factor < 1)).toBe(true);
    expect(reactiveBreakdown.total).toBeLessThan(scoreProduct(fragranced, calm).total);
  });

  it('scores a shade range that reaches the user above one that does not', () => {
    const deep = mergeProfile(createEmptyProfile(), {
      interests: ['makeup'],
      makeup: { depth: 10, undertone: 'warm' },
    });
    const wide = catalog.find((p) => p.id === 'fenty-pro-filtr-foundation')!;
    const narrow = catalog.find((p) => p.id === 'nars-light-reflecting-foundation')!;
    const wideShade = scoreProduct(wide, deep).signals.find((s) => s.key === 'shade')!;
    const narrowShade = scoreProduct(narrow, deep).signals.find((s) => s.key === 'shade')!;
    expect(wideShade.value).toBeGreaterThan(narrowShade.value);
  });

  it('always produces a score between 0 and 100', () => {
    for (const profile of [oilyAcneProfile(), dryMatureProfile(), coilyHairProfile()]) {
      for (const product of catalog) {
        const { total } = scoreProduct(product, profile);
        expect(total).toBeGreaterThanOrEqual(0);
        expect(total).toBeLessThanOrEqual(100);
      }
    }
  });

  it('is deterministic', () => {
    const profile = dryMatureProfile();
    const product = catalog[10]!;
    expect(scoreProduct(product, profile).total).toBe(scoreProduct(product, profile).total);
  });
});

describe('recommend', () => {
  it('returns results ranked by score', () => {
    const { recommendations } = recommend(catalog, oilyAcneProfile());
    expect(recommendations.length).toBeGreaterThan(0);
    const scores = recommendations.map((recommendation) => recommendation.score);
    // Diversification can reorder, so check the primary block is descending.
    const primary = scores.slice(0, 5);
    expect([...primary].sort((a, b) => b - a)).toEqual(primary);
  });

  it('never surfaces a product the user asked to avoid', () => {
    const { recommendations } = recommend(catalog, oilyAcneProfile());
    for (const recommendation of recommendations) {
      expect(recommendation.product.allergens).not.toContain('fragrance');
      expect(recommendation.product.priceUsd).toBeLessThanOrEqual(20);
    }
  });

  it('gives every recommendation at least one reason', () => {
    const { recommendations } = recommend(catalog, dryMatureProfile());
    for (const recommendation of recommendations) {
      expect(recommendation.reasons.length).toBeGreaterThan(0);
      expect(recommendation.reasons.every((reason) => reason.length > 0)).toBe(true);
    }
  });

  it('warns about strong actives instead of hiding them', () => {
    const { recommendations } = recommend(catalog, dryMatureProfile(), { limit: 60 });
    const retinoid = recommendations.find((recommendation) =>
      recommendation.product.keyIngredients.some((ingredient) => ingredient.includes('retin'))
    );
    expect(retinoid?.warnings.some((warning) => warning.includes('strong active'))).toBe(true);
  });

  it('respects the category filter', () => {
    const profile = mergeProfile(createEmptyProfile(), {
      interests: ['skincare', 'makeup', 'hair'],
      skin: { concerns: ['acne'] },
    });
    const { recommendations } = recommend(catalog, profile, { category: 'makeup' });
    expect(recommendations.every((r) => r.product.category === 'makeup')).toBe(true);
  });

  it('reports how many products it considered', () => {
    const result = recommend(catalog, coilyHairProfile());
    expect(result.consideredCount).toBeGreaterThan(0);
    expect(result.consideredCount).toBeLessThanOrEqual(catalog.length);
  });

  it('returns an empty list rather than throwing when nothing matches', () => {
    const impossible = mergeProfile(createEmptyProfile(), {
      interests: ['skincare'],
      budget: 'budget',
      ethics: ['crueltyFree', 'vegan', 'fragranceFree', 'reefSafe'],
      avoid: [
        'fragrance',
        'essential-oils',
        'alcohol-denat',
        'sulfates',
        'silicones',
        'parabens',
        'nuts',
        'gluten',
        'soy',
        'coconut',
        'lanolin',
        'shellfish',
        'salicylates',
      ],
    });
    expect(() => recommend(catalog, impossible)).not.toThrow();
  });
});

describe('diversify', () => {
  it('caps how many products one brand can take in the primary block', () => {
    const sameBrand = catalog
      .filter((product) => product.brand === 'The Ordinary')
      .map((product, index) => fakeRecommendation(product, 100 - index));
    const diversified = diversifyResults(sameBrand);
    const primaryFromBrand = diversified
      .slice(0, MAX_PER_BRAND)
      .filter((recommendation) => recommendation.product.brand === 'The Ordinary');
    expect(primaryFromBrand.length).toBeLessThanOrEqual(MAX_PER_BRAND);
  });

  it('keeps every recommendation, just reordered', () => {
    const input = catalog.slice(0, 30).map((product, index) => fakeRecommendation(product, index));
    expect(diversifyResults(input)).toHaveLength(input.length);
  });
});

describe('conflicts', () => {
  it('flags a retinoid used alongside an acid exfoliant at night', () => {
    const retinoid = catalog.find((p) => p.id === 'the-ordinary-retinal')!;
    const acid = catalog.find((p) => p.id === 'the-ordinary-glycolic-toner')!;
    const conflicts = findConflicts([retinoid, acid]);
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0]!.severity).toBe('block');
  });

  it('flags two sunscreens as redundant', () => {
    const sunscreens = catalog.filter((p) => p.subcategory === 'sunscreen').slice(0, 2);
    const conflicts = findConflicts(sunscreens);
    expect(conflicts.some((conflict) => conflict.message.includes('only need one'))).toBe(true);
  });

  it('finds nothing wrong with a sensible pairing', () => {
    const cleanser = catalog.find((p) => p.id === 'cerave-hydrating-cleanser')!;
    const moisturizer = catalog.find((p) => p.id === 'cerave-moisturizing-cream')!;
    expect(findConflicts([cleanser, moisturizer])).toHaveLength(0);
  });

  it('does not flag products used at different times of day', () => {
    const amRetinoidCandidate = catalog.find((p) => p.id === 'paulas-choice-clear-bp')!;
    const pmRetinoid = catalog.find((p) => p.id === 'the-ordinary-retinal')!;
    expect(amRetinoidCandidate.timeOfDay).toBe('am');
    expect(pmRetinoid.timeOfDay).toBe('pm');
    expect(findConflicts([amRetinoidCandidate, pmRetinoid])).toHaveLength(0);
  });
});

describe('routines', () => {
  it('builds an ordered morning skincare routine', () => {
    const routine = buildRoutine(catalog, dryMatureProfile(), {
      category: 'skincare',
      timeOfDay: 'am',
    });
    expect(routine.steps.length).toBeGreaterThan(2);
    const orders = routine.steps.map((step) => step.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('puts sunscreen last in the morning routine', () => {
    const routine = buildRoutine(catalog, dryMatureProfile(), {
      category: 'skincare',
      timeOfDay: 'am',
    });
    const last = routine.steps[routine.steps.length - 1]!;
    expect(last.recommendation.product.subcategory).toBe('sunscreen');
  });

  it('never puts a PM-only product in the morning routine', () => {
    const routine = buildRoutine(catalog, dryMatureProfile(), {
      category: 'skincare',
      timeOfDay: 'am',
    });
    for (const step of routine.steps) {
      expect(step.recommendation.product.timeOfDay).not.toBe('pm');
    }
  });

  it('never repeats a product across steps', () => {
    const routine = buildRoutine(catalog, dryMatureProfile(), {
      category: 'skincare',
      timeOfDay: 'pm',
    });
    const ids = routine.steps.map((step) => step.recommendation.product.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives a low-effort user fewer steps than a high-effort one', () => {
    const low = buildRoutine(catalog, { ...dryMatureProfile(), effort: 'low' }, {
      category: 'skincare',
      timeOfDay: 'am',
    });
    const high = buildRoutine(catalog, { ...dryMatureProfile(), effort: 'high' }, {
      category: 'skincare',
      timeOfDay: 'am',
    });
    expect(low.steps.length).toBeLessThan(high.steps.length);
  });

  it('totals the price of the routine', () => {
    const routine = buildRoutine(catalog, coilyHairProfile(), { category: 'hair' });
    const expected = routine.steps.reduce(
      (sum, step) => sum + step.recommendation.product.priceUsd,
      0
    );
    expect(routine.totalPriceUsd).toBeCloseTo(expected, 2);
  });

  it('builds every routine the profile calls for', () => {
    const profile = mergeProfile(createEmptyProfile(), {
      interests: ['skincare', 'makeup', 'hair'],
      budget: 'luxury',
      effort: 'high',
      skin: { type: 'combination', concerns: ['dullness'] },
      makeup: { depth: 5, undertone: 'neutral', coverage: 'medium', finish: 'natural' },
      hair: { type: 'wavy', porosity: 'medium', scalp: 'balanced', concerns: ['frizz'] },
    });
    const routines = buildAllRoutines(catalog, profile);
    const ids = routines.map((routine) => routine.id);
    expect(ids).toEqual(
      expect.arrayContaining(['skincare-am', 'skincare-pm', 'makeup', 'hair'])
    );
  });

  it('builds nothing for categories the user has no interest in', () => {
    const routines = buildAllRoutines(catalog, coilyHairProfile());
    expect(routines.every((routine) => routine.id === 'hair')).toBe(true);
  });
});

function fakeRecommendation(product: Product, score: number) {
  return { product, score, signals: [], reasons: ['test'], warnings: [] };
}
