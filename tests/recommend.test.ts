import { describe, expect, it } from 'vitest';
import { bundledCatalog } from '@/lib/data/json-provider';
import { buildRoutine, recommend } from '@/lib/engine';
import { product, profile } from './helpers';

describe('recommend', () => {
  it('returns nothing when every product is filtered out', () => {
    const result = recommend(
      [product({ price: 100 })],
      profile({ categories: ['skincare'], budget: { max: 10 } }),
    );

    expect(result.recommendations).toHaveLength(0);
    expect(result.eligible).toBe(0);
    expect(result.notes[0]).toContain('Nothing in the catalog cleared your filters');
  });

  it('sorts by descending score when diversification is off', () => {
    const result = recommend(
      bundledCatalog,
      profile({ categories: ['skincare'], concerns: ['acne'] }),
      { maxPerType: 0, limit: 100 },
    );
    const scores = result.recommendations.map((r) => r.score);

    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  it('leads with the single best match even when diversifying', () => {
    // Diversification deliberately reorders the tail, but the top result must
    // still be the highest-scoring product overall.
    const user = profile({ categories: ['skincare'], concerns: ['acne'] });
    const diversified = recommend(bundledCatalog, user, { maxPerType: 2, limit: 100 });
    const ranked = recommend(bundledCatalog, user, { maxPerType: 0, limit: 100 });

    expect(diversified.recommendations[0]!.score).toBe(ranked.recommendations[0]!.score);
  });

  it('returns the same set of products whether or not it diversifies', () => {
    const user = profile({ categories: ['skincare'], concerns: ['acne'] });
    const diversified = recommend(bundledCatalog, user, { maxPerType: 2, limit: 1000 });
    const ranked = recommend(bundledCatalog, user, { maxPerType: 0, limit: 1000 });

    expect(new Set(diversified.recommendations.map((r) => r.product.id))).toEqual(
      new Set(ranked.recommendations.map((r) => r.product.id)),
    );
  });

  it('respects the limit', () => {
    const result = recommend(bundledCatalog, profile({ categories: ['skincare'] }), { limit: 5 });
    expect(result.recommendations).toHaveLength(5);
  });

  it('never returns a product from an unselected category', () => {
    const result = recommend(bundledCatalog, profile({ categories: ['hair'] }), { limit: 100 });

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.every((r) => r.product.category === 'hair')).toBe(true);
  });

  it('never returns a product over the budget ceiling', () => {
    const result = recommend(
      bundledCatalog,
      profile({ categories: ['skincare', 'makeup', 'hair'], budget: { max: 25 } }),
      { limit: 100 },
    );

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.every((r) => r.product.price <= 25)).toBe(true);
  });

  it('honours a must-have across the whole catalog', () => {
    const result = recommend(
      bundledCatalog,
      profile({ categories: ['skincare', 'makeup', 'hair'], mustHave: ['fragrance-free'] }),
      { limit: 100 },
    );

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(
      result.recommendations.every((r) => r.product.attributes.includes('fragrance-free')),
    ).toBe(true);
  });

  it('never returns a men\'s-only product when the user selected women', () => {
    const result = recommend(
      bundledCatalog,
      profile({ categories: ['skincare', 'makeup', 'hair'], gender: 'women' }),
      { limit: 200 },
    );

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.every((r) => r.product.audience.includes('women'))).toBe(true);
  });

  it('includes both unisex and men\'s-marketed products when the user selected men', () => {
    const result = recommend(
      bundledCatalog,
      profile({ categories: ['skincare', 'makeup', 'hair'], gender: 'men' }),
      { limit: 200 },
    );

    const ids = result.recommendations.map((r) => r.product.id);
    expect(ids).toContain('kiehls-facial-fuel-moisturizer');
    // A product with no gender restriction (unisex) should still show up.
    expect(result.recommendations.some((r) => r.product.audience.length === 2)).toBe(true);
  });

  it('returns the full unrestricted catalog when no gender is stated', () => {
    const withGender = recommend(
      bundledCatalog,
      profile({ categories: ['skincare', 'makeup', 'hair'], gender: 'women' }),
      { limit: 500, maxPerType: 0 },
    );
    const withoutGender = recommend(
      bundledCatalog,
      profile({ categories: ['skincare', 'makeup', 'hair'] }),
      { limit: 500, maxPerType: 0 },
    );

    expect(withoutGender.recommendations.length).toBeGreaterThan(withGender.recommendations.length);
  });

  it('diversifies the head of the results by product type', () => {
    const result = recommend(
      bundledCatalog,
      profile({ categories: ['skincare'], concerns: ['acne'] }),
      { limit: 8, maxPerType: 2 },
    );

    const counts = new Map<string, number>();
    for (const rec of result.recommendations) {
      counts.set(rec.product.type, (counts.get(rec.product.type) ?? 0) + 1);
    }

    for (const count of counts.values()) {
      expect(count).toBeLessThanOrEqual(2);
    }
  });

  it('filters to a single product type when asked', () => {
    const result = recommend(bundledCatalog, profile({ categories: ['makeup'] }), {
      type: 'foundation',
      limit: 50,
      maxPerType: 0,
    });

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.every((r) => r.product.type === 'foundation')).toBe(true);
  });

  it('is deterministic — the same input gives the same order', () => {
    const user = profile({ categories: ['skincare'], concerns: ['dryness'] });
    const first = recommend(bundledCatalog, user, { limit: 20 });
    const second = recommend(bundledCatalog, user, { limit: 20 });

    expect(first.recommendations.map((r) => r.product.id)).toEqual(
      second.recommendations.map((r) => r.product.id),
    );
  });

  it('reports concerns nothing in the results addresses', () => {
    // A hair concern with the profile restricted to skincare can never match.
    const result = recommend(
      bundledCatalog,
      profile({ categories: ['skincare'], concerns: ['dandruff'] }),
      { limit: 10 },
    );

    expect(result.unmatchedConcerns).toContain('dandruff');
  });

  it('puts a product treating the top concern first', () => {
    const result = recommend(
      bundledCatalog,
      profile({ categories: ['skincare'], concerns: ['sun-protection'], experience: 'advanced' }),
      { limit: 3 },
    );

    expect(result.recommendations[0]!.product.targets).toContain('sun-protection');
  });

  it('attaches a shade match to complexion products and not to others', () => {
    const result = recommend(
      bundledCatalog,
      profile({ categories: ['makeup'], depth: 8, undertone: 'warm' }),
      { limit: 100, maxPerType: 0 },
    );

    for (const rec of result.recommendations) {
      if (rec.product.shades && rec.product.shades.length > 0) {
        expect(rec.shadeMatch).toBeDefined();
      } else {
        expect(rec.shadeMatch).toBeUndefined();
      }
    }
  });
});

