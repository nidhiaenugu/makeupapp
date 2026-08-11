import type {
  Category,
  Coverage,
  ExperienceLevel,
  Finish,
  Gender,
  HairTexture,
  HairType,
  Porosity,
  Potency,
  PreferenceId,
  PriceTier,
  ProductType,
  RoutineTime,
  ScalpType,
  SkinType,
  Undertone,
  Weight,
} from './taxonomy';

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

/** A single shade in a complexion product's range. */
export interface Shade {
  name: string;
  /** 1–10, matching the depth scale in taxonomy.ts. */
  depth: number;
  undertone: Undertone;
  /** Hex swatch, for the shade picker UI. */
  hex: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: Category;
  type: ProductType;
  /** One or two sentences, written for a shopper rather than a chemist. */
  description: string;

  /** Approximate full-size RRP in USD. See docs/CATALOG.md on data accuracy. */
  price: number;
  size?: string;

  /**
   * Who the product is marketed to. Defaults to both — almost nothing in
   * skincare or haircare is inherently gendered — and is only narrowed when
   * a brand genuinely formulates and markets a line for one audience.
   */
  audience: Gender[];

  /** Skin types the formula suits. Empty means "suits all / not applicable". */
  skinTypes: SkinType[];
  /** Hair types the formula suits. Empty means "suits all / not applicable". */
  hairTypes: HairType[];
  hairTextures: HairTexture[];
  porosities: Porosity[];
  scalpTypes: ScalpType[];

  /** Concern ids this product is intended to address. */
  targets: string[];
  /** Concern ids this product tends to make worse — a scoring penalty. */
  aggravates: string[];

  keyIngredients: string[];
  /** Preference ids the product satisfies (vegan, fragrance-free, …). */
  attributes: PreferenceId[];

  finish?: Finish;
  coverage?: Coverage;
  /** How the formula feels on the skin or hair. */
  weight?: Weight;
  spf?: number;
  /** 1–3; gates strong actives away from beginners. */
  potency: Potency;

  shades?: Shade[];

  /** When in a routine this belongs. Empty means "not a routine step". */
  routineTimes: RoutineTime[];

  /**
   * Editorial curation weight, 0–100. This is a hand-assigned signal for how
   * broadly recommendable a product is — NOT a scraped review average.
   * See docs/CATALOG.md.
   */
  curationScore: number;

  tags: string[];
}

/** A product with its price tier resolved, as served by the API. */
export interface ProductWithTier extends Product {
  priceTier: PriceTier;
}

// ---------------------------------------------------------------------------
// User profile
// ---------------------------------------------------------------------------

export interface UserProfile {
  /** Which categories the user wants recommendations for. */
  categories: Category[];

  /** Filters out products marketed to the other audience; unisex products always pass. */
  gender?: Gender;

  // skin
  skinType?: SkinType;
  undertone?: Undertone;
  /** 1–10 depth scale, for shade matching. */
  depth?: number;
  sensitive: boolean;

  // hair
  hairType?: HairType;
  hairTexture?: HairTexture;
  porosity?: Porosity;
  scalpType?: ScalpType;
  colourTreated: boolean;

  /** Concern ids, ordered — earlier entries are weighted more heavily. */
  concerns: string[];

  /** Preferences that are nice-to-have; they add score. */
  preferences: PreferenceId[];
  /**
   * Preferences that are non-negotiable; products failing these are removed
   * entirely rather than merely scored down.
   */
  mustHave: PreferenceId[];

  /** Free-text ingredients to exclude, e.g. an allergy. Case-insensitive. */
  avoidIngredients: string[];

  budget: {
    /** Hard ceiling per product, USD. */
    max: number;
    /** Preferred tier — scored, not enforced. */
    preferredTier?: PriceTier;
  };

  finishPreference?: Finish;
  coveragePreference?: Coverage;
  texturePreference?: Weight;
  experience: ExperienceLevel;
}

// ---------------------------------------------------------------------------
// Recommendation output
// ---------------------------------------------------------------------------

/** One line of the "why we picked this" breakdown. */
export interface MatchReason {
  /** Machine-readable factor id, e.g. "concerns" or "budget". */
  factor: string;
  /** Human-readable sentence shown in the UI. */
  message: string;
  /** Points this factor contributed to the final 0–100 score. */
  impact: number;
  /** Positive reasons are strengths; negative ones are trade-offs. */
  polarity: 'positive' | 'negative';
}

export interface ShadeMatch {
  shade: Shade;
  /** 0–1, where 1 is an exact depth + undertone match. */
  confidence: number;
}

export interface Recommendation {
  product: ProductWithTier;
  /** Final match score, 0–100. */
  score: number;
  reasons: MatchReason[];
  /** Concern ids this product addresses for this specific user. */
  addressesConcerns: string[];
  /** Best shade for the user, for complexion products with a shade range. */
  shadeMatch?: ShadeMatch;
}

export interface RecommendationSet {
  recommendations: Recommendation[];
  /** How many products were considered before filtering. */
  considered: number;
  /** How many survived the hard filters. */
  eligible: number;
  /** Concern ids the user selected that nothing in the catalog covers. */
  unmatchedConcerns: string[];
  /** Human-readable notes about filters that removed a lot of the catalog. */
  notes: string[];
}

/** A generated routine: ordered steps for a given time of day. */
export interface RoutineStep {
  order: number;
  type: ProductType;
  recommendation: Recommendation;
  /** Guidance for this step, e.g. "Start twice a week and build up". */
  guidance: string;
}

export interface Routine {
  time: RoutineTime | 'wash-day';
  category: Category;
  steps: RoutineStep[];
  notes: string[];
}
