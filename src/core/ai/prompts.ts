import { z } from 'zod';

import {
  ALLERGENS,
  CATEGORIES,
  COVERAGE_LEVELS,
  EFFORT_LEVELS,
  ETHICS_FLAGS,
  FINISHES,
  HAIR_CONCERNS,
  HAIR_TYPES,
  MAKEUP_STYLES,
  POROSITY_LEVELS,
  PRICE_TIERS,
  SCALP_TYPES,
  SKIN_CONCERNS,
  SKIN_TYPES,
  UNDERTONES,
} from '../types/enums';
import type { Product } from '../types/product';
import type { DeepPartialProfile, UserProfile } from '../types/profile';
import type { Recommendation } from '../types/recommendation';

/** The model used for every AI feature. Kept here so it is a one-line change. */
export const AI_MODEL = 'claude-opus-5';

/* -------------------------------------------------------------------------- */
/*                              Intent parsing                                */
/* -------------------------------------------------------------------------- */

/**
 * JSON Schema for the structured-output call.
 *
 * Structured outputs require `additionalProperties: false` and an explicit
 * `required` list on every object, so each field is listed and the model is
 * told to use null when it has no evidence — that's cheaper to validate than
 * making fields optional.
 */
export const INTENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    interests: { type: 'array', items: { type: 'string', enum: [...CATEGORIES] } },
    budget: { type: ['string', 'null'], enum: [...PRICE_TIERS, null] },
    effort: { type: ['string', 'null'], enum: [...EFFORT_LEVELS, null] },
    ethics: { type: 'array', items: { type: 'string', enum: [...ETHICS_FLAGS] } },
    avoid: { type: 'array', items: { type: 'string', enum: [...ALLERGENS] } },
    skinType: { type: ['string', 'null'], enum: [...SKIN_TYPES, null] },
    skinConcerns: { type: 'array', items: { type: 'string', enum: [...SKIN_CONCERNS] } },
    makeupFinish: { type: ['string', 'null'], enum: [...FINISHES, null] },
    makeupCoverage: { type: ['string', 'null'], enum: [...COVERAGE_LEVELS, null] },
    makeupStyle: { type: ['string', 'null'], enum: [...MAKEUP_STYLES, null] },
    makeupUndertone: { type: ['string', 'null'], enum: [...UNDERTONES, null] },
    hairType: { type: ['string', 'null'], enum: [...HAIR_TYPES, null] },
    hairPorosity: { type: ['string', 'null'], enum: [...POROSITY_LEVELS, null] },
    hairScalp: { type: ['string', 'null'], enum: [...SCALP_TYPES, null] },
    hairConcerns: { type: 'array', items: { type: 'string', enum: [...HAIR_CONCERNS] } },
  },
  required: [
    'interests',
    'budget',
    'effort',
    'ethics',
    'avoid',
    'skinType',
    'skinConcerns',
    'makeupFinish',
    'makeupCoverage',
    'makeupStyle',
    'makeupUndertone',
    'hairType',
    'hairPorosity',
    'hairScalp',
    'hairConcerns',
  ],
} as const;

const nullableEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values).nullable().optional();

/** Runtime validation of the model's reply — never trust it blindly. */
export const intentResponseSchema = z.object({
  interests: z.array(z.enum(CATEGORIES)).default([]),
  budget: nullableEnum(PRICE_TIERS),
  effort: nullableEnum(EFFORT_LEVELS),
  ethics: z.array(z.enum(ETHICS_FLAGS)).default([]),
  avoid: z.array(z.enum(ALLERGENS)).default([]),
  skinType: nullableEnum(SKIN_TYPES),
  skinConcerns: z.array(z.enum(SKIN_CONCERNS)).default([]),
  makeupFinish: nullableEnum(FINISHES),
  makeupCoverage: nullableEnum(COVERAGE_LEVELS),
  makeupStyle: nullableEnum(MAKEUP_STYLES),
  makeupUndertone: nullableEnum(UNDERTONES),
  hairType: nullableEnum(HAIR_TYPES),
  hairPorosity: nullableEnum(POROSITY_LEVELS),
  hairScalp: nullableEnum(SCALP_TYPES),
  hairConcerns: z.array(z.enum(HAIR_CONCERNS)).default([]),
});

export type IntentResponse = z.infer<typeof intentResponseSchema>;

/** Maps the flat AI response onto the nested profile shape. */
export function intentToProfilePatch(intent: IntentResponse): DeepPartialProfile {
  const patch: DeepPartialProfile = {};

  if (intent.interests.length > 0) patch.interests = intent.interests;
  if (intent.budget) patch.budget = intent.budget;
  if (intent.effort) patch.effort = intent.effort;
  if (intent.ethics.length > 0) patch.ethics = intent.ethics;
  if (intent.avoid.length > 0) patch.avoid = intent.avoid;

  const skin: NonNullable<DeepPartialProfile['skin']> = {};
  if (intent.skinType) skin.type = intent.skinType;
  if (intent.skinConcerns.length > 0) skin.concerns = intent.skinConcerns;
  if (Object.keys(skin).length > 0) patch.skin = skin;

  const makeup: NonNullable<DeepPartialProfile['makeup']> = {};
  if (intent.makeupFinish) makeup.finish = intent.makeupFinish;
  if (intent.makeupCoverage) makeup.coverage = intent.makeupCoverage;
  if (intent.makeupStyle) makeup.style = intent.makeupStyle;
  if (intent.makeupUndertone) makeup.undertone = intent.makeupUndertone;
  if (Object.keys(makeup).length > 0) patch.makeup = makeup;

  const hair: NonNullable<DeepPartialProfile['hair']> = {};
  if (intent.hairType) hair.type = intent.hairType;
  if (intent.hairPorosity) hair.porosity = intent.hairPorosity;
  if (intent.hairScalp) hair.scalp = intent.hairScalp;
  if (intent.hairConcerns.length > 0) hair.concerns = intent.hairConcerns;
  if (Object.keys(hair).length > 0) patch.hair = hair;

  return patch;
}

