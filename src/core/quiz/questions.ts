import {
  ALLERGENS,
  ALLERGEN_LABELS,
  CATEGORIES,
  CATEGORY_LABELS,
  COVERAGE_LEVELS,
  EFFORT_LABELS,
  EFFORT_LEVELS,
  ETHICS_FLAGS,
  ETHICS_LABELS,
  FINISHES,
  HAIR_CONCERNS,
  HAIR_CONCERN_LABELS,
  HAIR_DENSITIES,
  HAIR_TYPES,
  MAKEUP_STYLES,
  POROSITY_LEVELS,
  PRICE_TIERS,
  PRICE_TIER_LABELS,
  SCALP_TYPES,
  SKIN_CONCERNS,
  SKIN_CONCERN_LABELS,
  SKIN_TYPES,
  UNDERTONES,
} from '../types/enums';
import type { Category } from '../types/enums';
import type { UserProfile } from '../types/profile';

export type QuestionKind = 'single' | 'multi' | 'scale' | 'depth' | 'text';

export interface QuestionOption {
  value: string;
  label: string;
  /** Optional one-liner shown under the option label. */
  hint?: string;
}

/**
 * A quiz question, described entirely as data.
 *
 * `read` and `write` are the only place a question knows about the shape of
 * `UserProfile`. The quiz screen renders whatever this array contains, so
 * adding a question means adding an entry here — no UI changes, no new route.
 */
export interface Question {
  id: string;
  kind: QuestionKind;
  title: string;
  subtitle?: string;
  /** Only asked when the user is interested in one of these categories. */
  requiresCategory?: Category;
  /** Multi-select questions can be answered with nothing selected. */
  optional?: boolean;
  options?: QuestionOption[];
  /** For `scale`: inclusive bounds and end labels. */
  scale?: { min: number; max: number; minLabel: string; maxLabel: string };
  placeholder?: string;
  read: (profile: UserProfile) => string[] | number | string | undefined;
  write: (profile: UserProfile, answer: QuizAnswer) => UserProfile;
}

export type QuizAnswer = string[] | number | string;

const optionsFrom = (
  values: readonly string[],
  labels?: Record<string, string>,
  hints?: Record<string, string>
): QuestionOption[] =>
  values.map((value) => ({
    value,
    label: labels?.[value] ?? toTitle(value),
    ...(hints?.[value] ? { hint: hints[value] } : {}),
  }));

