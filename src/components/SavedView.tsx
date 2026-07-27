'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { SaveButton } from '@/components/SaveButton';
import type { ProductWithTier } from '@/lib/domain/types';
import { loadSaved } from '@/lib/profile/storage';

export function SavedView() {
  const [products, setProducts] = useState<ProductWithTier[] | null>(null);

  const load = useCallback(async () => {
    const ids = loadSaved();
    if (ids.length === 0) {
      setProducts([]);
      return;
    }

    // Fetch each saved product individually — the API has no bulk endpoint,
    // and a saved list is small enough that this stays fast.
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const response = await fetch(`/api/products/${id}`);
          if (!response.ok) return null;
          const body = (await response.json()) as { data: ProductWithTier };
          return body.data;
        } catch {
          return null;
        }
      }),
    );

    setProducts(results.filter((p): p is ProductWithTier => p !== null));
  }, []);

  useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener('gm-saved-changed', onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener('gm-saved-changed', onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [load]);

  if (products === null) {
    return <p style={{ color: 'var(--muted)' }}>Loading your saved products…</p>;
  }

  const total = products.reduce((sum, product) => sum + product.price, 0);

  return (
    <div style={{ display: 'grid', gap: '1.75rem' }}>
      <header>
        <h1 style={{ margin: '0 0 0.4rem', fontSize: 'clamp(1.7rem, 4vw, 2.4rem)' }}>Saved</h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          {products.length === 0
            ? 'Nothing saved yet.'
            : `${products.length} product${products.length === 1 ? '' : 's'} · $${total} to buy the lot.`}{' '}
          Stored in this browser only.
        </p>
      </header>

      {products.length === 0 ? (
        <div className="gm-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted)', marginTop: 0 }}>
            Tap the heart on any product to keep it here.
          </p>
          <Link href="/browse" className="gm-btn" style={{ textDecoration: 'none' }}>
            Browse products
          </Link>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          }}
        >
          {products.map((product) => (
            <article key={product.id} className="gm-card" style={{ padding: '1.1rem' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--muted)',
                    }}
                  >
                    {product.brand}
                  </p>
                  <h2 style={{ margin: '0.15rem 0 0.3rem', fontSize: '1.02rem' }}>
                    <Link href={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
                      {product.name}
                    </Link>
                  </h2>
                  <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>
                    {product.type.replace(/-/g, ' ')} · ${product.price}
                  </p>
                </div>
                <SaveButton productId={product.id} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