export const INTENT_SYSTEM_PROMPT = `You convert a person's description of their beauty needs into structured data.

Only fill a field when the text gives you clear evidence for it. Use null (or an empty array) for anything the person did not mention — guessing produces bad recommendations. Never infer skin tone, undertone or ethnicity from anything other than an explicit statement.

Map plain language onto the closest allowed value: "greasy by lunchtime" is oily skin, "nothing shiny" is a matte finish, "cheap" is the budget tier, "I break out from coconut oil" belongs in avoid, "no animal testing" is crueltyFree.`;

export function intentUserPrompt(text: string, current: UserProfile): string {
  return [
    'Here is what they already told us (do not repeat it back unless they are changing it):',
    JSON.stringify(
      {
        interests: current.interests,
        budget: current.budget,
        skinType: current.skin.type,
        skinConcerns: current.skin.concerns,
        hairType: current.hair.type,
      },
      null,
      2
    ),
    '',
    'And this is what they just wrote:',
    text.trim(),
  ].join('\n');
}

/* -------------------------------------------------------------------------- */
/*                               Explanations                                 */
/* -------------------------------------------------------------------------- */

export const EXPLAIN_SYSTEM_PROMPT = `You write one short sentence explaining why a beauty product suits a specific person.

Rules:
- Use only the facts given. Never invent ingredients, claims, prices or results.
- Address the person directly ("your oily T-zone"), never in the third person.
- One sentence, under 25 words, no emoji, no marketing superlatives.
- Never promise a result. "Salicylic acid targets the congestion you mentioned" is fine; "this will clear your acne" is not.`;

export function explainUserPrompt(
  recommendation: Recommendation,
  profile: UserProfile
): string {
  const { product } = recommendation;
  return [
    `Product: ${product.brand} ${product.name} (${product.subcategory})`,
    `Key ingredients: ${product.keyIngredients.join(', ')}`,
    `Benefits: ${product.benefits.join('; ')}`,
    `Why our engine matched it: ${recommendation.reasons.join('; ')}`,
    '',
    'About them:',
    profile.skin.type ? `- Skin: ${profile.skin.type}` : '',
    profile.skin.concerns.length ? `- Skin concerns: ${profile.skin.concerns.join(', ')}` : '',
    profile.hair.type ? `- Hair: ${profile.hair.type}` : '',
    profile.hair.concerns.length ? `- Hair concerns: ${profile.hair.concerns.join(', ')}` : '',
    profile.budget ? `- Budget: ${profile.budget}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/* -------------------------------------------------------------------------- */
/*                                  Advisor                                   */
/* -------------------------------------------------------------------------- */

export const ADVISOR_SYSTEM_PROMPT = `You are the beauty advisor inside the Glowmatch app. You are knowledgeable, warm and direct — like a good friend who happens to work behind a counter and has no sales target.

Hard rules:
- You may only recommend products from the catalog excerpt provided in the user message. If nothing there fits, say so plainly and explain what they should look for instead. Never invent a product, brand, price or ingredient.
- Refer to products as "Brand Name" exactly as written in the excerpt.
- This is cosmetic guidance, not medical advice. If someone describes painful, spreading, bleeding or rapidly worsening symptoms, or asks about a prescription, tell them to see a dermatologist or doctor and stop there.
- Keep answers short: two or three sentences unless they ask for detail. No bullet-point walls, no emoji.
- If a routine they describe has a real problem — layering two exfoliants, a retinoid with an acid on the same night, skipping SPF while using actives — say so.`;

export function advisorContextBlock(products: Product[], profile: UserProfile): string {
  const catalog = products
    .slice(0, 24)
    .map(
      (product) =>
        `- ${product.brand} ${product.name} | ${product.subcategory} | $${product.priceUsd} | ${product.keyIngredients.join(', ')} | ${product.benefits.join('; ')}`
    )
    .join('\n');

  const about = [
    profile.skin.type ? `skin: ${profile.skin.type}` : '',
    profile.skin.concerns.length ? `skin concerns: ${profile.skin.concerns.join(', ')}` : '',
    profile.hair.type ? `hair: ${profile.hair.type}` : '',
    profile.hair.concerns.length ? `hair concerns: ${profile.hair.concerns.join(', ')}` : '',
    profile.budget ? `budget: ${profile.budget}` : '',
    profile.avoid.length ? `avoiding: ${profile.avoid.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  return [
    `<about_them>${about || 'They have not filled in a profile yet.'}</about_them>`,
    '<catalog_excerpt>',
    catalog || 'No products matched their filters.',
    '</catalog_excerpt>',
  ].join('\n');
}
