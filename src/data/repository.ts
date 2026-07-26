import type { UserProfile } from '@core/types/profile';

export interface AppSettings {
  theme: 'system' | 'light' | 'dark';
  /** Which AI backend to use. `off` keeps the app entirely local. */
  aiMode: 'off' | 'byo-key' | 'proxy';
  /** Rewrite engine reasons into friendlier copy when an AI provider is available. */
  aiExplanations: boolean;
  /** Set once the user has acknowledged the "this is not medical advice" notice. */
  acknowledgedDisclaimer: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  aiMode: 'off',
  aiExplanations: true,
  acknowledgedDisclaimer: false,
};

/**
 * Persistence seams.
 *
 * The app never touches AsyncStorage directly — it goes through these three
 * interfaces. Adding accounts later means writing a `RemoteProfileRepository`
 * that calls an API and swapping it in at startup; no screen or store changes.
 */
export interface ProfileRepository {
  load(): Promise<UserProfile | undefined>;
  save(profile: UserProfile): Promise<void>;
  clear(): Promise<void>;
}

export interface FavoritesRepository {
  load(): Promise<string[]>;
  save(productIds: string[]): Promise<void>;
}

export interface SettingsRepository {
  load(): Promise<AppSettings>;
  save(settings: AppSettings): Promise<void>;
}

/** Secrets never go in AsyncStorage — this is backed by the device keychain. */
export interface SecretRepository {
  getApiKey(): Promise<string | undefined>;
  setApiKey(key: string): Promise<void>;
  clearApiKey(): Promise<void>;
}
