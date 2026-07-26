import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { createEmptyProfile } from '@core/types/profile';
import type { UserProfile } from '@core/types/profile';
import type {
  AppSettings,
  FavoritesRepository,
  ProfileRepository,
  SecretRepository,
  SettingsRepository,
} from './repository';
import { DEFAULT_SETTINGS } from './repository';

const KEYS = {
  profile: 'glowmatch.profile.v1',
  favorites: 'glowmatch.favorites.v1',
  settings: 'glowmatch.settings.v1',
  apiKey: 'glowmatch.anthropicApiKey',
} as const;

async function readJson<T>(key: string): Promise<T | undefined> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    // Corrupt or unreadable storage should never crash the app — the user just
    // starts fresh.
    return undefined;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export class AsyncStorageProfileRepository implements ProfileRepository {
  async load(): Promise<UserProfile | undefined> {
    const stored = await readJson<Partial<UserProfile>>(KEYS.profile);
    if (!stored) return undefined;
    // Merge onto a fresh profile so a schema addition never leaves a field
    // undefined that the rest of the app assumes exists.
    const base = createEmptyProfile();
    return {
      ...base,
      ...stored,
      interests: stored.interests ?? base.interests,
      ethics: stored.ethics ?? base.ethics,
      avoid: stored.avoid ?? base.avoid,
      skin: { ...base.skin, ...stored.skin, concerns: stored.skin?.concerns ?? [] },
      makeup: { ...base.makeup, ...stored.makeup },
      hair: { ...base.hair, ...stored.hair, concerns: stored.hair?.concerns ?? [] },
    };
  }

  async save(profile: UserProfile): Promise<void> {
    await writeJson(KEYS.profile, { ...profile, updatedAt: new Date().toISOString() });
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEYS.profile);
  }
}

export class AsyncStorageFavoritesRepository implements FavoritesRepository {
  async load(): Promise<string[]> {
    return (await readJson<string[]>(KEYS.favorites)) ?? [];
  }

  async save(productIds: string[]): Promise<void> {
    await writeJson(KEYS.favorites, productIds);
  }
}

export class AsyncStorageSettingsRepository implements SettingsRepository {
  async load(): Promise<AppSettings> {
    const stored = await readJson<Partial<AppSettings>>(KEYS.settings);
    return { ...DEFAULT_SETTINGS, ...stored };
  }

  async save(settings: AppSettings): Promise<void> {
    await writeJson(KEYS.settings, settings);
  }
}

/**
 * Keys live in the device keychain via expo-secure-store.
 *
 * SecureStore has no web implementation, so on web we fall back to
 * AsyncStorage and the Settings screen says so plainly — a browser has no
 * keychain to offer, and silently pretending otherwise would be worse.
 */
export class SecureStoreSecretRepository implements SecretRepository {
  private get useSecureStore(): boolean {
    return Platform.OS !== 'web';
  }

  async getApiKey(): Promise<string | undefined> {
    try {
      if (this.useSecureStore) {
        return (await SecureStore.getItemAsync(KEYS.apiKey)) ?? undefined;
      }
      return (await AsyncStorage.getItem(KEYS.apiKey)) ?? undefined;
    } catch {
      return undefined;
    }
  }

  async setApiKey(key: string): Promise<void> {
    if (this.useSecureStore) {
      await SecureStore.setItemAsync(KEYS.apiKey, key);
      return;
    }
    await AsyncStorage.setItem(KEYS.apiKey, key);
  }

  async clearApiKey(): Promise<void> {
    if (this.useSecureStore) {
      await SecureStore.deleteItemAsync(KEYS.apiKey);
      return;
    }
    await AsyncStorage.removeItem(KEYS.apiKey);
  }
}

export const profileRepository = new AsyncStorageProfileRepository();
export const favoritesRepository = new AsyncStorageFavoritesRepository();
export const settingsRepository = new AsyncStorageSettingsRepository();
export const secretRepository = new SecureStoreSecretRepository();
