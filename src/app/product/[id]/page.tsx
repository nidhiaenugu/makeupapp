import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SaveButton } from '@/components/SaveButton';
import { ShadeSwatch } from '@/components/ShadeSwatch';
import { PersonalFit } from '@/components/PersonalFit';
import { getCatalogProvider } from '@/lib/data';
import {
  CATEGORY_LABELS,
  CONCERN_BY_ID,
  DEPTH_LABELS,
  PREFERENCE_BY_ID,
  priceTierFor,
} from '@/lib/domain/taxonomy';

export async function generateStaticParams() {
  const products = await getCatalogProvider().all();
  return products.map((product) => ({ id: product.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getCatalogProvider().byId(id);
  if (!product) return { title: 'Product not found' };
  return {
    title: `${product.name} by ${product.brand}`,
    description: product.description,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getCatalogProvider().byId(id);
  if (!product) notFound();

  const tier = priceTierFor(product.price);
  const potencyLabel = ['', 'Gentle', 'Moderate', 'Strong'][product.potency] ?? 'Gentle';

  return (
    <article style={{ display: 'grid', gap: '2rem', maxWidth: 820 }}>
      <nav style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
        <Link href="/browse">Browse</Link> ·{' '}
        <Link href={`/browse?category=${product.category}`}>{CATEGORY_LABELS[product.category]}</Link>{' '}
        · <span style={{ textTransform: 'capitalize' }}>{product.type.replace(/-/g, ' ')}</span>
      </nav>

      <header style={{ display: 'grid', gap: '0.6rem' }}>
        <p
          style={{
            margin: 0,
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--accent)',
          }}
        >
          {product.brand}
        </p>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.7rem, 4vw, 2.4rem)' }}>{product.name}</h1>
        <p style={{ margin: 0, fontSize: '1.05rem' }}>
          ${product.price}
          {product.size ? ` · ${product.size}` : ''} ·{' '}
          <span style={{ color: 'var(--muted)', textTransform: 'capitalize' }}>{tier}</span>
        </p>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '1.02rem' }}>
          {product.description}
        </p>
        <div>
          <SaveButton productId={product.id} label="Save this" />
        </div>
      </header>

      <PersonalFit productId={product.id} />

      <section className="gm-card" style={{ padding: '1.35rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>What it targets</h2>
        {product.targets.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {product.targets.map((concern) => (
              <span key={concern} className="gm-chip">
                {CONCERN_BY_ID[concern]?.label ?? concern}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            Not aimed at a specific concern — this is a colour or finish product.
          </p>
        )}

        {product.aggravates.length > 0 && (
          <>
            <h3 style={{ margin: '1.1rem 0 0.4rem', fontSize: '0.95rem', color: 'var(--warning)' }}>
              May make worse
            </h3>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.9rem' }}>
              {product.aggravates
                .map((concern) => CONCERN_BY_ID[concern]?.label?.toLowerCase() ?? concern)
                .join(', ')}
              .
            </p>
          </>
        )}
      </section>

      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        }}
      >
        <section className="gm-card" style={{ padding: '1.35rem' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Key ingredients</h2>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.92rem' }}>
            {product.keyIngredients.map((ingredient) => (
              <li key={ingredient}>{ingredient}</li>
            ))}
          </ul>
          <p style={{ margin: '0.9rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
            Strength: <strong style={{ color: 'var(--text)' }}>{potencyLabel}</strong>
            {product.potency >= 3 ? ' — introduce slowly and patch-test first.' : '.'}
          </p>
        </section>

        <section className="gm-card" style={{ padding: '1.35rem' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Suits</h2>
          <dl style={{ margin: 0, display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
            {product.skinTypes.length > 0 && (
              <Row label="Skin types" value={product.skinTypes.join(', ')} />
            )}
            {product.hairTypes.length > 0 && (
              <Row label="Hair types" value={product.hairTypes.join(', ')} />
            )}
            {product.hairTextures.length > 0 && (
              <Row label="Textures" value={product.hairTextures.join(', ')} />
            )}
            {product.porosities.length > 0 && (
              <Row label="Porosity" value={product.porosities.join(', ')} />
            )}
            {product.scalpTypes.length > 0 && (
              <Row label="Scalp" value={product.scalpTypes.join(', ')} />
            )}
            {product.finish && <Row label="Finish" value={product.finish} />}
            {product.coverage && <Row label="Coverage" value={product.coverage} />}
            {product.weight && <Row label="Texture" value={product.weight} />}
            {product.spf !== undefined && <Row label="SPF" value={String(product.spf)} />}
            {product.routineTimes.length > 0 && (
              <Row label="Use" value={product.routineTimes.join(' and ').toUpperCase()} />
            )}
          </dl>
        </section>
      </div>

      {product.attributes.length > 0 && (
        <section className="gm-card" style={{ padding: '1.35rem' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>Formulation claims</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {product.attributes.map((attribute) => (
              <span key={attribute} className="gm-chip">
                {PREFERENCE_BY_ID[attribute]?.label ?? attribute}
              </span>
            ))}
          </div>
        </section>
      )}

      {product.shades && product.shades.length > 0 && (
        <section className="gm-card" style={{ padding: '1.35rem' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.05rem' }}>
            Shade range ({product.shades.length} shown)
          </h2>
          <p style={{ margin: '0 0 1rem', color: 'var(--muted)', fontSize: '0.87rem' }}>
            A representative selection, not the brand&apos;s complete range. Swatches are
            approximate — always check in daylight.
          </p>
          <div
            style={{
              display: 'grid',
              gap: '0.75rem',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            }}
          >
            {product.shades.map((shade) => (
              <div
                key={shade.name}
                style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}
              >
                <ShadeSwatch shade={shade} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.87rem', fontWeight: 500 }}>{shade.name}</p>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--muted)' }}>
                    {DEPTH_LABELS[shade.depth]} · {shade.undertone}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <dt style={{ color: 'var(--muted)', minWidth: 92 }}>{label}</dt>
      <dd style={{ margin: 0, textTransform: 'capitalize' }}>{value}</dd>
    </div>
  );
}
