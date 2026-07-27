import type { Metadata } from 'next';
import Link from 'next/link';
import { getCatalogProvider } from '@/lib/data';
import { productQuerySchema } from '@/lib/domain/schemas';
import { CATEGORIES, CATEGORY_LABELS, CONCERNS, PRODUCT_TYPES } from '@/lib/domain/taxonomy';
import { SaveButton } from '@/components/SaveButton';

export const metadata: Metadata = {
  title: 'Browse',
  description: 'Filter and search the full product catalog.',
};

/**
 * Browse is deliberately server-rendered with filters in the URL: results are
 * shareable, linkable and work without JavaScript.
 */
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  );

  const parsed = productQuerySchema.safeParse(flat);
  const query = parsed.success ? parsed.data : productQuerySchema.parse({});

  const provider = getCatalogProvider();
  const [{ items, total }, brands] = await Promise.all([provider.query(query), provider.brands()]);

  const totalPages = Math.max(1, Math.ceil(total / query.perPage));
  const typeOptions = query.category ? PRODUCT_TYPES[query.category] : [];

  /** Build a browse URL preserving current filters, resetting to page 1. */
  function hrefWith(patch: Record<string, string | undefined>): string {
    const params = new URLSearchParams();
    const merged = { ...flat, ...patch };
    for (const [key, value] of Object.entries(merged)) {
      if (value !== undefined && value !== '' && key !== 'page') params.set(key, String(value));
    }
    if (patch.page) params.set('page', patch.page);
    const qs = params.toString();
    return qs ? `/browse?${qs}` : '/browse';
  }

  return (
    <div style={{ display: 'grid', gap: '1.75rem' }}>
      <header>
        <h1 style={{ margin: '0 0 0.4rem', fontSize: 'clamp(1.7rem, 4vw, 2.4rem)' }}>
          Browse the catalog
        </h1>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          {total} product{total === 1 ? '' : 's'} match your filters. For personalised scoring, take{' '}
          <Link href="/quiz">the quiz</Link>.
        </p>
      </header>

      <form
        method="get"
        action="/browse"
        className="gm-card"
        style={{ padding: '1.25rem', display: 'grid', gap: '1rem' }}
      >
        <div
          style={{
            display: 'grid',
            gap: '0.75rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          }}
        >
          <Field label="Search">
            <input
              className="gm-input"
              type="search"
              name="search"
              defaultValue={query.search ?? ''}
              placeholder="Name, brand, ingredient…"
            />
          </Field>

          <Field label="Category">
            <select className="gm-input" name="category" defaultValue={query.category ?? ''}>
              <option value="">All categories</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </Field>

          {typeOptions.length > 0 && (
            <Field label="Product type">
              <select className="gm-input" name="type" defaultValue={query.type ?? ''}>
                <option value="">All types</option>
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/-/g, ' ')}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Brand">
            <select className="gm-input" name="brand" defaultValue={query.brand ?? ''}>
              <option value="">All brands</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Concern">
            <select className="gm-input" name="concern" defaultValue={query.concern ?? ''}>
              <option value="">Any concern</option>
              {CONCERNS.map((concern) => (
                <option key={concern.id} value={concern.id}>
                  {concern.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Max price ($)">
            <input
              className="gm-input"
              type="number"
              name="maxPrice"
              min={1}
              defaultValue={query.maxPrice ?? ''}
              placeholder="Any"
            />
          </Field>

          <Field label="Sort by">
            <select className="gm-input" name="sort" defaultValue={query.sort}>
              <option value="curation">Most recommended</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
              <option value="name">Name</option>
            </select>
          </Field>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button type="submit" className="gm-btn">
            Apply filters
          </button>
          <Link href="/browse" className="gm-btn gm-btn-secondary" style={{ textDecoration: 'none' }}>
            Clear
          </Link>
        </div>
      </form>

      {items.length === 0 ? (
        <div className="gm-card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ marginTop: 0 }}>No products match those filters</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 0 }}>
            Try removing one — the brand and concern filters together are often too narrow.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          }}
        >
          {items.map((product) => (
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
                  <h2 style={{ margin: '0.15rem 0 0', fontSize: '1.02rem' }}>
                    <Link href={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
                      {product.name}
                    </Link>
                  </h2>
                </div>
                <SaveButton productId={product.id} />
              </div>

              <p style={{ margin: '0.5rem 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                {product.type.replace(/-/g, ' ')} · ${product.price}
                {product.size ? ` · ${product.size}` : ''}
              </p>

              <p style={{ margin: '0 0 0.7rem', fontSize: '0.88rem' }}>{product.description}</p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {product.keyIngredients.slice(0, 3).map((ingredient) => (
                  <span key={ingredient} className="gm-chip">
                    {ingredient}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}
        >
          {query.page > 1 && (
            <Link
              href={hrefWith({ page: String(query.page - 1) })}
              className="gm-btn gm-btn-secondary"
              style={{ textDecoration: 'none', padding: '0.45rem 1rem' }}
            >
              ← Previous
            </Link>
          )}
          <span style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
            Page {query.page} of {totalPages}
          </span>
          {query.page < totalPages && (
            <Link
              href={hrefWith({ page: String(query.page + 1) })}
              className="gm-btn gm-btn-secondary"
              style={{ textDecoration: 'none', padding: '0.45rem 1rem' }}
            >
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 500 }}>
      <span>{label}</span>
      {children}
    </label>
  );
}
