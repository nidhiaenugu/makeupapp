import Constants from 'expo-constants';
import { useMemo } from 'react';

import { createAiProvider } from '@core/ai';
import type { AiProvider } from '@core/ai';
import { useAppStore } from './useAppStore';

/** Where the deployed proxy lives, if the app was built with one configured. */
export function proxyUrl(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_AI_PROXY_URL;
  const fromConfig = (Constants.expoConfig?.extra as { aiProxyUrl?: string } | undefined)
    ?.aiProxyUrl;
  return fromEnv || fromConfig || undefined;
}

/**
 * The AI provider for the current settings.
 *
 * Rebuilt only when the mode or key changes, so the underlying SDK client is
 * not recreated on every render.
 */
export function useAiProvider(): AiProvider {
  const mode = useAppStore((state) => state.settings.aiMode);
  const apiKey = useAppStore((state) => state.apiKey);

  return useMemo(
    () => createAiProvider({ mode, apiKey, proxyUrl: proxyUrl() }),
    [mode, apiKey]
  );
}
