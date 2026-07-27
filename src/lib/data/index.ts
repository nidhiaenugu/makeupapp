import { JsonCatalogProvider } from './json-provider';
import type { CatalogProvider } from './provider';

/**
 * The single place the app decides where product data comes from.
 *
 * To move off the bundled JSON, implement `CatalogProvider` against your store
 * and return it here — for example:
 *
 *   const provider = process.env.DATABASE_URL
 *     ? new PostgresCatalogProvider(process.env.DATABASE_URL)
 *     : new JsonCatalogProvider();
 *
 * Nothing else in the codebase imports a concrete provider.
 */
let cached: CatalogProvider | undefined;

export function getCatalogProvider(): CatalogProvider {
  if (!cached) {
    cached = new JsonCatalogProvider();
  }
  return cached;
}

/** Test hook: swap in a fake provider. */
export function setCatalogProvider(provider: CatalogProvider): void {
  cached = provider;
}

export type { CatalogProvider } from './provider';