function toTitle(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const asArray = (answer: QuizAnswer): string[] => (Array.isArray(answer) ? answer : []);
const asString = (answer: QuizAnswer): string | undefined =>
  typeof answer === 'string' ? answer : Array.isArray(answer) ? answer[0] : undefined;
const asNumber = (answer: QuizAnswer): number | undefined =>
  typeof answer === 'number' ? answer : undefined;

export const QUESTIONS: Question[] = [
  {
    id: 'interests',
    kind: 'multi',
    title: 'What are you shopping for?',
    subtitle: 'Pick everything you want recommendations for. You can change this later.',
    options: optionsFrom(CATEGORIES, CATEGORY_LABELS, {
      skincare: 'Cleansers, serums, moisturisers, SPF',
      makeup: 'Complexion, eyes, lips',
      hair: 'Wash, treat, style',
    }),
    read: (p) => p.interests,
    write: (p, a) => ({ ...p, interests: asArray(a) as Category[] }),
  },

  /* ------------------------------- Skincare ------------------------------- */
  {
    id: 'skin-type',
    kind: 'single',
    title: 'How would you describe your skin?',
    requiresCategory: 'skincare',
    options: optionsFrom(SKIN_TYPES, undefined, {
      dry: 'Feels tight, flakes sometimes',
      oily: 'Shiny within a few hours',
      combination: 'Oily T-zone, drier cheeks',
      normal: 'Balanced most days',
      sensitive: 'Reacts and reddens easily',
    }),
    read: (p) => p.skin.type,
    write: (p, a) => ({ ...p, skin: { ...p.skin, type: asString(a) as UserProfile['skin']['type'] } }),
  },
  {
    id: 'skin-concerns',
    kind: 'multi',
    title: 'What would you most like to improve?',
    subtitle: 'Choose up to four — the more focused, the better the matches.',
    requiresCategory: 'skincare',
    optional: true,
    options: optionsFrom(SKIN_CONCERNS, SKIN_CONCERN_LABELS),
    read: (p) => p.skin.concerns,
    write: (p, a) => ({
      ...p,
      skin: { ...p.skin, concerns: asArray(a) as UserProfile['skin']['concerns'] },
    }),
  },
  {
    id: 'skin-sensitivity',
    kind: 'scale',
    title: 'How reactive is your skin?',
    subtitle: 'This decides how cautiously we treat actives and fragrance.',
    requiresCategory: 'skincare',
    scale: { min: 0, max: 4, minLabel: 'Never reacts', maxLabel: 'Reacts to most things' },
    read: (p) => p.skin.sensitivity,
    write: (p, a) => ({ ...p, skin: { ...p.skin, sensitivity: asNumber(a) } }),
  },
  {
    id: 'sun-exposure',
    kind: 'single',
    title: 'How much sun do you get on a normal day?',
    requiresCategory: 'skincare',
    options: [
      { value: 'minimal', label: 'Barely any', hint: 'Mostly indoors' },
      { value: 'moderate', label: 'Some', hint: 'Commute, errands, a walk' },
      { value: 'high', label: 'A lot', hint: 'Outdoors for hours' },
    ],
    read: (p) => p.skin.sunExposure,
    write: (p, a) => ({
      ...p,
      skin: { ...p.skin, sunExposure: asString(a) as UserProfile['skin']['sunExposure'] },
    }),
  },

  /* -------------------------------- Makeup -------------------------------- */
  {
    id: 'makeup-depth',
    kind: 'depth',
    title: 'Which depth is closest to your skin?',
    subtitle: 'Used to check a shade range actually covers you.',
    requiresCategory: 'makeup',
    read: (p) => p.makeup.depth,
    write: (p, a) => ({ ...p, makeup: { ...p.makeup, depth: asNumber(a) } }),
  },
  {
    id: 'makeup-undertone',
    kind: 'single',
    title: "What's your undertone?",
    subtitle: 'Look at the veins on your inner wrist in daylight.',
    requiresCategory: 'makeup',
    options: optionsFrom(UNDERTONES, undefined, {
      cool: 'Veins look blue or purple; silver suits you',
      neutral: 'A mix of both; most metals suit you',
      warm: 'Veins look green; gold suits you',
      olive: 'A green or grey cast alongside warmth',
    }),
    read: (p) => p.makeup.undertone,
    write: (p, a) => ({
      ...p,
      makeup: { ...p.makeup, undertone: asString(a) as UserProfile['makeup']['undertone'] },
    }),
  },
  {
    id: 'makeup-coverage',
    kind: 'single',
    title: 'How much coverage do you like?',
    requiresCategory: 'makeup',
    options: optionsFrom(COVERAGE_LEVELS, undefined, {
      sheer: 'Just a wash of colour',
      light: 'Evens things out, still skin-like',
      medium: 'Covers redness and most spots',
      full: 'Covers everything',
    }),
    read: (p) => p.makeup.coverage,
    write: (p, a) => ({
      ...p,
      makeup: { ...p.makeup, coverage: asString(a) as UserProfile['makeup']['coverage'] },
    }),
  },
  {
    id: 'makeup-finish',
    kind: 'single',
    title: 'What finish are you after?',
    requiresCategory: 'makeup',
    options: optionsFrom(FINISHES, undefined, {
      matte: 'No shine at all',
      natural: 'Skin that looks like skin',
      satin: 'A soft, low sheen',
      dewy: 'Fresh and glowy',
      radiant: 'Lit-from-within, luminous',
    }),
    read: (p) => p.makeup.finish,
    write: (p, a) => ({
      ...p,
      makeup: { ...p.makeup, finish: asString(a) as UserProfile['makeup']['finish'] },
    }),
  },
  {
    id: 'makeup-style',
    kind: 'single',
    title: 'What does your everyday look like?',
    requiresCategory: 'makeup',
    options: optionsFrom(MAKEUP_STYLES, undefined, {
      natural: 'Five minutes, barely there',
      polished: 'Put together, not loud',
      glam: 'Full face, liner and lashes',
      bold: 'Strong lip or strong eye',
      editorial: 'Experimental and colourful',
    }),
    read: (p) => p.makeup.style,
    write: (p, a) => ({
      ...p,
      makeup: { ...p.makeup, style: asString(a) as UserProfile['makeup']['style'] },
    }),
  },

  /* --------------------------------- Hair --------------------------------- */
  {
    id: 'hair-type',
    kind: 'single',
    title: "What's your hair texture?",
    requiresCategory: 'hair',
    options: optionsFrom(HAIR_TYPES, undefined, {
      straight: 'Type 1 — no natural bend',
      wavy: 'Type 2 — loose S-shapes',
      curly: 'Type 3 — defined ringlets',
      coily: 'Type 4 — tight coils or zig-zags',
    }),
    read: (p) => p.hair.type,
    write: (p, a) => ({ ...p, hair: { ...p.hair, type: asString(a) as UserProfile['hair']['type'] } }),
  },
  {
    id: 'hair-density',
    kind: 'single',
    title: 'How thick is each strand?',
    requiresCategory: 'hair',
    options: optionsFrom(HAIR_DENSITIES, undefined, {
      fine: 'Thin strands, weighed down easily',
      medium: 'Neither fine nor coarse',
      thick: 'Coarse strands, needs a lot of product',
    }),
    read: (p) => p.hair.density,
    write: (p, a) => ({
      ...p,
      hair: { ...p.hair, density: asString(a) as UserProfile['hair']['density'] },
    }),
  },
  {
    id: 'hair-porosity',
    kind: 'single',
    title: 'How quickly does your hair soak up water?',
    subtitle: 'Porosity decides how rich a product should be.',
    requiresCategory: 'hair',
    options: [
      { value: 'low', label: 'Slowly', hint: 'Water beads up; products sit on top' },
      { value: 'medium', label: 'Normally', hint: 'Wets and dries at an average pace' },
      { value: 'high', label: 'Instantly', hint: 'Soaks up fast, dries fast, feels dry' },
    ],
    read: (p) => p.hair.porosity,
    write: (p, a) => ({
      ...p,
      hair: { ...p.hair, porosity: asString(a) as UserProfile['hair']['porosity'] },
    }),
  },
  {
    id: 'hair-scalp',
    kind: 'single',
    title: "How's your scalp?",
    requiresCategory: 'hair',
    options: optionsFrom(SCALP_TYPES, undefined, {
      dry: 'Tight, sometimes itchy',
      oily: 'Greasy within a day',
      balanced: 'No complaints',
      flaky: 'Visible flakes',
      sensitive: 'Stings or reddens easily',
    }),
    read: (p) => p.hair.scalp,
    write: (p, a) => ({ ...p, hair: { ...p.hair, scalp: asString(a) as UserProfile['hair']['scalp'] } }),
  },
  {
    id: 'hair-concerns',
    kind: 'multi',
    title: 'What are you trying to fix?',
    requiresCategory: 'hair',
    optional: true,
    options: optionsFrom(HAIR_CONCERNS, HAIR_CONCERN_LABELS),
    read: (p) => p.hair.concerns,
    write: (p, a) => ({
      ...p,
      hair: { ...p.hair, concerns: asArray(a) as UserProfile['hair']['concerns'] },
    }),
  },
  {
    id: 'hair-wash',
    kind: 'single',
    title: 'How often do you wash your hair?',
    requiresCategory: 'hair',
    options: [
      { value: 'daily', label: 'Every day' },
      { value: 'few-times-week', label: 'A few times a week' },
      { value: 'weekly', label: 'Once a week or less' },
    ],
    read: (p) => p.hair.washFrequency,
    write: (p, a) => ({
      ...p,
      hair: { ...p.hair, washFrequency: asString(a) as UserProfile['hair']['washFrequency'] },
    }),
  },

  /* -------------------------------- Shared -------------------------------- */
  {
    id: 'budget',
    kind: 'single',
    title: "What's your usual spend?",
    subtitle: 'Nothing above this range will be recommended.',
    options: optionsFrom(PRICE_TIERS, PRICE_TIER_LABELS, {
      budget: 'Under $20',
      mid: '$20 to $45',
      luxury: 'No limit',
    }),
    read: (p) => p.budget,
    write: (p, a) => ({ ...p, budget: asString(a) as UserProfile['budget'] }),
  },
  {
    id: 'effort',
    kind: 'single',
    title: 'How much time do you want to spend?',
    options: optionsFrom(EFFORT_LEVELS, EFFORT_LABELS, {
      low: 'Two or three products, tops',
      medium: 'A handful of steps',
      high: 'I enjoy a long routine',
    }),
    read: (p) => p.effort,
    write: (p, a) => ({ ...p, effort: asString(a) as UserProfile['effort'] }),
  },
  {
    id: 'ethics',
    kind: 'multi',
    title: 'Any of these matter to you?',
    subtitle: 'Products that fail these are removed entirely.',
    optional: true,
    options: optionsFrom(ETHICS_FLAGS, ETHICS_LABELS),
    read: (p) => p.ethics,
    write: (p, a) => ({ ...p, ethics: asArray(a) as UserProfile['ethics'] }),
  },
  {
    id: 'avoid',
    kind: 'multi',
    title: 'Anything you need to avoid?',
    subtitle: "We'll never show you a product containing these.",
    optional: true,
    options: optionsFrom(ALLERGENS, ALLERGEN_LABELS),
    read: (p) => p.avoid,
    write: (p, a) => ({ ...p, avoid: asArray(a) as UserProfile['avoid'] }),
  },
  {
    id: 'notes',
    kind: 'text',
    title: 'Anything else we should know?',
    subtitle:
      'Optional. Write it however you like — "oily but dehydrated, hate anything sticky, under $30".',
    optional: true,
    placeholder: 'Tell us in your own words…',
    read: (p) => p.notes,
    write: (p, a) => ({ ...p, notes: asString(a) }),
  },
];

/** The questions that apply to a given profile, in order. */
export function visibleQuestions(profile: UserProfile): Question[] {
  return QUESTIONS.filter(
    (question) =>
      !question.requiresCategory || profile.interests.includes(question.requiresCategory)
  );
}

/** True when a question has an answer good enough to move on. */
export function isAnswered(question: Question, profile: UserProfile): boolean {
  if (question.optional) return true;
  const value = question.read(profile);
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== '';
}
