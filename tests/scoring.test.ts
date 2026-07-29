import { describe, expect, it } from 'vitest';
import { WEIGHTS, concernWeights, scoreProduct } from '@/lib/engine';
import { product, profile } from './helpers';

describe('scoring weights', () => {
  it('sum to exactly 1 so the final score is a true 0-100', () => {
    const total = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it('assigns every weight a positive value', () => {
    for (const [factor, weight] of Object.entries(WEIGHTS)) {
      expect(weight, `${factor} must be positive`).toBeGreaterThan(0);
    }
  });
});

describe('concern weighting', () => {
  it('weights earlier concerns more heavily than later ones', () => {
    const weights = concernWeights(['acne', 'dullness', 'dryness']);
    expect(weights.get('acne')!).toBeGreaterThan(weights.get('dullness')!);
    expect(weights.get('dullness')!).toBeGreaterThan(weights.get('dryness')!);
  });

  it('still gives later concerns meaningful weight', () => {
    const weights = concernWeights(['acne', 'dullness', 'dryness', 'redness']);
    expect(weights.get('redness')!).toBeGreaterThan(0.4);
  });
});

describe('scoreProduct', () => {
  it('scores a product that targets the top concern above one that does not', () => {
    const user = profile({ categories: ['skincare'], concerns: ['acne'] });

    const match = scoreProduct(product({ targets: ['acne'] }), user);
    const miss = scoreProduct(product({ targets: ['dullness'] }), user);

    expect(match.score).toBeGreaterThan(miss.score);
  });

  it('ranks a product hitting two concerns above one hitting only the second', () => {
    const user = profile({ categories: ['skincare'], concerns: ['acne', 'dullness'] });

    const both = scoreProduct(product({ targets: ['acne', 'dullness'] }), user);
    const secondOnly = scoreProduct(product({ targets: ['dullness'] }), user);

    expect(both.score).toBeGreaterThan(secondOnly.score);
  });

  it('penalises a product that aggravates a stated concern', () => {
    const user = profile({ categories: ['skincare'], concerns: ['acne', 'dryness'] });

    const clean = scoreProduct(product({ targets: ['acne'] }), user);
    const drying = scoreProduct(product({ targets: ['acne'], aggravates: ['dryness'] }), user);

    expect(drying.score).toBeLessThan(clean.score);
  });

  it('surfaces the aggravation as a visible negative reason', () => {
    const user = profile({ categories: ['skincare'], concerns: ['acne', 'dryness'] });
    const result = scoreProduct(product({ targets: ['acne'], aggravates: ['dryness'] }), user);

    const negative = result.reasons.find((r) => r.polarity === 'negative');
    expect(negative).toBeDefined();
    expect(negative!.message.toLowerCase()).toContain('dryness');
  });

  it('rewards a formula matching the user skin type', () => {
    const user = profile({ categories: ['skincare'], skinType: 'oily' });

    const forOily = scoreProduct(product({ skinTypes: ['oily'] }), user);
    const forDry = scoreProduct(product({ skinTypes: ['dry'] }), user);

    expect(forOily.score).toBeGreaterThan(forDry.score);
  });

  it('rewards matching soft preferences', () => {
    const user = profile({ categories: ['skincare'], preferences: ['vegan', 'cruelty-free'] });

    const both = scoreProduct(product({ attributes: ['vegan', 'cruelty-free'] }), user);
    const neither = scoreProduct(product({ attributes: [] }), user);

    expect(both.score).toBeGreaterThan(neither.score);
  });

  it('does not double-count must-haves as soft preferences', () => {
    // Must-haves are enforced by the hard filter, so a product that satisfies
    // one should not also collect preference points for it.
    const withMustHave = profile({
      categories: ['skincare'],
      preferences: ['vegan'],
      mustHave: ['vegan'],
    });
    const item = product({ attributes: ['vegan'] });

    const scored = scoreProduct(item, withMustHave);
    const neutral = scoreProduct(item, profile({ categories: ['skincare'] }));

    expect(scored.score).toBe(neutral.score);
  });

  it('keeps every score inside 0-100', () => {
    const user = profile({
      categories: ['skincare'],
      concerns: ['acne', 'dryness', 'redness'],
      preferences: ['vegan'],
      skinType: 'oily',
    });

    const extremes = [
      product({ targets: ['acne', 'dryness', 'redness'], attributes: ['vegan'], curationScore: 100 }),
      product({ aggravates: ['acne', 'dryness', 'redness'], curationScore: 0, skinTypes: ['dry'] }),
    ];

    for (const item of extremes) {
      const { score } = scoreProduct(item, user);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it('reports the concerns it actually addressed', () => {
    const user = profile({ categories: ['skincare'], concerns: ['acne', 'dullness'] });
    const result = scoreProduct(product({ targets: ['acne', 'redness'] }), user);

    expect(result.addressedConcerns).toEqual(['acne']);
  });

  it('orders reasons with positives before trade-offs', () => {
    const user = profile({
      categories: ['skincare'],
      concerns: ['acne', 'dryness'],
      skinType: 'oily',
    });
    const result = scoreProduct(
      product({ targets: ['acne'], aggravates: ['dryness'], skinTypes: ['oily'] }),
      user,
    );

    const firstNegative = result.reasons.findIndex((r) => r.polarity === 'negative');
    const lastPositive = result.reasons.map((r) => r.polarity).lastIndexOf('positive');
    expect(firstNegative).toBeGreaterThan(lastPositive);
  });
});
