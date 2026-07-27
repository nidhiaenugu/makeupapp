import { describe, expect, it } from 'vitest';
import { bestShadeFor, describeShadeMatch, rangeCoverage, shadeConfidence } from '@/lib/engine';
import type { Shade } from '@/lib/domain/types';
import { product, profile } from './helpers';

const shade = (depth: number, undertone: Shade['undertone'], name = `Shade ${depth}`): Shade => ({
  name,
  depth,
  undertone,
  hex: '#cf9b7b',
});

describe('shadeConfidence', () => {
  it('gives a perfect score to an exact depth and undertone match', () => {
    expect(shadeConfidence(shade(5, 'warm'), 5, 'warm')).toBe(1);
  });

  it('drops as depth moves further away', () => {
    const close = shadeConfidence(shade(5, 'warm'), 5, 'warm');
    const near = shadeConfidence(shade(6, 'warm'), 5, 'warm');
    const far = shadeConfidence(shade(8, 'warm'), 5, 'warm');

    expect(close).toBeGreaterThan(near);
    expect(near).toBeGreaterThan(far);
  });

  it('weights depth more heavily than undertone', () => {
    // Right depth, wrong undertone should beat right undertone, wrong depth.
    const rightDepth = shadeConfidence(shade(5, 'cool'), 5, 'warm');
    const rightUndertone = shadeConfidence(shade(8, 'warm'), 5, 'warm');

    expect(rightDepth).toBeGreaterThan(rightUndertone);
  });

  it('treats neutral as a decent stand-in for both cool and warm', () => {
    const neutralForWarm = shadeConfidence(shade(5, 'neutral'), 5, 'warm');
    const coolForWarm = shadeConfidence(shade(5, 'cool'), 5, 'warm');

    expect(neutralForWarm).toBeGreaterThan(coolForWarm);
  });

  it('returns a neutral 0.5 when the user has given us nothing to match on', () => {
    expect(shadeConfidence(shade(5, 'warm'), undefined, undefined)).toBe(0.5);
  });

  it('scores on undertone alone when depth is unknown', () => {
    const match = shadeConfidence(shade(5, 'warm'), undefined, 'warm');
    const mismatch = shadeConfidence(shade(5, 'cool'), undefined, 'warm');
    expect(match).toBeGreaterThan(mismatch);
  });
});

describe('bestShadeFor', () => {
  it('returns undefined for products with no shade range', () => {
    expect(bestShadeFor(product(), profile({ depth: 5 }))).toBeUndefined();
  });

  it('picks the closest shade in the range', () => {
    const item = product({
      shades: [shade(1, 'cool', 'Fair'), shade(5, 'warm', 'Medium'), shade(9, 'neutral', 'Deep')],
    });

    const match = bestShadeFor(item, profile({ depth: 5, undertone: 'warm' }));
    expect(match!.shade.name).toBe('Medium');
  });

  it('still returns the nearest shade when the range is a poor fit', () => {
    const item = product({ shades: [shade(1, 'cool', 'Fair'), shade(2, 'cool', 'Light')] });

    const match = bestShadeFor(item, profile({ depth: 10, undertone: 'warm' }));
    expect(match!.shade.name).toBe('Light');
    expect(match!.confidence).toBeLessThan(0.4);
  });
});

describe('rangeCoverage', () => {
  it('is 1 when the user depth sits inside the range', () => {
    const item = product({ shades: [shade(2, 'cool'), shade(8, 'warm')] });
    expect(rangeCoverage(item, profile({ depth: 5 }))).toBe(1);
  });

  it('falls off when the user is outside the range', () => {
    const item = product({ shades: [shade(1, 'cool'), shade(4, 'warm')] });
    const coverage = rangeCoverage(item, profile({ depth: 9 }))!;
    expect(coverage).toBeLessThan(0.5);
  });

  it('is undefined without a shade range or a stated depth', () => {
    expect(rangeCoverage(product(), profile({ depth: 5 }))).toBeUndefined();
    expect(rangeCoverage(product({ shades: [shade(5, 'warm')] }), profile())).toBeUndefined();
  });
});

describe('describeShadeMatch', () => {
  it('is confident about a strong match', () => {
    const message = describeShadeMatch(
      { shade: shade(5, 'warm', 'Honey'), confidence: 0.95 },
      profile({ depth: 5, undertone: 'warm' }),
    );
    expect(message).toContain('Honey');
    expect(message).toContain('close match');
  });

  it('says plainly when a range does not cover the user', () => {
    const message = describeShadeMatch(
      { shade: shade(3, 'cool', 'Light'), confidence: 0.2 },
      profile({ depth: 10, undertone: 'warm' }),
    );
    expect(message).toContain('does not cover your shade');
  });

  it('asks for more information when the profile has none', () => {
    const message = describeShadeMatch(
      { shade: shade(5, 'warm', 'Honey'), confidence: 0.5 },
      profile(),
    );
    expect(message).toContain('tell us your depth');
  });
});