describe('buildRoutine', () => {
  it('orders skincare steps thinnest to thickest', () => {
    const routine = buildRoutine(
      bundledCatalog,
      profile({ categories: ['skincare'], skinType: 'oily', concerns: ['acne'] }),
      { category: 'skincare', time: 'am' },
    );

    const orders = routine.steps.map((step) => step.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('puts cleanser first and sunscreen last in a morning routine', () => {
    const routine = buildRoutine(
      bundledCatalog,
      profile({ categories: ['skincare'], skinType: 'combination' }),
      { category: 'skincare', time: 'am' },
    );

    expect(routine.steps[0]!.type).toBe('cleanser');
    expect(routine.steps.at(-1)!.type).toBe('sunscreen');
  });

  it('never puts sunscreen in an evening routine', () => {
    const routine = buildRoutine(
      bundledCatalog,
      profile({ categories: ['skincare'], skinType: 'dry' }),
      { category: 'skincare', time: 'pm' },
    );

    expect(routine.steps.some((step) => step.type === 'sunscreen')).toBe(false);
  });

  it('uses each product at most once per routine', () => {
    const routine = buildRoutine(
      bundledCatalog,
      profile({ categories: ['skincare'], skinType: 'dry', concerns: ['dryness'] }),
      { category: 'skincare', time: 'pm' },
    );

    const ids = routine.steps.map((step) => step.recommendation.product.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('builds a wash-day sequence for hair', () => {
    const routine = buildRoutine(
      bundledCatalog,
      profile({ categories: ['hair'], hairType: 'curly', concerns: ['frizz', 'hair-dryness'] }),
      { category: 'hair' },
    );

    expect(routine.time).toBe('wash-day');
    expect(routine.steps.length).toBeGreaterThan(0);
    expect(routine.steps.every((step) => step.recommendation.product.category === 'hair')).toBe(
      true,
    );
  });

  it('respects the budget ceiling in every step', () => {
    const routine = buildRoutine(
      bundledCatalog,
      profile({ categories: ['skincare'], budget: { max: 20 } }),
      { category: 'skincare', time: 'am' },
    );

    expect(routine.steps.every((step) => step.recommendation.product.price <= 20)).toBe(true);
  });

  it('warns about layering an exfoliant with a retinoid at night', () => {
    const routine = buildRoutine(
      bundledCatalog,
      profile({
        categories: ['skincare'],
        skinType: 'oily',
        concerns: ['blackheads', 'uneven-texture'],
        experience: 'advanced',
      }),
      { category: 'skincare', time: 'pm' },
    );

    if (routine.steps.some((step) => step.type === 'exfoliant')) {
      expect(routine.notes.some((note) => note.includes('same night'))).toBe(true);
    }
  });

  it('gives every step actionable guidance', () => {
    const routine = buildRoutine(
      bundledCatalog,
      profile({ categories: ['skincare'], skinType: 'normal' }),
      { category: 'skincare', time: 'am' },
    );

    expect(routine.steps.length).toBeGreaterThan(0);
    expect(routine.steps.every((step) => step.guidance.length > 10)).toBe(true);
  });
});
