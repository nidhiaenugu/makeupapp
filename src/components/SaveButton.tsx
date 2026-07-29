'use client';

import { useEffect, useState } from 'react';
import { loadSaved, toggleSaved } from '@/lib/profile/storage';

/** Heart toggle backed by localStorage, kept in sync across the page. */
export function SaveButton({ productId, label }: { productId: string; label?: string }) {
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSaved(loadSaved().includes(productId));

    const sync = (event: Event) => {
      const detail = (event as CustomEvent<string[]>).detail;
      setSaved(Array.isArray(detail) ? detail.includes(productId) : loadSaved().includes(productId));
    };

    window.addEventListener('gm-saved-changed', sync);
    // `storage` fires when another tab changes the list.
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('gm-saved-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, [productId]);

  return (
    <button
      type="button"
      onClick={() => setSaved(toggleSaved(productId).includes(productId))}
      aria-pressed={mounted ? saved : undefined}
      aria-label={saved ? 'Remove from saved' : 'Save this product'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: label ? '0.45rem 0.85rem' : '0.35rem',
        borderRadius: 999,
        border: '1px solid var(--border)',
        background: saved ? 'var(--accent-soft)' : 'var(--surface)',
        color: saved ? 'var(--accent)' : 'var(--muted)',
        cursor: 'pointer',
        fontSize: '0.85rem',
        lineHeight: 1,
      }}
    >
      <span aria-hidden="true">{saved ? '♥' : '♡'}</span>
      {label ? <span>{saved ? 'Saved' : label}</span> : null}
    </button>
  );
}
