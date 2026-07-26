import type { Product } from './product';

/** The scoring signals. Each one contributes `weight * value` to the total. */
export type SignalKey =
  | 'concern'
  | 'type'
  | 'preference'
  | 'shade'
  | 'budget'
  | 'effort'
  | 'social';

export interface SignalScore {
  key: SignalKey;
  /** Normalised 0-1 before weighting. */
  value: number;
  weight: number;
  /** Why this signal scored what it did, in plain English. */
  reasons: string[];
}

export interface Recommendation {
  product: Product;
  /** 0-100, weighted sum of all signals. */
  score: number;
  signals: SignalScore[];
  /** Headline reasons, already ranked by how much they moved the score. */
  reasons: string[];
  /** Things worth knowing before buying — never blockers. */
  warnings: string[];
  /** Set when an AI provider has rewritten the reasons into friendlier copy. */
  aiSummary?: string;
}

export interface ExclusionReason {
  productId: string;
  /** Machine-readable so the UI can offer "loosen this filter". */
  rule: 'allergen' | 'ethics' | 'budget' | 'category';
  detail: string;
}

export interface RecommendationResult {
  recommendations: Recommendation[];
  /** Products removed by hard filters, with the rule that removed them. */
  excluded: ExclusionReason[];
  /** How many products were considered before filtering. */
  consideredCount: number;
}

export interface RoutineStep {
  order: number;
  /** e.g. "Cleanse", "Treat", "Protect" */
  label: string;
  recommendation: Recommendation;
  /** Soft advisories from conflict detection, e.g. "alternate nights with your retinol". */
  notes: string[];
}

export interface Routine {
  id: string;
  title: string;
  subtitle: string;
  steps: RoutineStep[];
  /** Sum of the products' prices. */
  totalPriceUsd: number;
  /** Conflicts that could not be resolved by swapping products. */
  warnings: string[];
}
