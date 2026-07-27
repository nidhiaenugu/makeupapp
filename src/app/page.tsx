import Link from 'next/link';
import { getCatalogProvider } from '@/lib/data';
import { CATEGORIES, CATEGORY_LABELS, CONCERNS } from '@/lib/domain/taxonomy';

export default async function HomePage() {
  const provider = getCatalogProvider();
  const [products, brands] = await Promise.all([provider.all(), provider.brands()]);

  return (
    <div style={{ display: 'grid', gap: '3.5rem' }}>
      <section style={{ display: 'grid', gap: '1.25rem', maxWidth: 700 }}>
        <p
          style={{
            margin: 0,
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--accent)',
          }}
        >
          Makeup · Skincare · Hair
        </p>
        <h1 style={{ margin: 0, fontSize: 'clamp(2.1rem, 6vw, 3.4rem)' }}>
          Stop guessing which products suit you.
        </h1>
        <p style={{ margin: 0, fontSize: '1.1rem', color: 'var(--muted)' }}>
          Answer a short quiz about your skin, hair and what you actually care about. GlowMatch
          scores {products.length} products against your profile and shows you the reasoning behind
          every match — including the trade-offs.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/quiz" className="gm-btn" style={{ textDecoration: 'none' }}>
            Take the quiz
          </Link>
          <Link
            href="/browse"
            className="gm-btn gm-btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            Browse the catalog
          </Link>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        }}
      >
        {FEATURES.map((feature) => (
          <div key={feature.title} className="gm-card" style={{ padding: '1.25rem' }}>
            <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.05rem' }}>{feature.title}</h2>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.92rem' }}>{feature.body}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 style={{ marginTop: 0, fontSize: '1.4rem' }}>What it covers</h2>
        <div
          style={{
            display: 'grid',
            gap: '1rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          }}
        >
          {CATEGORIES.map((category) => {
            const count = products.filter((p) => p.category === category).length;
            const concerns = CONCERNS.filter((c) => c.category === category);
            return (
              <div key={category} className="gm-card" style={{ padding: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.3rem', fontSize: '1.1rem' }}>
                  {CATEGORY_LABELS[category]}
                </h3>
                <p style={{ margin: '0 0 0.8rem', color: 'var(--muted)', fontSize: '0.88rem' }}>
                  {count} products · {concerns.length} concerns tracked
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {concerns.slice(0, 6).map((concern) => (
                    <span key={concern.id} className="gm-chip">
                      {concern.label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="gm-card" style={{ padding: '1.5rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.3rem' }}>Built to be built on</h2>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          The matching engine is a pure TypeScript module with no framework or database
          dependencies, and the whole catalog is served over a public REST API. Swap the data
          provider to point at your own inventory without touching the engine or the UI.
        </p>
        <div className="gm-scroll-x">
          <pre
            style={{
              margin: 0,
              padding: '1rem',
              borderRadius: 10,
              background: 'var(--surface-2)',
              fontSize: '0.82rem',
              lineHeight: 1.6,
            }}
          >
            <code>{`curl -X POST /api/recommendations \\
  -H 'Content-Type: application/json' \\
  -d '{"profile":{"categories":["skincare"],
       "skinType":"oily","concerns":["acne"],
       "budget":{"max":40}},"limit":5}'`}</code>
          </pre>
        </div>
        <p style={{ marginBottom: 0, color: 'var(--muted)', fontSize: '0.88rem' }}>
          {brands.length} brands in the bundled sample catalog. See <code>docs/API.md</code> for the
          full reference.
        </p>
      </section>
    </div>
  );
}

const FEATURES = [
  {
    title: 'It shows its working',
    body: 'Every match comes with the specific reasons it scored well — and a warning when a product could aggravate something else you told us about.',
  },
  {
    title: 'Dealbreakers are absolute',
    body: 'Mark fragrance-free or vegan as a dealbreaker and failing products are removed outright, not quietly ranked lower.',
  },
  {
    title: 'Shade matching that admits defeat',
    body: 'Foundation matches account for depth and undertone, and tell you plainly when a range simply does not cover your skin.',
  },
  {
    title: 'Routines, not just lists',
    body: 'Turn your matches into an ordered AM and PM routine, or a wash-day sequence, with guidance on how often to use each step.',
  },
];
