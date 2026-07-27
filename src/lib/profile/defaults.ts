import type { UserProfile } from '@/lib/domain/types';

/**
 * A profile with nothing answered yet.
 *
 * Every optional field is genuinely absent rather than guessed — the engine
 * treats "unknown" as neutral, so a half-finished quiz still produces sensible
 * results instead of results skewed by a made-up default.
 */
export const EMPTY_PROFILE: UserProfile = {
  categories: [],
  sensitive: false,
  colourTreated: false,
  concerns: [],
  preferences: [],
  mustHave: [],
  avoidIngredients: [],
  budget: { max: 1000 },
  experience: 'beginner',
};

/** Used by the demo link on the landing page so the app is explorable instantly. */
export const SAMPLE_PROFILE: UserProfile = {
  categories: ['skincare', 'makeup'],
  skinType: 'combination',
  undertone: 'warm',
  depth: 5,
  sensitive: false,
  colourTreated: false,
  concerns: ['acne', 'hyperpigmentation', 'large-pores', 'shade-match'],
  preferences: ['cruelty-free', 'fragrance-free'],
  mustHave: [],
  avoidIngredients: [],
  budget: { max: 60, preferredTier: 'mid' },
  finishPreference: 'natural',
  coveragePreference: 'medium',
  texturePreference: 'light',
  experience: 'intermediate',
};

/** Has the user given us enough to produce a meaningful match? */
export function isProfileUsable(profile: UserProfile): boolean {
  return profile.categories.length > 0;
}

/** Rough completeness, 0–1, for the progress indicator on the quiz. */
export function profileCompleteness(profile: UserProfile): number {
  const checks = [
    profile.categories.length > 0,
    profile.concerns.length > 0,
    profile.skinType !== undefined || profile.hairType !== undefined,
    profile.budget.preferredTier !== undefined || profile.budget.max < 1000,
    profile.preferences.length > 0 || profile.mustHave.length > 0,
    profile.undertone !== undefined ||
      profile.hairTexture !== undefined ||
      profile.finishPreference !== undefined,
  ];
  return checks.filter(Boolean).length / checks.length;
}
