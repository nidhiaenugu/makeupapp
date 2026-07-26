import type { DeepPartialProfile, UserProfile } from '../types/profile';
import type { Recommendation } from '../types/recommendation';
import { intentResponseSchema, intentToProfilePatch } from './prompts';
import type { AdvisorContext, AdvisorMessage, AiProvider } from './provider';

/**
 * Calls a small backend that holds the API key.
 *
 * This is the mode to use when other people use the app: the device sends
 * plain JSON describing what it wants, and the server decides what prompt to
 * run. No key ever reaches the client. `server/` contains a deployable
 * implementation of the three endpoints below.
 */
export class ProxyAiProvider implements AiProvider {
  readonly mode = 'proxy' as const;

  constructor(private readonly baseUrl: string) {}

  get available(): boolean {
    return this.baseUrl.length > 0;
  }

  async parseIntent(text: string, current: UserProfile): Promise<DeepPartialProfile> {
    const data = await this.post<{ intent?: unknown }>('/intent', { text, profile: current });
    if (!data?.intent) return {};
    const parsed = intentResponseSchema.safeParse(data.intent);
    return parsed.success ? intentToProfilePatch(parsed.data) : {};
  }

  async explain(
    recommendation: Recommendation,
    profile: UserProfile
  ): Promise<string | undefined> {
    const data = await this.post<{ text?: string }>('/explain', {
      product: recommendation.product,
      reasons: recommendation.reasons,
      profile,
    });
    return data?.text?.trim() || undefined;
  }

  async chat(messages: AdvisorMessage[], context: AdvisorContext): Promise<string> {
    const data = await this.post<{ text?: string }>('/advisor', {
      messages,
      profile: context.profile,
      candidates: context.candidates.slice(0, 24),
    });
    if (!data?.text) {
      throw new Error('The advisor service did not return an answer.');
    }
    return data.text;
  }

  private async post<T>(path: string, body: unknown): Promise<T | undefined> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.status === 429) {
        throw new Error("The advisor is busy right now — give it a minute.");
      }
      if (!response.ok) {
        throw new Error(`The advisor service returned ${response.status}.`);
      }

      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
