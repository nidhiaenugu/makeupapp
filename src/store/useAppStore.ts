import { create } from 'zustand';

import { getCatalogProvider } from '@core/catalog';
import { recommend } from '@core/engine/recommend';
import { buildAllRoutines } from '@core/engine/routine';
import type { Category } from '@core/types/enums';
import type { Product } from '@core/types/product';
import { createEmptyProfile, isProfileUsable, mergeProfile } from '@core/types/profile';
import type { DeepPartialProfile, UserProfile } from '@core/types/profile';
import type { Recommendation, Routine } from '@core/types/recommendation';
import {
  favoritesRepository,
  profileRepository,
  secretRepository,
  settingsRepository,
} from '@/data/asyncStorage';
import type { AppSettings } from '@/data/repository';
import { DEFAULT_SETTINGS } from '@/data/repository';

interface AppState {
  hydrated: boolean;
  /** True until the user has completed the quiz at least once. */
  needsOnboarding: boolean;

  products: Product[];
  profile: UserProfile;
  favorites: string[];
  settings: AppSettings;
  apiKey?: string;

  hydrate: () => Promise<void>;
  updateProfile: (patch: DeepPartialProfile) => Promise<void>;
  completeQuiz: () => Promise<void>;
  resetProfile: () => Promise<void>;
  toggleFavorite: (productId: string) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  setApiKey: (key: string | undefined) => Promise<void>;

  recommendationsFor: (category: Category, limit?: number) => Recommendation[];
  routines: () => Routine[];
  productById: (id: string) => Product | undefined;
}

/**
 * One store for the whole app.
 *
 * Derived data (recommendations, routines) is computed on read rather than
 * stored: the engine is pure and fast enough that memoising it would only add
 * a cache to invalidate.
 */
export const useAppStore = create<AppState>((set, get) => ({
  hydrated: false,
  needsOnboarding: true,
  products: [],
  profile: createEmptyProfile(),
  favorites: [],
  settings: DEFAULT_SETTINGS,

  hydrate: async () => {
    const provider = getCatalogProvider();
    const [products, storedProfile, favorites, settings, apiKey] = await Promise.all([
      provider.all(),
      profileRepository.load(),
      favoritesRepository.load(),
      settingsRepository.load(),
      secretRepository.getApiKey(),
    ]);

    const profile = storedProfile ?? createEmptyProfile();
    set({
      hydrated: true,
      needsOnboarding: !isProfileUsable(profile),
      products,
      profile,
      favorites,
      settings,
      apiKey,
    });
  },

  updateProfile: async (patch) => {
    const profile = mergeProfile(get().profile, patch);
    set({ profile });
    await profileRepository.save(profile);
  },

  completeQuiz: async () => {
    const profile = { ...get().profile, updatedAt: new Date().toISOString() };
    set({ profile, needsOnboarding: false });
    await profileRepository.save(profile);
  },

  resetProfile: async () => {
    const profile = createEmptyProfile();
    set({ profile, needsOnboarding: true });
    await profileRepository.clear();
  },

  toggleFavorite: async (productId) => {
    const current = get().favorites;
    const favorites = current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId];
    set({ favorites });
    await favoritesRepository.save(favorites);
  },

  updateSettings: async (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    await settingsRepository.save(settings);
  },

  setApiKey: async (key) => {
    if (key && key.trim().length > 0) {
      await secretRepository.setApiKey(key.trim());
      set({ apiKey: key.trim() });
    } else {
      await secretRepository.clearApiKey();
      set({ apiKey: undefined });
    }
  },

  recommendationsFor: (category, limit = 20) => {
    const { products, profile } = get();
    if (products.length === 0) return [];
    return recommend(products, profile, { category, limit }).recommendations;
  },

  routines: () => {
    const { products, profile } = get();
    if (products.length === 0) return [];
    return buildAllRoutines(products, profile);
  },

  productById: (id) => get().products.find((product) => product.id === id),
}));
