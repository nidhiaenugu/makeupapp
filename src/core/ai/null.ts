import type { AdvisorContext, AdvisorMessage, AiProvider } from './provider';
import { AiUnavailableError } from './provider';
import type { DeepPartialProfile } from '../types/profile';

/**
 * The provider used when AI is switched off — which is the default.
 *
 * Every method is a no-op that returns the "we learned nothing" value, so the
 * rest of the app takes exactly the same code path with or without AI. Only
 * `chat` throws, because a chat screen with no provider has nothing to show.
 */
export class NullAiProvider implements AiProvider {
  readonly mode = 'off' as const;
  readonly available = false;

  async parseIntent(): Promise<DeepPartialProfile> {
    return {};
  }

  async explain(): Promise<string | undefined> {
    return undefined;
  }

  async chat(_messages: AdvisorMessage[], _context: AdvisorContext): Promise<string> {
    throw new AiUnavailableError();
  }
}
