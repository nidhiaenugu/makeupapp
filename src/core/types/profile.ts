import type {
  Allergen,
  Category,
  Coverage,
  EffortLevel,
  EthicsFlag,
  Finish,
  HairConcern,
  HairDensity,
  HairType,
  MakeupStyle,
  Porosity,
  PriceTier,
  ScalpType,
  SkinConcern,
  SkinType,
  Undertone,
} from './enums';

export interface SkinProfile {
  type?: SkinType;
  /** 0 = never reacts, 4 = reacts to almost everything. */
  sensitivity?: number;
  concerns: SkinConcern[];
  /** Rough daily sun exposure — nudges SPF priority. */
  sunExposure?: 'minimal' | 'moderate' | 'high';
}

export interface MakeupProfile {
  /** 1 (fairest) to 10 (deepest). */
  depth?: number;
  undertone?: Undertone;
  coverage?: Coverage;
  finish?: Finish;
  style?: MakeupStyle;
}

export interface HairProfile {
  type?: HairType;
  density?: HairDensity;
  porosity?: Porosity;
  scalp?: ScalpType;
  concerns: HairConcern[];
  washFrequency?: 'daily' | 'few-times-week' | 'weekly';
}

/**
 * Everything the engine knows about a person. Every field is optional by design:
 * a half-finished quiz still produces useful (if less precise) recommendations,
 * and the AI intent parser can fill in a subset without clobbering the rest.
 */
export interface UserProfile {
  /** Which categories the user actually wants recommendations for. */
  interests: Category[];
  budget?: PriceTier;
  effort?: EffortLevel;
  /** Values the user requires. A product failing any of these is excluded. */
  ethics: EthicsFlag[];
  /** Ingredients to avoid entirely. Any match excludes the product. */
  avoid: Allergen[];
  skin: SkinProfile;
  makeup: MakeupProfile;
  hair: HairProfile;
  /** Optional free-text note the user typed; fed to the AI intent parser. */
  notes?: string;
  /** ISO timestamp of the last completed quiz. */
  updatedAt?: string;
}

export function createEmptyProfile(): UserProfile {
  return {
    interests: [],
    ethics: [],
    avoid: [],
    skin: { concerns: [] },
    makeup: {},
    hair: { concerns: [] },
  };
}

/** True once the user has told us enough to score anything meaningfully. */
export function isProfileUsable(profile: UserProfile): boolean {
  return profile.interests.length > 0;
}

/**
 * Deep-merges a partial profile (e.g. from the AI intent parser) onto a base.
 * Arrays are replaced, not concatenated, so "actually I'm not worried about
 * acne anymore" produces the expected result.
 */
export function mergeProfile(base: UserProfile, patch: DeepPartialProfile): UserProfile {
  return {
    ...base,
    ...stripUndefined({
      interests: patch.interests,
      budget: patch.budget,
      effort: patch.effort,
      ethics: patch.ethics,
      avoid: patch.avoid,
      notes: patch.notes,
    }),
    skin: { ...base.skin, ...stripUndefined(patch.skin ?? {}) },
    makeup: { ...base.makeup, ...stripUndefined(patch.makeup ?? {}) },
    hair: { ...base.hair, ...stripUndefined(patch.hair ?? {}) },
  };
}

export type DeepPartialProfile = Partial<Omit<UserProfile, 'skin' | 'makeup' | 'hair'>> & {
  skin?: Partial<SkinProfile>;
  makeup?: Partial<MakeupProfile>;
  hair?: Partial<HairProfile>;
};

function stripUndefined<T extends object>(value: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, v] of Object.entries(value)) {
    if (v !== undefined) {
      out[key as keyof T] = v as T[keyof T];
    }
  }
  return out;
}
