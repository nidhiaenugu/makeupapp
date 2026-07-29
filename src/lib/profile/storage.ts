'use client';

import { userProfileSchema } from '@/lib/domain/schemas';
import type { UserProfile } from '@/lib/domain/types';
import { EMPTY_PROFILE } from './defaults';

/**
 * Client-side persistence.
 *
 * localStorage keeps the app usable with no account and no backend. Stored
 * data is re-validated on read, so a schema change or hand-edited value can
 * never crash the app — it falls back to a clean profile instead.
 */

const PROFILE_KEY = 'gm-profile';
const SAVED_KEY = 'gm-saved';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function loadProfile(): UserProfile | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = userProfileSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Private browsing or a full quota — the app still works for this session.
  }
}

export function clearProfile(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadOrEmptyProfile(): UserProfile {
  return loadProfile() ?? EMPTY_PROFILE;
}

// --- saved products ---------------------------------------------------------

export function loadSaved(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(SAVED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function toggleSaved(id: string): string[] {
  const current = loadSaved();
  const next = current.includes(id) ? current.filter((s) => s !== id) : [...current, id];
  if (isBrowser()) {
    try {
      window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
      // Same-tab listeners: `storage` only fires in *other* tabs.
      window.dispatchEvent(new CustomEvent('gm-saved-changed', { detail: next }));
    } catch {
      /* ignore */
    }
  }
  return next;
}
