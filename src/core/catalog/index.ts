import type { Product } from '../types/product';
import hairData from './data/hair.json';
import makeupData from './data/makeup.json';
import skincareData from './data/skincare.json';
import { LocalCatalogProvider } from './local';
import type { CatalogProvider } from './provider';
import { parseCatalog } from './schema';

let cached: Product[] | undefined;

/**
 * The bundled catalog, validated once and memoised.
 *
 * Validation runs at first access rather than at import time so a bad entry
 * fails loudly with a product id instead of crashing the bundle silently.
 */
export function loadBundledCatalog(): Product[] {
  if (!cached) {
    cached = [
      ...parseCatalog(skincareData, 'skincare.json'),
      ...parseCatalog(makeupData, 'makeup.json'),
      ...parseCatalog(hairData, 'hair.json'),
    ];
    assertUniqueIds(cached);
  }
  return cached;
}

let provider: CatalogProvider | undefined;

/**
 * The app's catalog provider.
 *
 * Everything reads products through this, so pointing the app at a remote
 * catalog is a matter of calling `setCatalogProvider` once at startup.
 */
export function getCatalogProvider(): CatalogProvider {
  if (!provider) {
    provider = new LocalCatalogProvider(loadBundledCatalog());
  }
  return provider;
}

export function setCatalogProvider(next: CatalogProvider): void {
  provider = next;
}

function assertUniqueIds(products: Product[]): void {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const product of products) {
    if (seen.has(product.id)) duplicates.push(product.id);
    seen.add(product.id);
  }
  if (duplicates.length > 0) {
    throw new Error(`Duplicate product ids in the catalog: ${duplicates.join(', ')}`);
  }
}

export { LocalCatalogProvider } from './local';
export type { CatalogPage, CatalogProvider, CatalogQuery } from './provider';
export { parseCatalog, productSchema } from './schema';
