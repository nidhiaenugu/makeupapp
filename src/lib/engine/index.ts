/**
 * Public surface of the recommendation engine.
 *
 * The engine has no dependency on Next.js, React or any storage layer — it is
 * plain TypeScript over the domain types. Import it from a script, a worker or
 * another service exactly as the web app does.
 */
export { recommend, groupByType, withTier } from './recommend';
export type { RecommendOptions } from './recommend';
export { buildRoutine } from './routine';
export type { BuildRoutineOptions } from './routine';
export { scoreProduct, WEIGHTS, concernWeights } from './scoring';
export type { ScoreBreakdown, ScoreFactor } from './scoring';
export { checkExclusion, summariseExclusions, containsIngredient } from './filters';
export { bestShadeFor, shadeConfidence, describeShadeMatch, rangeCoverage } from './shade';
