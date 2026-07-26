import type { Product } from '../types/product';
import type { DeepPartialProfile, UserProfile } from '../types/profile';
import type { Recommendation } from '../types/recommendation';

export type AiMode = 'off' | 'byo-key' | 'proxy';

export interface AdvisorMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AdvisorContext {
  profile: UserProfile;
  /** Products the engine already shortlisted — the AI may only recommend these. */
  candidates: Product[];
}

/**
 * The AI seam.
 *
 * Everything AI-shaped goes through this interface, and every method is
 * allowed to fail: callers fall back to the deterministic engine rather than
 * showing an error. `NullAiProvider` implements the whole thing as no-ops, so
 * the app behaves identically with AI switched off.
 */
export interface AiProvider {
  readonly mode: AiMode;
  /** False when the provider has no credentials and cannot do anything useful. */
  readonly available: boolean;

  /**
   * Turns "oily but dehydrated, hate anything sticky, under $30" into profile
   * fields. Returns an empty patch if it can't parse anything confidently.
   */
  parseIntent(text: string, current: UserProfile): Promise<DeepPartialProfile>;

  /** Rewrites engine reasons into a warmer sentence. Returns undefined on failure. */
  explain(
    recommendation: Recommendation,
    profile: UserProfile
  ): Promise<string | undefined>;

  /** Answers a question grounded in the supplied candidate products. */
  chat(messages: AdvisorMessage[], context: AdvisorContext): Promise<string>;
}

export class AiUnavailableError extends Error {
  constructor(message = 'The beauty advisor is switched off.') {
    super(message);
    this.name = 'AiUnavailableError';
  }
}
