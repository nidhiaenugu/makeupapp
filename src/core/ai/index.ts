import { ClaudeAiProvider } from './claude';
import { NullAiProvider } from './null';
import { ProxyAiProvider } from './proxy';
import type { AiMode, AiProvider } from './provider';

export interface AiConfig {
  mode: AiMode;
  apiKey?: string;
  proxyUrl?: string;
}

/**
 * Picks a provider from the user's settings, degrading to the null provider
 * whenever the chosen mode isn't actually usable (no key entered yet, no proxy
 * URL configured). Callers never have to check — they always get a provider.
 */
export function createAiProvider(config: AiConfig): AiProvider {
  switch (config.mode) {
    case 'byo-key':
      return config.apiKey ? new ClaudeAiProvider(config.apiKey) : new NullAiProvider();
    case 'proxy':
      return config.proxyUrl ? new ProxyAiProvider(config.proxyUrl) : new NullAiProvider();
    case 'off':
    default:
      return new NullAiProvider();
  }
}

export { ClaudeAiProvider } from './claude';
export { NullAiProvider } from './null';
export { ProxyAiProvider } from './proxy';
export { AiUnavailableError } from './provider';
export type { AdvisorContext, AdvisorMessage, AiMode, AiProvider } from './provider';
export { AI_MODEL } from './prompts';
