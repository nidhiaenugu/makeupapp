import { describe, expect, it } from 'vitest';
import { checkExclusion, containsIngredient, summariseExclusions } from '@/lib/engine';
import { product, profile } from './helpers';

describe('hard filters', () => {
  it('excludes products outside the chosen categories', () => {
    const result = checkExclusion(
      product({ category: 'hair', type: 'shampoo' }),
      profile({ categories: ['skincare'] }),
    );
    expect(result.excluded).toBe(true);
    expect(result.reason).toBe('category');
  });

  it('excludes products marketed only to a different gender than the user selected', () => {
    const result = checkExclusion(
      product({ audience: ['men'] }),
      profile({ categories: ['skincare'], gender: 'women' }),
    );
    expect(result.excluded).toBe(true);
    expect(result.reason).toBe('gender');
  });

  it('keeps unisex products regardless of the selected gender', () => {
    const result = checkExclusion(
      product({ audience: ['women', 'men'] }),
      profile({ categories: ['skincare'], gender: 'men' }),
    );
    expect(result.excluded).toBe(false);
  });

  it('keeps a product marketed to the gender the user selected', () => {
    const result = checkExclusion(
      product({ audience: ['men'] }),
      profile({ categories: ['skincare'], gender: 'men' }),
    );
    expect(result.excluded).toBe(false);
  });

  it('does not filter by gender when the user has not stated one', () => {
    const result = checkExclusion(product({ audience: ['men'] }), profile({ categories: ['skincare'] }));
    expect(result.excluded).toBe(false);
  });

  it('excludes products over the hard budget ceiling', () => {
    const result = checkExclusion(
      product({ price: 90 }),
      profile({ categories: ['skincare'], budget: { max: 50 } }),
    );
    expect(result.excluded).toBe(true);
    expect(result.reason).toBe('budget');
  });

  it('keeps a product priced exactly at the ceiling', () => {
    const result = checkExclusion(
      product({ price: 50 }),
      profile({ categories: ['skincare'], budget: { max: 50 } }),
    );
    expect(result.excluded).toBe(false);
  });

  it('excludes products failing a must-have preference', () => {
    const result = checkExclusion(
      product({ attributes: ['vegan'] }),
      profile({ categories: ['skincare'], mustHave: ['fragrance-free'] }),
    );
    expect(result.excluded).toBe(true);
    expect(result.reason).toBe('must-have');
  });

  it('keeps products satisfying every must-have', () => {
    const result = checkExclusion(
      product({ attributes: ['vegan', 'fragrance-free'] }),
      profile({ categories: ['skincare'], mustHave: ['vegan', 'fragrance-free'] }),
    );
    expect(result.excluded).toBe(false);
  });

  it('excludes products containing an avoided ingredient', () => {
    const result = checkExclusion(
      product({ keyIngredients: ['coconut oil', 'shea butter'] }),
      profile({ categories: ['skincare'], avoidIngredients: ['coconut'] }),
    );
    expect(result.excluded).toBe(true);
    expect(result.reason).toBe('ingredient');
  });

  it('matches avoided ingredients case-insensitively', () => {
    const result = checkExclusion(
      product({ keyIngredients: ['Salicylic Acid'] }),
      profile({ categories: ['skincare'], avoidIngredients: ['SALICYLIC acid'] }),
    );
    expect(result.excluded).toBe(true);
  });

  it('ignores blank entries in the avoid list', () => {
    const result = checkExclusion(
      product({ keyIngredients: ['niacinamide'] }),
      profile({ categories: ['skincare'], avoidIngredients: ['', '   '] }),
    );
    expect(result.excluded).toBe(false);
  });

  it('holds strong actives back from beginners', () => {
    const result = checkExclusion(
      product({ potency: 3 }),
      profile({ categories: ['skincare'], experience: 'beginner' }),
    );
    expect(result.excluded).toBe(true);
    expect(result.reason).toBe('potency');
  });

  it('allows strong actives for advanced users', () => {
    const result = checkExclusion(
      product({ potency: 3 }),
      profile({ categories: ['skincare'], experience: 'advanced' }),
    );
    expect(result.excluded).toBe(false);
  });

  it('excludes the strongest actives from sensitive skin regardless of experience', () => {
    const result = checkExclusion(
      product({ potency: 3 }),
      profile({ categories: ['skincare'], experience: 'advanced', sensitive: true }),
    );
    expect(result.excluded).toBe(true);
    expect(result.reason).toBe('sensitivity');
  });
});

describe('containsIngredient', () => {
  it('matches on a substring of an ingredient', () => {
    expect(containsIngredient(product({ keyIngredients: ['hyaluronic acid'] }), 'acid')).toBe(true);
  });

  it('matches on the product name too, for named actives', () => {
    expect(containsIngredient(product({ name: 'Retinol Serum' }), 'retinol')).toBe(true);
  });

  it('returns false for an empty needle', () => {
    expect(containsIngredient(product({ keyIngredients: ['squalane'] }), '  ')).toBe(false);
  });
});

describe('summariseExclusions', () => {
  it('never mentions category exclusions, which are expected', () => {
    expect(summariseExclusions(['category', 'category'])).toEqual([]);
  });

  it('never mentions gender exclusions, which are expected', () => {
    expect(summariseExclusions(['gender', 'gender'])).toEqual([]);
  });

  it('summarises and counts the reasons worth surfacing', () => {
    const notes = summariseExclusions(['budget', 'budget', 'potency', 'category']);
    expect(notes).toHaveLength(2);
    expect(notes[0]).toContain('2');
    expect(notes[0]).toContain('budget');
  });

  it('orders notes by how many products each reason removed', () => {
    const notes = summariseExclusions(['potency', 'budget', 'budget', 'budget']);
    expect(notes[0]).toContain('budget');
  });
});
