import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

import type { Category } from '@core/types/enums';
import type { Subcategory } from '@core/types/product';

type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * Icon and label lookup for product types.
 *
 * Kept in one place so a product tile, a routine step and a filter chip all
 * describe the same subcategory identically.
 */
const SUBCATEGORY_ICONS: Partial<Record<Subcategory, IconName>> = {
  cleanser: 'water-outline',
  toner: 'flask-outline',
  essence: 'flask-outline',
  exfoliant: 'sparkles-outline',
  serum: 'eyedrop-outline',
  treatment: 'medkit-outline',
  'eye-cream': 'eye-outline',
  moisturizer: 'ellipse-outline',
  'face-oil': 'water-outline',
  sunscreen: 'sunny-outline',
  mask: 'happy-outline',

  primer: 'layers-outline',
  foundation: 'color-fill-outline',
  concealer: 'brush-outline',
  powder: 'ellipse-outline',
  blush: 'rose-outline',
  bronzer: 'sunny-outline',
  highlighter: 'sparkles-outline',
  eyeshadow: 'color-palette-outline',
  eyeliner: 'pencil-outline',
  mascara: 'eye-outline',
  brow: 'remove-outline',
  lipstick: 'heart-outline',
  'lip-gloss': 'heart-half-outline',
  'lip-liner': 'pencil-outline',
  'setting-spray': 'cloud-outline',

  shampoo: 'water-outline',
  conditioner: 'leaf-outline',
  'deep-conditioner': 'leaf-outline',
  'scalp-treatment': 'medkit-outline',
  'leave-in': 'sparkles-outline',
  'styling-cream': 'hand-left-outline',
  gel: 'ellipse-outline',
  mousse: 'cloud-outline',
  'hair-oil': 'eyedrop-outline',
  'heat-protectant': 'shield-checkmark-outline',
  'dry-shampoo': 'cloud-outline',
  'hair-mask': 'happy-outline',
};

const CATEGORY_ICONS: Record<Category, IconName> = {
  skincare: 'sparkles-outline',
  makeup: 'color-palette-outline',
  hair: 'cut-outline',
};

export function iconForProduct(category: Category, subcategory: Subcategory): IconName {
  return SUBCATEGORY_ICONS[subcategory] ?? CATEGORY_ICONS[category];
}

export function iconForCategory(category: Category): IconName {
  return CATEGORY_ICONS[category];
}

/** "deep-conditioner" -> "Deep conditioner" */
export function labelForSubcategory(subcategory: Subcategory): string {
  const words = subcategory.split('-').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function formatPrice(priceUsd: number): string {
  return `$${priceUsd.toFixed(priceUsd % 1 === 0 ? 0 : 2)}`;
}
