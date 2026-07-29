import { DEPTH_LABELS, DEPTH_MAX, DEPTH_MIN } from '@/lib/domain/taxonomy';
import type { Undertone } from '@/lib/domain/taxonomy';
import type { Product, Shade, ShadeMatch, UserProfile } from '@/lib/domain/types';

/**
 * Shade matching for complexion products.
 *
 * Depth dominates: a foundation two steps too light is obvious across a room,
 * whereas a slightly-off undertone reads as a minor warmth mismatch. So depth
 * carries 70% of the confidence and undertone 30%.
 */

const DEPTH_WEIGHT = 0.7;
const UNDERTONE_WEIGHT = 0.3;

/** Depth difference beyond which a shade is simply the wrong colour. */
const MAX_USEFUL_DEPTH_DELTA = 3;

/**
 * How interchangeable two undertones are, 0–1.
 *
 * Olive sits between neutral and warm in practice — olive skin usually looks
 * better in a neutral than in a cool — so the table is deliberately not
 * symmetric around a simple "same or different" test.
 */
const UNDERTONE_AFFINITY: Record<Undertone, Record<Undertone, number>> = {
  cool: { cool: 1, neutral: 0.65, olive: 0.25, warm: 0.15 },
  neutral: { neutral: 1, cool: 0.65, warm: 0.65, olive: 0.55 },
  warm: { warm: 1, neutral: 0.65, olive: 0.6, cool: 0.15 },
  olive: { olive: 1, neutral: 0.6, warm: 0.55, cool: 0.2 },
};

/**
 * Depth proximity, 0–1, for a given number of steps away.
 *
 * The useful range decays fast (an exact match to near-useless over three
 * steps), but the tail past that keeps decaying instead of flattening to zero.
 * That matters: if every shade in a range is far from the user, "closest" must
 * still be meaningful — otherwise a deep-skinned user gets handed the *lightest*
 * shade in a pale range purely because it was first in the array.
 */
function depthProximity(delta: number): number {
  const FLOOR = 0.08;
  if (delta <= MAX_USEFUL_DEPTH_DELTA) {
    return 1 - (delta / MAX_USEFUL_DEPTH_DELTA) * (1 - FLOOR);
  }
  const overshoot = (delta - MAX_USEFUL_DEPTH_DELTA) / (DEPTH_MAX - DEPTH_MIN);
  return Math.max(0, FLOOR * (1 - overshoot));
}

export function shadeConfidence(
  shade: Shade,
  depth: number | undefined,
  undertone: Undertone | undefined,
): number {
  // With nothing to match against, every shade is equally plausible.
  if (depth === undefined && undertone === undefined) return 0.5;

  let score = 0;
  let weight = 0;

  if (depth !== undefined) {
    score += depthProximity(Math.abs(shade.depth - depth)) * DEPTH_WEIGHT;
    weight += DEPTH_WEIGHT;
  }

  if (undertone !== undefined) {
    score += (UNDERTONE_AFFINITY[undertone]?.[shade.undertone] ?? 0) * UNDERTONE_WEIGHT;
    weight += UNDERTONE_WEIGHT;
  }

  return weight === 0 ? 0.5 : score / weight;
}

/** Best shade in a product's range for this user, if it has a range at all. */
export function bestShadeFor(product: Product, profile: UserProfile): ShadeMatch | undefined {
  if (!product.shades || product.shades.length === 0) return undefined;

  let best: ShadeMatch | undefined;
  for (const shade of product.shades) {
    const confidence = shadeConfidence(shade, profile.depth, profile.undertone);
    if (!best || confidence > best.confidence) {
      best = { shade, confidence };
    }
  }
  return best;
}

/** Sentence describing a shade match, for the product card and detail page. */
export function describeShadeMatch(match: ShadeMatch, profile: UserProfile): string {
  const { shade, confidence } = match;

  if (profile.depth === undefined && profile.undertone === undefined) {
    return `${shade.name} — tell us your depth and undertone for a precise match.`;
  }

  if (confidence >= 0.9) {
    return `${shade.name} should be a close match for your ${shade.undertone} undertone.`;
  }
  if (confidence >= 0.7) {
    return `${shade.name} is the closest shade — worth swatching before you commit.`;
  }
  if (confidence >= 0.45) {
    const depthNote =
      profile.depth !== undefined
        ? ` This range is aimed at ${DEPTH_LABELS[shade.depth] ?? 'other'} depths.`
        : '';
    return `${shade.name} is the nearest option, but it is not an exact match.${depthNote}`;
  }
  return `This range does not cover your shade well — ${shade.name} is the closest it gets.`;
}

/**
 * How well a product's *range* serves this user, independent of the single
 * best shade. A ten-shade range that stops at medium depth is a worse product
 * for a deep-skinned user even if its darkest shade is "the closest".
 */
export function rangeCoverage(product: Product, profile: UserProfile): number | undefined {
  if (!product.shades || product.shades.length === 0 || profile.depth === undefined) {
    return undefined;
  }
  const depths = product.shades.map((s) => s.depth);
  const min = Math.min(...depths);
  const max = Math.max(...depths);

  if (profile.depth >= min && profile.depth <= max) return 1;

  const distance = profile.depth < min ? min - profile.depth : profile.depth - max;
  return Math.max(0, 1 - distance / MAX_USEFUL_DEPTH_DELTA);
}
